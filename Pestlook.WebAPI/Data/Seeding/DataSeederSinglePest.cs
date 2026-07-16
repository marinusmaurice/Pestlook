using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Pestlook.WebAPI.Domain.Entities;
using Pestlook.WebAPI.Domain.Enums;
using Pestlook.WebAPI.Infrastructure;

namespace Pestlook.WebAPI.Data.Seeding;

/// <summary>
/// Seeds a single-pest (Fall Armyworm) outbreak scenario across a 4×4 grid of 16
/// neighbouring farms in the Limpopo maize belt, each with 4 fields. Data spans 3 years
/// and models realistic spatial spread from the NW origin farm, seasonal population cycles
/// (southern hemisphere), and treatment suppression events.
///
/// Observations are GPS-pinned to the fixed field centroid — all scouts return to the
/// same spot, so GPS clustering reflects real fixed-station scouting practice.
/// </summary>
public static class DataSeederSinglePest
{
    private const string TenantSlug = "single-pest-demo";

    // ── Geographic anchor: Limpopo maize belt, South Africa ──────────────────
    // Origin = NW corner (row 0, col 0). Grid grows south and east.
    private const double OriginLat   = -24.500;
    private const double OriginLon   =  30.500;
    private const double FarmStepLat =  0.045;   // ~5 km between farm centres N→S
    private const double FarmStepLon =  0.055;   // ~5 km between farm centres W→E
    private const double FarmHalfLat =  0.018;   // farm extends ~4 km N–S
    private const double FarmHalfLon =  0.022;   // farm extends ~4 km E–W

    // ── Simulation parameters ─────────────────────────────────────────────────
    private const int GridSize        = 4;    // 4×4 = 16 farms
    private const int FieldsPerFarm   = 4;
    private const int SpanWeeks       = 156;  // 3 years

    // Threshold: starts at 5, agronomist raises to 8 at week 65 (~month 15)
    private const int ThresholdPhase1      = 5;
    private const int ThresholdPhase2      = 8;
    private const int ThresholdChangeWeek  = 65;

    // Spread: pest advances one Manhattan ring every ~6 weeks from origin (0,0)
    private const int WeeksPerRing = 6;

    // ─────────────────────────────────────────────────────────────────────────

    /// <returns>True if data was actually seeded; false if the demo tenant already existed (no-op).</returns>
    public static async Task<bool> SeedAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db          = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();

        if (await db.Tenants.AnyAsync(t => t.Slug == TenantSlug))
            return false;

        // ── Tenant ────────────────────────────────────────────────────────────
        var tenant = new Tenant
        {
            Id                   = Guid.NewGuid(),
            Name                 = "Single Pest Demo",
            Slug                 = TenantSlug,
            IsActive             = true,
            SubscriptionPlan     = SubscriptionPlan.Free,
            MonitoringPointQuota = 50_000,
            CreatedAt            = DateTime.UtcNow,
        };
        db.Tenants.Add(tenant);
        await db.SaveChangesAsync();

        // ── Users ─────────────────────────────────────────────────────────────
        var admin = new ApplicationUser
        {
            Id = Guid.NewGuid().ToString(), TenantId = tenant.Id,
            UserName = "admin@singlepest.demo", Email = "admin@singlepest.demo",
            EmailConfirmed = true, FirstName = "Carol", LastName = "Manager",
            IsActive = true, TemperatureUnit = "C",
        };
        await userManager.CreateAsync(admin, "Demo@1234!");
        await userManager.AddToRoleAsync(admin, "Admin");

        var scout = new ApplicationUser
        {
            Id = Guid.NewGuid().ToString(), TenantId = tenant.Id,
            UserName = "scout@singlepest.demo", Email = "scout@singlepest.demo",
            EmailConfirmed = true, FirstName = "David", LastName = "Scout",
            IsActive = true, TemperatureUnit = "C",
        };
        await userManager.CreateAsync(scout, "Demo@1234!");
        await userManager.AddToRoleAsync(scout, "Scout");

