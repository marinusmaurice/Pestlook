using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Pestlook.Tests.Integration.Infrastructure;
using Pestlook.WebAPI.Data;
using Pestlook.WebAPI.Domain.Enums;
using Pestlook.WebAPI.DTOs.Auth;
using Pestlook.WebAPI.DTOs.Common;

namespace Pestlook.Tests.Integration.Auth;

[Collection("Integration")]
public sealed class SignUpControllerTests(TestWebApplicationFactory factory)
{
    // Produces a fully valid request; each call gets a fresh name + email.
    private static SignUpRequest Valid(
        SubscriptionPlan plan = SubscriptionPlan.Basic,
        string? tenantName = null,
        string? email = null) => new(
            TenantName:       tenantName ?? $"Acme Farms {Guid.NewGuid():N}",
            SubscriptionPlan: plan,
            Email:            email ?? $"owner_{Guid.NewGuid():N}@acme.com",
            Password:         "P@ssw0rd1!",
            FirstName:        "Jane",
            LastName:         "Farmer");

    // ── POST /api/v1/auth/sign-up — happy path ────────────────────────────────

    [Fact]
    public async Task SignUp_WithValidRequest_ShouldReturn201WithActivationMessage()
    {
        var response = await factory.CreateClient().PostAsJsonAsync("/api/v1/auth/sign-up", Valid());

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await response.Content.ReadFromJsonAsync<ApiResponse<SignUpResponse>>();
        body!.Success.Should().BeTrue();
        body.Data.Should().NotBeNull();
        body.Data!.Email.Should().NotBeNullOrEmpty();
        body.Message.Should().Be("Account created! Please check your email to activate your account.");
    }

