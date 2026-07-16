using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Pestlook.WebAPI.Domain.Entities;
using Pestlook.WebAPI.Domain.Enums;
using Pestlook.WebAPI.Infrastructure;

namespace Pestlook.WebAPI.Data.Seeding;

/// <summary>
/// Seeds realistic fake data for development/demo purposes.
/// Only runs when no farms exist for the demo tenant, so it is idempotent.
/// </summary>
public static class DevDataSeeder
{
    /// <returns>True if data was actually seeded; false if the demo tenant already existed (no-op).</returns>
    public static async Task<bool> SeedAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db          = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();

        // ── Guard: already seeded? ────────────────────────────────────────────
        if (await db.Tenants.AnyAsync(t => t.Slug == "demo-farm-co"))
            return false;

        // ── Tenant ────────────────────────────────────────────────────────────
        var tenant = new Tenant
        {
            Id                   = Guid.NewGuid(),
            Name                 = "Demo Farm Co",
            Slug                 = "demo-farm-co",
            IsActive             = true,
            SubscriptionPlan     = SubscriptionPlan.Free,
            MonitoringPointQuota = 10000,
            CreatedAt            = DateTime.UtcNow
        };
        db.Tenants.Add(tenant);
        await db.SaveChangesAsync();

        // ── Users ─────────────────────────────────────────────────────────────
        var admin = new ApplicationUser
        {
            Id              = Guid.NewGuid().ToString(),
            TenantId        = tenant.Id,
            UserName        = "admin@demofarm.co",
            Email           = "admin@demofarm.co",
            EmailConfirmed  = true,
            FirstName       = "Alice",
            LastName        = "Grower",
            IsActive        = true,
            TemperatureUnit = "C"
        };
        await userManager.CreateAsync(admin, "Demo@1234!");
        await userManager.AddToRoleAsync(admin, "Admin");

        var scout = new ApplicationUser
        {
            Id              = Guid.NewGuid().ToString(),
            TenantId        = tenant.Id,
            UserName        = "scout@demofarm.co",
            Email           = "scout@demofarm.co",
            EmailConfirmed  = true,
            FirstName       = "Bob",
            LastName        = "Scout",
            IsActive        = true,
            TemperatureUnit = "C"
        };
        await userManager.CreateAsync(scout, "Demo@1234!");
        await userManager.AddToRoleAsync(scout, "Scout");

        // ── Pests (system catalogue + Unknown) ───────────────────────────────
        var pests = SystemPestCatalogue.BuildForTenant(tenant.Id, admin.Id);
        pests.Insert(0, new Pest
        {
            TenantId           = tenant.Id,
            CommonName         = "Unknown",
            Category           = PestCategory.Other,
            DefaultCaptureMode = CaptureMode.Count,
            IsSystemPest       = true,
            CreatedByUserId    = admin.Id
        });
        db.Pests.AddRange(pests);
        await db.SaveChangesAsync();

        // ── Farms (5) + Fields (4 per farm = 20) ─────────────────────────────
        var rng = new Random(42);
        var (farms, farmRegions)   = BuildFarms(tenant.Id, admin.Id, rng);
        var (fields, fieldRegions) = BuildFields(tenant.Id, admin.Id, farms, farmRegions, rng);
        db.Farms.AddRange(farms);
        db.Fields.AddRange(fields);
        await db.SaveChangesAsync();

        // ── Traps (2–4 per field, guaranteed inside field boundary) ──────────
        var traps = BuildTraps(tenant.Id, admin.Id, fields, fieldRegions, rng);
        db.Traps.AddRange(traps);
        await db.SaveChangesAsync();

        // ── Scouting sessions (~5,000) ────────────────────────────────────────
        var sessions = BuildSessions(tenant.Id, admin.Id, scout.Id, farms, fields, rng);
        const int sessionBatch = 500;
        for (int i = 0; i < sessions.Count; i += sessionBatch)
        {
            db.ScoutingSessions.AddRange(sessions.Skip(i).Take(sessionBatch));
            await db.SaveChangesAsync();
        }

