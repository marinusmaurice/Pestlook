using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Pestlook.Tests.Integration.Infrastructure;
using Pestlook.WebAPI.DTOs.Common;
using Pestlook.WebAPI.DTOs.ScoutingSessions;

namespace Pestlook.Tests.Integration.ScoutingSessions;

[Collection("Integration")]
public sealed class ScoutingSessionsControllerTests(TestWebApplicationFactory factory) : IAsyncLifetime
{
    private readonly HttpClient _admin = factory.CreateAdminClient();
    private readonly HttpClient _anon  = factory.CreateTenantClient();
    private Guid _sessionId;

    public async Task InitializeAsync()
    {
        _sessionId = await StartSessionAsync("Sunny", "Seeded session notes");
    }

    public Task DisposeAsync() => Task.CompletedTask;

    // ── Auth ─────────────────────────────────────────────────────────────────

    [Theory]
    [InlineData("GET",    "/api/v1/scouting-sessions")]
    [InlineData("POST",   "/api/v1/scouting-sessions")]
    [InlineData("DELETE", "/api/v1/scouting-sessions/00000000-0000-0000-0000-000000000001")]
    [InlineData("PATCH",  "/api/v1/scouting-sessions/00000000-0000-0000-0000-000000000001/complete")]
    public async Task Endpoint_Unauthenticated_ShouldReturn401(string method, string url)
    {
        var req = new HttpRequestMessage(new HttpMethod(method), url);
        if (method is "POST")
            req.Content = JsonContent.Create(new StartScoutingSessionRequest(null, null));
        if (method is "PATCH")
            req.Content = JsonContent.Create(new CompleteScoutingSessionRequest(null, null));
        var resp = await _anon.SendAsync(req);
        resp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ── GET all ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAll_ShouldReturn200WithList()
    {
        var resp = await _admin.GetAsync("/api/v1/scouting-sessions");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await resp.Content.ReadFromJsonAsync<ApiResponse<List<ScoutingSessionResponse>>>();
        body!.Success.Should().BeTrue();
        body.Data.Should().NotBeNull();
    }

    [Fact]
    public async Task GetAll_ShouldContainSeededSession()
    {
        var sessions = await GetAllAsync();
        sessions.Should().Contain(s => s.Id == _sessionId);
    }

    [Fact]
    public async Task GetAll_ShouldBeOrderedDescendingByStartedAt()
    {
        await StartSessionAsync(null, null);
        await StartSessionAsync(null, null);
        var sessions = await GetAllAsync();
        sessions.Select(s => s.StartedAt).Should().BeInDescendingOrder();
    }

    // ── GET by ID ────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetById_WhenExists_ShouldReturn200WithCorrectData()
    {
        var resp = await _admin.GetAsync($"/api/v1/scouting-sessions/{_sessionId}");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await resp.Content.ReadFromJsonAsync<ApiResponse<ScoutingSessionResponse>>();
        body!.Data!.Id.Should().Be(_sessionId);
        body.Data.WeatherConditions.Should().Be("Sunny");
        body.Data.Notes.Should().Be("Seeded session notes");
        body.Data.TenantId.Should().Be(TestWebApplicationFactory.DefaultTenantId);
        body.Data.CompletedAt.Should().BeNull();
        body.Data.ScouterId.Should().Be(TestWebApplicationFactory.DefaultAdminId);
    }

    [Fact]
    public async Task GetById_WhenNotFound_ShouldReturn404()
    {
        var resp = await _admin.GetAsync($"/api/v1/scouting-sessions/{Guid.NewGuid()}");
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ── POST ─────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Start_WithAllFields_ShouldReturn201WithData()
    {
        var resp = await _admin.PostAsJsonAsync("/api/v1/scouting-sessions",
            new StartScoutingSessionRequest("Overcast, 18°C", "Morning round"));
        resp.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await resp.Content.ReadFromJsonAsync<ApiResponse<ScoutingSessionResponse>>();
        body!.Data!.WeatherConditions.Should().Be("Overcast, 18°C");
        body.Data.Notes.Should().Be("Morning round");
        body.Data.CompletedAt.Should().BeNull();
        body.Data.Id.Should().NotBeEmpty();
    }

    [Fact]
    public async Task Start_WithNoFields_ShouldReturn201()
    {
        var resp = await _admin.PostAsJsonAsync("/api/v1/scouting-sessions",
            new StartScoutingSessionRequest(null, null));
        resp.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task Start_ShouldSetScouterIdToCurrentUser()
    {
        var resp = await _admin.PostAsJsonAsync("/api/v1/scouting-sessions",
            new StartScoutingSessionRequest(null, null));
        var body = await resp.Content.ReadFromJsonAsync<ApiResponse<ScoutingSessionResponse>>();
        body!.Data!.ScouterId.Should().Be(TestWebApplicationFactory.DefaultAdminId);
    }

    [Fact]
    public async Task Start_NewSession_ObservationCountShouldBeZero()
    {
        var id = await StartSessionAsync(null, null);
        var resp = await _admin.GetAsync($"/api/v1/scouting-sessions/{id}");
        var body = await resp.Content.ReadFromJsonAsync<ApiResponse<ScoutingSessionResponse>>();
        body!.Data!.ObservationCount.Should().Be(0);
    }

    [Fact]
    public async Task Start_MultipleSessions_EachHaveDistinctIds()
    {
        var id1 = await StartSessionAsync(null, null);
        var id2 = await StartSessionAsync(null, null);
        id1.Should().NotBe(id2);
    }

    // ── PATCH complete ────────────────────────────────────────────────────────

    [Fact]
    public async Task Complete_OpenSession_ShouldReturn200WithCompletedAt()
    {
        var id = await StartSessionAsync("Clear", "Pre-complete notes");
        var resp = await _admin.PatchAsJsonAsync($"/api/v1/scouting-sessions/{id}/complete",
            new CompleteScoutingSessionRequest("Windy", "Post-complete notes"));
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await resp.Content.ReadFromJsonAsync<ApiResponse<ScoutingSessionResponse>>();
        body!.Data!.CompletedAt.Should().NotBeNull();
        body.Data.WeatherConditions.Should().Be("Windy");
        body.Data.Notes.Should().Be("Post-complete notes");
    }

    [Fact]
    public async Task Complete_AlreadyCompleted_ShouldReturn400()
    {
        var id = await StartSessionAsync(null, null);
        await _admin.PatchAsJsonAsync($"/api/v1/scouting-sessions/{id}/complete",
            new CompleteScoutingSessionRequest(null, null));
        // Second complete should fail
        var resp = await _admin.PatchAsJsonAsync($"/api/v1/scouting-sessions/{id}/complete",
            new CompleteScoutingSessionRequest(null, null));
        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Complete_WhenNotFound_ShouldReturn404()
    {
        var resp = await _admin.PatchAsJsonAsync($"/api/v1/scouting-sessions/{Guid.NewGuid()}/complete",
            new CompleteScoutingSessionRequest(null, null));
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Complete_WithNullWeatherAndNotes_ShouldNotOverwriteOriginals()
    {
        var id = await StartSessionAsync("Original Weather", "Original Notes");
        var resp = await _admin.PatchAsJsonAsync($"/api/v1/scouting-sessions/{id}/complete",
            new CompleteScoutingSessionRequest(null, null));
        var body = await resp.Content.ReadFromJsonAsync<ApiResponse<ScoutingSessionResponse>>();
        body!.Data!.WeatherConditions.Should().Be("Original Weather");
        body.Data.Notes.Should().Be("Original Notes");
    }

    [Fact]
    public async Task Complete_CompletedAtShouldBeApproximatelyNow()
    {
        var before = DateTime.UtcNow.AddSeconds(-5);
        var id = await StartSessionAsync(null, null);
        await _admin.PatchAsJsonAsync($"/api/v1/scouting-sessions/{id}/complete",
            new CompleteScoutingSessionRequest(null, null));
        var after = DateTime.UtcNow.AddSeconds(5);

        var resp = await _admin.GetAsync($"/api/v1/scouting-sessions/{id}");
        var body = await resp.Content.ReadFromJsonAsync<ApiResponse<ScoutingSessionResponse>>();
        body!.Data!.CompletedAt.Should().BeAfter(before).And.BeBefore(after);
    }

    // ── DELETE ───────────────────────────────────────────────────────────────

    [Fact]
    public async Task Delete_WhenExists_ShouldReturn204()
    {
        var id = await StartSessionAsync(null, null);
        var resp = await _admin.DeleteAsync($"/api/v1/scouting-sessions/{id}");
        resp.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task Delete_WhenNotFound_ShouldReturn404()
    {
        var resp = await _admin.DeleteAsync($"/api/v1/scouting-sessions/{Guid.NewGuid()}");
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Delete_ShouldMakeGetByIdReturn404()
    {
        var id = await StartSessionAsync(null, null);
        await _admin.DeleteAsync($"/api/v1/scouting-sessions/{id}");
        var resp = await _admin.GetAsync($"/api/v1/scouting-sessions/{id}");
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Delete_ShouldRemoveFromGetAll()
    {
        var id = await StartSessionAsync(null, null);
        await _admin.DeleteAsync($"/api/v1/scouting-sessions/{id}");
        var sessions = await GetAllAsync();
        sessions.Should().NotContain(s => s.Id == id);
    }

    [Fact]
    public async Task Delete_AlreadyDeleted_ShouldReturn404()
    {
        var id = await StartSessionAsync(null, null);
        await _admin.DeleteAsync($"/api/v1/scouting-sessions/{id}");
        var resp = await _admin.DeleteAsync($"/api/v1/scouting-sessions/{id}");
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task<Guid> StartSessionAsync(string? weather, string? notes)
    {
        var resp = await _admin.PostAsJsonAsync("/api/v1/scouting-sessions",
            new StartScoutingSessionRequest(weather, notes));
        return (await resp.Content.ReadFromJsonAsync<ApiResponse<ScoutingSessionResponse>>())!.Data!.Id;
    }

    private async Task<List<ScoutingSessionResponse>> GetAllAsync()
    {
        var resp = await _admin.GetAsync("/api/v1/scouting-sessions");
        return (await resp.Content.ReadFromJsonAsync<ApiResponse<List<ScoutingSessionResponse>>>())!.Data!;
    }
}