        // ── Pest: Fall Armyworm ───────────────────────────────────────────────
        var unknownPest = new Pest
        {
            Id = Guid.NewGuid(), TenantId = tenant.Id,
            CommonName = "Unknown", Category = PestCategory.Other,
            DefaultCaptureMode = CaptureMode.Count, IsSystemPest = true,
            CreatedByUserId = admin.Id,
        };
        // ThresholdCount reflects the current (final) value; observations capture each phase value
        var faw = new Pest
        {
            Id = Guid.NewGuid(), TenantId = tenant.Id,
            CommonName         = "Fall Armyworm",
            ScientificName     = "Spodoptera frugiperda",
            Category           = PestCategory.Insect,
            DefaultCaptureMode = CaptureMode.Count,
            ThresholdCount     = ThresholdPhase2,
            IsSystemPest       = false,
            CreatedByUserId    = admin.Id,
        };
        db.Pests.AddRange(unknownPest, faw);
        await db.SaveChangesAsync();

        // ── 16 Farms in a 4×4 geographic grid ────────────────────────────────
        var rng      = new Random(99);
        var now      = DateTime.UtcNow;
        var baseDate = now.AddDays(-(SpanWeeks * 7));

        var farmGrid   = new Farm[GridSize, GridSize];
        var allFarms   = new List<Farm>(GridSize * GridSize);
        var farmCentre = new (double Lat, double Lon)[GridSize, GridSize];

        string[] rowLabels  = ["A", "B", "C", "D"];
        string[] farmColors =
        [
            "#e74c3c","#e67e22","#f1c40f","#2ecc71",
            "#1abc9c","#3498db","#9b59b6","#e91e8c",
            "#ff5722","#795548","#607d8b","#00bcd4",
            "#8bc34a","#ff9800","#673ab7","#2196f3",
        ];

        for (int r = 0; r < GridSize; r++)
        {
            for (int c = 0; c < GridSize; c++)
            {
                int    idx       = r * GridSize + c;
                double centreLat = OriginLat - r * FarmStepLat;
                double centreLon = OriginLon + c * FarmStepLon;

                var rect     = BuildRect(centreLat, centreLon, FarmHalfLat, FarmHalfLon);
                var geoJson  = BuildPolygonGeoJson(rect, rng);
                var area     = GeoJsonUtils.ComputeAreaHectares(geoJson);
                var centroid = GeoJsonUtils.ComputeCentroid(geoJson);

                var farm = new Farm
                {
                    Id              = Guid.NewGuid(),
                    TenantId        = tenant.Id,
                    Name            = $"Farm {rowLabels[r]}{c + 1}",
                    Address         = $"Plot {idx + 1}, Limpopo Agricultural District, South Africa",
                    Latitude        = centroid?.Lat ?? centreLat,
                    Longitude       = centroid?.Lon ?? centreLon,
                    BoundaryGeoJson = geoJson,
                    AreaHectares    = area,
                    BoundaryColor   = farmColors[idx],
                    IsActive        = true,
                    CreatedAt       = now,
                    UpdatedAt       = now,
                    CreatedByUserId = admin.Id,
                };

                farmGrid[r, c]   = farm;
                farmCentre[r, c] = (centroid?.Lat ?? centreLat, centroid?.Lon ?? centreLon);
                allFarms.Add(farm);
            }
        }

        db.Farms.AddRange(allFarms);
        await db.SaveChangesAsync();

        // ── 4 Fields per farm (2×2 quadrant layout) ───────────────────────────
        // Normalised positions within the farm bounding rect [0,1]
        var fieldNorm = new (string Name, string Crop,
                             double NMinLat, double NMinLon,
                             double NMaxLat, double NMaxLon)[]
        {
            ("North Block",  "Maize", 0.52, 0.04, 0.94, 0.48), // NW quadrant
            ("South Block",  "Maize", 0.06, 0.04, 0.48, 0.48), // SW quadrant
            ("East Paddock", "Maize", 0.52, 0.52, 0.94, 0.96), // NE quadrant
            ("West Meadow",  "Maize", 0.06, 0.52, 0.48, 0.96), // SE quadrant
        };
        string[] fieldColors = ["#27ae60", "#52be80", "#1d8348", "#a9dfbf"];

