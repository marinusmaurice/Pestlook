using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Pestlook.WebAPI.Data;
using Pestlook.WebAPI.Domain.Entities;
using Pestlook.WebAPI.DTOs.Auth;
using Pestlook.WebAPI.Infrastructure;
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
    ILogger<AuthService> logger) : IAuthService
{
    private const int MaxFailedAttempts = 5;
    private static readonly TimeSpan LockDuration = TimeSpan.FromMinutes(15);
    private readonly JwtOptions _jwt = jwtOptions.Value;

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

        await userManager.AddToRoleAsync(user, "User");

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

        var user = await userManager.Users
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
}
