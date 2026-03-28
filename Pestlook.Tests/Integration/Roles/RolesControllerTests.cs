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
    // Seeded users reused across tests
    private string _superAdminId = string.Empty;
    private string _adminId     = string.Empty;
    private string _userId      = string.Empty;

    // ── Seed ──────────────────────────────────────────────────────────────────

    public async Task InitializeAsync()
    {
        using var scope = factory.Services.CreateScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();

        _superAdminId = await SeedUserAsync(userManager, "superadmin_roles@test.com", "SuperAdmin");
        _adminId      = await SeedUserAsync(userManager, "admin_roles@test.com",      "Admin");
        _userId       = await SeedUserAsync(userManager, "user_roles@test.com",       "User");
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

    private HttpClient ClientFor(string userId, string email, string role) =>
        factory.CreateTenantClient(jwtToken: JwtTestHelper.GenerateToken(
            userId, email, TestWebApplicationFactory.DefaultTenantId, roles: [role]));

    // ── GET /api/v1/roles ─────────────────────────────────────────────────────

    [Fact]
    public async Task GetRoles_Unauthenticated_ShouldReturn401()
    {
        var client   = factory.CreateTenantClient();
        var response = await client.GetAsync("/api/v1/roles");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetRoles_AsUser_ShouldReturn403()
    {
        var client   = ClientFor(_userId, "user_roles@test.com", "User");
        var response = await client.GetAsync("/api/v1/roles");
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task GetRoles_AsAdmin_ShouldReturn200WithRoles()
    {
        var client   = ClientFor(_adminId, "admin_roles@test.com", "Admin");
        var response = await client.GetAsync("/api/v1/roles");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<ApiResponse<IList<string>>>();
        body!.Data.Should().Contain("User").And.Contain("Admin").And.Contain("SuperAdmin");
    }

    // ── GET /api/v1/roles/users ───────────────────────────────────────────────

    [Fact]
    public async Task GetUsers_AsAdmin_ShouldReturn200WithUsers()
    {
        var client   = ClientFor(_adminId, "admin_roles@test.com", "Admin");
        var response = await client.GetAsync("/api/v1/roles/users");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<ApiResponse<IList<UserInfoResponse>>>();
        body!.Data.Should().NotBeEmpty();
    }

    [Fact]
    public async Task GetUsers_AsUser_ShouldReturn403()
    {
        var client   = ClientFor(_userId, "user_roles@test.com", "User");
        var response = await client.GetAsync("/api/v1/roles/users");
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    // ── GET /api/v1/roles/users/{userId} ──────────────────────────────────────

    [Fact]
    public async Task GetUser_AsAdmin_ShouldReturn200()
    {
        var client   = ClientFor(_adminId, "admin_roles@test.com", "Admin");
        var response = await client.GetAsync($"/api/v1/roles/users/{_userId}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<ApiResponse<UserInfoResponse>>();
        body!.Data!.Email.Should().Be("user_roles@test.com");
    }

    [Fact]
    public async Task GetUser_WhenNotFound_ShouldReturn404()
    {
        var client   = ClientFor(_adminId, "admin_roles@test.com", "Admin");
        var response = await client.GetAsync("/api/v1/roles/users/nonexistent-id");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ── POST /api/v1/roles/users/{userId}/assign ──────────────────────────────

    [Fact]
    public async Task AssignRole_AsSuperAdmin_ShouldReturn204()
    {
        var targetEmail = $"assign_target_{Guid.NewGuid():N}@test.com";
        var targetId    = await SeedUserAsync(
            factory.Services.CreateScope().ServiceProvider
                .GetRequiredService<UserManager<ApplicationUser>>(),
            targetEmail, "User");

        var client   = ClientFor(_superAdminId, "superadmin_roles@test.com", "SuperAdmin");
        var response = await client.PostAsJsonAsync(
            $"/api/v1/roles/users/{targetId}/assign",
            new AssignRoleRequest("Admin"));

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task AssignRole_AsAdmin_ShouldReturn403()
    {
        var client   = ClientFor(_adminId, "admin_roles@test.com", "Admin");
        var response = await client.PostAsJsonAsync(
            $"/api/v1/roles/users/{_userId}/assign",
            new AssignRoleRequest("Admin"));

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task AssignRole_WhenUserAlreadyHasRole_ShouldReturn400()
    {
        var client   = ClientFor(_superAdminId, "superadmin_roles@test.com", "SuperAdmin");
        var response = await client.PostAsJsonAsync(
            $"/api/v1/roles/users/{_userId}/assign",
            new AssignRoleRequest("User"));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task AssignRole_WhenUserNotFound_ShouldReturn404()
    {
        var client   = ClientFor(_superAdminId, "superadmin_roles@test.com", "SuperAdmin");
        var response = await client.PostAsJsonAsync(
            "/api/v1/roles/users/nonexistent-id/assign",
            new AssignRoleRequest("Admin"));

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ── DELETE /api/v1/roles/users/{userId}/roles/{role} ─────────────────────

    [Fact]
    public async Task RevokeRole_AsSuperAdmin_ShouldReturn204()
    {
        // Seed a disposable user with Admin role then revoke it
        var scope       = factory.Services.CreateScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var email       = $"revoke_target_{Guid.NewGuid():N}@test.com";
        var targetId    = await SeedUserAsync(userManager, email, "Admin");

        var client   = ClientFor(_superAdminId, "superadmin_roles@test.com", "SuperAdmin");
        var response = await client.DeleteAsync($"/api/v1/roles/users/{targetId}/roles/Admin");

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task RevokeRole_WhenUserDoesNotHaveRole_ShouldReturn400()
    {
        var client   = ClientFor(_superAdminId, "superadmin_roles@test.com", "SuperAdmin");
        var response = await client.DeleteAsync($"/api/v1/roles/users/{_userId}/roles/SuperAdmin");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
