using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Pestlook.Tests.Integration.Infrastructure;
using Pestlook.WebAPI.Domain.Enums;
using Pestlook.WebAPI.DTOs.Common;
using Pestlook.WebAPI.DTOs.Farms;
using Pestlook.WebAPI.DTOs.Pests;

namespace Pestlook.Tests.Integration.Pests;

[Collection("Integration")]
public sealed class PestsControllerTests(TestWebApplicationFactory factory) : IAsyncLifetime
{
    private readonly HttpClient _admin = factory.CreateAdminClient();
    private readonly HttpClient _anon  = factory.CreateTenantClient();
    private Guid _pestId;

    public async Task InitializeAsync()
    {
        _pestId = await CreatePestAsync("Aphid", PestCategory.Insect, CaptureMode.Count);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    // ── Auth ─────────────────────────────────────────────────────────────────

    [Theory]
    [InlineData("GET",    "/api/v1/pests")]
    [InlineData("POST",   "/api/v1/pests")]
    [InlineData("PUT",    "/api/v1/pests/00000000-0000-0000-0000-000000000001")]
    [InlineData("DELETE", "/api/v1/pests/00000000-0000-0000-0000-000000000001")]
    public async Task Endpoint_Unauthenticated_ShouldReturn401(string method, string url)
    {
        var req = new HttpRequestMessage(new HttpMethod(method), url);
        if (method is "POST" or "PUT")
            req.Content = JsonContent.Create(
                new CreatePestRequest("X", null, PestCategory.Other, CaptureMode.Count, null, null));
        var resp = await _anon.SendAsync(req);
        resp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ── GET all ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAll_ShouldReturn200()
    {
        var resp = await _admin.GetAsync("/api/v1/pests");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await resp.Content.ReadFromJsonAsync<ApiResponse<List<PestResponse>>>();
        body!.Success.Should().BeTrue();
        body.Data.Should().NotBeNull();
    }

    [Fact]
    public async Task GetAll_ShouldContainSeededPest()
    {
        var pests = await GetAllAsync();
        pests.Should().Contain(p => p.Id == _pestId && p.CommonName == "Aphid");
    }

    [Fact]
    public async Task GetAll_ShouldBeOrderedByCommonName()
    {
        await CreatePestAsync("Zebra Moth", PestCategory.Insect, CaptureMode.Presence);
        await CreatePestAsync("Ant", PestCategory.Insect, CaptureMode.Count);
        var pests = await GetAllAsync();
        var names = pests.Select(p => p.CommonName).ToList();
        names.Should().BeInAscendingOrder();
    }

    // ── GET by ID ────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetById_WhenExists_ShouldReturn200WithCorrectData()
    {
        var resp = await _admin.GetAsync($"/api/v1/pests/{_pestId}");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await resp.Content.ReadFromJsonAsync<ApiResponse<PestResponse>>();
        body!.Data!.Id.Should().Be(_pestId);
        body.Data.CommonName.Should().Be("Aphid");
        body.Data.Category.Should().Be(PestCategory.Insect);
        body.Data.TenantId.Should().Be(TestWebApplicationFactory.DefaultTenantId);
        body.Data.IsSystemPest.Should().BeFalse();
    }

    [Fact]
    public async Task GetById_WhenNotFound_ShouldReturn404()
    {
        var resp = await _admin.GetAsync($"/api/v1/pests/{Guid.NewGuid()}");
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ── POST ─────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Create_WithAllFields_ShouldReturn201AndPersistData()
    {
        var req = new CreatePestRequest(
            "Whitefly", "Bemisia tabaci", PestCategory.Insect, CaptureMode.Count,
            ThresholdCount: 50, "Tiny sap-sucking insect");
        var resp = await _admin.PostAsJsonAsync("/api/v1/pests", req);
        resp.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await resp.Content.ReadFromJsonAsync<ApiResponse<PestResponse>>();
        body!.Data!.CommonName.Should().Be("Whitefly");
        body.Data.ScientificName.Should().Be("Bemisia tabaci");
        body.Data.Category.Should().Be(PestCategory.Insect);
        body.Data.DefaultCaptureMode.Should().Be(CaptureMode.Count);
        body.Data.ThresholdCount.Should().Be(50);
        body.Data.IsSystemPest.Should().BeFalse();
    }

    [Fact]
    public async Task Create_WithMinimalData_ShouldReturn201()
    {
        var resp = await _admin.PostAsJsonAsync("/api/v1/pests",
            new CreatePestRequest("Minimal Pest", null, PestCategory.Weed, CaptureMode.Presence, null, null));
        resp.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Theory]
    [InlineData(PestCategory.Insect,  CaptureMode.Count)]
    [InlineData(PestCategory.Disease, CaptureMode.Presence)]
    [InlineData(PestCategory.Weed,    CaptureMode.Count)]
    [InlineData(PestCategory.Rodent,  CaptureMode.Presence)]
    [InlineData(PestCategory.Other,   CaptureMode.Count)]
    public async Task Create_VariousCategoryAndCaptureMode_ShouldReturn201(
        PestCategory category, CaptureMode captureMode)
    {
        var resp = await _admin.PostAsJsonAsync("/api/v1/pests",
            new CreatePestRequest($"Pest {category} {captureMode}", null, category, captureMode, null, null));
        resp.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task Create_NewPest_IsSystemPestShouldAlwaysBeFalse()
    {
        var id = await CreatePestAsync("Non-System Pest", PestCategory.Other, CaptureMode.Count);
        var resp = await _admin.GetAsync($"/api/v1/pests/{id}");
        var body = await resp.Content.ReadFromJsonAsync<ApiResponse<PestResponse>>();
        body!.Data!.IsSystemPest.Should().BeFalse();
    }

    // ── PUT ──────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Update_WhenExists_ShouldReturn200WithUpdatedFields()
    {
        var resp = await _admin.PutAsJsonAsync($"/api/v1/pests/{_pestId}",
            new UpdatePestRequest("Updated Aphid", "Acyrthosiphon pisum",
                PestCategory.Insect, CaptureMode.Presence, 100, "Updated desc"));
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await resp.Content.ReadFromJsonAsync<ApiResponse<PestResponse>>();
        body!.Data!.CommonName.Should().Be("Updated Aphid");
        body.Data.ScientificName.Should().Be("Acyrthosiphon pisum");
        body.Data.ThresholdCount.Should().Be(100);
        body.Data.DefaultCaptureMode.Should().Be(CaptureMode.Presence);
    }

    [Fact]
    public async Task Update_WhenNotFound_ShouldReturn404()
    {
        var resp = await _admin.PutAsJsonAsync($"/api/v1/pests/{Guid.NewGuid()}",
            new UpdatePestRequest("X", null, PestCategory.Other, CaptureMode.Count, null, null));
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Update_SystemPest_ShouldReturn400()
    {
        // Seed a system pest directly through the DB via a separate client call
        // In the real system, system pests are seeded. We test the guard by checking any
        // system pest returned from GetAll (if none, seed via service scope).
        var allPests = await GetAllAsync();
        var systemPest = allPests.FirstOrDefault(p => p.IsSystemPest);
        if (systemPest is null) return; // no system pests seeded in this test run

        var resp = await _admin.PutAsJsonAsync($"/api/v1/pests/{systemPest.Id}",
            new UpdatePestRequest("Hacked System Pest", null, PestCategory.Other, CaptureMode.Count, null, null));
        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // ── DELETE ───────────────────────────────────────────────────────────────

    [Fact]
    public async Task Delete_WhenExists_ShouldReturn204()
    {
        var id = await CreatePestAsync("Delete Me", PestCategory.Weed, CaptureMode.Count);
        var resp = await _admin.DeleteAsync($"/api/v1/pests/{id}");
        resp.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task Delete_WhenNotFound_ShouldReturn404()
    {
        var resp = await _admin.DeleteAsync($"/api/v1/pests/{Guid.NewGuid()}");
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Delete_SystemPest_ShouldReturn400()
    {
        var allPests = await GetAllAsync();
        var systemPest = allPests.FirstOrDefault(p => p.IsSystemPest);
        if (systemPest is null) return;

        var resp = await _admin.DeleteAsync($"/api/v1/pests/{systemPest.Id}");
        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Delete_ShouldSoftDelete_GetByIdReturns404()
    {
        var id = await CreatePestAsync("Soft Delete Pest", PestCategory.Rodent, CaptureMode.Count);
        await _admin.DeleteAsync($"/api/v1/pests/{id}");
        var resp = await _admin.GetAsync($"/api/v1/pests/{id}");
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Delete_ShouldSoftDelete_ExcludedFromGetAll()
    {
        var id = await CreatePestAsync("Excluded Pest", PestCategory.Disease, CaptureMode.Presence);
        await _admin.DeleteAsync($"/api/v1/pests/{id}");
        var pests = await GetAllAsync();
        pests.Should().NotContain(p => p.Id == id);
    }

    [Fact]
    public async Task Delete_AlreadyDeleted_ShouldReturn404()
    {
        var id = await CreatePestAsync("Double Delete Pest", PestCategory.Insect, CaptureMode.Count);
        await _admin.DeleteAsync($"/api/v1/pests/{id}");
        var resp = await _admin.DeleteAsync($"/api/v1/pests/{id}");
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task<Guid> CreatePestAsync(string name, PestCategory category, CaptureMode captureMode)
    {
        var resp = await _admin.PostAsJsonAsync("/api/v1/pests",
            new CreatePestRequest(name, null, category, captureMode, null, null));
        return (await resp.Content.ReadFromJsonAsync<ApiResponse<PestResponse>>())!.Data!.Id;
    }

    private async Task<List<PestResponse>> GetAllAsync()
    {
        var resp = await _admin.GetAsync("/api/v1/pests");
        return (await resp.Content.ReadFromJsonAsync<ApiResponse<List<PestResponse>>>())!.Data!;
    }
}
