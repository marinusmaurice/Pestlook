using System.Net;
using System.Net.Http.Json;
using System.Linq;
using System.Text.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Pestlook.Tests.Helpers;
using Pestlook.Tests.Integration.Infrastructure;
using Pestlook.WebAPI.Data;
using Pestlook.WebAPI.Domain.Entities;
using Pestlook.WebAPI.Domain.Enums;
using Pestlook.WebAPI.DTOs.Common;

namespace Pestlook.Tests.Integration.Analytics;

[Collection("Integration")]
public sealed class AnalyticsControllerTests(TestWebApplicationFactory factory) : IAsyncLifetime
{
    private const string ScoutUserId = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
    private const string ScoutEmail = "analytics-scout@test-tenant.com";
    private readonly HttpClient _admin = factory.CreateAdminClient();
    private readonly HttpClient _anon = factory.CreateTenantClient();

    private static readonly Guid FarmNorthId = Guid.Parse("20000000-0000-0000-0000-000000000001");
    private static readonly Guid FarmSouthId = Guid.Parse("20000000-0000-0000-0000-000000000002");
    private static readonly Guid FieldVinesId = Guid.Parse("30000000-0000-0000-0000-000000000001");
    private static readonly Guid FieldWheatId = Guid.Parse("30000000-0000-0000-0000-000000000002");
    private static readonly Guid PestAphidId = Guid.Parse("40000000-0000-0000-0000-000000000001");
    private static readonly Guid PestBeetleId = Guid.Parse("40000000-0000-0000-0000-000000000002");
    private static readonly Guid PestLocustId = Guid.Parse("40000000-0000-0000-0000-000000000003");
    private static readonly Guid TrapTypeId = Guid.Parse("50000000-0000-0000-0000-000000000001");
    private static readonly Guid TrapNorthId = Guid.Parse("60000000-0000-0000-0000-000000000001");
    private static readonly Guid TrapSouthId = Guid.Parse("60000000-0000-0000-0000-000000000002");
    private static readonly Guid TrapDisabledId = Guid.Parse("60000000-0000-0000-0000-000000000003");
    private static readonly Guid SessionNorthOlderId = Guid.Parse("70000000-0000-0000-0000-000000000001");
    private static readonly Guid SessionNorthRecentId = Guid.Parse("70000000-0000-0000-0000-000000000002");
    private static readonly Guid SessionSouthCompletedId = Guid.Parse("70000000-0000-0000-0000-000000000003");
    private static readonly Guid SessionSouthActiveId = Guid.Parse("70000000-0000-0000-0000-000000000004");
    private static readonly Guid SessionSouthFutureId = Guid.Parse("70000000-0000-0000-0000-000000000005");
    private static readonly Guid SessionSouthOverdueId = Guid.Parse("70000000-0000-0000-0000-000000000006");

