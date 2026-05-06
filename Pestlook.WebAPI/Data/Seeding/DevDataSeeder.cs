using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Pestlook.WebAPI.Domain.Entities;
using Pestlook.WebAPI.Domain.Enums;

namespace Pestlook.WebAPI.Data.Seeding;

/// <summary>
/// Seeds realistic fake data for development/demo purposes.
/// Only runs when no farms exist for the demo tenant, so it is idempotent.
/// </summary>
public static class DevDataSeeder
{
    public static async Task SeedAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db          = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();

        // ── Guard: already seeded? ────────────────────────────────────────────
        if (await db.Tenants.AnyAsync(t => t.Slug == "demo-farm-co"))
            return;

        // ── Tenant ────────────────────────────────────────────────────────────
        var tenant = new Tenant
        {
            Id                   = Guid.NewGuid(),
            Name                 = "Demo Farm Co",
            Slug                 = "demo-farm-co",
            IsActive             = true,
            SubscriptionPlan     = SubscriptionPlan.Basic,
            MonitoringPointQuota = 100,
            CreatedAt            = DateTime.UtcNow
        };
        db.Tenants.Add(tenant);
        await db.SaveChangesAsync();

        // ── Users ─────────────────────────────────────────────────────────────
        var admin = new ApplicationUser
        {
            Id               = Guid.NewGuid().ToString(),
            TenantId         = tenant.Id,
            UserName         = "admin@demofarm.co",
            Email            = "admin@demofarm.co",
            EmailConfirmed   = true,
            FirstName        = "Alice",
            LastName         = "Grower",
            IsActive         = true,
            TemperatureUnit  = "C"
        };
        await userManager.CreateAsync(admin, "Demo@1234!");
        await userManager.AddToRoleAsync(admin, "Admin");

        var scout = new ApplicationUser
        {
            Id               = Guid.NewGuid().ToString(),
            TenantId         = tenant.Id,
            UserName         = "scout@demofarm.co",
            Email            = "scout@demofarm.co",
            EmailConfirmed   = true,
            FirstName        = "Bob",
            LastName         = "Scout",
            IsActive         = true,
            TemperatureUnit  = "C"
        };
        await userManager.CreateAsync(scout, "Demo@1234!");
        await userManager.AddToRoleAsync(scout, "Scout");

        // ── Pests (50) ────────────────────────────────────────────────────────
        var pests = BuildPests(tenant.Id, admin.Id);
        db.Pests.AddRange(pests);
        await db.SaveChangesAsync();

        // ── Farms (5) + Fields (3 per farm = 15) ─────────────────────────────
        var farms  = BuildFarms(tenant.Id, admin.Id);
        var fields = BuildFields(tenant.Id, admin.Id, farms);
        db.Farms.AddRange(farms);
        db.Fields.AddRange(fields);
        await db.SaveChangesAsync();

        // ── Traps (2-3 per field = ~30-45) ───────────────────────────────────
        var rng   = new Random(42);
        var traps = BuildTraps(tenant.Id, admin.Id, farms, fields, rng);
        db.Traps.AddRange(traps);
        await db.SaveChangesAsync();

        // ── Scouting sessions (~5,000) ─────────────────────────────────────
        var sessions = BuildSessions(tenant.Id, admin.Id, scout.Id, farms, fields, rng);
        const int sessionBatch = 500;
        for (int i = 0; i < sessions.Count; i += sessionBatch)
        {
            db.ScoutingSessions.AddRange(sessions.Skip(i).Take(sessionBatch));
            await db.SaveChangesAsync();
        }

