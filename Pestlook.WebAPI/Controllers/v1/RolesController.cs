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
using Pestlook.WebAPI.DTOs.Roles;

namespace Pestlook.WebAPI.Controllers.v1;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/roles")]
[Authorize]
[EnableRateLimiting("global")]
public sealed class RolesController(
    UserManager<ApplicationUser> userManager,
    RoleManager<IdentityRole> roleManager,
    IMapper mapper) : ControllerBase
{
    // Roles each tier may assign/revoke
    private static readonly string[] _agronomistManageable = ["Farmer", "Scout"];
    private static readonly string[] _farmerManageable     = ["Scout"];

    // GET /api/v1/roles
    [HttpGet]
    [Authorize(Roles = "Agronomist,Farmer")]
    [ProducesResponseType(typeof(ApiResponse<IList<string>>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetRoles()
    {
        var roles = await roleManager.Roles
            .OrderBy(r => r.Name)
            .Select(r => r.Name!)
            .ToListAsync();

        return Ok(ApiResponse<IList<string>>.Ok(roles));
    }

    // GET /api/v1/roles/users
    [HttpGet("users")]
    [Authorize(Roles = "Agronomist,Farmer")]
    [ProducesResponseType(typeof(ApiResponse<IList<UserInfoResponse>>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetUsers()
    {
        var users = await userManager.Users
            .OrderBy(u => u.Email)
            .ToListAsync();

        var result = new List<UserInfoResponse>(users.Count);
        foreach (var user in users)
        {
            var roles = await userManager.GetRolesAsync(user);
            result.Add(mapper.Map<UserInfoResponse>(user) with { Roles = roles });
        }

        return Ok(ApiResponse<IList<UserInfoResponse>>.Ok(result));
    }

    // GET /api/v1/roles/users/{userId}
    [HttpGet("users/{userId}")]
    [Authorize(Roles = "Agronomist,Farmer")]
    [ProducesResponseType(typeof(ApiResponse<UserInfoResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetUser(string userId)
    {
        var user = await userManager.FindByIdAsync(userId)
            ?? throw new KeyNotFoundException("User not found.");

        var roles = await userManager.GetRolesAsync(user);
        var dto = mapper.Map<UserInfoResponse>(user) with { Roles = roles };
        return Ok(ApiResponse<UserInfoResponse>.Ok(dto));
    }

    // POST /api/v1/roles/users/{userId}/assign
    [HttpPost("users/{userId}/assign")]
    [Authorize(Roles = "Agronomist,Farmer")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> AssignRole(string userId, [FromBody] AssignRoleRequest request)
    {
        if (!CallerCanManageRole(request.Role))
            return Forbid();

        var user = await userManager.FindByIdAsync(userId)
            ?? throw new KeyNotFoundException("User not found.");

        if (await userManager.IsInRoleAsync(user, request.Role))
            throw new InvalidOperationException($"User already has the '{request.Role}' role.");

        var result = await userManager.AddToRoleAsync(user, request.Role);
        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            throw new InvalidOperationException($"Failed to assign role: {errors}");
        }

        return NoContent();
    }

    // DELETE /api/v1/roles/users/{userId}/roles/{role}
    [HttpDelete("users/{userId}/roles/{role}")]
    [Authorize(Roles = "Agronomist,Farmer")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> RevokeRole(string userId, string role)
    {
        if (!CallerCanManageRole(role))
            return Forbid();

        var user = await userManager.FindByIdAsync(userId)
            ?? throw new KeyNotFoundException("User not found.");

        if (!await userManager.IsInRoleAsync(user, role))
            throw new InvalidOperationException($"User does not have the '{role}' role.");

        var result = await userManager.RemoveFromRoleAsync(user, role);
        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            throw new InvalidOperationException($"Failed to revoke role: {errors}");
        }

        return NoContent();
    }

    // Returns true when the JWT caller is permitted to manage the given role.
    // Agronomist → can manage Farmer and Scout.
    // Farmer      → can manage Scout only.
    private bool CallerCanManageRole(string role) =>
        User.IsInRole("Agronomist") && _agronomistManageable.Contains(role, StringComparer.OrdinalIgnoreCase) ||
        User.IsInRole("Farmer")     && _farmerManageable.Contains(role, StringComparer.OrdinalIgnoreCase);
}
