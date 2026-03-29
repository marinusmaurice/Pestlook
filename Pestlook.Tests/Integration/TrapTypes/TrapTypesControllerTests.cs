using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Pestlook.Tests.Helpers;
using Pestlook.Tests.Integration.Infrastructure;
using Pestlook.WebAPI.Domain.Enums;
using Pestlook.WebAPI.DTOs.Common;
using Pestlook.WebAPI.DTOs.TrapTypes;

namespace Pestlook.Tests.Integration.TrapTypes;

[Collection("Integration")]
public sealed class TrapTypesControllerTests(TestWebApplicationFactory factory) : IAsyncLifetime
{
    private readonly HttpClient _admin  = factory.CreateAdminClient();
    private readonly HttpClient _scout  = factory.CreateTenantClient(JwtTestHelper.GenerateToken(
        "scout-user-id", "scout@test-tenant.com",
        TestWebApplicationFactory.DefaultTenantId, roles: ["Scout"]));
    private readonly HttpClient _anon   = factory.CreateTenantClient();
    private readonly string _id = Guid.NewGuid().ToString("N")[..8];

    public Task InitializeAsync() => Task.CompletedTask;

    public Task DisposeAsync() => Task.CompletedTask;

    // ── Auth ─────────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAll_Unauthenticated_ShouldReturn401()
    {
        var resp = await _anon.GetAsync("/api/v1/trap-types");
        resp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetById_Unauthenticated_ShouldReturn401()
    {
        var id = await CreateTrapTypeAsync($"Test Trap {_id}");
        var resp = await _anon.GetAsync($"/api/v1/trap-types/{id}");
        resp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Theory]
    [InlineData("POST",   "/api/v1/trap-types")]
    [InlineData("PUT",    "/api/v1/trap-types/00000000-0000-0000-0000-000000000001")]
    [InlineData("DELETE", "/api/v1/trap-types/00000000-0000-0000-0000-000000000001")]
    public async Task MutationEndpoints_AsScout_ShouldReturn403(string method, string url)
    {
        var req = new HttpRequestMessage(new HttpMethod(method), url);
        if (method is "POST" or "PUT")
            req.Content = JsonContent.Create(new CreateTrapTypeRequest("X", null));
        var resp = await _scout.SendAsync(req);
        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    // ── GET ───────────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAll_AsScout_ShouldReturn200()
    {
        var resp = await _scout.GetAsync("/api/v1/trap-types");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetAll_ShouldContainSeededTrapType()
    {
        await CreateTrapTypeAsync("Sticky Trap");
        var resp = await _admin.GetAsync("/api/v1/trap-types");
        var body = await resp.Content.ReadFromJsonAsync<ApiResponse<List<TrapTypeResponse>>>();
        body!.Data.Should().Contain(t => t.Name == "Sticky Trap");
    }

    [Fact]
    public async Task GetAll_ShouldBeOrderedByName()
    {
        await CreateTrapTypeAsync("Z Trap");
        await CreateTrapTypeAsync("A Trap");
        var resp = await _admin.GetAsync("/api/v1/trap-types");
        var body = await resp.Content.ReadFromJsonAsync<ApiResponse<List<TrapTypeResponse>>>();
        var names = body!.Data!.Select(t => t.Name).ToList();
        names.Should().BeInAscendingOrder();
    }

    [Fact]
    public async Task GetById_WhenExists_ShouldReturn200()
    {
        var name = $"Test Trap {_id}";
        var id = await CreateTrapTypeAsync(name);
        var resp = await _admin.GetAsync($"/api/v1/trap-types/{id}");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await resp.Content.ReadFromJsonAsync<ApiResponse<TrapTypeResponse>>();
        body!.Data!.Id.Should().Be(id);
        body.Data.Name.Should().Be(name);
    }

    [Fact]
    public async Task GetById_WhenNotFound_ShouldReturn404()
    {
        var resp = await _admin.GetAsync($"/api/v1/trap-types/{Guid.NewGuid()}");
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ── POST ─────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Create_AsAdmin_ShouldReturn201WithData()
    {
        var resp = await _admin.PostAsJsonAsync("/api/v1/trap-types",
            new CreateTrapTypeRequest("Pheromone Trap", "Lures by scent"));
        resp.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await resp.Content.ReadFromJsonAsync<ApiResponse<TrapTypeResponse>>();
        body!.Data!.Name.Should().Be("Pheromone Trap");
        body.Data.Description.Should().Be("Lures by scent");
        body.Data.Id.Should().NotBeEmpty();
    }

    [Fact]
    public async Task Create_WithNameOnly_ShouldReturn201()
    {
        var resp = await _admin.PostAsJsonAsync("/api/v1/trap-types",
            new CreateTrapTypeRequest("Water Trap", null));
        resp.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task Create_DuplicateName_ShouldReturn400()
    {
        await CreateTrapTypeAsync("Duplicate Me");
        var resp = await _admin.PostAsJsonAsync("/api/v1/trap-types",
            new CreateTrapTypeRequest("Duplicate Me", null));
        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Create_DuplicateName_CaseSensitive_ShouldReturn400()
    {
        await CreateTrapTypeAsync("Case Trap");
        // Exact same name again (DB comparison is case-insensitive by default on most providers)
        var resp = await _admin.PostAsJsonAsync("/api/v1/trap-types",
            new CreateTrapTypeRequest("Case Trap", null));
        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // ── PUT ──────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Update_AsAdmin_ShouldReturn200WithUpdatedName()
    {
        var id = await CreateTrapTypeAsync("Update Me");
        var resp = await _admin.PutAsJsonAsync($"/api/v1/trap-types/{id}",
            new UpdateTrapTypeRequest("Updated Trap", "New description"));
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await resp.Content.ReadFromJsonAsync<ApiResponse<TrapTypeResponse>>();
        body!.Data!.Name.Should().Be("Updated Trap");
        body.Data.Description.Should().Be("New description");
    }

    [Fact]
    public async Task Update_WhenNotFound_ShouldReturn404()
    {
        var resp = await _admin.PutAsJsonAsync($"/api/v1/trap-types/{Guid.NewGuid()}",
            new UpdateTrapTypeRequest("X", null));
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ── DELETE ───────────────────────────────────────────────────────────────

    [Fact]
    public async Task Delete_AsAdmin_ShouldReturn204()
    {
        var id = await CreateTrapTypeAsync("Delete Me");
        var resp = await _admin.DeleteAsync($"/api/v1/trap-types/{id}");
        resp.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task Delete_WhenNotFound_ShouldReturn404()
    {
        var resp = await _admin.DeleteAsync($"/api/v1/trap-types/{Guid.NewGuid()}");
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Delete_ShouldRemoveFromGetAll()
    {
        var id = await CreateTrapTypeAsync("Removed Trap");
        await _admin.DeleteAsync($"/api/v1/trap-types/{id}");
        var resp = await _admin.GetAsync("/api/v1/trap-types");
        var body = await resp.Content.ReadFromJsonAsync<ApiResponse<List<TrapTypeResponse>>>();
        body!.Data.Should().NotContain(t => t.Id == id);
    }

    [Fact]
    public async Task Delete_ShouldMakeGetByIdReturn404()
    {
        var id = await CreateTrapTypeAsync("Get-After-Delete Trap");
        await _admin.DeleteAsync($"/api/v1/trap-types/{id}");
        var resp = await _admin.GetAsync($"/api/v1/trap-types/{id}");
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task<Guid> CreateTrapTypeAsync(string name)
    {
        var resp = await _admin.PostAsJsonAsync("/api/v1/trap-types",
            new CreateTrapTypeRequest(name, null));
        return (await resp.Content.ReadFromJsonAsync<ApiResponse<TrapTypeResponse>>())!.Data!.Id;
    }
}
