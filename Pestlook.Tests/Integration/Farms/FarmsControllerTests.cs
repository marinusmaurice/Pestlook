using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using Pestlook.Tests.Helpers;
using Pestlook.Tests.Integration.Infrastructure;
using Pestlook.WebAPI.DTOs.Common;
using Pestlook.WebAPI.DTOs.Farms;

namespace Pestlook.Tests.Integration.Farms;

[Collection("Integration")]
public sealed class FarmsControllerTests(TestWebApplicationFactory factory) : IAsyncLifetime
{
    private readonly HttpClient _admin = factory.CreateAdminClient();
    private readonly HttpClient _scout = factory.CreateScoutClient();
    private readonly HttpClient _anon  = factory.CreateTenantClient(); // tenant header, no JWT
    private Guid _farmId;

    public async Task InitializeAsync()
    {
        var resp = await _admin.PostAsJsonAsync("/api/v1/farms",
            new CreateFarmRequest("Seeded Farm", "1 Test Road", 51.5, -0.1, null, null));
        _farmId = (await resp.Content.ReadFromJsonAsync<ApiResponse<FarmResponse>>())!.Data!.Id;
    }

    public Task DisposeAsync() => Task.CompletedTask;

    // ── Auth ─────────────────────────────────────────────────────────────────