        // ── Observations (~100,000) ───────────────────────────────────────────
        var observations = BuildObservations(tenant.Id, admin.Id, scout.Id, sessions, pests, traps, fieldRegions, rng);
        const int obsBatch = 5000;
        for (int i = 0; i < observations.Count; i += obsBatch)
        {
            db.SessionObservations.AddRange(observations.Skip(i).Take(obsBatch));
            await db.SaveChangesAsync();
        }

        return true;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Geo helpers
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Axis-aligned bounding box used to place sub-features and sample random
    /// points that are guaranteed to be inside a rectangular region.
    /// </summary>
    private readonly record struct GeoRect(double MinLat, double MinLon, double MaxLat, double MaxLon)
    {
        public double SpanLat => MaxLat - MinLat;
        public double SpanLon => MaxLon - MinLon;

        /// <summary>Sample a uniform random point strictly inside this rectangle.</summary>
        public (double Lat, double Lon) RandomPoint(Random rng) =>
            (Math.Round(MinLat + rng.NextDouble() * SpanLat, 7),
             Math.Round(MinLon + rng.NextDouble() * SpanLon, 7));

        /// <summary>Shrink inward by <paramref name="fraction"/> on each edge.</summary>
        public GeoRect Inset(double fraction)
        {
            var dLat = SpanLat * fraction;
            var dLon = SpanLon * fraction;
            return new GeoRect(MinLat + dLat, MinLon + dLon, MaxLat - dLat, MaxLon - dLon);
        }
    }

