using Asp.Versioning;
using AutoMapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
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

    [HttpPost("register")]
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
        var user = await userManager.FindByIdAsync(currentUserService.UserId!);
        if (user is null) return Unauthorized();

        var roles = await userManager.GetRolesAsync(user);
        var dto = mapper.Map<UserInfoResponse>(user) with { Roles = roles };
        return Ok(ApiResponse<UserInfoResponse>.Ok(dto));
    }
}
