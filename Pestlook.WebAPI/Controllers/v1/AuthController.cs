using Asp.Versioning;
using AutoMapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Pestlook.WebAPI.Domain.Entities;
using Pestlook.WebAPI.DTOs.Auth;
using Pestlook.WebAPI.DTOs.Common;
using Pestlook.WebAPI.Infrastructure.Services.Interfaces;

namespace Pestlook.WebAPI.Controllers.v1;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/auth")]
[EnableRateLimiting("auth")]
public sealed class AuthController(
    IAuthService authService,
    ICurrentUserService currentUserService,
    UserManager<ApplicationUser> userManager,
    IMapper mapper) : ControllerBase
{
    private string IpAddress =>
        Request.Headers.TryGetValue("X-Forwarded-For", out var forwarded)
            ? forwarded.ToString()
            : HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";

    [HttpPost("sign-up")]
    [ProducesResponseType(typeof(ApiResponse<TokenResponse>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> SignUp([FromBody] SignUpRequest request, CancellationToken ct)
    {
        var result = await authService.SignUpAsync(request, IpAddress, ct);
        return StatusCode(StatusCodes.Status201Created,
            ApiResponse<TokenResponse>.Ok(result, "Account created successfully."));
    }

    [HttpPost("register")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(ApiResponse<TokenResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request, CancellationToken ct)
    {
        var result = await authService.RegisterAsync(request, IpAddress, ct);
        return Ok(ApiResponse<TokenResponse>.Ok(result, "Registration successful."));
    }

    [HttpPost("login")]
    [ProducesResponseType(typeof(ApiResponse<TokenResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken ct)
    {
        var result = await authService.LoginAsync(request, IpAddress, ct);
        return Ok(ApiResponse<TokenResponse>.Ok(result));
    }

    [HttpPost("refresh")]
    [ProducesResponseType(typeof(ApiResponse<TokenResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequest request, CancellationToken ct)
    {
        var result = await authService.RefreshTokenAsync(request, IpAddress, ct);
        return Ok(ApiResponse<TokenResponse>.Ok(result));
    }

    [HttpPost("revoke")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Revoke([FromBody] string refreshToken, CancellationToken ct)
    {
        await authService.RevokeTokenAsync(refreshToken, IpAddress, ct);
        return NoContent();
    }

    [HttpGet("me")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<UserInfoResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Me()
    {
        var user = await userManager.Users
            .Include(u => u.Tenant)
            .FirstOrDefaultAsync(u => u.Id == currentUserService.UserId);
        if (user is null) return Unauthorized();

        var roles = await userManager.GetRolesAsync(user);
        var dto = mapper.Map<UserInfoResponse>(user) with { Roles = roles };
        return Ok(ApiResponse<UserInfoResponse>.Ok(dto));
    }

    [HttpPatch("me/preferences")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<UserInfoResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UpdatePreferences([FromBody] UpdatePreferencesRequest request)
    {
        var user = await userManager.Users
            .Include(u => u.Tenant)
            .FirstOrDefaultAsync(u => u.Id == currentUserService.UserId);
        if (user is null) return Unauthorized();

        user.TemperatureUnit = request.TemperatureUnit;
        await userManager.UpdateAsync(user);

        var roles = await userManager.GetRolesAsync(user);
        var dto = mapper.Map<UserInfoResponse>(user) with { Roles = roles };
        return Ok(ApiResponse<UserInfoResponse>.Ok(dto, "Preferences updated."));
    }

    [HttpPost("confirm-email")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ConfirmEmail([FromBody] ConfirmEmailRequest request, CancellationToken ct)
    {
        await authService.ConfirmEmailAsync(request, ct);
        return Ok(ApiResponse<object>.Ok(null, "Email confirmed successfully."));
    }

    [HttpPost("forgot-password")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request, CancellationToken ct)
    {
        await authService.ForgotPasswordAsync(request, ct);
        return Ok(ApiResponse<object>.Ok(null, "If that email is registered you will receive a reset link shortly."));
    }

    [HttpPost("reset-password")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request, CancellationToken ct)
    {
        await authService.ResetPasswordAsync(request, ct);
        return Ok(ApiResponse<object>.Ok(null, "Password reset successfully."));
    }

    [HttpPost("invite")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> InviteMember([FromBody] InviteMemberRequest request, CancellationToken ct)
    {
        await authService.InviteMemberAsync(request, ct);
        return Ok(ApiResponse<object>.Ok(null, "Invitation sent successfully."));
    }
}