    [Fact]
    public async Task SignUp_DoesNotRequireAuthenticationOrTenantHeader()
    {
        // Bare client — no Bearer token, no X-Tenant-ID header
        var response = await factory.CreateClient().PostAsJsonAsync("/api/v1/auth/sign-up", Valid());

        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    // ── Role assignment ───────────────────────────────────────────────────────

    [Fact]
    public async Task SignUp_SignedUpUserShouldHaveAdminRole()
    {
        var response = await SignUpAsync();

        using var scope = factory.Services.CreateScope();
        var userManager = scope.ServiceProvider.GetRequiredService<Microsoft.AspNetCore.Identity.UserManager<Pestlook.WebAPI.Domain.Entities.ApplicationUser>>();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var user = await db.Users.IgnoreQueryFilters().SingleAsync(u => u.Email == response.Email);
        var roles = await userManager.GetRolesAsync(user);

        roles.Should().ContainSingle().Which.Should().Be("Admin");
    }

    [Fact]
    public async Task SignUp_SignedUpUserShouldNotHaveScoutRole()
    {
        var response = await SignUpAsync();

        using var scope = factory.Services.CreateScope();
        var userManager = scope.ServiceProvider.GetRequiredService<Microsoft.AspNetCore.Identity.UserManager<Pestlook.WebAPI.Domain.Entities.ApplicationUser>>();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var user = await db.Users.IgnoreQueryFilters().SingleAsync(u => u.Email == response.Email);
        var roles = await userManager.GetRolesAsync(user);

        roles.Should().NotContain("Scout");
    }

    // ── Subscription plan → MonitoringPointQuota ──────────────────────────────

    [Theory]
    [InlineData(SubscriptionPlan.Basic,        10)]
    [InlineData(SubscriptionPlan.Professional, 50)]
    [InlineData(SubscriptionPlan.Enterprise,  200)]
    public async Task SignUp_EachPlan_SetsCorrectMonitoringPointQuota(
        SubscriptionPlan plan, int expectedQuota)
    {
        var tenantName = $"Plan Farms {Guid.NewGuid():N}";
        await factory.CreateClient().PostAsJsonAsync("/api/v1/auth/sign-up", Valid(plan: plan, tenantName: tenantName));

        using var scope = factory.Services.CreateScope();
        var db     = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var tenant = await db.Tenants.SingleAsync(t => t.Name == tenantName);

        tenant.MonitoringPointQuota.Should().Be(expectedQuota);
        tenant.SubscriptionPlan.Should().Be(plan);
    }

    [Theory]
    [InlineData(SubscriptionPlan.Basic)]
    [InlineData(SubscriptionPlan.Professional)]
    [InlineData(SubscriptionPlan.Enterprise)]
    public async Task SignUp_AllDefinedPlans_ShouldReturn201(SubscriptionPlan plan)
    {
        var response = await factory.CreateClient().PostAsJsonAsync("/api/v1/auth/sign-up", Valid(plan: plan));

        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task SignUp_WithOutOfRangeSubscriptionPlan_ShouldReturn400()
    {
        var request = Valid() with { SubscriptionPlan = (SubscriptionPlan)999 };

        var response = await factory.CreateClient().PostAsJsonAsync("/api/v1/auth/sign-up", request);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // ── Conflict cases ────────────────────────────────────────────────────────

    [Fact]
    public async Task SignUp_WithDuplicateEmail_ShouldReturn409()
    {
        var email  = $"dup-email-{Guid.NewGuid():N}@test.com";
        var first  = Valid(email: email);
        var second = Valid(email: email); // different slug, same email

        await factory.CreateClient().PostAsJsonAsync("/api/v1/auth/sign-up", first);
        var response = await factory.CreateClient().PostAsJsonAsync("/api/v1/auth/sign-up", second);

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    // ── FluentValidation failures ─────────────────────────────────────────────

    [Theory]
    [InlineData("", "owner@test.com", "P@ssw0rd1!", "Jane", "Farmer")]
    [InlineData("Acme", "", "P@ssw0rd1!", "Jane", "Farmer")]
    [InlineData("Acme", "not-an-email", "P@ssw0rd1!", "Jane", "Farmer")]
    [InlineData("Acme", "Short1!", "Short1!", "Jane", "Farmer")]
    [InlineData("Acme", "owner@test.com", "nouppercase1!", "Jane", "Farmer")]
    [InlineData("Acme", "owner@test.com", "NOLOWERCASE1!", "Jane", "Farmer")]
    [InlineData("Acme", "owner@test.com", "NoDigitHere!", "Jane", "Farmer")]
    [InlineData("Acme", "owner@test.com", "NoSpecial123", "Jane", "Farmer")]
    [InlineData("Acme", "owner@test.com", "P@ssw0rd1!", "", "Farmer")]
    [InlineData("Acme", "owner@test.com", "P@ssw0rd1!", "Jane", "")]
    public async Task SignUp_WhenRequestIsInvalid_ShouldReturn400(
        string tenantName, string email, string password,
        string firstName,  string lastName)
    {
        var request = new SignUpRequest(
            tenantName, SubscriptionPlan.Basic, email, password, firstName, lastName);

        var response = await factory.CreateClient().PostAsJsonAsync("/api/v1/auth/sign-up", request);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // ── Tenant state ──────────────────────────────────────────────────────────

    [Fact]
    public async Task SignUp_CreatedTenantShouldBeActive()
    {
        var tenantName = $"Active Check Farms {Guid.NewGuid():N}";
        await factory.CreateClient().PostAsJsonAsync("/api/v1/auth/sign-up", Valid(tenantName: tenantName));

        using var scope = factory.Services.CreateScope();
        var db     = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var tenant = await db.Tenants.SingleAsync(t => t.Name == tenantName);

        tenant.IsActive.Should().BeTrue();
    }

    [Fact]
    public async Task SignUp_CreatedTenantShouldHaveCorrectName()
    {
        var tenantName = $"Green Leaf Farms {Guid.NewGuid():N}";
        var request = Valid(tenantName: tenantName);
        await factory.CreateClient().PostAsJsonAsync("/api/v1/auth/sign-up", request);

        using var scope = factory.Services.CreateScope();
        var db     = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var tenant = await db.Tenants.SingleAsync(t => t.Name == tenantName);

        tenant.Name.Should().Be(tenantName);

    }

    // ── Post sign-up flows ────────────────────────────────────────────────────

    [Fact]
    public async Task SignUp_UserCannotLogInBeforeActivation()
    {
        var email = $"login-after-{Guid.NewGuid():N}@test.com";
        var password = "P@ssw0rd1!";
        await factory.CreateClient().PostAsJsonAsync("/api/v1/auth/sign-up",
            Valid(email: email) with { Password = password });

        var loginResp = await factory.CreateClient()
            .PostAsJsonAsync("/api/v1/auth/login", new LoginRequest(email, password));

        loginResp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task SignUp_ReturnsActivationResponseWithCreatedEmail()
    {
        var response = await SignUpAsync();

        response.Email.Should().NotBeNullOrEmpty();
        response.Message.Should().Be("Account created! Please check your email to activate your account.");
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task<SignUpResponse> SignUpAsync(SignUpRequest? request = null)
    {
        var resp = await factory.CreateClient()
            .PostAsJsonAsync("/api/v1/auth/sign-up", request ?? Valid());
        resp.StatusCode.Should().Be(HttpStatusCode.Created);
        return (await resp.Content.ReadFromJsonAsync<ApiResponse<SignUpResponse>>())!.Data!;
    }
}