        // fieldsByfarm[farm.Id] = ordered list of fields (same order as fieldNorm)
        var fieldsByFarm = new Dictionary<Guid, List<Field>>();
        // Fixed GPS centroid per field — all observations land on this exact point
        var fieldGps     = new Dictionary<Guid, (double Lat, double Lon)>();

        var allFields = new List<Field>(GridSize * GridSize * FieldsPerFarm);

        for (int r = 0; r < GridSize; r++)
        {
            for (int c = 0; c < GridSize; c++)
            {
                var farm     = farmGrid[r, c];
                var (cLat, cLon) = farmCentre[r, c];
                var farmRect = BuildRect(cLat, cLon, FarmHalfLat, FarmHalfLon);

                fieldsByFarm[farm.Id] = new List<Field>(FieldsPerFarm);

                for (int fi = 0; fi < FieldsPerFarm; fi++)
                {
                    var n = fieldNorm[fi];
                    var fieldRect = new GeoRect(
                        farmRect.MinLat + n.NMinLat * farmRect.SpanLat,
                        farmRect.MinLon + n.NMinLon * farmRect.SpanLon,
                        farmRect.MinLat + n.NMaxLat * farmRect.SpanLat,
                        farmRect.MinLon + n.NMaxLon * farmRect.SpanLon);

                    var geoJson  = BuildPolygonGeoJson(fieldRect, rng, perturbFrac: 0.03);
                    var area     = GeoJsonUtils.ComputeAreaHectares(geoJson);
                    var centroid = GeoJsonUtils.ComputeCentroid(geoJson);

                    double fLat = centroid?.Lat ?? (fieldRect.MinLat + fieldRect.SpanLat / 2);
                    double fLon = centroid?.Lon ?? (fieldRect.MinLon + fieldRect.SpanLon / 2);

                    var field = new Field
                    {
                        Id              = Guid.NewGuid(),
                        FarmId          = farm.Id,
                        TenantId        = tenant.Id,
                        Name            = n.Name,
                        CropType        = n.Crop,
                        Season          = "2023–2026",
                        AreaHectares    = area,
                        GeoBoundary     = geoJson,
                        BoundaryColor   = fieldColors[fi],
                        Latitude        = fLat,
                        Longitude       = fLon,
                        IsActive        = true,
                        CreatedAt       = now,
                        UpdatedAt       = now,
                        CreatedByUserId = admin.Id,
                    };

                    allFields.Add(field);
                    fieldsByFarm[farm.Id].Add(field);
                    fieldGps[field.Id] = (fLat, fLon);
                }
            }
        }

        db.Fields.AddRange(allFields);
        await db.SaveChangesAsync();

        // ── Sessions + Observations ───────────────────────────────────────────
        // Arrival week per farm = Manhattan distance from origin × WeeksPerRing + small jitter
        var arrivalWeek = new int[GridSize, GridSize];
        for (int r = 0; r < GridSize; r++)
            for (int c = 0; c < GridSize; c++)
                arrivalWeek[r, c] = (r + c) * WeeksPerRing + rng.Next(0, 4);

        string[] conditions = ["Sunny", "Partly Cloudy", "Overcast", "Light Rain", "Windy"];

        var sessions     = new List<ScoutingSession>(GridSize * GridSize * FieldsPerFarm * SpanWeeks);
        var observations = new List<SessionObservation>(sessions.Capacity);

