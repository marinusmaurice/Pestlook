using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Pestlook.Tests.Helpers;
using Pestlook.Tests.Integration.Infrastructure;
using Pestlook.WebAPI.Data;
using Pestlook.WebAPI.Domain.Entities;
using Pestlook.WebAPI.DTOs.Common;
using Pestlook.WebAPI.DTOs.Farms;

namespace Pestlook.Tests.Integration.Security;

/// <summary>
/// Regression coverage for the tenant-isolation bug: tenant scoping used to be
/// resolved from a client-supplied "X-Tenant-ID" header instead of the
/// authenticated JWT's "tenantId" claim. That meant any authenticated user
/// could read another tenant's data by sending a different tenant's slug in
/// the header, and omitting the header entirely returned every tenant's data
/// unfiltered (the EF Core query filters treat a null TenantId as "no filter").
///
/// These tests spin up two genuinely separate tenants — not just two users in
/// the shared fixture's default tenant — and assert that Tenant A can never
/// see Tenant B's data, regardless of what headers Tenant A's client sends.
/// </summary>
[Collection("Integration")]
public sealed class TenantIsolationTests(TestWebApplicationFactory factory) : IAsyncLifetime
{
    private HttpClient _tenantAAdmin = null!;
    private HttpClient _tenantBAdmin = null!;

    private Guid _tenantBId;
    private string _tenantBSlug = null!;
    private string _tenantBAdminId = null!;
    private string _tenantBAdminEmail = null!;

    private Guid _tenantAFarmId;
    private Guid _tenantBFarmId;

    public async Task InitializeAsync()
    {
        _tenantAAdmin = factory.CreateAdminClient();

        // ── Seed a second, wholly independent tenant directly via the DB ────────
        _tenantBSlug = $"tenant-b-{Guid.NewGuid():N}";
        _tenantBAdminEmail = $"admin_{Guid.NewGuid():N}@tenant-b.com";
        _tenantBAdminId = Guid.NewGuid().ToString();

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();

            _tenantBId = Guid.NewGuid();
            db.Tenants.Add(new Tenant { Id = _tenantBId, Name = "Tenant B Co", Slug = _tenantBSlug, IsActive = true });
            await db.SaveChangesAsync();

            var tenantBAdmin = new ApplicationUser
            {
                Id = _tenantBAdminId,
                UserName = _tenantBAdminEmail,
                Email = _tenantBAdminEmail,
                FirstName = "B",
                LastName = "Admin",
                TenantId = _tenantBId,
                EmailConfirmed = true,
            };
            await userManager.CreateAsync(tenantBAdmin, "Admin@123!");
            await userManager.AddToRoleAsync(tenantBAdmin, "Admin");
        }

        _tenantBAdmin = factory.CreateClient();
        _tenantBAdmin.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer",
            JwtTestHelper.GenerateToken(_tenantBAdminId, _tenantBAdminEmail, _tenantBId, ["Admin"]));

        // ── Each tenant creates one farm of its own ──────────────────────────────
        _tenantAFarmId = await CreateFarmAsync(_tenantAAdmin, "Tenant A Farm");
        _tenantBFarmId = await CreateFarmAsync(_tenantBAdmin, "Tenant B Farm");
    }

    public Task DisposeAsync() => Task.CompletedTask;

    // ── Baseline: each tenant sees only its own data via the normal path ───────

    [Fact]
    public async Task GetAll_ShouldOnlyReturnOwnTenantsFarms()
    {
        var farmsA = await GetFarmsAsync(_tenantAAdmin);
        farmsA.Should().Contain(f => f.Id == _tenantAFarmId);
        farmsA.Should().NotContain(f => f.Id == _tenantBFarmId);

        var farmsB = await GetFarmsAsync(_tenantBAdmin);
        farmsB.Should().Contain(f => f.Id == _tenantBFarmId);
        farmsB.Should().NotContain(f => f.Id == _tenantAFarmId);
    }

    [Fact]
    public async Task GetById_ForAnotherTenantsFarm_ShouldReturn404NotTheData()
    {
        var resp = await _tenantAAdmin.GetAsync($"/api/v1/farms/{_tenantBFarmId}");
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ── The actual regression: header no longer controls tenant scoping ────────

    [Fact]
    public async Task ForgedTenantHeader_ShouldNotGrantAccessToAnotherTenantsData()
    {
        // Tenant A's own valid JWT, but with the X-Tenant-ID header forged to
        // claim Tenant B. Before the fix, this returned Tenant B's farms.
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = _tenantAAdmin.DefaultRequestHeaders.Authorization;
        client.DefaultRequestHeaders.Add("X-Tenant-ID", _tenantBSlug);

        var resp = await client.GetAsync("/api/v1/farms");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await resp.Content.ReadFromJsonAsync<ApiResponse<List<FarmResponse>>>();

        body!.Data.Should().OnlyContain(f => f.TenantId == TestWebApplicationFactory.DefaultTenantId);
        body.Data.Should().NotContain(f => f.Id == _tenantBFarmId);
    }

    [Fact]
    public async Task MissingTenantHeader_WithValidJwt_ShouldScopeToOwnTenant_NotLeakEveryTenant()
    {
        // Valid JWT, deliberately no X-Tenant-ID header at all. Before the fix,
        // the EF Core query filters treat a null TenantId as "unfiltered", so
        // this returned every tenant's farms.
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = _tenantAAdmin.DefaultRequestHeaders.Authorization;

        var resp = await client.GetAsync("/api/v1/farms");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await resp.Content.ReadFromJsonAsync<ApiResponse<List<FarmResponse>>>();

        body!.Data.Should().OnlyContain(f => f.TenantId == TestWebApplicationFactory.DefaultTenantId);
        body.Data.Should().NotContain(f => f.Id == _tenantBFarmId);
    }

    [Fact]
    public async Task ForgedTenantHeader_OnGetById_CannotReadAnotherTenantsRecord()
    {
        // Same attack shape, but targeting a specific record by ID rather than
        // a list — confirms the fix isn't just a list-filtering coincidence.
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = _tenantAAdmin.DefaultRequestHeaders.Authorization;
        client.DefaultRequestHeaders.Add("X-Tenant-ID", _tenantBSlug);

        var resp = await client.GetAsync($"/api/v1/farms/{_tenantBFarmId}");
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ── Tenant status is still enforced, just from the JWT-resolved tenant ─────

    [Fact]
    public async Task InactiveTenant_ShouldReturn403ForAnAuthenticatedUserOfThatTenant()
    {
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var tenantB = await db.Tenants.FirstAsync(t => t.Id == _tenantBId);
            tenantB.IsActive = false;
            await db.SaveChangesAsync();
        }

        var resp = await _tenantBAdmin.GetAsync("/api/v1/farms");
        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static async Task<Guid> CreateFarmAsync(HttpClient client, string name)
    {
        var resp = await client.PostAsJsonAsync("/api/v1/farms",
            new CreateFarmRequest(name, null, null, null, null, null));
        resp.StatusCode.Should().Be(HttpStatusCode.Created, "farm creation is a test-setup precondition, not the behaviour under test");
        return (await resp.Content.ReadFromJsonAsync<ApiResponse<FarmResponse>>())!.Data!.Id;
    }

    private static async Task<List<FarmResponse>> GetFarmsAsync(HttpClient client)
    {
        var resp = await client.GetAsync("/api/v1/farms");
        return (await resp.Content.ReadFromJsonAsync<ApiResponse<List<FarmResponse>>>())!.Data!;
    }
}
