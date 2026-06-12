using System.Security.Claims;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Pestlook.WebAPI.Data;
using Pestlook.WebAPI.Domain.Entities;
using Pestlook.WebAPI.Domain.Enums;
using Pestlook.WebAPI.DTOs.Auth;
using Pestlook.WebAPI.Infrastructure;
using Pestlook.WebAPI.Infrastructure.Exceptions;
using Pestlook.WebAPI.Infrastructure.Services.Interfaces;
using Pestlook.WebAPI.Options;
using Microsoft.Extensions.Options;

namespace Pestlook.WebAPI.Infrastructure.Services;

public sealed class AuthService(
    UserManager<ApplicationUser> userManager,
    ITokenService tokenService,
    IEmailService emailService,
    ApplicationDbContext db,
    ITenantContext tenantContext,
    IOptions<JwtOptions> jwtOptions,
    IOptions<EmailOptions> emailOptions,
    ILogger<AuthService> logger) : IAuthService
{
    private const int MaxFailedAttempts = 5;
    private static readonly TimeSpan LockDuration = TimeSpan.FromMinutes(15);
    private readonly JwtOptions _jwt = jwtOptions.Value;
    private readonly EmailOptions _email = emailOptions.Value;

    public async Task<SignUpResponse> SignUpAsync(SignUpRequest request, string ipAddress, CancellationToken ct = default)
    {
        var existingUser = await userManager.FindByEmailAsync(request.Email);
        if (existingUser is not null)
            throw new ConflictException("Email is already registered.");

        var slug = await GenerateUniqueSlugAsync(request.TenantName, ct);
        var plan = request.SubscriptionPlan;

        var tenant = new Tenant
        {
            Name = request.TenantName,
            Slug = slug,
            SubscriptionPlan = plan,
            // Free plan: 10,000 observations per month.
            // Paid plan quotas disabled:
            // MonitoringPointQuota = plan switch
            // {
            //     SubscriptionPlan.Professional => 50,
            //     SubscriptionPlan.Enterprise   => 200,
            //     _                             => 10
            // }
            MonitoringPointQuota = 10000
        };

        db.Tenants.Add(tenant);
        await db.SaveChangesAsync(ct);

        db.Pests.Add(new Pest
        {
            TenantId           = tenant.Id,
            CommonName         = "Unknown",
            Category           = PestCategory.Other,
            DefaultCaptureMode = CaptureMode.Count,
            IsSystemPest       = true
        });
        await db.SaveChangesAsync(ct);

        var user = new ApplicationUser
        {
            UserName       = request.Email,
            Email          = request.Email,
            FirstName      = request.FirstName,
            LastName       = request.LastName,
            TenantId       = tenant.Id,
            EmailConfirmed = false
        };

        var result = await userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            db.Tenants.Remove(tenant);
            await db.SaveChangesAsync(ct);
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            throw new InvalidOperationException($"Sign-up failed: {errors}");
        }

        await userManager.AddToRoleAsync(user, "Admin");

        await SendActivationEmailAsync(user, ct);

        logger.LogInformation("New tenant {TenantId} ({Slug}) created via sign-up by {Email}",
            tenant.Id, tenant.Slug, user.Email);

        return new SignUpResponse(
            "Account created! Please check your email to activate your account. If you don't see it, check your spam or junk folder.",
            user.Email!);
    }

    public async Task<TokenResponse> ActivateAccountAsync(string userId, string token, string ipAddress, CancellationToken ct = default)
    {
        var user = await db.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new InvalidOperationException("Invalid activation link.");

        if (user.EmailConfirmed)
            throw new InvalidOperationException("Account is already activated.");

        var result = await userManager.ConfirmEmailAsync(user, token);
        if (!result.Succeeded)
        {
            logger.LogWarning("Account activation failed for user {UserId}", userId);
            throw new InvalidOperationException("Activation link is invalid or has expired. Please request a new one.");
        }

        logger.LogInformation("Account activated for user {Email}", user.Email);

        return await IssueTokensAsync(user, ipAddress, ct);
    }

    public async Task ResendActivationAsync(string email, CancellationToken ct = default)
    {
        // Always return without error to avoid leaking whether an email is registered
        var user = await db.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Email == email, ct);

        if (user is null || user.EmailConfirmed)
            return;

        await SendActivationEmailAsync(user, ct);

        logger.LogInformation("Activation email resent to {Email}", email);
    }

    public async Task ForgotPasswordAsync(string email, CancellationToken ct = default)
    {
        // Always returns silently — never reveal whether the email is registered
        var user = await db.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Email == email, ct);

        if (user is null || !user.EmailConfirmed)
            return;

        try
        {
            var token = await userManager.GeneratePasswordResetTokenAsync(user);
            var encodedToken = Uri.EscapeDataString(token);
            var resetUrl = $"{_email.AppBaseUrl}/#/reset-password?userId={user.Id}&token={encodedToken}";
            await emailService.SendPasswordResetEmailAsync(user.Email!, user.FirstName, resetUrl, ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send password reset email to {Email}", email);
        }

        logger.LogInformation("Password reset requested for {Email}", email);
    }

    public async Task ResetPasswordAsync(string userId, string token, string newPassword, CancellationToken ct = default)
    {
        var user = await db.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new InvalidOperationException("Invalid password reset link.");

        var result = await userManager.ResetPasswordAsync(user, token, newPassword);
        if (!result.Succeeded)
        {
            logger.LogWarning("Password reset failed for user {UserId}", userId);
            throw new InvalidOperationException("Password reset link is invalid or has expired.");
        }

        // Clear any account lock that may have triggered the reset
        user.FailedLoginAttempts = 0;
        user.LockedUntil = null;
        await userManager.UpdateAsync(user);

        logger.LogInformation("Password reset completed for user {Email}", user.Email);
    }

    public async Task<TokenResponse> RegisterAsync(RegisterRequest request, string ipAddress, CancellationToken ct = default)
    {
        if (tenantContext.TenantId is null)
            throw new InvalidOperationException("Tenant could not be resolved. Provide X-Tenant-ID header.");

        var tenant = await db.Tenants
            .FirstOrDefaultAsync(t => t.Id == tenantContext.TenantId && t.IsActive, ct)
            ?? throw new InvalidOperationException("Tenant not found or inactive.");

        var existing = await userManager.FindByEmailAsync(request.Email);
        if (existing is not null)
            throw new InvalidOperationException("Email is already registered.");

        if (request.Timezone is not null && !TimeZoneInfo.TryFindSystemTimeZoneById(request.Timezone, out _))
            throw new InvalidOperationException($"Unknown timezone id '{request.Timezone}'.");

        // Admin-created users are pre-approved — no email verification required
        var user = new ApplicationUser
        {
            UserName       = request.Email,
            Email          = request.Email,
            FirstName      = request.FirstName,
            LastName       = request.LastName,
            TenantId       = tenant.Id,
            EmailConfirmed = true,
            Timezone       = request.Timezone
        };

        var result = await userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            throw new InvalidOperationException($"Registration failed: {errors}");
        }

        await userManager.AddToRoleAsync(user, request.Role ?? "Scout");

        logger.LogInformation("User {Email} registered in tenant {TenantId}", user.Email, user.TenantId);

        return await IssueTokensAsync(user, ipAddress, ct);
    }

    public async Task<TokenResponse> LoginAsync(LoginRequest request, string ipAddress, CancellationToken ct = default)
    {
        var user = await userManager.FindByEmailAsync(request.Email)
            ?? throw new UnauthorizedAccessException("Invalid credentials.");

        if (tenantContext.TenantId.HasValue && user.TenantId != tenantContext.TenantId)
            throw new UnauthorizedAccessException("Invalid credentials.");

        if (!user.EmailConfirmed)
            throw new UnauthorizedAccessException("Please activate your account. Check your email for the activation link.");

        if (!user.IsActive)
            throw new UnauthorizedAccessException("Account is disabled.");

        if (user.LockedUntil.HasValue && user.LockedUntil > DateTime.UtcNow)
            throw new UnauthorizedAccessException($"Account locked until {user.LockedUntil:u}. Try again later.");

        var passwordValid = await userManager.CheckPasswordAsync(user, request.Password);
        if (!passwordValid)
        {
            user.FailedLoginAttempts++;
            if (user.FailedLoginAttempts >= MaxFailedAttempts)
            {
                user.LockedUntil = DateTime.UtcNow.Add(LockDuration);
                logger.LogWarning("User {Email} locked after {Count} failed attempts", user.Email, user.FailedLoginAttempts);
            }
            await userManager.UpdateAsync(user);
            throw new UnauthorizedAccessException("Invalid credentials.");
        }

        user.FailedLoginAttempts = 0;
        user.LockedUntil = null;
        await userManager.UpdateAsync(user);

        logger.LogInformation("User {Email} logged in from {Ip}", user.Email, ipAddress);

        return await IssueTokensAsync(user, ipAddress, ct);
    }

    public async Task<TokenResponse> RefreshTokenAsync(RefreshTokenRequest request, string ipAddress, CancellationToken ct = default)
    {
        var principal = tokenService.GetPrincipalFromExpiredToken(request.AccessToken)
            ?? throw new UnauthorizedAccessException("Invalid access token.");

        var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new UnauthorizedAccessException("Invalid token claims.");

        var user = await db.Users
            .IgnoreQueryFilters()
            .Include(u => u.RefreshTokens)
            .FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new UnauthorizedAccessException("User not found.");

        var storedToken = user.RefreshTokens.FirstOrDefault(rt => rt.Token == request.RefreshToken);

        if (storedToken is null || !storedToken.IsActive)
            throw new UnauthorizedAccessException("Refresh token is invalid or expired.");

        storedToken.RevokedAt = DateTime.UtcNow;
        var newRefreshToken = BuildRefreshToken(user, ipAddress);
        storedToken.ReplacedByToken = newRefreshToken.Token;
        db.RefreshTokens.Add(newRefreshToken);

        var cutoff = DateTime.UtcNow.AddDays(-(_jwt.RefreshTokenExpiryDays * 2));
        var stale = user.RefreshTokens.Where(rt => rt.CreatedAt < cutoff).ToList();
        db.RefreshTokens.RemoveRange(stale);

        await db.SaveChangesAsync(ct);

        var roles = await userManager.GetRolesAsync(user);
        var accessToken = tokenService.GenerateAccessToken(user, roles);
        var accessExpiry = DateTime.UtcNow.AddMinutes(_jwt.AccessTokenExpiryMinutes);

        return new TokenResponse(accessToken, newRefreshToken.Token, accessExpiry, newRefreshToken.ExpiresAt);
    }

    public async Task RevokeTokenAsync(string refreshToken, string ipAddress, CancellationToken ct = default)
    {
        var token = await db.RefreshTokens
            .Include(rt => rt.User)
            .FirstOrDefaultAsync(rt => rt.Token == refreshToken, ct)
            ?? throw new InvalidOperationException("Refresh token not found.");

        if (!token.IsActive)
            throw new InvalidOperationException("Token is already revoked or expired.");

        token.RevokedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        logger.LogInformation("Refresh token revoked for user {UserId} from {Ip}", token.UserId, ipAddress);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task SendActivationEmailAsync(ApplicationUser user, CancellationToken ct)
    {
        try
        {
            var confirmationToken = await userManager.GenerateEmailConfirmationTokenAsync(user);
            var encodedToken = Uri.EscapeDataString(confirmationToken);
            var activationUrl = $"{_email.AppBaseUrl}/#/activate?userId={user.Id}&token={encodedToken}";
            await emailService.SendActivationEmailAsync(user.Email!, user.FirstName, activationUrl, ct);
        }
        catch (Exception ex)
        {
            // Email failure must not break account creation — user can request a resend
            logger.LogError(ex, "Failed to send activation email to {Email}", user.Email);
        }
    }

    private async Task<string> GenerateUniqueSlugAsync(string tenantName, CancellationToken ct)
    {
        var baseSlug = Regex.Replace(tenantName.ToLowerInvariant(), @"[^a-z0-9]+", "-").Trim('-');
        if (string.IsNullOrEmpty(baseSlug)) baseSlug = "org";

        var slug = baseSlug;
        var suffix = 2;

        while (await db.Tenants.AnyAsync(t => t.Slug == slug, ct))
        {
            slug = $"{baseSlug}-{suffix++}";
        }

        return slug;
    }

    private async Task<TokenResponse> IssueTokensAsync(ApplicationUser user, string ipAddress, CancellationToken ct)
    {
        var roles = await userManager.GetRolesAsync(user);
        var accessToken = tokenService.GenerateAccessToken(user, roles);
        var refreshToken = BuildRefreshToken(user, ipAddress);

        db.RefreshTokens.Add(refreshToken);
        await db.SaveChangesAsync(ct);

        var accessExpiry = DateTime.UtcNow.AddMinutes(_jwt.AccessTokenExpiryMinutes);
        return new TokenResponse(accessToken, refreshToken.Token, accessExpiry, refreshToken.ExpiresAt);
    }

    private RefreshToken BuildRefreshToken(ApplicationUser user, string ipAddress) => new()
    {
        UserId = user.Id,
        TenantId = user.TenantId,
        Token = tokenService.GenerateRefreshToken(),
        ExpiresAt = DateTime.UtcNow.AddDays(_jwt.RefreshTokenExpiryDays),
        CreatedByIp = ipAddress
    };
}