    /// <summary>
    /// Builds a closed GeoJSON Polygon from a <see cref="GeoRect"/> by slightly
    /// perturbing each corner to produce a realistic organic quadrilateral.
    /// Coordinates are lon,lat (GeoJSON spec). First and last point are identical.
    /// </summary>
    private static string BuildPolygonGeoJson(GeoRect rect, Random rng, double perturbFrac = 0.08)
    {
        double dLat = rect.SpanLat * perturbFrac;
        double dLon = rect.SpanLon * perturbFrac;

        double Jitter(double v, double d) => v + (rng.NextDouble() * 2 - 1) * d;

        // SW, SE, NE, NW corners (CCW)
        var sw = (Lon: Jitter(rect.MinLon, dLon), Lat: Jitter(rect.MinLat, dLat));
        var se = (Lon: Jitter(rect.MaxLon, dLon), Lat: Jitter(rect.MinLat, dLat));
        var ne = (Lon: Jitter(rect.MaxLon, dLon), Lat: Jitter(rect.MaxLat, dLat));
        var nw = (Lon: Jitter(rect.MinLon, dLon), Lat: Jitter(rect.MaxLat, dLat));

        static string Pt((double Lon, double Lat) p) => $"[{p.Lon:F7},{p.Lat:F7}]";
        var pts = $"{Pt(sw)},{Pt(se)},{Pt(ne)},{Pt(nw)},{Pt(sw)}";

        return $"{{\"type\":\"Polygon\",\"coordinates\":[[{pts}]]}}";
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Farms — each gets a real-world centre, a ~200–400 ha bounding polygon,
    //         auto-computed area, and a unique hex colour.
    // ─────────────────────────────────────────────────────────────────────────

    private static readonly string[] FarmColors =
    [
        "#2ecc71",  // Emerald green  – Sunrise Valley Farm
        "#3498db",  // Peter River blue – Green Acres
        "#e67e22",  // Carrot orange  – Hillcrest Orchards
        "#9b59b6",  // Amethyst purple – Delta Growers
        "#1abc9c",  // Green sea teal – Coastal Fields
    ];

    // (Name, Address, CentreLat, CentreLon, HalfLat, HalfLon)
    // HalfLat/HalfLon sized so the farm is roughly 2–4 km on a side (~400–900 ha)
    private static readonly (string Name, string Address, double CentreLat, double CentreLon,
                              double HalfLat, double HalfLon)[] FarmTemplates =
    [
        ("Sunrise Valley Farm", "12 Valley Road, Fresno, CA",      36.7378, -119.7871, 0.022, 0.028),
        ("Green Acres",         "450 Prairie Lane, Ames, IA",      42.0308,  -93.6319, 0.024, 0.030),
        ("Hillcrest Orchards",  "88 Orchard Hill, Hood River, OR", 45.7054, -121.5217, 0.020, 0.026),
        ("Delta Growers",       "330 River Bend, Greenville, MS",  33.4099,  -91.0629, 0.025, 0.032),
        ("Coastal Fields",      "7 Sea Breeze Dr, Salinas, CA",    36.6777, -121.6555, 0.018, 0.024),
    ];

    private static (List<Farm> Farms, Dictionary<Guid, GeoRect> Regions) BuildFarms(
        Guid tenantId, string userId, Random rng)
    {
        var now     = DateTime.UtcNow;
        var farms   = new List<Farm>();
        var regions = new Dictionary<Guid, GeoRect>();

        for (int fi = 0; fi < FarmTemplates.Length; fi++)
        {
            var t     = FarmTemplates[fi];
            var color = FarmColors[fi % FarmColors.Length];

            var rect = new GeoRect(
                MinLat: t.CentreLat - t.HalfLat,
                MinLon: t.CentreLon - t.HalfLon,
                MaxLat: t.CentreLat + t.HalfLat,
                MaxLon: t.CentreLon + t.HalfLon);

            var geoJson  = BuildPolygonGeoJson(rect, rng, perturbFrac: 0.06);
            var areaHa   = GeoJsonUtils.ComputeAreaHectares(geoJson);
            var centroid = GeoJsonUtils.ComputeCentroid(geoJson);

            var farm = new Farm
            {
                Id              = Guid.NewGuid(),
                TenantId        = tenantId,
                Name            = t.Name,
                Address         = t.Address,
                Latitude        = centroid?.Lat ?? t.CentreLat,
                Longitude       = centroid?.Lon ?? t.CentreLon,
                BoundaryGeoJson = geoJson,
                AreaHectares    = areaHa,
                BoundaryColor   = color,
                IsActive        = true,
                CreatedAt       = now,
                UpdatedAt       = now,
                CreatedByUserId = userId
            };

            farms.Add(farm);
            regions[farm.Id] = rect;
        }

        return (farms, regions);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Fields — each farm is divided into 4 non-overlapping rectangular blocks
    //          arranged in a 2×2 grid with a 4 % gutter.
    //          Every field polygon is strictly inside the parent farm boundary.
    // ─────────────────────────────────────────────────────────────────────────

    // Distinct field colours — 4 per farm, 20 total
    private static readonly string[] FieldColors =
    [
        // Farm 0 – greens
        "#27ae60", "#52be80", "#1d8348", "#a9dfbf",
        // Farm 1 – blues
        "#2980b9", "#5dade2", "#1a5276", "#aed6f1",
        // Farm 2 – oranges
        "#d35400", "#e59866", "#922b21", "#f0b27a",
        // Farm 3 – purples
        "#8e44ad", "#bb8fce", "#6c3483", "#d7bde2",
        // Farm 4 – teals
        "#148f77", "#45b39d", "#0e6655", "#a2d9ce",
    ];

    // Normalised [0,1] positions within the farm rect (4 % gutter between quadrants)
    private record FieldTemplate(string Name, string Crop, string Season,
                                 double NormMinLat, double NormMinLon,
                                 double NormMaxLat, double NormMaxLon);

    private static readonly FieldTemplate[] FieldGrid =
    [
        new("North Block",  "Corn",       "Summer 2025", 0.52, 0.04, 0.94, 0.48), // NW
        new("East Paddock", "Soybeans",   "Summer 2025", 0.52, 0.52, 0.94, 0.96), // NE
        new("South Block",  "Wheat",      "Spring 2025", 0.06, 0.04, 0.48, 0.48), // SW
        new("West Meadow",  "Sunflowers", "Spring 2025", 0.06, 0.52, 0.48, 0.96), // SE
    ];

    private static (List<Field> Fields, Dictionary<Guid, GeoRect> Regions) BuildFields(
        Guid tenantId, string userId,
        List<Farm> farms, Dictionary<Guid, GeoRect> farmRegions, Random rng)
    {
        var now     = DateTime.UtcNow;
        var fields  = new List<Field>();
        var regions = new Dictionary<Guid, GeoRect>();

        for (int fi = 0; fi < farms.Count; fi++)
        {
            var farm      = farms[fi];
            var farmRect  = farmRegions[farm.Id];
            int colorBase = fi * 4;

            for (int ti = 0; ti < FieldGrid.Length; ti++)
            {
                var tpl = FieldGrid[ti];

                var fieldRect = new GeoRect(
                    MinLat: farmRect.MinLat + tpl.NormMinLat * farmRect.SpanLat,
                    MinLon: farmRect.MinLon + tpl.NormMinLon * farmRect.SpanLon,
                    MaxLat: farmRect.MinLat + tpl.NormMaxLat * farmRect.SpanLat,
                    MaxLon: farmRect.MinLon + tpl.NormMaxLon * farmRect.SpanLon);

                var geoJson  = BuildPolygonGeoJson(fieldRect, rng, perturbFrac: 0.04);
                var areaHa   = GeoJsonUtils.ComputeAreaHectares(geoJson);
                var centroid = GeoJsonUtils.ComputeCentroid(geoJson);
                var color    = FieldColors[(colorBase + ti) % FieldColors.Length];

                var field = new Field
                {
                    Id              = Guid.NewGuid(),
                    FarmId          = farm.Id,
                    TenantId        = tenantId,
                    Name            = tpl.Name,
                    CropType        = tpl.Crop,
                    AreaHectares    = areaHa,
                    Season          = tpl.Season,
                    GeoBoundary     = geoJson,
                    BoundaryColor   = color,
                    Latitude        = centroid?.Lat,
                    Longitude       = centroid?.Lon,
                    IsActive        = true,
                    CreatedAt       = now,
                    UpdatedAt       = now,
                    CreatedByUserId = userId
                };

                fields.Add(field);
                regions[field.Id] = fieldRect;
            }
        }

        return (fields, regions);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Traps — 2–4 per field, lat/lon sampled strictly inside the field rect
    //         (inset 5 % on each edge to stay clear of boundary lines)
    // ─────────────────────────────────────────────────────────────────────────
    private static readonly Guid[] KnownTrapTypeIds =
    [
        new("a0000000-0000-0000-0000-000000000001"), // Delta Trap
        new("a0000000-0000-0000-0000-000000000002"), // Bucket Trap
        new("a0000000-0000-0000-0000-000000000004"), // Sticky Card (Yellow)
        new("a0000000-0000-0000-0000-000000000005"), // Sticky Card (Blue)
        new("a0000000-0000-0000-0000-000000000007"), // Pitfall Trap
        new("a0000000-0000-0000-0000-000000000009"), // Fruit Fly Trap
        new("a0000000-0000-0000-0000-00000000000b"), // Smart / Automated Trap
    ];

    private static readonly string[] TrapNoteTemplates =
    [
        "Near field entrance, first post on the headland.",
        "Mid-field, row {0}, post {1} — high-traffic insect corridor.",
        "South-east corner near irrigation riser.",
        "Adjacent to windbreak — sheltered microclimate.",
        "Along centre-pivot track, post {1}.",
        "North hedgerow margin, 5 m from fence.",
        "Near drainage ditch — moisture-loving pest zone.",
        "Row {0}, alongside drip-tape irrigation line.",
    ];

    private static List<Trap> BuildTraps(
        Guid tenantId, string userId,
        List<Field> fields, Dictionary<Guid, GeoRect> fieldRegions, Random rng)
    {
        var now     = DateTime.UtcNow;
        var list    = new List<Trap>();
        int counter = 1;

        foreach (var field in fields)
        {
            if (!fieldRegions.TryGetValue(field.Id, out var fieldRect))
                continue;

            // Inset 5 % on each edge so traps are never on the boundary line
            var inner        = fieldRect.Inset(0.05);
            int trapsInField = rng.Next(2, 5); // 2, 3 or 4 traps

            for (int i = 0; i < trapsInField; i++)
            {
                var trapTypeId   = KnownTrapTypeIds[rng.Next(KnownTrapTypeIds.Length)];
                var (lat, lon)   = inner.RandomPoint(rng);
                var noteTmpl     = TrapNoteTemplates[rng.Next(TrapNoteTemplates.Length)];
                var note         = string.Format(noteTmpl, rng.Next(2, 30), rng.Next(1, 8));

                list.Add(new Trap
                {
                    Id              = Guid.NewGuid(),
                    TenantId        = tenantId,
                    FieldId         = field.Id,
                    TrapTypeId      = trapTypeId,
                    Name            = $"Trap-{counter:D3}",
                    Barcode         = $"PL-{counter:D5}",
                    Latitude        = lat,
                    Longitude       = lon,
                    IsEnabled       = true,
                    Notes           = note,
                    CreatedAt       = now,
                    UpdatedAt       = now,
                    CreatedByUserId = userId
                });

                counter++;
            }
        }

        return list;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Scouting Sessions
    // ─────────────────────────────────────────────────────────────────────────
    private const int SessionsPerFarm = 1_000;

    private static List<ScoutingSession> BuildSessions(
        Guid tenantId, string adminId, string scoutId,
        List<Farm> farms, List<Field> fields, Random rng)
    {
        var list       = new List<ScoutingSession>(farms.Count * SessionsPerFarm);
        var conditions = new[] { "Sunny", "Partly Cloudy", "Overcast", "Light Rain", "Windy" };
        var baseDate   = DateTime.UtcNow.AddYears(-2);
        const int spanDays = 730;

        foreach (var farm in farms)
        {
            var farmFields = fields.Where(f => f.FarmId == farm.Id).ToList();

            for (int i = 0; i < SessionsPerFarm; i++)
            {
                var isPlanned = rng.Next(2) == 0;
                var scheduled = baseDate.AddDays(rng.Next(0, spanDays)).AddHours(rng.Next(6, 18));
                var started   = scheduled.AddMinutes(rng.Next(0, 120));
                var completed = started.AddHours(rng.Next(1, 5));
                var field     = farmFields[rng.Next(farmFields.Count)];

                list.Add(new ScoutingSession
                {
                    Id                 = Guid.NewGuid(),
                    TenantId           = tenantId,
                    FarmId             = farm.Id,
                    FieldId            = field.Id,
                    ScouterId          = scoutId,
                    IsPlanned          = isPlanned,
                    ScheduledDate      = isPlanned ? scheduled : null,
                    StartedAt          = started,
                    CompletedAt        = completed,
                    WeatherConditions  = conditions[rng.Next(conditions.Length)],
                    TemperatureCelsius = Math.Round(15 + rng.NextDouble() * 20, 1),
                    Notes              = $"Session {i + 1} for {farm.Name}.",
                    CreatedAt          = scheduled,
                    CreatedByUserId    = isPlanned ? adminId : scoutId,
                    UpdatedByUserId    = scoutId,
                });
            }
        }

        return list;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Observations
    // ─────────────────────────────────────────────────────────────────────────
    private static List<SessionObservation> BuildObservations(
        Guid tenantId, string adminId, string scoutId,
        List<ScoutingSession> sessions, List<Pest> pests, List<Trap> traps,
        Dictionary<Guid, GeoRect> fieldRegions, Random rng)
    {
        var list       = new List<SessionObservation>();
        var lifeStages = Enum.GetValues<LifeStage>();
        var insects    = pests.Where(p => p.Category == PestCategory.Insect).ToList();
        var allPests   = pests.ToList();
        var trapById   = traps.ToDictionary(t => t.Id);

        foreach (var session in sessions)
        {
            // Traps deployed in the same field as this session
            var fieldTraps = traps.Where(t => t.FieldId == session.FieldId).ToList();
            int obsCount   = rng.Next(15, 26); // avg 20 × 5,000 sessions ≈ 100,000 observations

            // Pre-compute the inset rect for this session's field — every observation
            // geo-point will be sampled from this rectangle so it is always inside the field.
            GeoRect? fieldInner = session.FieldId.HasValue &&
                                  fieldRegions.TryGetValue(session.FieldId.Value, out var fr)
                ? fr.Inset(0.03)
                : null;

            for (int i = 0; i < obsCount; i++)
            {
                var isAdHoc  = !session.IsPlanned || rng.Next(5) == 0;
                var pest     = isAdHoc ? allPests[rng.Next(allPests.Count)] : insects[rng.Next(insects.Count)];
                var useCount = pest.DefaultCaptureMode == CaptureMode.Count;

                Guid? trapId = null;
                if (!isAdHoc && fieldTraps.Count > 0)
                    trapId = fieldTraps[rng.Next(fieldTraps.Count)].Id;

                // Trap observations: use the trap's exact location (already inside the field).
                // Ad-hoc observations: sample a random point strictly inside the field rect.
                double? obsLat = null, obsLon = null;
                if (trapId.HasValue && trapById.TryGetValue(trapId.Value, out var assignedTrap))
                {
                    obsLat = assignedTrap.Latitude;
                    obsLon = assignedTrap.Longitude;
                }
                else if (fieldInner.HasValue)
                {
                    var (lat, lon) = fieldInner.Value.RandomPoint(rng);
                    obsLat = lat;
                    obsLon = lon;
                }

                var obsCreatedBy = session.IsPlanned ? adminId : scoutId;
                var obsCreatedAt = session.IsPlanned ? session.CreatedAt : (session.StartedAt ?? session.CreatedAt);

                // ObservedAt: staggered by 2-minute steps + jitter, always after StartedAt
                var sessionStart = session.StartedAt ?? session.CreatedAt;
                var observedAt   = sessionStart
                    .AddMinutes(i * 2)
                    .AddSeconds(rng.Next(0, 119));

                list.Add(new SessionObservation
                {
                    Id              = Guid.NewGuid(),
                    TenantId        = tenantId,
                    SessionId       = session.Id,
                    ObservationType = isAdHoc ? ObservationType.AdHoc : ObservationType.Trap,
                    IsPlanned       = !isAdHoc,
                    TrapId          = trapId,
                    PestId          = pest.Id,
                    CaptureMode     = pest.DefaultCaptureMode,
                    Count           = useCount ? rng.Next(0, 60) : null,
                    IsPresent       = useCount ? null : rng.Next(2) == 0,
                    LifeStage       = lifeStages[rng.Next(lifeStages.Length)],
                    ThresholdCount  = pest.ThresholdCount,
                    IsUnknownPest   = false,
                    Latitude        = obsLat,
                    Longitude       = obsLon,
                    SortOrder       = i,
                    Notes           = i % 3 == 0 ? $"Observed near field edge, row {rng.Next(1, 20)}." : null,
                    ObservedAt      = observedAt,
                    CreatedAt       = obsCreatedAt,
                    CreatedByUserId = obsCreatedBy,
                    UpdatedByUserId = scoutId,
                });
            }
        }

        return list;
    }
}
