using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Pestlook.Tests.Helpers;
using Pestlook.Tests.Integration.Infrastructure;
using Pestlook.WebAPI.Domain.Enums;
using Pestlook.WebAPI.DTOs.Common;
using Pestlook.WebAPI.DTOs.Farms;
using Pestlook.WebAPI.DTOs.Fields;
using Pestlook.WebAPI.DTOs.MonitoringPoints;
using Pestlook.WebAPI.DTOs.Pests;
using Pestlook.WebAPI.DTOs.TrapTypes;

namespace Pestlook.Tests.Integration.MonitoringPoints;

[Collection("Integration")]
public sealed class MonitoringPointsControllerTests(TestWebApplicationFactory factory) : IAsyncLifetime
{
    private readonly HttpClient _admin = factory.CreateAdminClient();
    private readonly HttpClient _scout = factory.CreateTenantClient(JwtTestHelper.GenerateToken(
        "scout-mp-id", "scout-mp@test-tenant.com",
        TestWebApplicationFactory.DefaultTenantId, roles: ["Scout"]));
    private readonly HttpClient _anon  = factory.CreateTenantClient();

    private readonly string _id = Guid.NewGuid().ToString("N")[..8];
    private Guid _farmId;
    private Guid _fieldId;
    private Guid _pestId;
    private Guid _trapTypeId;
    private Guid _pointId;