    public async Task InitializeAsync()
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        await EnsureDefaultTenantAsync(db);
        await EnsureScoutAsync(db);
        await SeedAnalyticsDataAsync(db);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task Endpoint_Unauthenticated_ShouldReturn401()
    {
        var response = await _anon.GetAsync("/api/v1/analytics/overview");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Overview_ShouldReturnExpectedKpisTrendAndTopPests()
    {
        var data = await GetAnalyticsDataAsync("/api/v1/analytics/overview?dateRange=30");
        var kpis = data.GetProperty("kpis");
        var topPests = data.GetProperty("topPests");
        var weeklyTrend = data.GetProperty("weeklyTrend");

        kpis.GetProperty("TotalSessions").GetInt32().Should().Be(3);
        kpis.GetProperty("CompletedSessions").GetInt32().Should().Be(3);
        kpis.GetProperty("TotalObservations").GetInt32().Should().Be(73);
        kpis.GetProperty("ThresholdBreaches").GetInt32().Should().Be(5);
        topPests[0].GetProperty("PestName").GetString().Should().Be("Locust");
        topPests[0].GetProperty("TotalCount").GetInt32().Should().Be(28);
        weeklyTrend.GetArrayLength().Should().Be(3);
    }

    [Fact]
    public async Task Alerts_ShouldReturnBreachesRepeatOffendersAndTrend()
    {
        var data = await GetAnalyticsDataAsync("/api/v1/analytics/alerts?dateRange=30");
        var breaches = data.GetProperty("breaches");
        var repeatOffenders = data.GetProperty("repeatOffenders");
        var weeklyTrend = data.GetProperty("weeklyTrend");

        breaches.GetArrayLength().Should().Be(5);
        repeatOffenders.GetArrayLength().Should().Be(1);
        repeatOffenders[0].GetProperty("PestName").GetString().Should().Be("Aphid");
        repeatOffenders[0].GetProperty("FieldName").GetString().Should().Be("Vines Block");
        repeatOffenders[0].GetProperty("BreachCount").GetInt32().Should().Be(2);
        weeklyTrend.GetArrayLength().Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task PestPressure_ShouldReturnExpectedFieldAggregates()
    {
        var data = await GetAnalyticsDataAsync("/api/v1/analytics/pest-pressure?dateRange=30");
        var fields = data.GetProperty("fields");

        fields.GetArrayLength().Should().Be(2);
        var vines = fields.EnumerateArray().Single(x => x.GetProperty("FieldName").GetString() == "Vines Block");
        var wheat = fields.EnumerateArray().Single(x => x.GetProperty("FieldName").GetString() == "Wheat Block");

        vines.GetProperty("SessionCount").GetInt32().Should().Be(2);
        vines.GetProperty("TotalObs").GetInt32().Should().Be(57);
        vines.GetProperty("BreachCount").GetInt32().Should().Be(3);
        vines.GetProperty("AvgObsPerSession").GetDouble().Should().Be(28.5);
        vines.GetProperty("TopPests")[0].GetProperty("PestName").GetString().Should().Be("Locust");

        wheat.GetProperty("SessionCount").GetInt32().Should().Be(1);
        wheat.GetProperty("TotalObs").GetInt32().Should().Be(16);
        wheat.GetProperty("BreachCount").GetInt32().Should().Be(1);
    }

    [Fact]
    public async Task SessionsSummary_ShouldReturnExpectedStatusKpisAndScoutCompliance()
    {
        var data = await GetAnalyticsDataAsync("/api/v1/analytics/sessions-summary?dateRange=30");
        var kpis = data.GetProperty("kpis");
        var scoutCompliance = data.GetProperty("scoutCompliance");
        var sessions = data.GetProperty("sessions");

        kpis.GetProperty("Total").GetInt32().Should().Be(6);
        kpis.GetProperty("Completed").GetInt32().Should().Be(3);
        kpis.GetProperty("Planned").GetInt32().Should().Be(1);
        kpis.GetProperty("Overdue").GetInt32().Should().Be(1);
        kpis.GetProperty("Active").GetInt32().Should().Be(1);
        kpis.GetProperty("CompletionRate").GetDouble().Should().Be(50);
        kpis.GetProperty("AvgDurationMin").GetInt32().Should().Be(41);
        kpis.GetProperty("MinDurationMin").GetInt32().Should().Be(30);
        kpis.GetProperty("MaxDurationMin").GetInt32().Should().Be(55);
        scoutCompliance.GetArrayLength().Should().Be(2);
        sessions.GetArrayLength().Should().Be(6);
    }

    [Fact]
    public async Task TopPests_ShouldReturnRankedPestsWithCountsAndLifeStages()
    {
        var data = await GetAnalyticsDataAsync("/api/v1/analytics/top-pests?dateRange=30");
        var pests = data.GetProperty("pests");

        pests.GetArrayLength().Should().Be(3);
        pests[0].GetProperty("PestName").GetString().Should().Be("Locust");
        pests[0].GetProperty("TotalCount").GetInt32().Should().Be(28);
        pests[0].GetProperty("FieldCount").GetInt32().Should().Be(2);
        pests[0].GetProperty("SessionCount").GetInt32().Should().Be(2);
        pests[0].GetProperty("BreachCount").GetInt32().Should().Be(1);
        pests[0].GetProperty("TopLifeStage").GetString().Should().Be("Adult");
    }

    [Fact]
    public async Task TrapPerformance_ShouldReturnTrapAndCatchTypeMetrics()
    {
        var data = await GetAnalyticsDataAsync("/api/v1/analytics/trap-performance?dateRange=30");
        var traps = data.GetProperty("traps");
        var catchesByType = data.GetProperty("catchesByType");

        traps.GetArrayLength().Should().Be(3);
        var northTrap = traps.EnumerateArray().Single(x => x.GetProperty("TrapName").GetString() == "North Trap");
        northTrap.GetProperty("CheckCount").GetInt32().Should().Be(2);
        northTrap.GetProperty("TotalCatches").GetInt32().Should().Be(55);
        northTrap.GetProperty("CatchRate").GetDouble().Should().Be(27.5);
        northTrap.GetProperty("TopPest").GetString().Should().Be("Locust");
        catchesByType[0].GetProperty("TrapType").GetString().Should().Be("Analytics Delta Trap");
        catchesByType[0].GetProperty("TotalCatches").GetInt32().Should().Be(65);
    }

    [Fact]
    public async Task ScoutProductivity_ShouldReturnExpectedScoutAggregates()
    {
        var data = await GetAnalyticsDataAsync("/api/v1/analytics/scout-productivity?dateRange=30");
        var scouts = data.GetProperty("scouts");
        var weeklyActivity = data.GetProperty("weeklyActivity");

        scouts.GetArrayLength().Should().Be(2);
        var sally = scouts.EnumerateArray().Single(x => x.GetProperty("ScouterName").GetString() == "Sally Scout");
        sally.GetProperty("TotalSessions").GetInt32().Should().Be(5);
        sally.GetProperty("Completed").GetInt32().Should().Be(2);
        sally.GetProperty("CompletionRate").GetDouble().Should().Be(40);
        sally.GetProperty("TotalObs").GetInt32().Should().Be(25);
        sally.GetProperty("AlertCount").GetInt32().Should().Be(2);
        weeklyActivity.GetArrayLength().Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task SeasonalTrends_ShouldReturnMonthBuckets()
    {
        var data = await GetAnalyticsDataAsync("/api/v1/analytics/seasonal-trends");
        var months = data.GetProperty("months");

        months.GetArrayLength().Should().BeGreaterThan(0);
        var currentMonth = months.EnumerateArray().Single();
        currentMonth.GetProperty("SessionCount").GetInt32().Should().Be(3);
        currentMonth.GetProperty("TotalObs").GetInt32().Should().Be(65);
        currentMonth.GetProperty("AvgTempCelsius").GetDouble().Should().BeApproximately(23.3, 0.1);
        currentMonth.GetProperty("TopPests")[0].GetProperty("PestName").GetString().Should().Be("Locust");
    }

    [Fact]
    public async Task UnknownPests_ShouldReturnUnknownKpisItemsAndTrend()
    {
        var data = await GetAnalyticsDataAsync("/api/v1/analytics/unknown-pests?dateRange=30");
        var kpis = data.GetProperty("kpis");
        var items = data.GetProperty("items");
        var weeklyTrend = data.GetProperty("weeklyTrend");

        kpis.GetProperty("Total").GetInt32().Should().Be(2);
        kpis.GetProperty("WithPhotos").GetInt32().Should().Be(2);
        kpis.GetProperty("WithNotes").GetInt32().Should().Be(2);
        kpis.GetProperty("FieldsAffected").GetInt32().Should().Be(2);
        items.GetArrayLength().Should().Be(2);
        items[0].GetProperty("IsPriority").GetBoolean().Should().BeTrue();
        weeklyTrend.GetArrayLength().Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task FieldCoverage_ShouldReturnCoverageForEachField()
    {
        var data = await GetAnalyticsDataAsync("/api/v1/analytics/field-coverage");
        data.GetProperty("targetPerMonth").GetInt32().Should().Be(4);
        var fields = data.GetProperty("fields");
        fields.GetArrayLength().Should().Be(2);

        var vines = fields.EnumerateArray().Single(x => x.GetProperty("Name").GetString() == "Vines Block");
        var wheat = fields.EnumerateArray().Single(x => x.GetProperty("Name").GetString() == "Wheat Block");

        vines.GetProperty("SessionsThisMonth").GetInt32().Should().Be(2);
        vines.GetProperty("CoveragePct").GetInt32().Should().Be(50);
        vines.GetProperty("TopPest").GetString().Should().Be("Locust");
        wheat.GetProperty("SessionsThisMonth").GetInt32().Should().Be(1);
        wheat.GetProperty("CoveragePct").GetInt32().Should().Be(25);
    }

    [Fact]
    public async Task Billing_ShouldReturnActiveTrapCountAndSnapshots()
    {
        var data = await GetAnalyticsDataAsync("/api/v1/analytics/billing");
        data.GetProperty("activeTraps").GetInt32().Should().Be(2);
        var snapshots = data.GetProperty("snapshots");
        snapshots.GetArrayLength().Should().Be(2);
        snapshots[0].GetProperty("AmountCents").GetInt32().Should().Be(4500);
        snapshots[0].GetProperty("Status").GetString().Should().Be("paid");
    }

    [Fact]
    public async Task Sessions_ShouldReturnObservationRichPayload()
    {
        var response = await _admin.GetAsync("/api/v1/analytics/sessions?page=1&pageSize=10");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<ApiResponse<PagedResult<JsonElement>>>();
        body!.Success.Should().BeTrue();
        body.Data!.Items.Count.Should().Be(6);
        body.Data.TotalCount.Should().Be(6);
        body.Data.Items[0].GetProperty("observations").GetArrayLength().Should().BeGreaterThan(0);
    }

    private static async Task EnsureDefaultTenantAsync(ApplicationDbContext db)
    {
        var tenant = await db.Tenants.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == TestWebApplicationFactory.DefaultTenantId);
        if (tenant is not null)
        {
            if (tenant.Slug != TestWebApplicationFactory.DefaultTenantSlug || !tenant.IsActive)
            {
                tenant.Slug = TestWebApplicationFactory.DefaultTenantSlug;
                tenant.IsActive = true;
                await db.SaveChangesAsync();
            }

            return;
        }

        db.Tenants.Add(new Tenant
        {
            Id = TestWebApplicationFactory.DefaultTenantId,
            Name = "Test Tenant",
            Slug = TestWebApplicationFactory.DefaultTenantSlug,
            IsActive = true
        });
        await db.SaveChangesAsync();
    }

    private static async Task EnsureScoutAsync(ApplicationDbContext db)
    {
        if (await db.Users.IgnoreQueryFilters().AnyAsync(u => u.Id == ScoutUserId))
        {
            return;
        }

        db.Users.Add(new ApplicationUser
        {
            Id = ScoutUserId,
            TenantId = TestWebApplicationFactory.DefaultTenantId,
            UserName = ScoutEmail,
            NormalizedUserName = ScoutEmail.ToUpperInvariant(),
            Email = ScoutEmail,
            NormalizedEmail = ScoutEmail.ToUpperInvariant(),
            EmailConfirmed = true,
            FirstName = "Sally",
            LastName = "Scout",
            IsActive = true,
            SecurityStamp = Guid.NewGuid().ToString("N")
        });

        await db.SaveChangesAsync();
    }

    private static async Task SeedAnalyticsDataAsync(ApplicationDbContext db)
    {
        var tenantId = TestWebApplicationFactory.DefaultTenantId;
        var now = DateTime.Now;

        var existingSnapshots = await db.BillingSnapshots.Where(x => x.TenantId == tenantId).ToListAsync();
        db.BillingSnapshots.RemoveRange(existingSnapshots);

        var existingObservations = await db.SessionObservations.Where(x => x.TenantId == tenantId).ToListAsync();
        db.SessionObservations.RemoveRange(existingObservations);

        var existingSessions = await db.ScoutingSessions.Where(x => x.TenantId == tenantId).ToListAsync();
        db.ScoutingSessions.RemoveRange(existingSessions);

        var existingTraps = await db.Traps.Where(x => x.TenantId == tenantId).ToListAsync();
        db.Traps.RemoveRange(existingTraps);

        var existingFields = await db.Fields.Where(x => x.TenantId == tenantId).ToListAsync();
        db.Fields.RemoveRange(existingFields);

        var existingFarms = await db.Farms.Where(x => x.TenantId == tenantId).ToListAsync();
        db.Farms.RemoveRange(existingFarms);

        var existingPests = await db.Pests.Where(x => x.TenantId == tenantId).ToListAsync();
        db.Pests.RemoveRange(existingPests);

        var existingTrapType = await db.TrapTypes.Where(x => x.Id == TrapTypeId).ToListAsync();
        db.TrapTypes.RemoveRange(existingTrapType);

        await db.SaveChangesAsync();

        var northFarm = new Farm
        {
            Id = FarmNorthId,
            TenantId = tenantId,
            Name = "Analytics North Farm",
            Address = "North Road",
            Latitude = -33.48,
            Longitude = 19.62,
            BoundaryColor = "#00AA00",
            CreatedByUserId = TestWebApplicationFactory.DefaultAdminId,
            UpdatedByUserId = TestWebApplicationFactory.DefaultAdminId
        };

        var southFarm = new Farm
        {
            Id = FarmSouthId,
            TenantId = tenantId,
            Name = "Analytics South Farm",
            Address = "South Road",
            Latitude = -33.72,
            Longitude = 18.95,
            BoundaryColor = "#0000AA",
            CreatedByUserId = TestWebApplicationFactory.DefaultAdminId,
            UpdatedByUserId = TestWebApplicationFactory.DefaultAdminId
        };

        var vinesField = new Field
        {
            Id = FieldVinesId,
            TenantId = tenantId,
            FarmId = FarmNorthId,
            Name = "Vines Block",
            CropType = "Grapes",
            AreaHectares = 18,
            Latitude = -33.482,
            Longitude = 19.623,
            CreatedByUserId = TestWebApplicationFactory.DefaultAdminId,
            UpdatedByUserId = TestWebApplicationFactory.DefaultAdminId
        };

        var wheatField = new Field
        {
            Id = FieldWheatId,
            TenantId = tenantId,
            FarmId = FarmSouthId,
            Name = "Wheat Block",
            CropType = "Wheat",
            AreaHectares = 22,
            Latitude = -33.728,
            Longitude = 18.955,
            CreatedByUserId = TestWebApplicationFactory.DefaultAdminId,
            UpdatedByUserId = TestWebApplicationFactory.DefaultAdminId
        };

        var aphid = new Pest
        {
            Id = PestAphidId,
            TenantId = tenantId,
            CommonName = "Aphid",
            Category = PestCategory.Insect,
            DefaultCaptureMode = CaptureMode.Count,
            ThresholdCount = 10,
            IsSystemPest = false,
            CreatedByUserId = TestWebApplicationFactory.DefaultAdminId
        };

        var beetle = new Pest
        {
            Id = PestBeetleId,
            TenantId = tenantId,
            CommonName = "Beetle",
            Category = PestCategory.Insect,
            DefaultCaptureMode = CaptureMode.Count,
            ThresholdCount = 5,
            IsSystemPest = false,
            CreatedByUserId = TestWebApplicationFactory.DefaultAdminId
        };

        var locust = new Pest
        {
            Id = PestLocustId,
            TenantId = tenantId,
            CommonName = "Locust",
            Category = PestCategory.Insect,
            DefaultCaptureMode = CaptureMode.Count,
            ThresholdCount = 20,
            IsSystemPest = false,
            CreatedByUserId = TestWebApplicationFactory.DefaultAdminId
        };

        var trapType = new TrapType
        {
            Id = TrapTypeId,
            TenantId = null,
            Name = "Analytics Delta Trap",
            Description = "Analytics test trap",
            CreatedAt = now.AddMonths(-3)
        };

        var northTrap = new Trap
        {
            Id = TrapNorthId,
            TenantId = tenantId,
            Name = "North Trap",
            TrapTypeId = TrapTypeId,
            FieldId = FieldVinesId,
            IsEnabled = true,
            Latitude = -33.4821,
            Longitude = 19.6234,
            CreatedByUserId = TestWebApplicationFactory.DefaultAdminId,
            UpdatedByUserId = TestWebApplicationFactory.DefaultAdminId
        };

        var southTrap = new Trap
        {
            Id = TrapSouthId,
            TenantId = tenantId,
            Name = "South Trap",
            TrapTypeId = TrapTypeId,
            FieldId = FieldWheatId,
            IsEnabled = true,
            Latitude = -33.7285,
            Longitude = 18.9548,
            CreatedByUserId = TestWebApplicationFactory.DefaultAdminId,
            UpdatedByUserId = TestWebApplicationFactory.DefaultAdminId
        };

        var disabledTrap = new Trap
        {
            Id = TrapDisabledId,
            TenantId = tenantId,
            Name = "Disabled Trap",
            TrapTypeId = TrapTypeId,
            FieldId = FieldWheatId,
            IsEnabled = false,
            Latitude = -33.7287,
            Longitude = 18.9551,
            CreatedByUserId = TestWebApplicationFactory.DefaultAdminId,
            UpdatedByUserId = TestWebApplicationFactory.DefaultAdminId
        };

        var northOlderCompletedAt = now.AddDays(-10);
        var northRecentCompletedAt = now.AddDays(-3);
        var southCompletedAt = now.AddDays(-1);

        var sessions = new[]
        {
            new ScoutingSession
            {
                Id = SessionNorthOlderId,
                TenantId = tenantId,
                ScouterId = ScoutUserId,
                FieldId = FieldVinesId,
                FarmId = FarmNorthId,
                IsPlanned = false,
                StartedAt = northOlderCompletedAt.AddMinutes(-40),
                CompletedAt = northOlderCompletedAt,
                WeatherConditions = "Sunny",
                TemperatureCelsius = 24,
                Notes = "Older north session",
                CreatedAt = northOlderCompletedAt.AddMinutes(-50),
                CreatedByUserId = TestWebApplicationFactory.DefaultAdminId,
                UpdatedByUserId = TestWebApplicationFactory.DefaultAdminId
            },
            new ScoutingSession
            {
                Id = SessionNorthRecentId,
                TenantId = tenantId,
                ScouterId = TestWebApplicationFactory.DefaultAdminId,
                FieldId = FieldVinesId,
                FarmId = FarmNorthId,
                IsPlanned = false,
                StartedAt = northRecentCompletedAt.AddMinutes(-55),
                CompletedAt = northRecentCompletedAt,
                WeatherConditions = "Windy",
                TemperatureCelsius = 27,
                Notes = "Recent north session",
                CreatedAt = northRecentCompletedAt.AddMinutes(-65),
                CreatedByUserId = TestWebApplicationFactory.DefaultAdminId,
                UpdatedByUserId = TestWebApplicationFactory.DefaultAdminId
            },
            new ScoutingSession
            {
                Id = SessionSouthCompletedId,
                TenantId = tenantId,
                ScouterId = ScoutUserId,
                FieldId = FieldWheatId,
                FarmId = FarmSouthId,
                IsPlanned = false,
                StartedAt = southCompletedAt.AddMinutes(-30),
                CompletedAt = southCompletedAt,
                WeatherConditions = "Cloudy",
                TemperatureCelsius = 19,
                Notes = "Recent south session",
                CreatedAt = southCompletedAt.AddMinutes(-40),
                CreatedByUserId = TestWebApplicationFactory.DefaultAdminId,
                UpdatedByUserId = TestWebApplicationFactory.DefaultAdminId
            },
            new ScoutingSession
            {
                Id = SessionSouthActiveId,
                TenantId = tenantId,
                ScouterId = ScoutUserId,
                FieldId = FieldWheatId,
                FarmId = FarmSouthId,
                IsPlanned = false,
                StartedAt = now.AddHours(-5),
                CompletedAt = null,
                WeatherConditions = "Warm",
                TemperatureCelsius = 21,
                Notes = "Active south session",
                CreatedAt = now.AddHours(-6),
                CreatedByUserId = TestWebApplicationFactory.DefaultAdminId,
                UpdatedByUserId = TestWebApplicationFactory.DefaultAdminId
            },
            new ScoutingSession
            {
                Id = SessionSouthFutureId,
                TenantId = tenantId,
                ScouterId = ScoutUserId,
                FieldId = FieldWheatId,
                FarmId = FarmSouthId,
                IsPlanned = true,
                ScheduledDate = now.AddDays(2),
                Notes = "Future planned session",
                CreatedAt = now.AddDays(-2),
                CreatedByUserId = TestWebApplicationFactory.DefaultAdminId,
                UpdatedByUserId = TestWebApplicationFactory.DefaultAdminId
            },
            new ScoutingSession
            {
                Id = SessionSouthOverdueId,
                TenantId = tenantId,
                ScouterId = ScoutUserId,
                FieldId = FieldWheatId,
                FarmId = FarmSouthId,
                IsPlanned = true,
                ScheduledDate = now.AddDays(-2),
                Notes = "Overdue planned session",
                CreatedAt = now.AddDays(-5),
                CreatedByUserId = TestWebApplicationFactory.DefaultAdminId,
                UpdatedByUserId = TestWebApplicationFactory.DefaultAdminId
            }
        };

        var observations = new[]
        {
            CreateObservation(Guid.Parse("80000000-0000-0000-0000-000000000001"), tenantId, SessionNorthOlderId, TrapNorthId, PestAphidId, 12, 10, false, "aphid breach 1", LifeStage.Adult, northOlderCompletedAt.AddMinutes(-10), -33.4821, 19.6234),
            CreateObservation(Guid.Parse("80000000-0000-0000-0000-000000000002"), tenantId, SessionNorthOlderId, TrapNorthId, PestBeetleId, 4, 5, false, "beetle below threshold", LifeStage.Larva, northOlderCompletedAt.AddMinutes(-8), -33.4822, 19.6235),
            CreateObservation(Guid.Parse("80000000-0000-0000-0000-000000000003"), tenantId, SessionNorthOlderId, null, null, 2, null, true, "unknown north", LifeStage.Unknown, northOlderCompletedAt.AddMinutes(-5), -33.4823, 19.6236, "[\"https://example.com/unknown-north.jpg\"]"),
            CreateObservation(Guid.Parse("80000000-0000-0000-0000-000000000004"), tenantId, SessionNorthRecentId, TrapNorthId, PestAphidId, 14, 10, false, "aphid breach 2", LifeStage.Nymph, northRecentCompletedAt.AddMinutes(-15), -33.4820, 19.6232),
            CreateObservation(Guid.Parse("80000000-0000-0000-0000-000000000005"), tenantId, SessionNorthRecentId, TrapNorthId, PestLocustId, 25, 20, false, "locust breach", LifeStage.Adult, northRecentCompletedAt.AddMinutes(-12), -33.4821, 19.6233),
            CreateObservation(Guid.Parse("80000000-0000-0000-0000-000000000006"), tenantId, SessionSouthCompletedId, TrapSouthId, PestBeetleId, 7, 5, false, "south beetle breach", LifeStage.Adult, southCompletedAt.AddMinutes(-10), -33.7285, 18.9548),
            CreateObservation(Guid.Parse("80000000-0000-0000-0000-000000000007"), tenantId, SessionSouthCompletedId, null, null, 6, null, true, "unknown south", LifeStage.Unknown, southCompletedAt.AddMinutes(-7), -33.7286, 18.9549, "[\"https://example.com/unknown-south.jpg\"]"),
            CreateObservation(Guid.Parse("80000000-0000-0000-0000-000000000008"), tenantId, SessionSouthCompletedId, TrapSouthId, PestLocustId, 3, 20, false, "minor locust", LifeStage.Egg, southCompletedAt.AddMinutes(-6), -33.7284, 18.9547)
        };

        var billing = new[]
        {
            new BillingSnapshot
            {
                Id = Guid.Parse("90000000-0000-0000-0000-000000000001"),
                TenantId = tenantId,
                OwnerId = TestWebApplicationFactory.DefaultAdminId,
                BillingMonth = new DateTime(now.Year, now.Month, 1),
                ActivePointCount = 2,
                AmountCents = 4500,
                Status = "paid",
                CreatedAt = now.AddDays(-2)
            },
            new BillingSnapshot
            {
                Id = Guid.Parse("90000000-0000-0000-0000-000000000002"),
                TenantId = tenantId,
                OwnerId = TestWebApplicationFactory.DefaultAdminId,
                BillingMonth = new DateTime(now.AddMonths(-1).Year, now.AddMonths(-1).Month, 1),
                ActivePointCount = 3,
                AmountCents = 6000,
                Status = "pending",
                CreatedAt = now.AddMonths(-1)
            }
        };

        db.Farms.AddRange(northFarm, southFarm);
        db.Fields.AddRange(vinesField, wheatField);
        db.Pests.AddRange(aphid, beetle, locust);
        db.TrapTypes.Add(trapType);
        db.Traps.AddRange(northTrap, southTrap, disabledTrap);
        db.ScoutingSessions.AddRange(sessions);
        db.SessionObservations.AddRange(observations);
        db.BillingSnapshots.AddRange(billing);
        await db.SaveChangesAsync();
    }

    private static SessionObservation CreateObservation(
        Guid id,
        Guid tenantId,
        Guid sessionId,
        Guid? trapId,
        Guid? pestId,
        int count,
        int? threshold,
        bool isUnknown,
        string notes,
        LifeStage lifeStage,
        DateTime observedAt,
        double latitude,
        double longitude,
        string? photoUrlsJson = null)
    {
        return new SessionObservation
        {
            Id = id,
            TenantId = tenantId,
            SessionId = sessionId,
            ObservationType = trapId.HasValue ? ObservationType.Trap : ObservationType.AdHoc,
            IsPlanned = false,
            TrapId = trapId,
            PestId = pestId,
            CaptureMode = CaptureMode.Count,
            Count = count,
            Latitude = latitude,
            Longitude = longitude,
            IsUnknownPest = isUnknown,
            Notes = notes,
            ThresholdCount = threshold,
            LifeStage = lifeStage,
            SortOrder = 0,
            CreatedAt = observedAt,
            ObservedAt = observedAt,
            PhotoUrlsJson = photoUrlsJson,
            CreatedByUserId = TestWebApplicationFactory.DefaultAdminId,
            UpdatedByUserId = TestWebApplicationFactory.DefaultAdminId
        };
    }

    private async Task<JsonElement> GetAnalyticsDataAsync(string url)
    {
        var response = await _admin.GetAsync(url);
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<ApiResponse<JsonElement>>();
        body!.Success.Should().BeTrue();
        return body.Data!;
    }
}