        for (int r = 0; r < GridSize; r++)
        {
            for (int c = 0; c < GridSize; c++)
            {
                var farm       = farmGrid[r, c];
                int arrival    = arrivalWeek[r, c];
                var farmFields = fieldsByFarm[farm.Id];

                // Farm-level pressure modifier — some farms are more susceptible to FAW
                double pressureMod = 0.70 + rng.NextDouble() * 0.60; // 0.70–1.30

                // Treatment suppression state (shared across fields on same farm)
                bool suppressed      = false;
                int  suppressEndWeek = 0;
                int  aboveCount      = 0; // consecutive weeks above 2× threshold

                for (int week = 0; week < SpanWeeks; week++)
                {
                    var weekDate     = baseDate.AddDays(week * 7);
                    int threshold    = week < ThresholdChangeWeek ? ThresholdPhase1 : ThresholdPhase2;
                    double seasonal  = SeasonalFactor(weekDate.Month);
                    double tempC     = TemperatureForMonth(weekDate.Month);

                    // Compute farm-level base count for this week
                    int farmBaseCount = ComputeCount(
                        week, arrival, seasonal, pressureMod,
                        suppressed, suppressEndWeek, rng);

                    // Update treatment suppression state based on this week's count
                    if (farmBaseCount > threshold * 2 && !suppressed)
                        aboveCount++;
                    else
                        aboveCount = 0;

                    if (aboveCount >= 3)
                    {
                        suppressed       = true;
                        suppressEndWeek  = week + 6;
                        aboveCount       = 0;
                    }

                    if (suppressed && week > suppressEndWeek + 8)
                        suppressed = false; // full recovery

                    // One session per field per week
                    for (int fi = 0; fi < FieldsPerFarm; fi++)
                    {
                        var field            = farmFields[fi];
                        var (fieldLat, fieldLon) = fieldGps[field.Id];

                        // Field modifier — slight per-field variation in counts
                        double fieldMod = 0.85 + (fi * 0.1) + rng.NextDouble() * 0.2;
                        int    count    = (int)Math.Round(farmBaseCount * fieldMod);
                        count = Math.Max(0, count);

                        var sessionStart = weekDate.AddHours(6 + fi * 2 + rng.Next(0, 2)); // stagger fields through the day
                        var sessionEnd   = sessionStart.AddHours(1 + rng.Next(0, 2));

                        var session = new ScoutingSession
                        {
                            Id                 = Guid.NewGuid(),
                            TenantId           = tenant.Id,
                            FarmId             = farm.Id,
                            FieldId            = field.Id,
                            ScouterId          = scout.Id,
                            IsPlanned          = true,
                            ScheduledDate      = sessionStart,
                            StartedAt          = sessionStart,
                            CompletedAt        = sessionEnd,
                            WeatherConditions  = conditions[rng.Next(conditions.Length)],
                            TemperatureCelsius = Math.Round(tempC + (rng.NextDouble() * 4 - 2), 1),
                            Notes              = $"Week {week + 1} routine FAW scout — {field.Name}.",
                            CreatedAt          = sessionStart,
                            CreatedByUserId    = admin.Id,
                            UpdatedByUserId    = scout.Id,
                        };
                        sessions.Add(session);

                        // Single FAW observation, GPS fixed to field centroid
                        var obs = new SessionObservation
                        {
                            Id              = Guid.NewGuid(),
                            TenantId        = tenant.Id,
                            SessionId       = session.Id,
                            ObservationType = ObservationType.AdHoc,
                            IsPlanned       = true,
                            PestId          = faw.Id,
                            CaptureMode     = CaptureMode.Count,
                            Count           = count,
                            IsPresent       = null,
                            LifeStage       = count > 0 ? LifeStage.Adult : LifeStage.Egg,
                            ThresholdCount  = threshold,
                            IsUnknownPest   = false,
                            Latitude        = fieldLat,
                            Longitude       = fieldLon,
                            SortOrder       = 0,
                            Notes           = count > threshold
                                ? "Count exceeds action threshold — recommend treatment assessment."
                                : null,
                            ObservedAt      = sessionStart.AddMinutes(5 + rng.Next(0, 20)),
                            CreatedAt       = sessionStart,
                            CreatedByUserId = scout.Id,
                            UpdatedByUserId = scout.Id,
                        };
                        observations.Add(obs);
                    }
                }
            }
        }

        // Batch insert sessions
        const int sessionBatch = 500;
        for (int i = 0; i < sessions.Count; i += sessionBatch)
        {
            db.ScoutingSessions.AddRange(sessions.Skip(i).Take(sessionBatch));
            await db.SaveChangesAsync();
        }