    public async Task InitializeAsync()
    {
        _farmId     = await CreateFarmAsync($"MP Test Farm {_id}");
        _fieldId    = await CreateFieldAsync($"MP Test Field {_id}", _farmId);
        _pestId     = await CreatePestAsync($"MP Test Aphid {_id}");
        _trapTypeId = await CreateTrapTypeAsync($"MP Sticky Trap {_id}");
        _pointId    = await CreatePointAsync("Seeded Point", MonitoringPointType.FixedTrap, _farmId, _fieldId, _trapTypeId);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    // -- Auth -----------------------------------------------------------------

    [Theory]
    [InlineData("GET",    "/api/v1/monitoring-points")]
    [InlineData("POST",   "/api/v1/monitoring-points")]
    [InlineData("PUT",    "/api/v1/monitoring-points/00000000-0000-0000-0000-000000000001")]
    [InlineData("DELETE", "/api/v1/monitoring-points/00000000-0000-0000-0000-000000000001")]
    public async Task Endpoint_Unauthenticated_ShouldReturn401(string method, string url)
    {
        var req = new HttpRequestMessage(new HttpMethod(method), url);
        if (method is "POST" or "PUT")
            req.Content = JsonContent.Create(new CreateMonitoringPointRequest(
                Guid.NewGuid(), null, MonitoringPointType.FixedTrap, "X", 0, 0, null, null, null));
        var resp = await _anon.SendAsync(req);
        resp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ── GET all ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAll_ShouldReturn200WithList()
    {
        var resp = await _admin.GetAsync("/api/v1/monitoring-points");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await resp.Content.ReadFromJsonAsync<ApiResponse<List<MonitoringPointResponse>>>();
        body!.Success.Should().BeTrue();
        body.Data.Should().NotBeNull();
    }

    [Fact]
    public async Task GetAll_FilteredByFarmId_ShouldReturnOnlyMatchingPoints()
    {
        var otherFarm  = await CreateFarmAsync("Other Farm");
        var otherPoint = await CreatePointAsync("Other Point", MonitoringPointType.FixedScouting, otherFarm, null, null);

        var points = await GetAllAsync(farmId: _farmId);
        points.Should().Contain(p => p.Id == _pointId);
        points.Should().NotContain(p => p.Id == otherPoint);
    }

    [Fact]
    public async Task GetAll_FilteredByFieldId_ShouldReturnOnlyMatchingPoints()
    {
        var otherField = await CreateFieldAsync("Other MP Field", _farmId);
        var otherPoint = await CreatePointAsync("Field-filtered Point", MonitoringPointType.FixedTrap, _farmId, otherField, null);

        var points = await GetAllAsync(fieldId: _fieldId);
        points.Should().Contain(p => p.Id == _pointId);
        points.Should().NotContain(p => p.Id == otherPoint);
    }

    [Fact]
    public async Task GetAll_ShouldIncludeAssignedPests()
    {
        await _admin.PostAsJsonAsync($"/api/v1/monitoring-points/{_pointId}/pests",
            new AssignPestRequest(_pestId, false));
        var points = await GetAllAsync(farmId: _farmId);
        var point = points.First(p => p.Id == _pointId);
        point.AssignedPests.Should().Contain(p => p.PestId == _pestId);
    }

    // ── GET by ID ────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetById_WhenExists_ShouldReturn200WithCorrectData()
    {
        var farmId = await CreateFarmAsync("Test Farm");
        var fieldId = await CreateFieldAsync("Test Field", farmId);
        var trapTypeName = $"Test Trap {_id}";
        var trapTypeId = await CreateTrapTypeAsync(trapTypeName);
        var pointId = await CreatePointAsync("Test Point", MonitoringPointType.FixedTrap, farmId, fieldId, trapTypeId);

        var resp = await _admin.GetAsync($"/api/v1/monitoring-points/{pointId}");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await resp.Content.ReadFromJsonAsync<ApiResponse<MonitoringPointResponse>>();
        body!.Data!.Id.Should().Be(pointId);
        body.Data.Name.Should().Be("Test Point");
        body.Data.FarmId.Should().Be(farmId);
        body.Data.FieldId.Should().Be(fieldId);
        body.Data.PointType.Should().Be(MonitoringPointType.FixedTrap);
        body.Data.TenantId.Should().Be(TestWebApplicationFactory.DefaultTenantId);
        body.Data.TrapTypeName.Should().Be(trapTypeName);
    }

    [Fact]
    public async Task GetById_WhenNotFound_ShouldReturn404()
    {
        var resp = await _admin.GetAsync($"/api/v1/monitoring-points/{Guid.NewGuid()}");
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ── POST ─────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Create_WithAllPointTypes_ShouldReturn201()
    {
        foreach (var type in Enum.GetValues<MonitoringPointType>())
        {
            var resp = await _admin.PostAsJsonAsync("/api/v1/monitoring-points",
                new CreateMonitoringPointRequest(_farmId, null, type, $"Point {type}", 51.0, -0.1, null, null, null));
            resp.StatusCode.Should().Be(HttpStatusCode.Created, $"PointType {type} should return 201");
        }
    }

    [Fact]
    public async Task Create_WithPestsInBody_ShouldHaveAssignedPests()
    {
        var req = new CreateMonitoringPointRequest(
            _farmId, _fieldId, MonitoringPointType.FixedTrap, "Pest Point", 51.0, -0.1, _trapTypeId, null,
            [new AssignPestRequest(_pestId, AllowUnknown: true)]);
        var resp = await _admin.PostAsJsonAsync("/api/v1/monitoring-points", req);
        resp.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await resp.Content.ReadFromJsonAsync<ApiResponse<MonitoringPointResponse>>();
        body!.Data!.AssignedPests.Should().HaveCount(1);
        body.Data.AssignedPests.First().PestId.Should().Be(_pestId);
        body.Data.AssignedPests.First().AllowUnknown.Should().BeTrue();
    }

    [Fact]
    public async Task Create_WithDuplicatePestsInBody_ShouldDeduplicateToOne()
    {
        var req = new CreateMonitoringPointRequest(
            _farmId, null, MonitoringPointType.FixedTrap, "Dedup Point", 51.0, -0.1, null, null,
            [new AssignPestRequest(_pestId), new AssignPestRequest(_pestId)]);
        var resp = await _admin.PostAsJsonAsync("/api/v1/monitoring-points", req);
        resp.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await resp.Content.ReadFromJsonAsync<ApiResponse<MonitoringPointResponse>>();
        body!.Data!.AssignedPests.Should().HaveCount(1);
    }

    [Fact]
    public async Task Create_WithNonExistentFarmId_ShouldReturn400()
    {
        var resp = await _admin.PostAsJsonAsync("/api/v1/monitoring-points",
            new CreateMonitoringPointRequest(Guid.NewGuid(), null, MonitoringPointType.FixedTrap, "Orphan", 0, 0, null, null, null));
        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Create_AsScout_ShouldReturn201()
    {
        var resp = await _scout.PostAsJsonAsync("/api/v1/monitoring-points",
            new CreateMonitoringPointRequest(_farmId, null, MonitoringPointType.ScoutingVisit, "Scout Point", 51.0, -0.1, null, null, null));
        resp.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    // ── PUT ──────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Update_WhenExists_ShouldReturn200WithUpdatedFields()
    {
        var resp = await _admin.PutAsJsonAsync($"/api/v1/monitoring-points/{_pointId}",
            new UpdateMonitoringPointRequest("Renamed Point", 52.0, -1.0, null, "Updated notes", true));
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await resp.Content.ReadFromJsonAsync<ApiResponse<MonitoringPointResponse>>();
        body!.Data!.Name.Should().Be("Renamed Point");
        body.Data.Latitude.Should().Be(52.0);
        body.Data.Notes.Should().Be("Updated notes");
    }

    [Fact]
    public async Task Update_WhenNotFound_ShouldReturn404()
    {
        var resp = await _admin.PutAsJsonAsync($"/api/v1/monitoring-points/{Guid.NewGuid()}",
            new UpdateMonitoringPointRequest("X", 0, 0, null, null, true));
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Update_CanDeactivatePoint_IsActiveShouldBeFalse()
    {
        var resp = await _admin.PutAsJsonAsync($"/api/v1/monitoring-points/{_pointId}",
            new UpdateMonitoringPointRequest("Inactive Point", 51.0, -0.1, null, null, false));
        var body = await resp.Content.ReadFromJsonAsync<ApiResponse<MonitoringPointResponse>>();
        body!.Data!.IsActive.Should().BeFalse();
    }

    // ── Pest assignment ───────────────────────────────────────────────────────

    [Fact]
    public async Task AssignPest_ToFixedPoint_ShouldReturn200()
    {
        var pointId = await CreatePointAsync("Assign Pest Point", MonitoringPointType.FixedTrap, _farmId, null, null);
        var resp = await _admin.PostAsJsonAsync($"/api/v1/monitoring-points/{pointId}/pests",
            new AssignPestRequest(_pestId, false));
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task AssignPest_ToScoutingVisit_ShouldReturn400()
    {
        var pointId = await CreatePointAsync("ScoutingVisit Point", MonitoringPointType.ScoutingVisit, _farmId, null, null);
        var resp = await _admin.PostAsJsonAsync($"/api/v1/monitoring-points/{pointId}/pests",
            new AssignPestRequest(_pestId, false));
        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task AssignPest_WhenAlreadyAssigned_ShouldReturn400()
    {
        var pointId = await CreatePointAsync("Already Assigned Point", MonitoringPointType.FixedTrap, _farmId, null, null);
        await _admin.PostAsJsonAsync($"/api/v1/monitoring-points/{pointId}/pests", new AssignPestRequest(_pestId));
        var resp = await _admin.PostAsJsonAsync($"/api/v1/monitoring-points/{pointId}/pests", new AssignPestRequest(_pestId));
        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task AssignPest_WithNonExistentPest_ShouldReturn400()
    {
        var pointId = await CreatePointAsync("Non-existent Pest Point", MonitoringPointType.FixedTrap, _farmId, null, null);
        var resp = await _admin.PostAsJsonAsync($"/api/v1/monitoring-points/{pointId}/pests",
            new AssignPestRequest(Guid.NewGuid(), false));
        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task AssignPest_ToNonExistentPoint_ShouldReturn404()
    {
        var resp = await _admin.PostAsJsonAsync($"/api/v1/monitoring-points/{Guid.NewGuid()}/pests",
            new AssignPestRequest(_pestId, false));
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ── Remove pest ───────────────────────────────────────────────────────────

    [Fact]
    public async Task RemovePest_WhenAssigned_ShouldReturn204()
    {
        var pointId = await CreatePointAsync("Remove Pest Point", MonitoringPointType.FixedScouting, _farmId, null, null);
        await _admin.PostAsJsonAsync($"/api/v1/monitoring-points/{pointId}/pests", new AssignPestRequest(_pestId));
        var resp = await _admin.DeleteAsync($"/api/v1/monitoring-points/{pointId}/pests/{_pestId}");
        resp.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task RemovePest_WhenNotAssigned_ShouldReturn404()
    {
        var resp = await _admin.DeleteAsync($"/api/v1/monitoring-points/{_pointId}/pests/{Guid.NewGuid()}");
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task RemovePest_ShouldNoLongerAppearInGetById()
    {
        var pointId = await CreatePointAsync("Pest Removal Verify", MonitoringPointType.FixedTrap, _farmId, null, null);
        await _admin.PostAsJsonAsync($"/api/v1/monitoring-points/{pointId}/pests", new AssignPestRequest(_pestId));
        await _admin.DeleteAsync($"/api/v1/monitoring-points/{pointId}/pests/{_pestId}");

        var resp = await _admin.GetAsync($"/api/v1/monitoring-points/{pointId}");
        var body = await resp.Content.ReadFromJsonAsync<ApiResponse<MonitoringPointResponse>>();
        body!.Data!.AssignedPests.Should().NotContain(p => p.PestId == _pestId);
    }

    // ── DELETE ───────────────────────────────────────────────────────────────

    [Fact]
    public async Task Delete_WhenExists_ShouldReturn204()
    {
        var id = await CreatePointAsync("To Delete MP", MonitoringPointType.FixedTrap, _farmId, null, null);
        var resp = await _admin.DeleteAsync($"/api/v1/monitoring-points/{id}");
        resp.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task Delete_WhenNotFound_ShouldReturn404()
    {
        var resp = await _admin.DeleteAsync($"/api/v1/monitoring-points/{Guid.NewGuid()}");
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Delete_ShouldSoftDelete_GetByIdReturns404()
    {
        var id = await CreatePointAsync("Soft Delete MP", MonitoringPointType.FixedTrap, _farmId, null, null);
        await _admin.DeleteAsync($"/api/v1/monitoring-points/{id}");
        var resp = await _admin.GetAsync($"/api/v1/monitoring-points/{id}");
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Delete_ShouldSetIsActiveFalse_PointNotInGetAll()
    {
        var id = await CreatePointAsync("Excluded MP", MonitoringPointType.FixedTrap, _farmId, null, null);
        await _admin.DeleteAsync($"/api/v1/monitoring-points/{id}");
        var points = await GetAllAsync(farmId: _farmId);
        points.Should().NotContain(p => p.Id == id);
    }

    [Fact]
    public async Task Delete_AlreadyDeleted_ShouldReturn404()
    {
        var id = await CreatePointAsync("Double Delete MP", MonitoringPointType.FixedTrap, _farmId, null, null);
        await _admin.DeleteAsync($"/api/v1/monitoring-points/{id}");
        var resp = await _admin.DeleteAsync($"/api/v1/monitoring-points/{id}");
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task<Guid> CreateFarmAsync(string name)
    {
        var resp = await _admin.PostAsJsonAsync("/api/v1/farms",
            new CreateFarmRequest(name, null, null, null, null));
        return (await resp.Content.ReadFromJsonAsync<ApiResponse<FarmResponse>>())!.Data!.Id;
    }

    private async Task<Guid> CreateFieldAsync(string name, Guid farmId)
    {
        var resp = await _admin.PostAsJsonAsync("/api/v1/fields",
            new CreateFieldRequest(farmId, name, null, null, null, null));
        return (await resp.Content.ReadFromJsonAsync<ApiResponse<FieldResponse>>())!.Data!.Id;
    }

    private async Task<Guid> CreatePestAsync(string name)
    {
        var resp = await _admin.PostAsJsonAsync("/api/v1/pests",
            new CreatePestRequest(name, null, PestCategory.Insect, CaptureMode.Count, null, null, null));
        return (await resp.Content.ReadFromJsonAsync<ApiResponse<PestResponse>>())!.Data!.Id;
    }

    private async Task<Guid> CreateTrapTypeAsync(string name)
    {
        var resp = await _admin.PostAsJsonAsync("/api/v1/trap-types",
            new CreateTrapTypeRequest(name, null));
        return (await resp.Content.ReadFromJsonAsync<ApiResponse<TrapTypeResponse>>())!.Data!.Id;
    }

    private async Task<Guid> CreatePointAsync(string name, MonitoringPointType type, Guid farmId, Guid? fieldId, Guid? trapTypeId)
    {
        var resp = await _admin.PostAsJsonAsync("/api/v1/monitoring-points",
            new CreateMonitoringPointRequest(farmId, fieldId, type, name, 51.5, -0.1, trapTypeId, null, null));
        return (await resp.Content.ReadFromJsonAsync<ApiResponse<MonitoringPointResponse>>())!.Data!.Id;
    }

    private async Task<List<MonitoringPointResponse>> GetAllAsync(Guid? farmId = null, Guid? fieldId = null)
    {
        var url = "/api/v1/monitoring-points";
        if (farmId.HasValue) url += $"?farmId={farmId}";
        if (fieldId.HasValue) url += (farmId.HasValue ? "&" : "?") + $"fieldId={fieldId}";
        var resp = await _admin.GetAsync(url);
        return (await resp.Content.ReadFromJsonAsync<ApiResponse<List<MonitoringPointResponse>>>())!.Data!;
    }
}
