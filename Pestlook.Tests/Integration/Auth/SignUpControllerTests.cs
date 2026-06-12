using System.Net;
using System.Net.Http.Headers;
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
    // Produces a fully valid request; each call gets a fresh tenant name + email.
    private static SignUpRequest Valid(
        SubscriptionPlan plan = SubscriptionPlan.Free,
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
    public async Task SignUp_WithValidRequest_ShouldReturn201WithTokens()
    {
        var response = await factory.CreateClient().PostAsJsonAsync("/api/v1/auth/sign-up", Valid());

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await response.Content.ReadFromJsonAsync<ApiResponse<TokenResponse>>();
        body!.Success.Should().BeTrue();
        body.Data.Should().NotBeNull();
        body.Data!.AccessToken.Should().NotBeNullOrEmpty();
        body.Data.RefreshToken.Should().NotBeNullOrEmpty();
        body.Data.AccessTokenExpiry.Should().BeAfter(DateTime.UtcNow);
        body.Data.RefreshTokenExpiry.Should().BeAfter(DateTime.UtcNow);
        body.Message.Should().Be("Account created successfully.");
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
        var tokens = await SignUpAndGetTokensAsync();

        var me = await GetMeAsync(tokens.AccessToken);
        me.Roles.Should().ContainSingle().Which.Should().Be("Admin");
    }

    [Fact]
    public async Task SignUp_SignedUpUserShouldNotHaveScoutRole()
    {
        var tokens = await SignUpAndGetTokensAsync();

        var me = await GetMeAsync(tokens.AccessToken);
        me.Roles.Should().NotContain("Scout");
    }

    // ── Subscription plan → MonitoringPointQuota ──────────────────────────────

    [Theory]
    [InlineData(SubscriptionPlan.Free, 10000)]
    // Paid plans disabled:
    // [InlineData(SubscriptionPlan.Basic,        10)]
    // [InlineData(SubscriptionPlan.Professional, 50)]
    // [InlineData(SubscriptionPlan.Enterprise,  200)]
    public async Task SignUp_EachPlan_SetsCorrectMonitoringPointQuota(
        SubscriptionPlan plan, int expectedQuota)
    {
        // Slug is server-generated from TenantName; a slug-form name maps to itself
        var slug = $"plan-{Guid.NewGuid():N}";
        await factory.CreateClient().PostAsJsonAsync("/api/v1/auth/sign-up", Valid(plan: plan, tenantName: slug));

        using var scope = factory.Services.CreateScope();
        var db     = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var tenant = await db.Tenants.SingleAsync(t => t.Slug == slug);

        tenant.MonitoringPointQuota.Should().Be(expectedQuota);
        tenant.SubscriptionPlan.Should().Be(plan);
    }

    [Theory]
    [InlineData(SubscriptionPlan.Free)]
    // Paid plans disabled:
    // [InlineData(SubscriptionPlan.Basic)]
    // [InlineData(SubscriptionPlan.Professional)]
    // [InlineData(SubscriptionPlan.Enterprise)]
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
    public async Task SignUp_WithDuplicateTenantName_ShouldAutoSuffixSlug()
    {
        // Slugs are server-generated; a name collision yields "<slug>-2", not a 409
        var name   = $"dup-slug-{Guid.NewGuid():N}";
        var first  = Valid(tenantName: name);
        var second = Valid(tenantName: name); // different email, same tenant name

        await factory.CreateClient().PostAsJsonAsync("/api/v1/auth/sign-up", first);
        var response = await factory.CreateClient().PostAsJsonAsync("/api/v1/auth/sign-up", second);

        response.StatusCode.Should().Be(HttpStatusCode.Created);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        (await db.Tenants.SingleOrDefaultAsync(t => t.Slug == $"{name}-2")).Should().NotBeNull();
    }

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
    // Tenant name
    [InlineData("",      "owner@test.com", "P@ssw0rd1!", "Jane", "Farmer")] // empty name
    // Email
    [InlineData("Acme",  "",               "P@ssw0rd1!", "Jane", "Farmer")] // empty email
    [InlineData("Acme",  "not-an-email",   "P@ssw0rd1!", "Jane", "Farmer")] // not an email
    // Password rules
    [InlineData("Acme",  "owner@test.com", "Short1!",    "Jane", "Farmer")] // < 8 chars
    [InlineData("Acme",  "owner@test.com", "nouppercase1!","Jane","Farmer")]// no uppercase
    [InlineData("Acme",  "owner@test.com", "NOLOWERCASE1!","Jane","Farmer")]// no lowercase
    [InlineData("Acme",  "owner@test.com", "NoDigitHere!", "Jane","Farmer")]// no digit
    [InlineData("Acme",  "owner@test.com", "NoSpecial123", "Jane","Farmer")]// no special char
    // Name fields
    [InlineData("Acme",  "owner@test.com", "P@ssw0rd1!", "",     "Farmer")] // empty first name
    [InlineData("Acme",  "owner@test.com", "P@ssw0rd1!", "Jane", "")]       // empty last name
    public async Task SignUp_WhenRequestIsInvalid_ShouldReturn400(
        string tenantName, string email, string password,
        string firstName,  string lastName)
    {
        var request = new SignUpRequest(
            tenantName, SubscriptionPlan.Free, email, password, firstName, lastName);

        var response = await factory.CreateClient().PostAsJsonAsync("/api/v1/auth/sign-up", request);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // ── Tenant state ──────────────────────────────────────────────────────────

    [Fact]
    public async Task SignUp_CreatedTenantShouldBeActive()
    {
        var slug = $"active-check-{Guid.NewGuid():N}";
        await factory.CreateClient().PostAsJsonAsync("/api/v1/auth/sign-up", Valid(tenantName: slug));

        using var scope = factory.Services.CreateScope();
        var db     = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var tenant = await db.Tenants.SingleAsync(t => t.Slug == slug);

        tenant.IsActive.Should().BeTrue();
    }

    [Fact]
    public async Task SignUp_CreatedTenantShouldHaveCorrectName()
    {
        var name = $"name-check-{Guid.NewGuid():N}";
        await factory.CreateClient().PostAsJsonAsync("/api/v1/auth/sign-up", Valid(tenantName: name));

        using var scope = factory.Services.CreateScope();
        var db     = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var tenant = await db.Tenants.SingleAsync(t => t.Slug == name);

        tenant.Name.Should().Be(name);
    }

    // ── Post sign-up flows ────────────────────────────────────────────────────

    [Fact]
    public async Task SignUp_UserCanLogInWithCredentialsAfterwards()
    {
        var email    = $"login-after-{Guid.NewGuid():N}@test.com";
        var password = "P@ssw0rd1!";
        await factory.CreateClient().PostAsJsonAsync("/api/v1/auth/sign-up",
            Valid(email: email) with { Password = password });

        // No tenant header — the new tenant is not "test-tenant"
        var loginResp = await factory.CreateClient()
            .PostAsJsonAsync("/api/v1/auth/login", new LoginRequest(email, password));

        loginResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = (await loginResp.Content.ReadFromJsonAsync<ApiResponse<TokenResponse>>())!;
        body.Data!.AccessToken.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task SignUp_ReturnedTokensAreImmediatelyUsable()
    {
        var tokens = await SignUpAndGetTokensAsync();

        var me = await GetMeAsync(tokens.AccessToken);
        me.Should().NotBeNull();
        me.Email.Should().NotBeNullOrEmpty();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task<TokenResponse> SignUpAndGetTokensAsync(SignUpRequest? request = null)
    {
        var resp = await factory.CreateClient()
            .PostAsJsonAsync("/api/v1/auth/sign-up", request ?? Valid());
        return (await resp.Content.ReadFromJsonAsync<ApiResponse<TokenResponse>>())!.Data!;
    }

    private async Task<UserInfoResponse> GetMeAsync(string accessToken)
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", accessToken);
        var resp = await client.GetAsync("/api/v1/auth/me");
        return (await resp.Content.ReadFromJsonAsync<ApiResponse<UserInfoResponse>>())!.Data!;
    }
}
