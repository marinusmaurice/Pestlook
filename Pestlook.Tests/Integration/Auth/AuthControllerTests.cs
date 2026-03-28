using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Pestlook.Tests.Helpers;
using Pestlook.Tests.Integration.Infrastructure;
using Pestlook.WebAPI.DTOs.Auth;
using Pestlook.WebAPI.DTOs.Common;

namespace Pestlook.Tests.Integration.Auth;

public sealed class AuthControllerTests(TestWebApplicationFactory factory)
    : IClassFixture<TestWebApplicationFactory>
{
    private readonly HttpClient _client = factory.CreateTenantClient();

    // ── POST /api/v1/auth/register ────────────────────────────────────────────

    [Fact]
    public async Task Register_WhenValid_ShouldReturn200WithAccessAndRefreshTokens()
    {
        var request = new RegisterRequest(
            Email: $"new_{Guid.NewGuid():N}@test.com",
            Password: "P@ssw0rd1!",
            FirstName: "John",
            LastName: "Doe");

        var response = await _client.PostAsJsonAsync("/api/v1/auth/register", request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<ApiResponse<TokenResponse>>();
        body!.Success.Should().BeTrue();
        body.Data.Should().NotBeNull();
        body.Data!.AccessToken.Should().NotBeNullOrEmpty();
        body.Data.RefreshToken.Should().NotBeNullOrEmpty();
        body.Data.AccessTokenExpiry.Should().BeAfter(DateTime.UtcNow);
        body.Data.RefreshTokenExpiry.Should().BeAfter(DateTime.UtcNow);
    }

    [Theory]
    [InlineData("not-an-email", "P@ssw0rd1!", "John", "Doe")]
    [InlineData("", "P@ssw0rd1!", "John", "Doe")]
    [InlineData("valid@test.com", "weak", "John", "Doe")]
    [InlineData("valid@test.com", "P@ssw0rd1!", "", "Doe")]
    [InlineData("valid@test.com", "P@ssw0rd1!", "John", "")]
    public async Task Register_WhenRequestIsInvalid_ShouldReturn400(
        string email, string password, string firstName, string lastName)
    {
        var request = new RegisterRequest(email, password, firstName, lastName);

        var response = await _client.PostAsJsonAsync("/api/v1/auth/register", request);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Register_WhenEmailAlreadyExists_ShouldReturn400()
    {
        var email = $"dup_{Guid.NewGuid():N}@test.com";
        var request = new RegisterRequest(email, "P@ssw0rd1!", "John", "Doe");

        await _client.PostAsJsonAsync("/api/v1/auth/register", request);
        var response = await _client.PostAsJsonAsync("/api/v1/auth/register", request);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // ── POST /api/v1/auth/login ───────────────────────────────────────────────

    [Fact]
    public async Task Login_AfterRegister_ShouldReturn200WithTokens()
    {
        var email = $"login_{Guid.NewGuid():N}@test.com";
        var password = "P@ssw0rd1!";
        await _client.PostAsJsonAsync("/api/v1/auth/register",
            new RegisterRequest(email, password, "Login", "User"));

        var response = await _client.PostAsJsonAsync("/api/v1/auth/login",
            new LoginRequest(email, password));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<ApiResponse<TokenResponse>>();
        body!.Success.Should().BeTrue();
        body.Data!.AccessToken.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task Login_WithWrongPassword_ShouldReturn401()
    {
        var email = $"wp_{Guid.NewGuid():N}@test.com";
        await _client.PostAsJsonAsync("/api/v1/auth/register",
            new RegisterRequest(email, "P@ssw0rd1!", "Test", "User"));

        var response = await _client.PostAsJsonAsync("/api/v1/auth/login",
            new LoginRequest(email, "WrongPass999!"));

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Login_WithUnknownEmail_ShouldReturn401()
    {
        var response = await _client.PostAsJsonAsync("/api/v1/auth/login",
            new LoginRequest("ghost@nowhere.com", "P@ssw0rd1!"));

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ── POST /api/v1/auth/refresh ─────────────────────────────────────────────

    [Fact]
    public async Task Refresh_WithValidTokens_ShouldReturn200WithNewTokens()
    {
        var email = $"refresh_{Guid.NewGuid():N}@test.com";
        var registerResp = await _client.PostAsJsonAsync("/api/v1/auth/register",
            new RegisterRequest(email, "P@ssw0rd1!", "Refresh", "User"));

        var tokens = (await registerResp.Content
            .ReadFromJsonAsync<ApiResponse<TokenResponse>>())!.Data!;

        var response = await _client.PostAsJsonAsync("/api/v1/auth/refresh",
            new RefreshTokenRequest(tokens.AccessToken, tokens.RefreshToken));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<ApiResponse<TokenResponse>>();
        body!.Data!.AccessToken.Should().NotBe(tokens.AccessToken);
        body.Data.RefreshToken.Should().NotBe(tokens.RefreshToken);
    }

    [Fact]
    public async Task Refresh_WithInvalidRefreshToken_ShouldReturn401()
    {
        var response = await _client.PostAsJsonAsync("/api/v1/auth/refresh",
            new RefreshTokenRequest("bad.access.token", "bad-refresh-token"));

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ── POST /api/v1/auth/revoke ──────────────────────────────────────────────

    [Fact]
    public async Task Revoke_WithUnknownToken_ShouldReturn400()
    {
        var response = await _client.PostAsJsonAsync("/api/v1/auth/revoke",
            "unknown-token-value");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // ── GET /api/v1/auth/me ───────────────────────────────────────────────────

    [Fact]
    public async Task Me_WithoutBearerToken_ShouldReturn401()
    {
        var response = await _client.GetAsync("/api/v1/auth/me");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Me_WithValidRegisteredUser_ShouldReturn200WithUserInfo()
    {
        var email = $"me_{Guid.NewGuid():N}@test.com";
        var registerResp = await _client.PostAsJsonAsync("/api/v1/auth/register",
            new RegisterRequest(email, "P@ssw0rd1!", "Me", "Test"));

        var tokens = (await registerResp.Content
            .ReadFromJsonAsync<ApiResponse<TokenResponse>>())!.Data!;

        var authedClient = factory.CreateTenantClient(jwtToken: tokens.AccessToken);
        var response = await authedClient.GetAsync("/api/v1/auth/me");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<ApiResponse<UserInfoResponse>>();
        body!.Data!.Email.Should().Be(email);
        body.Data.Roles.Should().Contain("User");
    }

    // ── No tenant header ──────────────────────────────────────────────────────

    [Fact]
    public async Task AnyEndpoint_WithoutTenantHeader_ShouldStillRoute()
    {
        var clientNoTenant = factory.CreateClient();
        var response = await clientNoTenant.PostAsJsonAsync("/api/v1/auth/login",
            new LoginRequest("x@y.com", "pass"));

        // No tenant header means TenantId is null in service,
        // which results in a 401 (user not found under null tenant)
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
