using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Pestlook.Tests.Integration.Infrastructure;
using Pestlook.WebAPI.DTOs.Common;
using Pestlook.WebAPI.DTOs.Farms;
using Pestlook.WebAPI.DTOs.Fields;

namespace Pestlook.Tests.Integration.Fields;

[Collection("Integration")]
public sealed class FieldsControllerTests(TestWebApplicationFactory factory) : IAsyncLifetime
{
    private readonly HttpClient _admin = factory.CreateAdminClient();
    private readonly HttpClient _scout = factory.CreateScoutClient();
    private readonly HttpClient _anon  = factory.CreateTenantClient();
    private Guid _farmId;
    private Guid _fieldId;

    public async Task InitializeAsync()
    {
        _farmId   = await CreateFarmAsync("Fields Test Farm");
        _fieldId  = await CreateFieldAsync("Seeded Field", _farmId);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    // ── Auth ─────────────────────────────────────────────────────────────────

    [Theory]
    [InlineData("GET",    "/api/v1/fields")]
    [InlineData("POST",   "/api/v1/fields")]
    [InlineData("PUT",    "/api/v1/fields/00000000-0000-0000-0000-000000000001")]
    [InlineData("DELETE", "/api/v1/fields/00000000-0000-0000-0000-000000000001")]
    public async Task Endpoint_Unauthenticated_ShouldReturn401(string method, string url)
    {
        var req = new HttpRequestMessage(new HttpMethod(method), url);
        if (method is "POST" or "PUT")
            req.Content = JsonContent.Create(new CreateFieldRequest(Guid.NewGuid(), "X", null, null, null, null, null, null, null));
        var resp = await _anon.SendAsync(req);
        resp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ── GET all ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAll_ShouldReturn200WithList()
    {
        var resp = await _admin.GetAsync("/api/v1/fields");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await resp.Content.ReadFromJsonAsync<ApiResponse<List<FieldResponse>>>();
        body!.Success.Should().BeTrue();
        body.Data.Should().NotBeNull();
    }

    [Fact]
    public async Task GetAll_ShouldContainSeededField()
    {
        var fields = await GetAllAsync();
        fields.Should().Contain(f => f.Id == _fieldId && f.Name == "Seeded Field");
    }

    [Fact]
    public async Task GetAll_FilteredByFarmId_ShouldReturnOnlyMatchingFields()
    {
        var otherFarmId  = await CreateFarmAsync("Other Farm for Filter");
        var otherFieldId = await CreateFieldAsync("Other Field", otherFarmId);

        var fields = await GetAllAsync(farmId: _farmId);
        fields.Should().Contain(f => f.Id == _fieldId);
        fields.Should().NotContain(f => f.Id == otherFieldId);
    }

    [Fact]
    public async Task GetAll_FilteredByFarmId_WithNoMatchingFields_ShouldReturnEmptyList()
    {
        var emptyFarmId = await CreateFarmAsync("Empty Farm");
        var fields = await GetAllAsync(farmId: emptyFarmId);
        fields.Should().BeEmpty();
    }

    // ── GET by ID ────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetById_WhenExists_ShouldReturn200WithCorrectData()
    {
        var resp = await _admin.GetAsync($"/api/v1/fields/{_fieldId}");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await resp.Content.ReadFromJsonAsync<ApiResponse<FieldResponse>>();
        body!.Data!.Id.Should().Be(_fieldId);
        body.Data.Name.Should().Be("Seeded Field");
        body.Data.FarmId.Should().Be(_farmId);
        body.Data.TenantId.Should().Be(TestWebApplicationFactory.DefaultTenantId);
    }

    [Fact]
    public async Task GetById_WhenNotFound_ShouldReturn404()
    {
        var resp = await _admin.GetAsync($"/api/v1/fields/{Guid.NewGuid()}");
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ── POST ─────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Create_WithAllFields_ShouldReturn201AndPersistData()
    {
        var req = new CreateFieldRequest(_farmId, "Full Field", "{}", 12.5, null, null, null, "Wheat", "2025");
        var resp = await _admin.PostAsJsonAsync("/api/v1/fields", req);
        resp.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await resp.Content.ReadFromJsonAsync<ApiResponse<FieldResponse>>();
        body!.Data!.Name.Should().Be("Full Field");
        body.Data.FarmId.Should().Be(_farmId);
        body.Data.AreaHectares.Should().Be(12.5);
        body.Data.CropType.Should().Be("Wheat");
        body.Data.Season.Should().Be("2025");
        body.Data.TenantId.Should().Be(TestWebApplicationFactory.DefaultTenantId);
    }

    [Fact]
    public async Task Create_WithNameAndFarmOnly_ShouldReturn201()
    {
        var resp = await _admin.PostAsJsonAsync("/api/v1/fields",
            new CreateFieldRequest(_farmId, "Minimal Field", null, null, null, null, null, null, null));
        resp.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task Create_WithNonExistentFarmId_ShouldReturn400()
    {
        var resp = await _admin.PostAsJsonAsync("/api/v1/fields",
            new CreateFieldRequest(Guid.NewGuid(), "Orphan Field", null, null, null, null, null, null, null));
        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Create_LocationAvailableInGetById()
    {
        var id = await CreateFieldAsync("Verifiable Field", _farmId);
        var resp = await _admin.GetAsync($"/api/v1/fields/{id}");
        var body = await resp.Content.ReadFromJsonAsync<ApiResponse<FieldResponse>>();
        body!.Data!.FarmId.Should().Be(_farmId);
    }

    // ── PUT ──────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Update_WhenExists_ShouldReturn200WithUpdatedFields()
    {
        var resp = await _admin.PutAsJsonAsync($"/api/v1/fields/{_fieldId}",
            new UpdateFieldRequest("Renamed Field", null, 99.9, null, null, null, "Barley", "2026"));
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await resp.Content.ReadFromJsonAsync<ApiResponse<FieldResponse>>();
        body!.Data!.Name.Should().Be("Renamed Field");
        body.Data.AreaHectares.Should().Be(99.9);
        body.Data.CropType.Should().Be("Barley");
    }

    [Fact]
    public async Task Update_WhenNotFound_ShouldReturn404()
    {
        var resp = await _admin.PutAsJsonAsync($"/api/v1/fields/{Guid.NewGuid()}",
            new UpdateFieldRequest("X", null, null, null, null, null, null, null));
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ── DELETE ───────────────────────────────────────────────────────────────

    [Fact]
    public async Task Delete_WhenExists_ShouldReturn204()
    {
        var id = await CreateFieldAsync("To Delete", _farmId);
        var resp = await _admin.DeleteAsync($"/api/v1/fields/{id}");
        resp.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task Delete_WhenNotFound_ShouldReturn404()
    {
        var resp = await _admin.DeleteAsync($"/api/v1/fields/{Guid.NewGuid()}");
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Delete_ShouldSoftDelete_GetByIdReturns404()
    {
        var id = await CreateFieldAsync("Soft Delete Field", _farmId);
        await _admin.DeleteAsync($"/api/v1/fields/{id}");
        var resp = await _admin.GetAsync($"/api/v1/fields/{id}");
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Delete_ShouldSoftDelete_ExcludedFromGetAll()
    {
        var id = await CreateFieldAsync("Excluded Field", _farmId);
        await _admin.DeleteAsync($"/api/v1/fields/{id}");
        var fields = await GetAllAsync();
        fields.Should().NotContain(f => f.Id == id);
    }

    [Fact]
    public async Task Delete_AlreadyDeleted_ShouldReturn404()
    {
        var id = await CreateFieldAsync("Double Delete Field", _farmId);
        await _admin.DeleteAsync($"/api/v1/fields/{id}");
        var resp = await _admin.DeleteAsync($"/api/v1/fields/{id}");
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ── Scout role restrictions ──────────────────────────────────────────────

    [Fact]
    public async Task GetAll_AsScout_ShouldReturn200()
    {
        var resp = await _scout.GetAsync("/api/v1/fields");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetById_AsScout_ShouldReturn200()
    {
        var resp = await _scout.GetAsync($"/api/v1/fields/{_fieldId}");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Create_AsScout_ShouldReturn403()
    {
        var resp = await _scout.PostAsJsonAsync("/api/v1/fields",
            new CreateFieldRequest(_farmId, "Scout Field", null, null, null, null, null, null, null));
        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Update_AsScout_ShouldReturn403()
    {
        var resp = await _scout.PutAsJsonAsync($"/api/v1/fields/{_fieldId}",
            new UpdateFieldRequest("Scout Rename", null, null, null, null, null, null, null));
        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Delete_AsScout_ShouldReturn403()
    {
        var resp = await _scout.DeleteAsync($"/api/v1/fields/{_fieldId}");
        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task<Guid> CreateFarmAsync(string name)
    {
        var resp = await _admin.PostAsJsonAsync("/api/v1/farms",
            new CreateFarmRequest(name, null, null, null, null, null));
        return (await resp.Content.ReadFromJsonAsync<ApiResponse<FarmResponse>>())!.Data!.Id;
    }

    private async Task<Guid> CreateFieldAsync(string name, Guid farmId)
    {
        var resp = await _admin.PostAsJsonAsync("/api/v1/fields",
            new CreateFieldRequest(farmId, name, null, null, null, null, null, null, null));
        return (await resp.Content.ReadFromJsonAsync<ApiResponse<FieldResponse>>())!.Data!.Id;
    }

    private async Task<List<FieldResponse>> GetAllAsync(Guid? farmId = null)
    {
        var url = farmId.HasValue ? $"/api/v1/fields?farmId={farmId}" : "/api/v1/fields";
        var resp = await _admin.GetAsync(url);
        return (await resp.Content.ReadFromJsonAsync<ApiResponse<List<FieldResponse>>>())!.Data!;
    }
}
