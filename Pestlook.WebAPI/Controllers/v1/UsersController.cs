using Asp.Versioning;
using AutoMapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pestlook.WebAPI.Domain.Entities;
using Pestlook.WebAPI.DTOs.Auth;
using Pestlook.WebAPI.DTOs.Common;
using Pestlook.WebAPI.Infrastructure.Services.Interfaces;

namespace Pestlook.WebAPI.Controllers.v1;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/users")]
[Authorize]
public sealed class UsersController(
    ICurrentUserService currentUserService,
    UserManager<ApplicationUser> userManager,
    IMapper mapper) : ControllerBase
{
    /// <summary>
    /// Saves the current user's IANA timezone (e.g. "Africa/Johannesburg").
    /// Used only for analytics that group by local day — storage stays UTC.
    /// </summary>
    [HttpPatch("timezone")]
    [ProducesResponseType(typeof(ApiResponse<UserInfoResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> UpdateTimezone([FromBody] UpdateTimezoneRequest request)
    {
        if (!TimeZoneInfo.TryFindSystemTimeZoneById(request.Timezone, out _))
            return BadRequest(ApiResponse<object>.Fail($"Unknown timezone id '{request.Timezone}'."));

        var user = await userManager.Users
            .Include(u => u.Tenant)
            .FirstOrDefaultAsync(u => u.Id == currentUserService.UserId);
        if (user is null) return Unauthorized();

        user.Timezone = request.Timezone;
        await userManager.UpdateAsync(user);

        var roles = await userManager.GetRolesAsync(user);
        var dto = mapper.Map<UserInfoResponse>(user) with { Roles = roles };
        return Ok(ApiResponse<UserInfoResponse>.Ok(dto, "Timezone updated."));
    }
}
