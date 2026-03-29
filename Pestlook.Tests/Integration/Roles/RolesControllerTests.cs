using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using Pestlook.Tests.Helpers;
using Pestlook.Tests.Integration.Infrastructure;
using Pestlook.WebAPI.Domain.Entities;
using Pestlook.WebAPI.DTOs.Auth;
using Pestlook.WebAPI.DTOs.Common;
using Pestlook.WebAPI.DTOs.Roles;

namespace Pestlook.Tests.Integration.Roles;

[Collection("Integration")]
public sealed class RolesControllerTests(TestWebApplicationFactory factory)
    : IAsyncLifetime
{
    private string _adminId = string.Empty;
    private string _scoutId = string.Empty;

    // ── Seed ──────────────────────────────────────────────────────────────────

    public async Task InitializeAsync()
    {
        using var scope = factory.Services.CreateScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();

        _adminId = await SeedUserAsync(userManager, "admin_roles@test.com", "Admin");
        _scoutId = await SeedUserAsync(userManager, "scout_roles@test.com", "Scout");
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private static async Task<string> SeedUserAsync(
        UserManager<ApplicationUser> userManager,
        string email,
        string role)
    {
        var existing = await userManager.FindByEmailAsync(email);
        if (existing is not null) return existing.Id;

        var user = new ApplicationUser
        {
            UserName  = email,
            Email     = email,
            FirstName = role,
            LastName  = "Test",
            TenantId  = TestWebApplicationFactory.DefaultTenantId
        };

        await userManager.CreateAsync(user, "P@ssw0rd1!");
        await userManager.AddToRoleAsync(user, role);
        return user.Id;
    }

    private static async Task<string> CreateFreshUserAsync(
        UserManager<ApplicationUser> userManager,
        string email)
    {
        var user = new ApplicationUser
        {
            UserName  = email,
            Email     = email,
            FirstName = "Fresh",
            LastName  = "User",
            TenantId  = TestWebApplicationFactory.DefaultTenantId
        };

        await userManager.CreateAsync(user, "P@ssw0rd1!");
        return user.Id;
    }

    private HttpClient ClientFor(string userId, string email, string role) =>
        factory.CreateTenantClient(jwtToken: JwtTestHelper.GenerateToken(
            userId, email, TestWebApplicationFactory.DefaultTenantId, roles: [role]));

    // ── GET /api/v1/roles ─────────────────────────────────────────────────────

    [Fact]
    public async Task GetRoles_Unauthenticated_ShouldReturn401()
    {
        var response = await factory.CreateTenantClient().GetAsync("/api/v1/roles");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetRoles_AsScout_ShouldReturn403()
    {
        var response = await ClientFor(_scoutId, "scout_roles@test.com", "Scout")
            .GetAsync("/api/v1/roles");
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task GetRoles_AsAdmin_ShouldReturn200WithAllRoles()
    {
        var response = await ClientFor(_adminId, "admin_roles@test.com", "Admin")
            .GetAsync("/api/v1/roles");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<ApiResponse<IList<string>>>();
        body!.Data.Should().Contain("Admin").And.Contain("Scout");
    }

    // ── GET /api/v1/roles/users ───────────────────────────────────────────────

    [Fact]
    public async Task GetUsers_AsAdmin_ShouldReturn200WithUsers()
    {
        var response = await ClientFor(_adminId, "admin_roles@test.com", "Admin")
            .GetAsync("/api/v1/roles/users");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<ApiResponse<IList<UserInfoResponse>>>();
        body!.Data.Should().NotBeEmpty();
    }

    [Fact]
    public async Task GetUsers_AsScout_ShouldReturn403()
    {
        var response = await ClientFor(_scoutId, "scout_roles@test.com", "Scout")
            .GetAsync("/api/v1/roles/users");
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    // ── GET /api/v1/roles/users/{userId} ──────────────────────────────────────

    [Fact]
    public async Task GetUser_AsAdmin_ShouldReturn200()
    {
        var response = await ClientFor(_adminId, "admin_roles@test.com", "Admin")
            .GetAsync($"/api/v1/roles/users/{_scoutId}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<ApiResponse<UserInfoResponse>>();
        body!.Data!.Email.Should().Be("scout_roles@test.com");
    }

    [Fact]
    public async Task GetUser_WhenNotFound_ShouldReturn404()
    {
        var response = await ClientFor(_adminId, "admin_roles@test.com", "Admin")
            .GetAsync("/api/v1/roles/users/nonexistent-id");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ── POST /api/v1/roles/users/{userId}/assign — happy paths ───────────────

    [Fact]
    public async Task AssignRole_AsAdmin_CanAssignAdmin_ShouldReturn204()
    {
        using var scope = factory.Services.CreateScope();
        var um       = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var targetId = await CreateFreshUserAsync(um, $"target_aa_{Guid.NewGuid():N}@test.com");

        var response = await ClientFor(_adminId, "admin_roles@test.com", "Admin")
            .PostAsJsonAsync($"/api/v1/roles/users/{targetId}/assign", new AssignRoleRequest("Admin"));

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task AssignRole_AsAdmin_CanAssignScout_ShouldReturn204()
    {
        using var scope = factory.Services.CreateScope();
        var um       = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var targetId = await CreateFreshUserAsync(um, $"target_as_{Guid.NewGuid():N}@test.com");

        var response = await ClientFor(_adminId, "admin_roles@test.com", "Admin")
            .PostAsJsonAsync($"/api/v1/roles/users/{targetId}/assign", new AssignRoleRequest("Scout"));

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    // ── POST /api/v1/roles/users/{userId}/assign — forbidden paths ────────────

    [Fact]
    public async Task AssignRole_AsScout_ShouldReturn403()
    {
        var response = await ClientFor(_scoutId, "scout_roles@test.com", "Scout")
            .PostAsJsonAsync($"/api/v1/roles/users/{_adminId}/assign", new AssignRoleRequest("Scout"));
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task AssignRole_AsAdmin_WithInvalidRole_ShouldReturn400()
    {
        using var scope = factory.Services.CreateScope();
        var um       = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var targetId = await CreateFreshUserAsync(um, $"target_ir_{Guid.NewGuid():N}@test.com");

        var response = await ClientFor(_adminId, "admin_roles@test.com", "Admin")
            .PostAsJsonAsync($"/api/v1/roles/users/{targetId}/assign", new AssignRoleRequest("SuperAdmin"));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // ── POST /api/v1/roles/users/{userId}/assign — error cases ───────────────

    [Fact]
    public async Task AssignRole_WhenUserAlreadyHasRole_ShouldReturn400()
    {
        var response = await ClientFor(_adminId, "admin_roles@test.com", "Admin")
            .PostAsJsonAsync($"/api/v1/roles/users/{_scoutId}/assign", new AssignRoleRequest("Scout"));
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task AssignRole_WhenUserNotFound_ShouldReturn404()
    {
        var response = await ClientFor(_adminId, "admin_roles@test.com", "Admin")
            .PostAsJsonAsync("/api/v1/roles/users/nonexistent-id/assign", new AssignRoleRequest("Scout"));
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ── DELETE /api/v1/roles/users/{userId}/roles/{role} — happy paths ────────

    [Fact]
    public async Task RevokeRole_AsAdmin_CanRevokeScout_ShouldReturn204()
    {
        using var scope = factory.Services.CreateScope();
        var um       = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var email    = $"revoke_scout_{Guid.NewGuid():N}@test.com";
        var targetId = await SeedUserAsync(um, email, "Scout");

        var response = await ClientFor(_adminId, "admin_roles@test.com", "Admin")
            .DeleteAsync($"/api/v1/roles/users/{targetId}/roles/Scout");

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task RevokeRole_AsAdmin_CanRevokeAdmin_ShouldReturn204()
    {
        using var scope = factory.Services.CreateScope();
        var um       = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var email    = $"revoke_admin_{Guid.NewGuid():N}@test.com";
        var targetId = await SeedUserAsync(um, email, "Admin");

        var response = await ClientFor(_adminId, "admin_roles@test.com", "Admin")
            .DeleteAsync($"/api/v1/roles/users/{targetId}/roles/Admin");

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    // ── DELETE /api/v1/roles/users/{userId}/roles/{role} — forbidden paths ────

    [Fact]
    public async Task RevokeRole_AsScout_ShouldReturn403()
    {
        var response = await ClientFor(_scoutId, "scout_roles@test.com", "Scout")
            .DeleteAsync($"/api/v1/roles/users/{_adminId}/roles/Admin");
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    // ── DELETE /api/v1/roles/users/{userId}/roles/{role} — error cases ────────

    [Fact]
    public async Task RevokeRole_WhenUserDoesNotHaveRole_ShouldReturn400()
    {
        var response = await ClientFor(_adminId, "admin_roles@test.com", "Admin")
            .DeleteAsync($"/api/v1/roles/users/{_scoutId}/roles/Admin");
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // ── PUT /api/v1/roles/users/{userId} ──────────────────────────────────────

    [Fact]
    public async Task UpdateUser_AsAdmin_WithValidData_ShouldReturn200WithUpdatedUser()
    {
        using var scope = factory.Services.CreateScope();
        var um       = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var targetId = await CreateFreshUserAsync(um, $"edit_valid_{Guid.NewGuid():N}@test.com");
        await um.AddToRoleAsync(await um.FindByIdAsync(targetId)!, "Scout");

        var request = new UpdateUserRequest("Updated", "Name", IsActive: false, Role: "Admin");
        var response = await ClientFor(_adminId, "admin_roles@test.com", "Admin")
            .PutAsJsonAsync($"/api/v1/roles/users/{targetId}", request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<ApiResponse<UserInfoResponse>>();
        body!.Data!.FirstName.Should().Be("Updated");
        body.Data.LastName.Should().Be("Name");
        body.Data.IsActive.Should().BeFalse();
        body.Data.Roles.Should().Contain("Admin");
    }

    [Fact]
    public async Task UpdateUser_AsAdmin_ShouldSwapRole()
    {
        using var scope = factory.Services.CreateScope();
        var um       = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var targetId = await CreateFreshUserAsync(um, $"edit_role_{Guid.NewGuid():N}@test.com");
        var user     = await um.FindByIdAsync(targetId)!;
        await um.AddToRoleAsync(user!, "Scout");

        var response = await ClientFor(_adminId, "admin_roles@test.com", "Admin")
            .PutAsJsonAsync($"/api/v1/roles/users/{targetId}",
                new UpdateUserRequest("Fresh", "User", IsActive: true, Role: "Admin"));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<ApiResponse<UserInfoResponse>>();
        body!.Data!.Roles.Should().Contain("Admin").And.NotContain("Scout");
    }

    [Fact]
    public async Task UpdateUser_AsAdmin_WithInvalidRole_ShouldReturn400()
    {
        using var scope = factory.Services.CreateScope();
        var um       = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var targetId = await CreateFreshUserAsync(um, $"edit_badrole_{Guid.NewGuid():N}@test.com");

        var response = await ClientFor(_adminId, "admin_roles@test.com", "Admin")
            .PutAsJsonAsync($"/api/v1/roles/users/{targetId}",
                new UpdateUserRequest("Fresh", "User", IsActive: true, Role: "Manager"));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task UpdateUser_WhenUserNotFound_ShouldReturn404()
    {
        var response = await ClientFor(_adminId, "admin_roles@test.com", "Admin")
            .PutAsJsonAsync("/api/v1/roles/users/nonexistent-id",
                new UpdateUserRequest("First", "Last", IsActive: true, Role: "Scout"));

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task UpdateUser_AsScout_ShouldReturn403()
    {
        var response = await ClientFor(_scoutId, "scout_roles@test.com", "Scout")
            .PutAsJsonAsync($"/api/v1/roles/users/{_adminId}",
                new UpdateUserRequest("First", "Last", IsActive: true, Role: "Scout"));

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }
}
