using System.Security.Claims;
using System.Web;
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
    ApplicationDbContext db,
    ITenantContext tenantContext,
    IOptions<JwtOptions> jwtOptions,
    IOptions<EmailOptions> emailOptions,
    IEmailService emailService,
    ILogger<AuthService> logger) : IAuthService
{
    private const int MaxFailedAttempts = 5;
    private static readonly TimeSpan LockDuration = TimeSpan.FromMinutes(15);
    private readonly JwtOptions _jwt = jwtOptions.Value;
    private readonly EmailOptions _email = emailOptions.Value;

    public async Task<TokenResponse> SignUpAsync(SignUpRequest request, string ipAddress, CancellationToken ct = default)
    {
        var slugTaken = await db.Tenants.AnyAsync(t => t.Slug == request.TenantSlug, ct);
        if (slugTaken)
            throw new ConflictException($"The organization slug '{request.TenantSlug}' is already in use.");

        var existingUser = await userManager.FindByEmailAsync(request.Email);
        if (existingUser is not null)
            throw new ConflictException("Email is already registered.");

        var plan = request.SubscriptionPlan;

        var tenant = new Tenant
        {
            Name = request.TenantName,
            Slug = request.TenantSlug.ToLowerInvariant(),
            SubscriptionPlan = plan,
            MonitoringPointQuota = plan switch
            {
                SubscriptionPlan.Professional => 50,
                SubscriptionPlan.Enterprise   => 200,
                _                             => 10
            }
        };

        db.Tenants.Add(tenant);
        await db.SaveChangesAsync(ct);

        db.Pests.Add(new Pest
        {
            TenantId            = tenant.Id,
            CommonName          = "Unknown",
            Category            = PestCategory.Other,
            DefaultCaptureMode  = CaptureMode.Count,
            IsSystemPest        = true
        });
        await db.SaveChangesAsync(ct);

        var user = new ApplicationUser
        {
            UserName  = request.Email,
            Email     = request.Email,
            FirstName = request.FirstName,
            LastName  = request.LastName,
            TenantId  = tenant.Id
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

        logger.LogInformation("New tenant {TenantId} ({Slug}) created via sign-up by {Email}",
            tenant.Id, tenant.Slug, user.Email);

        var confirmToken = await userManager.GenerateEmailConfirmationTokenAsync(user);
        var confirmLink = BuildLink("confirm-email", new { userId = user.Id, token = confirmToken });
        await emailService.SendEmailConfirmationAsync(user.Email!, $"{user.FirstName} {user.LastName}", confirmLink, ct);

        return await IssueTokensAsync(user, ipAddress, ct);
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

        var user = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            FirstName = request.FirstName,
            LastName = request.LastName,
            TenantId = tenant.Id
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

        // Reset brute-force counters on successful login
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

        // Rotate: revoke old, issue new
        storedToken.RevokedAt = DateTime.UtcNow;
        var newRefreshToken = BuildRefreshToken(user, ipAddress);
        storedToken.ReplacedByToken = newRefreshToken.Token;
        db.RefreshTokens.Add(newRefreshToken);

        // Remove tokens older than double the expiry window to keep the table clean
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

    // ── Email flows ──────────────────────────────────────────────────────────

    public async Task ConfirmEmailAsync(ConfirmEmailRequest request, CancellationToken ct = default)
    {
        var user = await userManager.FindByIdAsync(request.UserId)
            ?? throw new InvalidOperationException("User not found.");

        var result = await userManager.ConfirmEmailAsync(user, request.Token);
        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            throw new InvalidOperationException($"Email confirmation failed: {errors}");
        }

        logger.LogInformation("Email confirmed for user {UserId}", user.Id);
    }

    public async Task ForgotPasswordAsync(ForgotPasswordRequest request, CancellationToken ct = default)
    {
        var user = await userManager.FindByEmailAsync(request.Email);

        // Always return successfully to avoid email enumeration
        if (user is null || !user.IsActive)
            return;

        var token = await userManager.GeneratePasswordResetTokenAsync(user);
        var resetLink = BuildLink("reset-password", new { email = user.Email, token });
        await emailService.SendPasswordResetAsync(user.Email!, $"{user.FirstName} {user.LastName}", resetLink, ct);

        logger.LogInformation("Password reset email sent to {Email}", user.Email);
    }

    public async Task ResetPasswordAsync(ResetPasswordRequest request, CancellationToken ct = default)
    {
        var user = await userManager.FindByEmailAsync(request.Email)
            ?? throw new InvalidOperationException("User not found.");

        var result = await userManager.ResetPasswordAsync(user, request.Token, request.NewPassword);
        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            throw new InvalidOperationException($"Password reset failed: {errors}");
        }

        logger.LogInformation("Password reset completed for {Email}", user.Email);
    }

    public async Task InviteMemberAsync(InviteMemberRequest request, CancellationToken ct = default)
    {
        if (tenantContext.TenantId is null)
            throw new InvalidOperationException("Tenant could not be resolved.");

        var tenant = await db.Tenants
            .FirstOrDefaultAsync(t => t.Id == tenantContext.TenantId && t.IsActive, ct)
            ?? throw new InvalidOperationException("Tenant not found or inactive.");

        var existing = await userManager.FindByEmailAsync(request.Email);
        if (existing is not null)
            throw new ConflictException("A user with this email address already exists.");

        // Create the account without a password; the invite link lets them set one
        var user = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            FirstName = request.FirstName,
            LastName = request.LastName,
            TenantId = tenant.Id,
            EmailConfirmed = true
        };

        var createResult = await userManager.CreateAsync(user);
        if (!createResult.Succeeded)
        {
            var errors = string.Join(", ", createResult.Errors.Select(e => e.Description));
            throw new InvalidOperationException($"Invite failed: {errors}");
        }

        await userManager.AddToRoleAsync(user, request.Role ?? "Scout");

        // Reuse the password-reset token as the set-password token for new invitees
        var token = await userManager.GeneratePasswordResetTokenAsync(user);
        var inviteLink = BuildLink("accept-invite", new { email = user.Email, token });
        await emailService.SendMemberInviteAsync(user.Email!, "your team", tenant.Name, inviteLink, ct);

        logger.LogInformation("Member invite sent to {Email} for tenant {TenantId}", user.Email, tenant.Id);
    }

    private string BuildLink(string path, object parameters)
    {
        var query = string.Join("&", parameters.GetType()
            .GetProperties()
            .Select(p => $"{p.Name}={HttpUtility.UrlEncode(p.GetValue(parameters)?.ToString())}"));

        // Hash-based SPA routing: base/#/path?params
        return $"{_email.AppBaseUrl.TrimEnd('/')}/#/{path.TrimStart('/')}?{query}";
    }
}