        // Batch insert observations
        const int obsBatch = 2_000;
        for (int i = 0; i < observations.Count; i += obsBatch)
        {
            db.SessionObservations.AddRange(observations.Skip(i).Take(obsBatch));
            await db.SaveChangesAsync();
        }

        return true;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Pest population model
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Returns the raw FAW count for a farm in a given week, incorporating
    /// logistic build-up, seasonal cycles, and treatment suppression.
    /// </summary>
    private static int ComputeCount(
        int week, int arrival, double seasonal, double pressureMod,
        bool suppressed, int suppressEndWeek, Random rng)
    {
        if (week < arrival)
            return rng.Next(0, 2); // background noise before pest arrives

        int wsa = week - arrival; // weeks since arrival

        // Logistic build-up: reaches ~20 at peak in ~20 weeks, never goes higher than ~25
        double buildUp = 22.0 * wsa / (wsa + 14.0);

        double raw = buildUp * seasonal * pressureMod;

        // Treatment suppression: heavily suppressed during treatment, gradual recovery after
        if (suppressed)
        {
            int weeksSinceTreatment = week - (suppressEndWeek - 6);
            if (week <= suppressEndWeek)
                raw *= 0.06; // >90% knockdown
            else
            {
                // Linear recovery over 8 weeks
                double recovery = Math.Min(1.0, (week - suppressEndWeek) / 8.0);
                raw *= recovery;
            }
        }

        // Gaussian noise ±25%
        double noise = 1.0 + (rng.NextDouble() * 0.5 - 0.25);
        return Math.Max(0, (int)Math.Round(raw * noise));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Seasonal model — southern hemisphere maize belt
    // FAW peaks in summer (Dec–Feb), very low in winter (Jun–Aug)
    // ─────────────────────────────────────────────────────────────────────────
    private static double SeasonalFactor(int month) => month switch
    {
        12 or 1 or 2 => 1.00, // summer peak
        3 or 11      => 0.70, // shoulder
        4 or 10      => 0.40, // early/late cool
        5 or 9       => 0.18, // cool
        6 or 7 or 8  => 0.05, // winter low
        _            => 0.50,
    };

    // Ambient temperatures for the same region (°C)
    private static double TemperatureForMonth(int month) => month switch
    {
        12 or 1 or 2 => 28.0,
        3 or 11      => 25.0,
        4 or 10      => 21.0,
        5 or 9       => 17.0,
        6 or 7 or 8  => 13.0,
        _            => 20.0,
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Geo helpers (self-contained — no dependency on DevDataSeeder)
    // ─────────────────────────────────────────────────────────────────────────

    private readonly record struct GeoRect(double MinLat, double MinLon, double MaxLat, double MaxLon)
    {
        public double SpanLat => MaxLat - MinLat;
        public double SpanLon => MaxLon - MinLon;
    }

    private static GeoRect BuildRect(double centreLat, double centreLon, double halfLat, double halfLon) =>
        new(centreLat - halfLat, centreLon - halfLon, centreLat + halfLat, centreLon + halfLon);

    private static string BuildPolygonGeoJson(GeoRect rect, Random rng, double perturbFrac = 0.06)
    {
        double dLat = rect.SpanLat * perturbFrac;
        double dLon = rect.SpanLon * perturbFrac;

        double Jitter(double v, double d) => v + (rng.NextDouble() * 2 - 1) * d;

        var sw = (Lon: Jitter(rect.MinLon, dLon), Lat: Jitter(rect.MinLat, dLat));
        var se = (Lon: Jitter(rect.MaxLon, dLon), Lat: Jitter(rect.MinLat, dLat));
        var ne = (Lon: Jitter(rect.MaxLon, dLon), Lat: Jitter(rect.MaxLat, dLat));
        var nw = (Lon: Jitter(rect.MinLon, dLon), Lat: Jitter(rect.MaxLat, dLat));

        static string Pt((double Lon, double Lat) p) => $"[{p.Lon:F7},{p.Lat:F7}]";
        return $"{{\"type\":\"Polygon\",\"coordinates\":[[{Pt(sw)},{Pt(se)},{Pt(ne)},{Pt(nw)},{Pt(sw)}]]}}";
    }
}