    [Theory]
    [InlineData("GET",    "/api/v1/farms")]
    [InlineData("POST",   "/api/v1/farms")]
    [InlineData("PUT",    "/api/v1/farms/00000000-0000-0000-0000-000000000001")]
    [InlineData("DELETE", "/api/v1/farms/00000000-0000-0000-0000-000000000001")]
    public async Task Endpoint_Unauthenticated_ShouldReturn401(string method, string url)
    {
        var req = new HttpRequestMessage(new HttpMethod(method), url);
        if (method is "POST" or "PUT")
            req.Content = JsonContent.Create(new CreateFarmRequest("X", null, null, null, null, null));

        var resp = await _anon.SendAsync(req);
        resp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ── GET all ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAll_ShouldReturn200WithList()
    {
        var resp = await _admin.GetAsync("/api/v1/farms");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await resp.Content.ReadFromJsonAsync<ApiResponse<List<FarmResponse>>>();
        body!.Success.Should().BeTrue();
        body.Data.Should().NotBeNull();
    }

    [Fact]
    public async Task GetAll_ShouldContainSeededFarm()
    {
        var body = await GetAllAsync();
        body.Should().Contain(f => f.Id == _farmId && f.Name == "Seeded Farm");
    }

    // ── GET by ID ────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetById_WhenExists_ShouldReturn200WithCorrectData()
    {
        var resp = await _admin.GetAsync($"/api/v1/farms/{_farmId}");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await resp.Content.ReadFromJsonAsync<ApiResponse<FarmResponse>>();
        body!.Data!.Id.Should().Be(_farmId);
        body.Data.Name.Should().Be("Seeded Farm");
        body.Data.TenantId.Should().Be(TestWebApplicationFactory.DefaultTenantId);
    }

    [Fact]
    public async Task GetById_WhenNotFound_ShouldReturn404()
    {
        var resp = await _admin.GetAsync($"/api/v1/farms/{Guid.NewGuid()}");
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ── POST ─────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Create_WithFullData_ShouldReturn201WithAllFieldsPersisted()
    {
        var req = new CreateFarmRequest("Full Farm", "123 Lane", 52.0, -2.0, "{\"type\":\"Feature\"}", null);
        var resp = await _admin.PostAsJsonAsync("/api/v1/farms", req);
        resp.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await resp.Content.ReadFromJsonAsync<ApiResponse<FarmResponse>>();
        body!.Data!.Name.Should().Be("Full Farm");
        body.Data.Address.Should().Be("123 Lane");
        body.Data.Latitude.Should().Be(52.0);
        body.Data.Longitude.Should().Be(-2.0);
        body.Data.TenantId.Should().Be(TestWebApplicationFactory.DefaultTenantId);
        body.Data.Id.Should().NotBeEmpty();
    }

    [Fact]
    public async Task Create_WithNameOnly_ShouldReturn201()
    {
        var resp = await _admin.PostAsJsonAsync("/api/v1/farms",
            new CreateFarmRequest("Minimal Farm", null, null, null, null, null));
        resp.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    // Tenant scoping is resolved server-side from the JWT's "tenantId" claim
    // (TenantResolutionMiddleware), not from the client-supplied X-Tenant-ID
    // header — see TenantIsolationTests for the full regression coverage of
    // that fix. A valid JWT is therefore sufficient on its own; the header is
    // no longer required, or trusted, for tenant scoping to work.
    [Fact]
    public async Task Create_WithoutTenantHeader_ButWithValidJwt_ShouldStillSucceed()
    {
        var noHeaderClient = factory.CreateClient();
        noHeaderClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer",
            JwtTestHelper.GenerateToken(TestWebApplicationFactory.DefaultAdminId,
                TestWebApplicationFactory.DefaultAdminEmail,
                TestWebApplicationFactory.DefaultTenantId, ["Admin"]));

        var resp = await noHeaderClient.PostAsJsonAsync("/api/v1/farms",
            new CreateFarmRequest("No Tenant Header Farm", null, null, null, null, null));
        resp.StatusCode.Should().Be(HttpStatusCode.Created);

        var body = await resp.Content.ReadFromJsonAsync<ApiResponse<FarmResponse>>();
        body!.Data!.TenantId.Should().Be(TestWebApplicationFactory.DefaultTenantId);
    }

    // ── PUT ──────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Update_WhenExists_ShouldReturn200WithUpdatedFields()
    {
        var resp = await _admin.PutAsJsonAsync($"/api/v1/farms/{_farmId}",
            new UpdateFarmRequest("Renamed Farm", "New Address", 55.0, -5.0, null, null));
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await resp.Content.ReadFromJsonAsync<ApiResponse<FarmResponse>>();
        body!.Data!.Name.Should().Be("Renamed Farm");
        body.Data.Address.Should().Be("New Address");
    }

    [Fact]
    public async Task Update_WhenNotFound_ShouldReturn404()
    {
        var resp = await _admin.PutAsJsonAsync($"/api/v1/farms/{Guid.NewGuid()}",
            new UpdateFarmRequest("X", null, null, null, null, null));
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ── DELETE ───────────────────────────────────────────────────────────────

    [Fact]
    public async Task Delete_WhenExists_ShouldReturn204()
    {
        var id = await CreateFarmAsync("To Delete");
        var resp = await _admin.DeleteAsync($"/api/v1/farms/{id}");
        resp.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task Delete_WhenNotFound_ShouldReturn404()
    {
        var resp = await _admin.DeleteAsync($"/api/v1/farms/{Guid.NewGuid()}");
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Delete_ShouldSoftDelete_GetByIdReturns404Afterwards()
    {
        var id = await CreateFarmAsync("Soft Delete Test");
        await _admin.DeleteAsync($"/api/v1/farms/{id}");

        var resp = await _admin.GetAsync($"/api/v1/farms/{id}");
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Delete_ShouldSoftDelete_FarmExcludedFromGetAll()
    {
        var id = await CreateFarmAsync("Exclude From List");
        await _admin.DeleteAsync($"/api/v1/farms/{id}");

        var all = await GetAllAsync();
        all.Should().NotContain(f => f.Id == id);
    }

    [Fact]
    public async Task Delete_AlreadyDeleted_ShouldReturn404()
    {
        var id = await CreateFarmAsync("Double Delete");
        await _admin.DeleteAsync($"/api/v1/farms/{id}");

        var resp = await _admin.DeleteAsync($"/api/v1/farms/{id}");
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ── Scout role restrictions ──────────────────────────────────────────────

    [Fact]
    public async Task GetAll_AsScout_ShouldReturn200()
    {
        var resp = await _scout.GetAsync("/api/v1/farms");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetById_AsScout_ShouldReturn200()
    {
        var resp = await _scout.GetAsync($"/api/v1/farms/{_farmId}");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Create_AsScout_ShouldReturn403()
    {
        var resp = await _scout.PostAsJsonAsync("/api/v1/farms",
            new CreateFarmRequest("Scout Farm", null, null, null, null, null));
        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Update_AsScout_ShouldReturn403()
    {
        var resp = await _scout.PutAsJsonAsync($"/api/v1/farms/{_farmId}",
            new UpdateFarmRequest("Scout Rename", null, null, null, null, null));
        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Delete_AsScout_ShouldReturn403()
    {
        var resp = await _scout.DeleteAsync($"/api/v1/farms/{_farmId}");
        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task<Guid> CreateFarmAsync(string name)
    {
        var resp = await _admin.PostAsJsonAsync("/api/v1/farms",
            new CreateFarmRequest(name, null, null, null, null, null));
        return (await resp.Content.ReadFromJsonAsync<ApiResponse<FarmResponse>>())!.Data!.Id;
    }

    private async Task<List<FarmResponse>> GetAllAsync()
    {
        var resp = await _admin.GetAsync("/api/v1/farms");
        return (await resp.Content.ReadFromJsonAsync<ApiResponse<List<FarmResponse>>>())!.Data!;
    }
}