        // ── Observations (~100,000) ───────────────────────────────────────────
        var observations = BuildObservations(tenant.Id, admin.Id, scout.Id, sessions, pests, traps, rng);
        const int obsBatch = 5000;
        for (int i = 0; i < observations.Count; i += obsBatch)
        {
            db.SessionObservations.AddRange(observations.Skip(i).Take(obsBatch));
            await db.SaveChangesAsync();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Pests
    // ─────────────────────────────────────────────────────────────────────────
    private static List<Pest> BuildPests(Guid tenantId, string userId)
    {
        var now = DateTime.UtcNow;

        // (CommonName, ScientificName, Category, CaptureMode, ThresholdCount)
        var data = new (string Common, string? Scientific, PestCategory Cat, CaptureMode Mode, int? Threshold)[]
        {
            // Insects (20)
            ("Aphid",                  "Aphidoidea",                 PestCategory.Insect,  CaptureMode.Count,    50),
            ("Whitefly",               "Bemisia tabaci",             PestCategory.Insect,  CaptureMode.Count,    20),
            ("Thrips",                 "Thysanoptera",               PestCategory.Insect,  CaptureMode.Count,    30),
            ("Spider Mite",            "Tetranychus urticae",        PestCategory.Insect,  CaptureMode.Count,    40),
            ("Leaf Miner",             "Liriomyza spp.",             PestCategory.Insect,  CaptureMode.Presence, null),
            ("Codling Moth",           "Cydia pomonella",            PestCategory.Insect,  CaptureMode.Count,    5),
            ("Fall Armyworm",          "Spodoptera frugiperda",      PestCategory.Insect,  CaptureMode.Count,    10),
            ("Corn Rootworm",          "Diabrotica virgifera",       PestCategory.Insect,  CaptureMode.Count,    15),
            ("Fruit Fly",              "Bactrocera dorsalis",        PestCategory.Insect,  CaptureMode.Count,    3),
            ("Cucumber Beetle",        "Diabrotica undecimpunctata", PestCategory.Insect,  CaptureMode.Count,    10),
            ("Cabbage Looper",         "Trichoplusia ni",            PestCategory.Insect,  CaptureMode.Count,    25),
            ("Colorado Potato Beetle", "Leptinotarsa decemlineata",  PestCategory.Insect,  CaptureMode.Count,    5),
            ("Stink Bug",              "Halyomorpha halys",          PestCategory.Insect,  CaptureMode.Presence, null),
            ("Grasshopper",            "Melanoplinae",               PestCategory.Insect,  CaptureMode.Count,    8),
            ("Cutworm",                "Agrotis ipsilon",            PestCategory.Insect,  CaptureMode.Count,    4),
            ("Earworm",                "Helicoverpa zea",            PestCategory.Insect,  CaptureMode.Count,    6),
            ("Squash Bug",             "Anasa tristis",              PestCategory.Insect,  CaptureMode.Presence, null),
            ("Diamondback Moth",       "Plutella xylostella",        PestCategory.Insect,  CaptureMode.Count,    20),
            ("Scale Insect",           "Coccoidea",                  PestCategory.Insect,  CaptureMode.Presence, null),
            ("Leafhopper",             "Cicadellidae",               PestCategory.Insect,  CaptureMode.Count,    35),

            // Diseases (10)
            ("Powdery Mildew",         "Erysiphales",                PestCategory.Disease, CaptureMode.Presence, null),
            ("Downy Mildew",           "Peronosporaceae",            PestCategory.Disease, CaptureMode.Presence, null),
            ("Early Blight",           "Alternaria solani",          PestCategory.Disease, CaptureMode.Presence, null),
            ("Late Blight",            "Phytophthora infestans",     PestCategory.Disease, CaptureMode.Presence, null),
            ("Botrytis (Grey Mould)",  "Botrytis cinerea",           PestCategory.Disease, CaptureMode.Presence, null),
            ("Fusarium Wilt",          "Fusarium oxysporum",         PestCategory.Disease, CaptureMode.Presence, null),
            ("Root Rot",               "Phytophthora spp.",          PestCategory.Disease, CaptureMode.Presence, null),
            ("Anthracnose",            "Colletotrichum spp.",        PestCategory.Disease, CaptureMode.Presence, null),
            ("Rust",                   "Pucciniales",                PestCategory.Disease, CaptureMode.Presence, null),
            ("Bacterial Blight",       "Xanthomonas spp.",           PestCategory.Disease, CaptureMode.Presence, null),

            // Weeds (10)
            ("Pigweed",                "Amaranthus retroflexus",     PestCategory.Weed,    CaptureMode.Presence, null),
            ("Common Ragweed",         "Ambrosia artemisiifolia",    PestCategory.Weed,    CaptureMode.Presence, null),
            ("Bindweed",               "Convolvulus arvensis",       PestCategory.Weed,    CaptureMode.Presence, null),
            ("Johnson Grass",          "Sorghum halepense",          PestCategory.Weed,    CaptureMode.Presence, null),
            ("Nutsedge",               "Cyperus esculentus",         PestCategory.Weed,    CaptureMode.Presence, null),
            ("Lambs Quarters",         "Chenopodium album",          PestCategory.Weed,    CaptureMode.Presence, null),
            ("Wild Mustard",           "Sinapis arvensis",           PestCategory.Weed,    CaptureMode.Presence, null),
            ("Canada Thistle",         "Cirsium arvense",            PestCategory.Weed,    CaptureMode.Presence, null),
            ("Velvetleaf",             "Abutilon theophrasti",       PestCategory.Weed,    CaptureMode.Presence, null),
            ("Cocklebur",              "Xanthium strumarium",        PestCategory.Weed,    CaptureMode.Presence, null),

            // Rodents (5)
            ("Common Vole",            "Microtus arvalis",           PestCategory.Rodent,  CaptureMode.Count,    2),
            ("Black Rat",              "Rattus rattus",              PestCategory.Rodent,  CaptureMode.Count,    1),
            ("House Mouse",            "Mus musculus",               PestCategory.Rodent,  CaptureMode.Count,    2),
            ("Mole",                   "Talpa europaea",             PestCategory.Rodent,  CaptureMode.Presence, null),
            ("Gopher",                 "Geomyidae",                  PestCategory.Rodent,  CaptureMode.Presence, null),

            // Other (5)
            ("Snail",                  "Cornu aspersum",             PestCategory.Other,   CaptureMode.Count,    10),
            ("Slug",                   "Arion spp.",                 PestCategory.Other,   CaptureMode.Count,    10),
            ("Nematode (Root-knot)",   "Meloidogyne spp.",           PestCategory.Other,   CaptureMode.Presence, null),
            ("Deer",                   "Odocoileus virginianus",     PestCategory.Other,   CaptureMode.Presence, null),
            ("Wild Boar",              "Sus scrofa",                 PestCategory.Other,   CaptureMode.Presence, null),
        };

        return data.Select(d => new Pest
        {
            Id                  = Guid.NewGuid(),
            TenantId            = tenantId,
            CommonName          = d.Common,
            ScientificName      = d.Scientific,
            Category            = d.Cat,
            DefaultCaptureMode  = d.Mode,
            ThresholdCount      = d.Threshold,
            IsSystemPest        = true,
            CreatedAt           = now,
            CreatedByUserId     = userId
        }).ToList();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Farms
    // ─────────────────────────────────────────────────────────────────────────
    private static List<Farm> BuildFarms(Guid tenantId, string userId)
    {
        var now = DateTime.UtcNow;

        var data = new (string Name, string Address, double Lat, double Lon)[]
        {
            ("Sunrise Valley Farm",  "12 Valley Road, Fresno, CA",         36.7378, -119.7871),
            ("Green Acres",          "450 Prairie Lane, Ames, IA",         42.0308, -93.6319),
            ("Hillcrest Orchards",   "88 Orchard Hill, Hood River, OR",    45.7054, -121.5217),
            ("Delta Growers",        "330 River Bend, Greenville, MS",     33.4099, -91.0629),
            ("Coastal Fields",       "7 Sea Breeze Dr, Salinas, CA",       36.6777, -121.6555),
        };

        return data.Select(d => new Farm
        {
            Id              = Guid.NewGuid(),
            TenantId        = tenantId,
            Name            = d.Name,
            Address         = d.Address,
            Latitude        = d.Lat,
            Longitude       = d.Lon,
            IsActive        = true,
            CreatedAt       = now,
            UpdatedAt       = now,
            CreatedByUserId = userId
        }).ToList();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Fields
    // ─────────────────────────────────────────────────────────────────────────
    private static List<Field> BuildFields(Guid tenantId, string userId, List<Farm> farms)
    {
        var now  = DateTime.UtcNow;
        var list = new List<Field>();

        var fieldTemplates = new (string Name, string Crop, double Area, string Season)[]
        {
            ("North Block",   "Corn",       45.5,  "Summer 2025"),
            ("South Block",   "Soybeans",   38.2,  "Summer 2025"),
            ("East Paddock",  "Wheat",      22.0,  "Spring 2025"),
        };

        foreach (var farm in farms)
        {
            foreach (var (name, crop, area, season) in fieldTemplates)
            {
                list.Add(new Field
                {
                    Id              = Guid.NewGuid(),
                    FarmId          = farm.Id,
                    TenantId        = tenantId,
                    Name            = name,
                    CropType        = crop,
                    AreaHectares    = area,
                    Season          = season,
                    IsActive        = true,
                    CreatedAt       = now,
                    UpdatedAt       = now,
                    CreatedByUserId = userId
                });
            }
        }

        return list;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Traps  (~2-3 per field, using well-known TrapType GUIDs from migration)
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

    private static List<Trap> BuildTraps(Guid tenantId, string userId, List<Farm> farms, List<Field> fields, Random rng)
    {
        var now      = DateTime.UtcNow;
        var list     = new List<Trap>();
        var farmById = farms.ToDictionary(f => f.Id);

        int trapCounter = 1;
        foreach (var field in fields)
        {
            farmById.TryGetValue(field.FarmId, out var farm);
            double baseLat = farm?.Latitude  ?? 0;
            double baseLon = farm?.Longitude ?? 0;

            int trapsInField = rng.Next(2, 4); // 2 or 3 traps per field
            for (int i = 0; i < trapsInField; i++)
            {
                var trapTypeId = KnownTrapTypeIds[rng.Next(KnownTrapTypeIds.Length)];

                // Scatter traps within ~500 m of the farm centre (±0.0045°)
                double lat = Math.Round(baseLat + (rng.NextDouble() - 0.5) * 0.009, 6);
                double lon = Math.Round(baseLon + (rng.NextDouble() - 0.5) * 0.009, 6);

                list.Add(new Trap
                {
                    Id              = Guid.NewGuid(),
                    TenantId        = tenantId,
                    FieldId         = field.Id,
                    TrapTypeId      = trapTypeId,
                    Name            = $"Trap-{trapCounter:D3}",
                    Barcode         = $"PL-{trapCounter:D5}",
                    Latitude        = lat,
                    Longitude       = lon,
                    IsEnabled       = true,
                    Notes           = i == 0 ? "Near field entrance." : $"Row {rng.Next(2, 20)}, post {rng.Next(1, 5)}.",
                    CreatedAt       = now,
                    UpdatedAt       = now,
                    CreatedByUserId = userId
                });

                trapCounter++;
            }
        }

        return list;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Scouting Sessions
    // ─────────────────────────────────────────────────────────────────────────
    // 1,000 sessions per farm × 5 farms = 5,000 sessions spread over 2 years
    private const int SessionsPerFarm = 1_000;

    private static List<ScoutingSession> BuildSessions(
        Guid tenantId, string adminId, string scoutId,
        List<Farm> farms, List<Field> fields, Random rng)
    {
        var list       = new List<ScoutingSession>(farms.Count * SessionsPerFarm);
        var conditions = new[] { "Sunny", "Partly Cloudy", "Overcast", "Light Rain", "Windy" };
        var baseDate   = DateTime.UtcNow.AddYears(-2);
        const int spanDays = 730; // 2 years

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
                    Id                  = Guid.NewGuid(),
                    TenantId            = tenantId,
                    FarmId              = farm.Id,
                    FieldId             = field.Id,
                    ScouterId           = scoutId,
                    IsPlanned           = isPlanned,
                    ScheduledDate       = isPlanned ? scheduled : null,
                    StartedAt           = started,
                    CompletedAt         = completed,
                    WeatherConditions   = conditions[rng.Next(conditions.Length)],
                    TemperatureCelsius  = Math.Round(15 + rng.NextDouble() * 20, 1),
                    Notes               = $"Session {i + 1} for {farm.Name}.",
                    CreatedAt           = scheduled,
                    CreatedByUserId     = isPlanned ? adminId : scoutId,
                    UpdatedByUserId     = scoutId,
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
        List<ScoutingSession> sessions, List<Pest> pests, List<Trap> traps, Random rng)
    {
        var list        = new List<SessionObservation>();
        var lifeStages  = Enum.GetValues<LifeStage>();
        var insects     = pests.Where(p => p.Category == PestCategory.Insect).ToList();
        var allPests    = pests.ToList();
        var trapById    = traps.ToDictionary(t => t.Id);

        foreach (var session in sessions)
        {
            // Traps deployed in the same field as this session
            var fieldTraps = traps.Where(t => t.FieldId == session.FieldId).ToList();

            int obsCount = rng.Next(15, 26); // avg 20 × 5,000 sessions ≈ 100,000 observations
            for (int i = 0; i < obsCount; i++)
            {
                // Observations mirror the session's intent:
                //   planned session  → mostly Trap observations, occasionally an ad-hoc one
                //   unplanned session → all ad-hoc observations
                var isAdHoc = !session.IsPlanned || rng.Next(5) == 0;
                var pest     = isAdHoc
                    ? allPests[rng.Next(allPests.Count)]
                    : insects[rng.Next(insects.Count)];

                var useCount = pest.DefaultCaptureMode == CaptureMode.Count;

                // Assign a trap when it's a Trap-type observation and traps are available
                Guid? trapId = null;
                if (!isAdHoc && fieldTraps.Count > 0)
                    trapId = fieldTraps[rng.Next(fieldTraps.Count)].Id;

                // Trap observations use the exact trap location;
                // Ad-hoc observations get a small scatter around a nearby trap
                double? obsLat = null;
                double? obsLon = null;
                if (trapId.HasValue && trapById.TryGetValue(trapId.Value, out var assignedTrap))
                {
                    obsLat = assignedTrap.Latitude;
                    obsLon = assignedTrap.Longitude;
                }
                else if (isAdHoc && fieldTraps.Count > 0)
                {
                    var refTrap = fieldTraps[rng.Next(fieldTraps.Count)];
                    if (refTrap.Latitude is not null)
                    {
                        obsLat = Math.Round(refTrap.Latitude.Value  + (rng.NextDouble() - 0.5) * 0.002, 6);
                        obsLon = Math.Round(refTrap.Longitude!.Value + (rng.NextDouble() - 0.5) * 0.002, 6);
                    }
                }

                // Planned sessions: admin pre-creates the observations, scout updates them with results.
                // Unplanned sessions: scout creates and updates everything.
                var obsCreatedBy = session.IsPlanned ? adminId : scoutId;
                var obsUpdatedBy = scoutId;
                var obsCreatedAt = session.IsPlanned
                    ? session.CreatedAt                          // pre-created by admin when session was planned
                    : (session.StartedAt ?? session.CreatedAt);  // created by scout when they started

                list.Add(new SessionObservation
                {
                    Id              = Guid.NewGuid(),
                    TenantId        = tenantId,
                    SessionId       = session.Id,
                    ObservationType = isAdHoc ? ObservationType.AdHoc : ObservationType.Trap,
                    // Trap observations on planned sessions are pre-created slots (IsPlanned=true).
                    // realObs() treats them as real once count/isPresent is recorded.
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
                    CreatedAt       = obsCreatedAt,
                    CreatedByUserId = obsCreatedBy,
                    UpdatedByUserId = obsUpdatedBy,
                });
            }
        }

        return list;
    }
}
