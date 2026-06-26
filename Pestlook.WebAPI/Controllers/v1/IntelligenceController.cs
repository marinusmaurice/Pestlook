using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pestlook.WebAPI.Data;
using Pestlook.WebAPI.DTOs.Common;
using Pestlook.WebAPI.Infrastructure.Services.Interfaces;

namespace Pestlook.WebAPI.Controllers.v1;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/intelligence")]
[Authorize]
public sealed class IntelligenceController(ApplicationDbContext db, IUserTimezoneService tzService) : ControllerBase
{
    // ── Shared helpers ──────────────────────────────────────────────────────

    /// <summary>
    /// Returns the start/end UTC range. Explicit from/to are interpreted as
    /// calendar dates in the user's timezone; day boundaries are the user's
    /// local day converted to UTC.
    /// </summary>
    private async Task<(DateTime From, DateTime To)> ResolveRangeAsync(
        DateTime? from, DateTime? to, int defaultDays, CancellationToken ct)
    {
        var tz = await tzService.GetUserTimeZoneAsync(ct);
        var nowLocal = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tz);

        // Normalize end date to local 23:59:59
        var endLocal = (to?.Date ?? nowLocal.Date).AddDays(1).AddSeconds(-1);

        // Normalize start date to local 00:00:00
        var startLocal = from?.Date ?? endLocal.AddDays(-defaultDays).Date;

        return (LocalToUtc(startLocal, tz), LocalToUtc(endLocal, tz));
    }

    private static DateTime LocalToUtc(DateTime local, TimeZoneInfo tz) =>
        TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(local, DateTimeKind.Unspecified), tz);

    /// <summary>Local calendar date (midnight, Kind=Unspecified) of a UTC instant — bucket label only.</summary>
    private static DateTime ToLocalDate(DateTime utc, TimeZoneInfo tz) =>
        TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utc, DateTimeKind.Utc), tz).Date;

    // ── I1 · Spread & Movement — Pest Spread Direction ──────────────────────

    /// <summary>
    /// Returns per-pest, per-field observation centroids grouped into weekly buckets
    /// so the client can animate movement vectors and compute spread direction/velocity.
    ///
    /// Response shape:
    /// {
    ///   pests: [ { pestId, pestName } ],
    ///   fields: [ { fieldId, fieldName, farmName, lat, lng } ],
    ///   weeklySnapshots: [
    ///     {
    ///       weekStart: "2025-11-03",
    ///       byPest: [
    ///         {
    ///           pestId, pestName,
    ///           fields: [ { fieldId, fieldName, lat, lng, totalCount, isAboveThreshold } ]
    ///         }
    ///       ]
    ///     }
    ///   ],
    ///   spreadVectors: [          // one per pest — computed server-side
    ///     {
    ///       pestId, pestName,
    ///       originFieldId, originFieldName,
    ///       bearingDeg,            // 0–360 — compass direction of spread
    ///       velocityFieldsPerWeek, // how many new fields appear per week on average
    ///       affectedFieldCount,
    ///       firstSeenAt,
    ///       lastSeenAt,
    ///       neighbourRisk: [ { fieldId, fieldName, farmName } ]  // fields adjacent to current front
    ///     }
    ///   ]
    /// }
    /// </summary>
    [HttpGet("spread-direction")]
    public async Task<IActionResult> GetSpreadDirection(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] Guid?     farmId,
        [FromQuery] Guid?     fieldId,
        [FromQuery] Guid?     pestId,
        CancellationToken ct = default)
    {
        var (start, end) = await ResolveRangeAsync(from, to, 180, ct);

        // ── 1. Pull raw GPS observations ─────────────────────────────────────
        var obsQ = db.SessionObservations
            .Where(o => !o.IsUnknownPest
                     && o.PestId != null
                     && o.Count > 0
                     && o.Latitude  != null
                     && o.Longitude != null
                     && o.Session.CompletedAt >= start
                     && o.Session.CompletedAt <= end);

        if (farmId.HasValue)  obsQ = obsQ.Where(o => o.Session.FarmId == farmId || o.Session.Field!.FarmId == farmId);
        if (fieldId.HasValue) obsQ = obsQ.Where(o => o.Session.FieldId == fieldId);
        if (pestId.HasValue)  obsQ = obsQ.Where(o => o.PestId == pestId);

        var obs = await obsQ
            .Select(o => new
            {
                o.PestId,
                PestName      = o.Pest!.CommonName,
                o.ThresholdCount,
                o.Count,
                Lat           = o.Latitude!.Value,
                Lng           = o.Longitude!.Value,
                CompletedAt   = o.Session.CompletedAt!.Value,
                FieldId       = o.Session.FieldId,
                FieldName     = o.Session.Field != null ? o.Session.Field.Name : null,
                FarmName      = o.Session.Farm  != null ? o.Session.Farm.Name
                              : o.Session.Field != null && o.Session.Field.Farm != null
                                  ? o.Session.Field.Farm.Name : null,
            })
            .ToListAsync(ct);

        // ── 2. Fallback: observations without GPS — use field centroid ────────
        //    Pull sessions that have field info but no observation GPS
        var noGpsQ = db.SessionObservations
            .Where(o => !o.IsUnknownPest
                     && o.PestId != null
                     && o.Count > 0
                     && (o.Latitude == null || o.Longitude == null)
                     && o.Session.FieldId != null
                     && o.Session.CompletedAt >= start
                     && o.Session.CompletedAt <= end
                     && o.Session.Field != null);

        if (farmId.HasValue)  noGpsQ = noGpsQ.Where(o => o.Session.FarmId == farmId || o.Session.Field!.FarmId == farmId);
        if (fieldId.HasValue) noGpsQ = noGpsQ.Where(o => o.Session.FieldId == fieldId);
        if (pestId.HasValue)  noGpsQ = noGpsQ.Where(o => o.PestId == pestId);

        // We need field centroids — use Farm lat/lng as proxy (Field doesn't have lat/lng in schema)
        var noGpsObs = await noGpsQ
            .Select(o => new
            {
                o.PestId,
                PestName      = o.Pest!.CommonName,
                o.ThresholdCount,
                o.Count,
                FarmLat  = o.Session.Farm != null ? (double?)o.Session.Farm.Latitude : null,
                FarmLng  = o.Session.Farm != null ? (double?)o.Session.Farm.Longitude : null,
                CompletedAt   = o.Session.CompletedAt!.Value,
                FieldId       = o.Session.FieldId,
                FieldName     = o.Session.Field != null ? o.Session.Field.Name : null,
                FarmName      = o.Session.Farm  != null ? o.Session.Farm.Name
                              : o.Session.Field != null && o.Session.Field.Farm != null
                                  ? o.Session.Field.Farm.Name : null,
            })
            .Where(o => o.FarmLat != null && o.FarmLng != null)
            .ToListAsync(ct);

        // Merge — use farm centroid with a small jitter per field so fields on same farm don't overlap
        var merged = obs.Select(o => new RawObs(
            o.PestId!.Value, o.PestName,
            o.ThresholdCount, o.Count,
            o.Lat, o.Lng,
            o.CompletedAt, o.FieldId, o.FieldName, o.FarmName))
            .Concat(noGpsObs
                .Where(o => o.FarmLat.HasValue)
                .Select(o =>
                {
                    // Tiny per-field jitter (~500m) so field dots don't stack exactly
                    var hash  = o.FieldId?.GetHashCode() ?? 0;
                    var jLat  = ((hash & 0xFFFF) / 32767.0 - 1.0) * 0.004;
                    var jLng  = (((hash >> 16) & 0xFFFF) / 32767.0 - 1.0) * 0.006;
                    return new RawObs(
                        o.PestId!.Value, o.PestName,
                        o.ThresholdCount, o.Count,
                        o.FarmLat!.Value + jLat, o.FarmLng!.Value + jLng,
                        o.CompletedAt, o.FieldId, o.FieldName, o.FarmName);
                }))
            .ToList();

        if (merged.Count == 0)
            return Ok(ApiResponse<object>.Ok(new
            {
                pests            = Array.Empty<object>(),
                fields           = Array.Empty<object>(),
                weeklySnapshots  = Array.Empty<object>(),
                spreadVectors    = Array.Empty<object>(),
            }));

        // ── 3. Distinct pests & fields ────────────────────────────────────────
        var pests = merged
            .GroupBy(o => o.PestId)
            .Select(g => new { pestId = g.Key, pestName = g.First().PestName })
            .OrderBy(p => p.pestName)
            .ToList();

        var fields = merged
            .Where(o => o.FieldId.HasValue)
            .GroupBy(o => o.FieldId)
            .Select(g =>
            {
                var first = g.First();
                return new
                {
                    fieldId   = first.FieldId,
                    fieldName = first.FieldName ?? "(unknown field)",
                    farmName  = first.FarmName,
                    lat       = g.Average(o => o.Lat),
                    lng       = g.Average(o => o.Lng),
                };
            })
            .ToList();

        // ── 4. Weekly snapshots (centroid per pest per field per week) ────────
        var weeklySnapshots = merged
            .GroupBy(o => Monday(o.CompletedAt))
            .OrderBy(g => g.Key)
            .Select(weekGrp => new
            {
                weekStart = weekGrp.Key.ToString("yyyy-MM-dd"),
                byPest    = weekGrp
                    .GroupBy(o => o.PestId)
                    .Select(pg => new
                    {
                        pestId   = pg.Key,
                        pestName = pg.First().PestName,
                        fields   = pg
                            .GroupBy(o => o.FieldId)
                            .Select(fg =>
                            {
                                var f     = fg.First();
                                var total = fg.Sum(o => o.Count ?? 0);
                                var thr   = fg.Max(o => o.ThresholdCount);
                                return new
                                {
                                    fieldId          = f.FieldId,
                                    fieldName        = f.FieldName ?? "(unknown)",
                                    lat              = fg.Average(o => o.Lat),
                                    lng              = fg.Average(o => o.Lng),
                                    totalCount       = total,
                                    isAboveThreshold = thr.HasValue && total > thr.Value,
                                };
                            })
                            .ToList(),
                    })
                    .ToList(),
            })
            .ToList();

        // ── 5. Spread vectors (one per pest) ──────────────────────────────────
        var spreadVectors = pests.Select(p =>
        {
            var pestObs = merged.Where(o => o.PestId == p.pestId).OrderBy(o => o.CompletedAt).ToList();
            if (pestObs.Count < 2)
                return null;

            // Group by week to get weekly centroids
            var weeklyCentroids = pestObs
                .GroupBy(o => Monday(o.CompletedAt))
                .OrderBy(g => g.Key)
                .Select(g => new
                {
                    WeekStart = g.Key,
                    Lat       = g.Average(o => o.Lat),
                    Lng       = g.Average(o => o.Lng),
                    Fields    = g.Select(o => o.FieldId).Distinct().Count(),
                })
                .ToList();

            // Bearing: from earliest centroid → latest centroid
            var first = weeklyCentroids.First();
            var last  = weeklyCentroids.Last();
            var bearingDeg = Bearing(first.Lat, first.Lng, last.Lat, last.Lng);

            // Velocity: new distinct fields per week
            var distinctFieldsByWeek = pestObs
                .GroupBy(o => Monday(o.CompletedAt))
                .OrderBy(g => g.Key)
                .Select(g => g.Select(o => o.FieldId).Distinct().Count())
                .ToList();
            var velocityFieldsPerWeek = distinctFieldsByWeek.Count > 1
                ? Math.Round((double)(distinctFieldsByWeek.Max() - distinctFieldsByWeek.First()) / (distinctFieldsByWeek.Count - 1), 2)
                : 0;

            // Origin: earliest field + week
            var originObs  = pestObs.First();
            var originField = pestObs
                .GroupBy(o => o.FieldId)
                .OrderBy(g => g.Min(o => o.CompletedAt))
                .FirstOrDefault();

            var affectedFieldIds = pestObs.Where(o => o.FieldId.HasValue).Select(o => o.FieldId!.Value).Distinct().ToHashSet();
            var affectedFieldCount = affectedFieldIds.Count;

            // Neighbour risk: fields that are geographically close to the spread front but NOT yet affected
            // "Close" = within ~0.05 degrees lat/lng (~5 km)
            var frontLat = last.Lat;
            var frontLng = last.Lng;
            var neighbourRisk = fields
                .Where(f => f.fieldId.HasValue
                         && !affectedFieldIds.Contains(f.fieldId!.Value)
                         && HaversineKm(frontLat, frontLng, f.lat, f.lng) < 5.0)
                .Select(f => new { f.fieldId, f.fieldName, f.farmName })
                .ToList();

            return (object)new
            {
                pestId                 = p.pestId,
                pestName               = p.pestName,
                originFieldId          = originField?.Key,
                originFieldName        = originField?.First().FieldName ?? "(unknown)",
                bearingDeg             = Math.Round(bearingDeg, 1),
                bearingLabel           = BearingLabel(bearingDeg),
                velocityFieldsPerWeek  = velocityFieldsPerWeek,
                affectedFieldCount,
                firstSeenAt            = pestObs.Min(o => o.CompletedAt).ToString("yyyy-MM-dd"),
                lastSeenAt             = pestObs.Max(o => o.CompletedAt).ToString("yyyy-MM-dd"),
                weeklyCentroidCount    = weeklyCentroids.Count,
                neighbourRisk,
            };
        })
        .Where(v => v != null)
        .ToList();

        return Ok(ApiResponse<object>.Ok(new
        {
            pests,
            fields,
            weeklySnapshots,
            spreadVectors,
        }));
    }

    // ── I3 · Spread & Movement — Infestation Origin Detection ──────────────

    /// <summary>
    /// Works backwards from the observation record to identify the most likely
    /// origin field for each pest outbreak — the field that first reported the
    /// species at or above threshold — then builds a chronological spread chain
    /// showing which subsequent fields were reached and how many days later.
    ///
    /// Response shape:
    /// {
    ///   origins: [
    ///     {
    ///       pestId, pestName,
    ///       totalFieldsAffected,
    ///       daysToSecondField,       // null when only one field
    ///       maxSpreadDistanceKm,     // null when GPS unavailable
    ///       outbreakConfidence,      // 0.0–1.0 composite score
    ///       chain: [
    ///         {
    ///           step, fieldId, fieldName, farmName,
    ///           lat, lng,               // null when no GPS
    ///           firstSeenAt,            // "yyyy-MM-dd"
    ///           firstCount,             // total count in first 7-day window
    ///           threshold, wasAboveThreshold,
    ///           lagDays,               // days after the origin (0 for origin)
    ///           distanceKm,            // from origin; null when GPS unavailable
    ///           isOrigin               // true only for step 0
    ///         }
    ///       ]
    ///     }
    ///   ]
    /// }
    /// </summary>
    [HttpGet("origin-detection")]
    public async Task<IActionResult> GetOriginDetection(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] Guid?     farmId,
        [FromQuery] Guid?     fieldId,
        [FromQuery] Guid?     pestId,
        CancellationToken ct = default)
    {
        var (start, end) = await ResolveRangeAsync(from, to, 180, ct);

        var obsQ = db.SessionObservations
            .Where(o => !o.IsUnknownPest
                     && o.PestId != null
                     && o.Count > 0
                     && o.Session.CompletedAt >= start
                     && o.Session.CompletedAt <= end
                     && o.Session.FieldId != null);

        if (farmId.HasValue)  obsQ = obsQ.Where(o => o.Session.FarmId == farmId || o.Session.Field!.FarmId == farmId);
        if (fieldId.HasValue) obsQ = obsQ.Where(o => o.Session.FieldId == fieldId);
        if (pestId.HasValue)  obsQ = obsQ.Where(o => o.PestId == pestId);

        var obs = await obsQ
            .Select(o => new
            {
                o.PestId,
                PestName    = o.Pest!.CommonName,
                FieldId     = o.Session.FieldId!.Value,
                FieldName   = o.Session.Field != null ? o.Session.Field.Name : "(unknown)",
                FarmName    = o.Session.Farm  != null ? o.Session.Farm.Name
                            : o.Session.Field != null && o.Session.Field.Farm != null
                                ? o.Session.Field.Farm.Name : null,
                o.ThresholdCount,
                o.Count,
                // GPS: prefer observation-level coords, fall back to farm centroid
                ObsLat      = o.Latitude,
                ObsLng      = o.Longitude,
                FarmLat     = o.Session.Farm != null ? (double?)o.Session.Farm.Latitude  : null,
                FarmLng     = o.Session.Farm != null ? (double?)o.Session.Farm.Longitude : null,
                CompletedAt = o.Session.CompletedAt!.Value,
            })
            .ToListAsync(ct);

        if (obs.Count == 0)
            return Ok(ApiResponse<object>.Ok(new { origins = Array.Empty<object>() }));

        var origins = obs
            .GroupBy(o => o.PestId)
            .OrderBy(pg => pg.First().PestName)
            .Select(pg =>
            {
                var pestName = pg.First().PestName;

                // Per-field: earliest first seen, first-week count, best GPS coords
                var byField = pg
                    .GroupBy(o => o.FieldId)
                    .Select(fg =>
                    {
                        var ordered      = fg.OrderBy(o => o.CompletedAt).ToList();
                        var first        = ordered[0];
                        var threshold    = fg.Max(o => o.ThresholdCount);
                        var firstWeekEnd = first.CompletedAt.AddDays(7);
                        var firstCount   = fg.Where(o => o.CompletedAt <= firstWeekEnd)
                                             .Sum(o => o.Count ?? 0);

                        // Pick the best available lat/lng — observation GPS preferred
                        var gpsObs = fg.FirstOrDefault(o => o.ObsLat.HasValue && o.ObsLng.HasValue);
                        double? lat = gpsObs?.ObsLat ?? first.FarmLat;
                        double? lng = gpsObs?.ObsLng ?? first.FarmLng;

                        return new
                        {
                            first.FieldId,
                            first.FieldName,
                            first.FarmName,
                            Lat              = lat,
                            Lng              = lng,
                            HasGps           = lat.HasValue && lng.HasValue,
                            FirstSeenAt      = first.CompletedAt,
                            FirstCount       = firstCount,
                            Threshold        = threshold,
                            WasAboveThreshold = threshold.HasValue && firstCount > threshold.Value,
                        };
                    })
                    .OrderBy(f => f.FirstSeenAt)
                    .ToList();

                if (byField.Count == 0) return null;

                var origin = byField[0];

                var chain = byField.Select((f, i) =>
                {
                    var lagDays = (int)(f.FirstSeenAt - origin.FirstSeenAt).TotalDays;
                    double? distKm = (f.HasGps && origin.HasGps)
                        ? Math.Round(HaversineKm(origin.Lat!.Value, origin.Lng!.Value, f.Lat!.Value, f.Lng!.Value), 2)
                        : null;
                    return new
                    {
                        step              = i,
                        fieldId           = f.FieldId,
                        fieldName         = f.FieldName,
                        farmName          = f.FarmName,
                        lat               = f.Lat,
                        lng               = f.Lng,
                        firstSeenAt       = f.FirstSeenAt.ToString("yyyy-MM-dd"),
                        firstCount        = f.FirstCount,
                        threshold         = f.Threshold,
                        wasAboveThreshold = f.WasAboveThreshold,
                        lagDays,
                        distanceKm        = distKm,
                        isOrigin          = i == 0,
                    };
                }).ToList();

                // Outbreak confidence: weighted composite
                //   +0.40  if origin count was already above threshold
                //   +0.35  if a second field appeared within 21 days (rapid spread)
                //   +0.10  bonus per additional field (capped at 0.25)
                bool   quickSpread = chain.Count > 1 && chain[1].lagDays <= 21;
                double confidence  = Math.Round(
                    (origin.WasAboveThreshold ? 0.40 : 0.10)
                  + (quickSpread              ? 0.35 : 0.05)
                  + Math.Min(0.25, (chain.Count - 1) * 0.08),
                    2);

                int?    daysToSecond = chain.Count > 1 ? (int?)chain[1].lagDays : null;
                double? maxDist      = chain.Where(f => f.distanceKm.HasValue)
                                           .Select(f => f.distanceKm!.Value)
                                           .DefaultIfEmpty()
                                           .Max() is double d && d > 0 ? d : null;

                return (object?)new
                {
                    pestId               = pg.Key,
                    pestName,
                    totalFieldsAffected  = chain.Count,
                    daysToSecondField    = daysToSecond,
                    maxSpreadDistanceKm  = maxDist,
                    outbreakConfidence   = confidence,
                    chain,
                };
            })
            .Where(o => o != null)
            .OrderByDescending(o => ((dynamic)o!).outbreakConfidence)
            .ToList<object>();

        return Ok(ApiResponse<object>.Ok(new { origins }));
    }

    // ── I2 · Predictive Intelligence — Pest Population Forecast ────────────

    /// <summary>
    /// Returns per-pest-per-field weekly observation history with a linear-regression
    /// (OLS) forecast for the next N weeks, a 90 % confidence interval, breach
    /// probability, and trend direction.  Response is a flat list so the client can
    /// sort / filter without further grouping.
    /// </summary>
    [HttpGet("population-forecast")]
    public async Task<IActionResult> GetPopulationForecast(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] Guid?     farmId,
        [FromQuery] Guid?     fieldId,
        [FromQuery] Guid?     pestId,
        [FromQuery] int       weeksAhead = 4,
        CancellationToken ct = default)
    {
        var (start, end) = await ResolveRangeAsync(from, to, 180, ct);
        weeksAhead = Math.Clamp(weeksAhead, 1, 12);

        var obsQ = db.SessionObservations
            .Where(o => !o.IsUnknownPest
                     && o.PestId != null
                     && o.Count > 0
                     && o.Session.CompletedAt >= start
                     && o.Session.CompletedAt <= end
                     && o.Session.FieldId != null);

        if (farmId.HasValue)  obsQ = obsQ.Where(o => o.Session.FarmId == farmId || o.Session.Field!.FarmId == farmId);
        if (fieldId.HasValue) obsQ = obsQ.Where(o => o.Session.FieldId == fieldId);
        if (pestId.HasValue)  obsQ = obsQ.Where(o => o.PestId == pestId);

        var obs = await obsQ
            .Select(o => new
            {
                o.PestId,
                PestName    = o.Pest!.CommonName,
                FieldId     = o.Session.FieldId!.Value,
                FieldName   = o.Session.Field != null ? o.Session.Field.Name : "(unknown)",
                FarmName    = o.Session.Farm  != null ? o.Session.Farm.Name
                            : o.Session.Field != null && o.Session.Field.Farm != null
                                ? o.Session.Field.Farm.Name : null,
                o.ThresholdCount,
                o.Count,
                CompletedAt = o.Session.CompletedAt!.Value,
            })
            .ToListAsync(ct);

        if (obs.Count == 0)
            return Ok(ApiResponse<object>.Ok(new { forecasts = Array.Empty<object>() }));

        var forecasts = obs
            .GroupBy(o => (o.PestId, o.FieldId))
            .Select(grp =>
            {
                var first     = grp.First();
                var threshold = grp.Max(o => o.ThresholdCount);

                // Weekly totals, ordered chronologically
                var weekly = grp
                    .GroupBy(o => Monday(o.CompletedAt))
                    .OrderBy(g => g.Key)
                    .Select(wg => new { WeekStart = wg.Key, Total = wg.Sum(o => o.Count ?? 0) })
                    .ToList();

                if (weekly.Count == 0) return null;

                // OLS linear regression: x = week index (0‥n-1), y = total count
                int    n        = weekly.Count;
                double xMean    = (n - 1) / 2.0;
                double yMean    = weekly.Average(w => (double)w.Total);
                double ssXX     = Enumerable.Range(0, n).Sum(i => Math.Pow(i - xMean, 2));
                double ssXY     = weekly.Select((w, i) => (i - xMean) * (w.Total - yMean)).Sum();
                double slope    = ssXX > 0 ? ssXY / ssXX : 0;
                double intercept = yMean - slope * xMean;

                // Residual standard error for the 90 % CI (z = 1.645)
                double sse = weekly.Select((w, i) => Math.Pow(w.Total - (intercept + slope * i), 2)).Sum();
                double se  = n > 2 ? Math.Sqrt(sse / (n - 2)) : Math.Max(yMean * 0.2, 1);

                var history = weekly.Select((w, i) => new
                {
                    weekStart   = w.WeekStart.ToString("yyyy-MM-dd"),
                    totalCount  = w.Total,
                    fittedCount = (int)Math.Max(0, Math.Round(intercept + slope * i)),
                }).ToList();

                var forecastPts = Enumerable.Range(1, weeksAhead).Select(k =>
                {
                    int    xi    = n - 1 + k;
                    double proj  = Math.Max(0, intercept + slope * xi);
                    double lower = Math.Max(0, proj - 1.645 * se);
                    double upper = proj + 1.645 * se;
                    return new
                    {
                        weekStart      = weekly.Last().WeekStart.AddDays(7 * k).ToString("yyyy-MM-dd"),
                        projectedCount = (int)Math.Round(proj),
                        lower          = (int)Math.Round(lower),
                        upper          = (int)Math.Round(upper),
                    };
                }).ToList();

                // Breach probability = fraction of forecast weeks whose upper-CI crosses threshold
                double breachProbability = 0;
                if (threshold.HasValue && threshold.Value > 0)
                {
                    int atRisk = forecastPts.Count(f => f.upper >= threshold.Value);
                    breachProbability = Math.Round((double)atRisk / weeksAhead, 2);
                }

                // Last projected count (week N)
                int projectedPeak = forecastPts.Max(f => f.projectedCount);

                string trend = slope > 0.5 ? "rising" : slope < -0.5 ? "falling" : "stable";

                return (object?)new
                {
                    pestId            = first.PestId,
                    pestName          = first.PestName,
                    fieldId           = first.FieldId,
                    fieldName         = first.FieldName,
                    farmName          = first.FarmName,
                    threshold,
                    trend,
                    breachProbability,
                    peakCount         = weekly.Max(w => w.Total),
                    projectedPeak,
                    history,
                    forecast          = forecastPts,
                };
            })
            .Where(f => f != null)
            .OrderByDescending(f => ((dynamic)f!).breachProbability)
            .ThenBy(f => ((dynamic)f!).pestName)
            .ToList<object>();

        return Ok(ApiResponse<object>.Ok(new { forecasts }));
    }

    // ── I4 · Spread & Movement — Neighbour Risk Alert ───────────────────────

    /// <summary>
    /// Identifies fields that have recorded a threshold breach in the period, then finds
    /// all OTHER fields whose farm centroid lies within <paramref name="radiusKm"/> kilometres.
    /// Returns those neighbour fields flagged as elevated-risk, together with their last
    /// scouting session date so unscounted fields can be escalated.
    ///
    /// Response shape:
    /// {
    ///   radiusKm,
    ///   alerts: [ {
    ///     pestId, pestName,
    ///     sourceField: { fieldId, fieldName, farmName, lat, lng, breachCount, lastBreachAt, maxCount, threshold },
    ///     atRiskNeighbours: [ { fieldId, fieldName, farmName, lat, lng, distanceKm,
    ///                           lastSessionAt, daysSinceLastSession } ],
    ///     neighbourCount, unscoutedCount
    ///   } ],
    ///   summary: { breachedFields, atRiskFields, unscoutedRiskFields }
    /// }
    /// </summary>
    [HttpGet("neighbour-risk")]
    public async Task<IActionResult> GetNeighbourRisk(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] Guid?     farmId,
        [FromQuery] Guid?     fieldId,
        [FromQuery] Guid?     pestId,
        [FromQuery] double    radiusKm = 5.0,
        CancellationToken ct = default)
    {
        var (start, end) = await ResolveRangeAsync(from, to, 180, ct);
        radiusKm = Math.Clamp(radiusKm, 0.5, 100.0);

        // ── 1. Load all fields with farm GPS ──────────────────────────────
        var allFields = await db.Fields
            .Where(f => (!farmId.HasValue  || f.FarmId == farmId)
                     && (!fieldId.HasValue || f.Id     == fieldId))
            .Include(f => f.Farm)
            .Select(f => new {
                FieldId   = f.Id,
                FieldName = f.Name,
                FarmId    = f.FarmId,
                FarmName  = f.Farm!.Name,
                Lat       = f.Farm!.Latitude,
                Lng       = f.Farm!.Longitude,
            })
            .ToListAsync();

        // ── 2. Load threshold-breaching observations in period ────────────
        var breachObs = await db.SessionObservations
            .Where(o => o.Session!.CompletedAt >= start
                     && o.Session!.CompletedAt <= end
                     && o.Count > o.ThresholdCount
                     && o.Count.HasValue
                     && o.ThresholdCount.HasValue
                     && o.Session!.FieldId.HasValue
                     && o.PestId.HasValue
                     && (!farmId.HasValue  || o.Session!.FarmId == farmId)
                     && (!fieldId.HasValue || o.Session!.FieldId == fieldId)
                     && (!pestId.HasValue  || o.PestId           == pestId))
            .Select(o => new {
                PestId    = o.PestId!.Value,
                PestName  = o.Pest!.CommonName,
                FieldId   = o.Session!.FieldId!.Value,
                Count     = o.Count!.Value,
                Threshold = o.ThresholdCount!.Value,
                At        = o.Session!.CompletedAt,
                ObsLat    = o.Latitude,
                ObsLng    = o.Longitude,
            })
            .ToListAsync();

        if (!breachObs.Any())
            return Ok(ApiResponse<object>.Ok(new {
                radiusKm,
                alerts  = Array.Empty<object>(),
                summary = new { breachedFields = 0, atRiskFields = 0, unscoutedRiskFields = 0 },
            }));

        // ── 3. Last completed session per field ───────────────────────────
        var lastSession = await db.ScoutingSessions
            .Where(s => s.CompletedAt.HasValue && s.FieldId.HasValue)
            .GroupBy(s => s.FieldId!.Value)
            .Select(g => new { FieldId = g.Key, LastAt = g.Max(s => s.CompletedAt) })
            .ToListAsync();

        var lastSessionMap = lastSession.ToDictionary(x => x.FieldId, x => x.LastAt);
        var fieldMap       = allFields.ToDictionary(f => f.FieldId);

        // ── 4. Group breaches by pest × field ─────────────────────────────
        var now    = DateTime.UtcNow;
        var alerts = breachObs
            .GroupBy(o => new { o.PestId, o.FieldId })
            .Select(g =>
            {
                var pestId2   = g.Key.PestId;
                var srcFieldId = g.Key.FieldId;

                if (!fieldMap.TryGetValue(srcFieldId, out var srcField)) return null;

                // Use farm GPS as fallback (obs GPS not reliably available at this aggregate level)
                if (!srcField.Lat.HasValue || !srcField.Lng.HasValue
                    || srcField.Lat.Value == 0 && srcField.Lng.Value == 0) return null;

                double srcLat = srcField.Lat.Value;
                double srcLng = srcField.Lng.Value;

                var breachCount  = g.Count();
                var lastBreachAt = g.Max(o => o.At);
                var maxCount     = g.Max(o => o.Count);
                var threshold    = g.First().Threshold;
                var pestName     = g.First().PestName;

                // ── 5. Find neighbours within radius ──────────────────────
                var neighbours = allFields
                    .Where(f => f.FieldId != srcFieldId
                             && f.Lat.HasValue && f.Lng.HasValue
                             && f.Lat.Value != 0 && f.Lng.Value != 0
                             && HaversineKm(srcLat, srcLng, f.Lat.Value, f.Lng.Value) <= radiusKm)
                    .Select(f =>
                    {
                        var distKm = Math.Round(HaversineKm(srcLat, srcLng, f.Lat!.Value, f.Lng!.Value), 2);
                        lastSessionMap.TryGetValue(f.FieldId, out var lastAt);
                        var daysSince = lastAt.HasValue
                            ? (int)(now - lastAt.Value).TotalDays
                            : (int?)null;
                        return new {
                            fieldId             = f.FieldId,
                            fieldName           = f.FieldName,
                            farmName            = f.FarmName,
                            lat                 = f.Lat,
                            lng                 = f.Lng,
                            distanceKm          = distKm,
                            lastSessionAt       = lastAt,
                            daysSinceLastSession = daysSince,
                        };
                    })
                    .OrderBy(n => n.distanceKm)
                    .ToList<object>();

                var unscoutedCount = neighbours
                    .Cast<dynamic>()
                    .Count(n => n.daysSinceLastSession == null || n.daysSinceLastSession > 7);

                return new {
                    pestId          = pestId2,
                    pestName,
                    sourceField = new {
                        fieldId     = srcField.FieldId,
                        fieldName   = srcField.FieldName,
                        farmName    = srcField.FarmName,
                        lat         = srcLat,
                        lng         = srcLng,
                        breachCount,
                        lastBreachAt,
                        maxCount,
                        threshold,
                    },
                    atRiskNeighbours = neighbours,
                    neighbourCount   = neighbours.Count,
                    unscoutedCount,
                } as object;
            })
            .Where(a => a != null)
            .OrderByDescending(a => ((dynamic)a!).unscoutedCount)
            .ThenByDescending(a => ((dynamic)a!).sourceField.breachCount)
            .ToList<object>();

        var summary = new {
            breachedFields    = alerts.Select(a => ((dynamic)a).sourceField.fieldId).Distinct().Count(),
            atRiskFields      = alerts.SelectMany(a => (IEnumerable<object>)((dynamic)a).atRiskNeighbours)
                                      .Cast<dynamic>().Select(n => (Guid)n.fieldId).Distinct().Count(),
            unscoutedRiskFields = alerts.Cast<dynamic>().Sum(a => (int)a.unscoutedCount),
        };

        return Ok(ApiResponse<object>.Ok(new { radiusKm, alerts, summary }));
    }

    // ── I5 · Spread & Movement — Cross-Farm Outbreak Correlation ────────────

    /// <summary>
    /// Identifies weeks where the same pest species spiked simultaneously across two or more
    /// farms, surfacing regional outbreak events distinct from isolated farm-level incidents.
    ///
    /// A "spike" is defined per farm as any week whose total observation count exceeds the
    /// higher of: (a) the configured action threshold, or (b) 1.5× that farm's own
    /// median weekly count for the pest over the full period.
    ///
    /// Response shape:
    /// {
    ///   outbreaks: [ {
    ///     pestId, pestName,
    ///     peakWeek,            // ISO week start (Monday) of worst simultaneous spike
    ///     farmCount,           // number of farms that spiked in the same week
    ///     totalCount,          // combined count across all spiking farms that week
    ///     isRegional,          // true when farmCount >= 2
    ///     weeks: [             // all weeks where this pest spiked on 2+ farms
    ///       { weekStart, farmCount, totalCount,
    ///         farms: [ { farmId, farmName, weekCount, isAboveThreshold } ] }
    ///     ],
    ///     farmTimeline: [      // per-farm weekly series for charting
    ///       { farmId, farmName,
    ///         series: [ { weekStart, count, isSpike } ] }
    ///     ]
    ///   } ],
    ///   summary: { totalOutbreakPests, regionalOutbreaks, peakFarmCount, peakPestName }
    /// }
    /// </summary>
    [HttpGet("cross-farm-correlation")]
    public async Task<IActionResult> GetCrossFarmCorrelation(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] Guid?     farmId,
        [FromQuery] Guid?     pestId,
        [FromQuery] int       minFarms = 2,
        CancellationToken ct = default)
    {
        var (start, end) = await ResolveRangeAsync(from, to, 365, ct);
        minFarms = Math.Clamp(minFarms, 2, 20);

        // ── 1. Aggregate weekly totals per pest × farm in SQL ────────────────
        // NOTE: farmId is intentionally NOT applied here — cross-farm analysis
        // requires all farms' data. It is used below to post-filter results to
        // outbreaks that include the selected farm as a participant.
        var raw = await db.SessionObservations
            .Where(o => o.Session!.CompletedAt >= start
                     && o.Session!.CompletedAt <= end
                     && o.Count.HasValue
                     && o.PestId.HasValue
                     && o.Session!.FarmId.HasValue
                     && (!pestId.HasValue || o.PestId == pestId))
            .GroupBy(o => new
            {
                PestId   = o.PestId!.Value,
                PestName = o.Pest!.CommonName,
                FarmId   = o.Session!.FarmId!.Value,
                FarmName = o.Session!.Farm!.Name,
                // Week index from epoch — groups all obs in the same Monday-Sunday bucket
                WeekIndex = o.Session!.CompletedAt!.Value.DayOfYear / 7 + o.Session!.CompletedAt!.Value.Year * 54,
            })
            .Select(g => new
            {
                g.Key.PestId,
                g.Key.PestName,
                g.Key.FarmId,
                g.Key.FarmName,
                WeekStart    = g.Min(o => o.Session!.CompletedAt!.Value),
                WeeklyCount  = g.Sum(o => o.Count!.Value),
                MaxThreshold = g.Max(o => o.ThresholdCount),
            })
            .ToListAsync();

        if (!raw.Any())
            return Ok(ApiResponse<object>.Ok(new {
                outbreaks = Array.Empty<object>(),
                summary   = new { totalOutbreakPests = 0, regionalOutbreaks = 0, peakFarmCount = 0, peakPestName = (string?)null },
            }));

        // ── 2. Build spike detection per pest × farm from the aggregated weekly rows ──
        var byPest = raw
            .GroupBy(r => new { r.PestId, r.PestName })
            .Select(pg =>
            {
                var pestId2   = pg.Key.PestId;
                var pestName  = pg.Key.PestName;

                // Farm-level weekly series — already summed, just normalise the WeekStart to Monday
                var byFarm = pg
                    .GroupBy(r => new { r.FarmId, r.FarmName })
                    .Select(fg =>
                    {
                        var farmId2   = fg.Key.FarmId;
                        var farmName  = fg.Key.FarmName;
                        var threshold = fg.Max(r => r.MaxThreshold) ?? 0;

                        var weekly = fg
                            .Select(r => new { WeekStart = Monday(r.WeekStart), Count = r.WeeklyCount })
                            .GroupBy(r => r.WeekStart) // collapse any same-week duplicates from WeekIndex boundary
                            .Select(wg => new { WeekStart = wg.Key, Count = wg.Sum(r => r.Count) })
                            .OrderBy(w => w.WeekStart)
                            .ToList();

                        // Median weekly count for this farm × pest
                        var sorted  = weekly.Select(w => (double)w.Count).OrderBy(x => x).ToList();
                        var median  = sorted.Count % 2 == 0
                            ? (sorted[sorted.Count / 2 - 1] + sorted[sorted.Count / 2]) / 2.0
                            : sorted[sorted.Count / 2];
                        var spikeThreshold = Math.Max(threshold, median * 1.5);

                        return new {
                            farmId2,
                            farmName,
                            threshold,
                            spikeThreshold,
                            weekly,
                        };
                    })
                    .ToList();

                // Collect all distinct weeks across all farms for this pest
                var allWeeks = byFarm
                    .SelectMany(f => f.weekly.Select(w => w.WeekStart))
                    .Distinct()
                    .OrderBy(w => w)
                    .ToList();

                // For each week: find farms that spiked
                var weekSnapshots = allWeeks
                    .Select(week =>
                    {
                        var spiking = byFarm
                            .Select(f =>
                            {
                                var entry = f.weekly.FirstOrDefault(w => w.WeekStart == week);
                                if (entry == null) return null;
                                var isSpike = entry.Count >= f.spikeThreshold;
                                return isSpike ? new {
                                    farmId    = f.farmId2,
                                    farmName  = f.farmName,
                                    weekCount = entry.Count,
                                    isAboveThreshold = entry.Count >= f.threshold,
                                } : null;
                            })
                            .Where(x => x != null)
                            .ToList();

                        return new {
                            weekStart  = week,
                            farmCount  = spiking.Count,
                            totalCount = spiking.Sum(s => s!.weekCount),
                            farms      = spiking.Cast<object>().ToList(),
                        };
                    })
                    .Where(w => w.farmCount >= minFarms)
                    .OrderBy(w => w.weekStart)
                    .ToList();

                if (!weekSnapshots.Any()) return null;

                var peakWeekSnap = weekSnapshots.MaxBy(w => w.farmCount * 1000 + w.totalCount);

                // Farm timeline (all weeks, not just spikes) — for the chart
                var farmTimeline = byFarm.Select(f =>
                {
                    var spikeThresh = f.spikeThreshold;
                    return new {
                        farmId   = f.farmId2,
                        farmName = f.farmName,
                        series   = f.weekly.Select(w => new {
                            weekStart = w.WeekStart,
                            count     = w.Count,
                            isSpike   = w.Count >= spikeThresh,
                        }).ToList<object>(),
                    };
                }).ToList<object>();

                return new {
                    pestId    = pestId2,
                    pestName,
                    peakWeek      = peakWeekSnap!.weekStart,
                    farmCount     = peakWeekSnap.farmCount,
                    totalCount    = peakWeekSnap.totalCount,
                    isRegional    = peakWeekSnap.farmCount >= minFarms,
                    weeks         = weekSnapshots.Cast<object>().ToList(),
                    farmTimeline,
                } as object;
            })
            .Where(p => p != null)
            .OrderByDescending(p => ((dynamic)p!).farmCount)
            .ThenByDescending(p => ((dynamic)p!).totalCount)
            .ToList<object>();

        // ── Post-filter: if a farmId was specified, keep only outbreaks where
        //    that farm was one of the spiking participants in at least one week.
        if (farmId.HasValue)
        {
            var farmIdStr = farmId.Value;
            byPest = byPest
                .Where(p =>
                {
                    var weeks2 = (IEnumerable<object>)((dynamic)p!).weeks;
                    return weeks2.Any(w =>
                    {
                        var farms2 = (IEnumerable<object>)((dynamic)w).farms;
                        return farms2.Any(f => (Guid)((dynamic)f).farmId == farmIdStr);
                    });
                })
                .ToList();
        }

        var summary = new {
            totalOutbreakPests = byPest.Count,
            regionalOutbreaks  = byPest.Count(p => (bool)((dynamic)p!).isRegional),
            peakFarmCount      = byPest.Any() ? (int)((dynamic)byPest.First()!).farmCount  : 0,
            peakPestName       = byPest.Any() ? (string)((dynamic)byPest.First()!).pestName : null,
        };

        return Ok(ApiResponse<object>.Ok(new { outbreaks = byPest, summary }));
    }

    // ── I5b · Spread & Movement — Spread Velocity Score ─────────────────────

    /// <summary>
    /// Measures how fast a pest is actively spreading field-to-field RIGHT NOW.
    /// Velocity = change in the number of distinct fields actively reporting the
    /// pest week-over-week.  A field counts as "active" in a week if it had at
    /// least one observation with Count > 0 that week.
    ///
    /// Rising active-field count  → spreading.
    /// Falling active-field count → retreating / under control.
    /// Stable / zero              → contained at current level.
    ///
    /// This remains meaningful for established pests because it tracks
    /// re-emergence, seasonal flare-ups, and post-treatment recovery —
    /// not just first-ever appearances.
    /// </summary>
    [HttpGet("spread-velocity")]
    public async Task<IActionResult> GetSpreadVelocity(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] Guid?     farmId,
        [FromQuery] Guid?     pestId,
        CancellationToken ct = default)
    {
        var (windowStart, windowEnd) = await ResolveRangeAsync(from, to, 180, ct);

        var obsQ = db.SessionObservations
            .Where(o => !o.IsUnknownPest && o.PestId != null && o.Count > 0
                     && o.Session.FieldId  != null
                     && o.Session.CompletedAt >= windowStart
                     && o.Session.CompletedAt <= windowEnd);

        if (farmId.HasValue) obsQ = obsQ.Where(o => o.Session.FarmId == farmId || o.Session.Field!.FarmId == farmId);
        if (pestId.HasValue) obsQ = obsQ.Where(o => o.PestId == pestId);

        var obs = await obsQ
            .Select(o => new
            {
                o.PestId,
                PestName = o.Pest!.CommonName,
                FieldId  = o.Session.FieldId!.Value,
                SeenAt   = o.Session.CompletedAt!.Value,
            })
            .ToListAsync(ct);

        if (obs.Count == 0)
            return Ok(ApiResponse<object>.Ok(new
            {
                pests   = Array.Empty<object>(),
                summary = new { totalPests = 0, activelySpreading = 0, retreating = 0, contained = 0 },
            }));

        // Build a contiguous week series across the full window
        var allWeeks = new List<DateTime>();
        var cursor   = Monday(windowStart);
        while (cursor <= Monday(windowEnd).AddDays(7)) { allWeeks.Add(cursor); cursor = cursor.AddDays(7); }

        var pests = obs
            .GroupBy(o => (o.PestId, o.PestName))
            .Select(pg =>
            {
                var id   = pg.Key.PestId;
                var name = pg.Key.PestName;

                // Distinct fields active (Count > 0) per week
                var activeByWeek = pg
                    .GroupBy(o => Monday(o.SeenAt))
                    .ToDictionary(g => g.Key, g => g.Select(o => o.FieldId).Distinct().Count());

                // Build typed week series
                var typed = allWeeks
                    .Select(w => (WeekStart: w, ActiveFields: activeByWeek.GetValueOrDefault(w, 0)))
                    .ToList();

                // Week-over-week velocity = change in active field count
                var velocityByWeek = typed
                    .Select((w, i) =>
                    {
                        int prev     = i > 0 ? typed[i - 1].ActiveFields : w.ActiveFields;
                        int velocity = w.ActiveFields - prev;
                        return (w.WeekStart, w.ActiveFields, Velocity: velocity);
                    })
                    .ToList();

                // Current velocity = most recent week's change
                int currentVelocity  = velocityByWeek.Any() ? velocityByWeek.Last().Velocity : 0;
                int currentActive    = velocityByWeek.Any() ? velocityByWeek.Last().ActiveFields : 0;
                int peakActive       = typed.Any() ? typed.Max(w => w.ActiveFields) : 0;

                // Peak velocity = largest single-week increase
                int peakVelocity = velocityByWeek.Any() ? velocityByWeek.Max(w => w.Velocity) : 0;

                // OLS slope across active-field counts → overall trend direction
                int n        = typed.Count;
                double xMean = (n - 1) / 2.0;
                double yMean = n > 0 ? typed.Average(w => (double)w.ActiveFields) : 0;
                double ssXX  = typed.Select((_, i) => Math.Pow(i - xMean, 2)).Sum();
                double ssXY  = typed.Select((w, i) => (i - xMean) * (w.ActiveFields - yMean)).Sum();
                double slope = ssXX > 0 ? ssXY / ssXX : 0;

                string trend  = slope > 0.15 ? "Rising" : slope < -0.15 ? "Falling" : "Stable";
                string status = currentVelocity > 0  ? "Spreading"
                              : currentVelocity < 0  ? "Retreating"
                              : currentActive   == 0 ? "Inactive"
                              : "Contained";

                var weeklyHistory = velocityByWeek
                    .Select(w => (object)new
                    {
                        weekStart     = w.WeekStart.ToString("yyyy-MM-dd"),
                        activeFields  = w.ActiveFields,
                        velocity      = w.Velocity,
                        velocityScore = Math.Abs(w.Velocity), // for sparkline height
                    })
                    .ToList();

                return (object?)new
                {
                    pestId         = id,
                    pestName       = name,
                    currentActive,
                    peakActive,
                    currentVelocity,
                    peakVelocity,
                    trend,
                    status,
                    weeklyHistory,
                };
            })
            .Where(p => p != null)
            .OrderByDescending(p => ((dynamic)p!).currentVelocity)
            .ThenByDescending(p => ((dynamic)p!).currentActive)
            .ToList<object>();

        var summary = new
        {
            totalPests        = pests.Count,
            activelySpreading = pests.Count(p => (string)((dynamic)p!).status == "Spreading"),
            retreating        = pests.Count(p => (string)((dynamic)p!).status == "Retreating"),
            contained         = pests.Count(p => (string)((dynamic)p!).status is "Contained" or "Inactive"),
        };

        return Ok(ApiResponse<object>.Ok(new { pests, summary }));
    }

    // ── I6 · Predictive — Threshold Breach Probability ──────────────────────

    [HttpGet("breach-probability")]
    public async Task<IActionResult> GetBreachProbability(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] Guid?     farmId,
        [FromQuery] Guid?     fieldId,
        [FromQuery] Guid?     pestId,
        CancellationToken ct = default)
    {
        var (start, end) = await ResolveRangeAsync(from, to, 180, ct);

        var obsQ = db.SessionObservations
            .Where(o => !o.IsUnknownPest && o.PestId != null && o.Count > 0
                     && o.Session.CompletedAt >= start && o.Session.CompletedAt <= end
                     && o.Session.FieldId != null);

        if (farmId.HasValue)  obsQ = obsQ.Where(o => o.Session.FarmId == farmId || o.Session.Field!.FarmId == farmId);
        if (fieldId.HasValue) obsQ = obsQ.Where(o => o.Session.FieldId == fieldId);
        if (pestId.HasValue)  obsQ = obsQ.Where(o => o.PestId == pestId);

        var obs = await obsQ
            .Select(o => new
            {
                o.PestId,
                PestName    = o.Pest!.CommonName,
                FieldId     = o.Session.FieldId!.Value,
                FieldName   = o.Session.Field != null ? o.Session.Field.Name : "(unknown)",
                FarmName    = o.Session.Farm  != null ? o.Session.Farm.Name
                            : o.Session.Field != null && o.Session.Field.Farm != null ? o.Session.Field.Farm.Name : null,
                o.ThresholdCount,
                o.Count,
                CompletedAt = o.Session.CompletedAt!.Value,
            })
            .ToListAsync(ct);

        if (obs.Count == 0)
            return Ok(ApiResponse<object>.Ok(new { combinations = Array.Empty<object>(), summary = new { total = 0, highRisk = 0, mediumRisk = 0, lowRisk = 0 } }));

        var combinations = obs
            .GroupBy(o => (o.PestId, o.FieldId))
            .Select(grp =>
            {
                var first     = grp.First();
                var threshold = grp.Max(o => o.ThresholdCount) ?? 0;

                var weekly = grp
                    .GroupBy(o => Monday(o.CompletedAt))
                    .OrderBy(g => g.Key)
                    .Select(wg => new { WeekStart = wg.Key, Total = wg.Sum(o => o.Count ?? 0) })
                    .ToList();

                int n = weekly.Count;
                if (n == 0) return null;

                // OLS slope
                double xMean = (n - 1) / 2.0;
                double yMean = weekly.Average(w => (double)w.Total);
                double ssXX  = Enumerable.Range(0, n).Sum(i => Math.Pow(i - xMean, 2));
                double ssXY  = weekly.Select((w, i) => (i - xMean) * (w.Total - yMean)).Sum();
                double slope = ssXX > 0 ? ssXY / ssXX : 0;
                double intercept = yMean - slope * xMean;
                double projected = Math.Max(0, intercept + slope * n);

                double sse = weekly.Select((w, i) => Math.Pow(w.Total - (intercept + slope * i), 2)).Sum();
                double se  = n > 2 ? Math.Sqrt(sse / (n - 2)) : Math.Max(yMean * 0.2, 1);

                // Probability that the next session's count will exceed threshold
                double prob = 0.5;
                if (threshold > 0)
                {
                    // z-score of (threshold - projected) / se, then 1 - Φ(z)
                    double z = (threshold - projected) / Math.Max(se, 1);
                    prob = 1.0 - NormalCdf(z);
                }
                else if (projected > 0)
                {
                    // No threshold set — use relative change as proxy
                    prob = Math.Min(1.0, Math.Max(0, slope / Math.Max(yMean, 1)));
                }

                string risk = prob >= 0.6 ? "High" : prob >= 0.3 ? "Medium" : "Low";
                string trend = slope > 0.5 ? "Rising" : slope < -0.5 ? "Falling" : "Stable";

                int daysToNext = slope > 0 && threshold > 0 && projected < threshold
                    ? (int)Math.Ceiling((threshold - projected) / Math.Max(slope / 7.0, 0.01))
                    : slope <= 0 ? -1 : 0;

                return (object?)new
                {
                    pestId            = first.PestId,
                    pestName          = first.PestName,
                    fieldId           = first.FieldId,
                    fieldName         = first.FieldName,
                    farmName          = first.FarmName,
                    threshold,
                    currentLevel      = weekly.Last().Total,
                    projectedNext     = (int)Math.Round(projected),
                    breachProbability = Math.Round(prob, 3),
                    risk,
                    trend,
                    daysToBreachEstimate = daysToNext,
                    weeklyHistory     = weekly.Select(w => new { weekStart = w.WeekStart.ToString("yyyy-MM-dd"), total = w.Total }).ToList<object>(),
                };
            })
            .Where(c => c != null)
            .OrderByDescending(c => ((dynamic)c!).breachProbability)
            .ToList<object>();

        var summary = new
        {
            total      = combinations.Count,
            highRisk   = combinations.Count(c => (string)((dynamic)c!).risk == "High"),
            mediumRisk = combinations.Count(c => (string)((dynamic)c!).risk == "Medium"),
            lowRisk    = combinations.Count(c => (string)((dynamic)c!).risk == "Low"),
        };

        return Ok(ApiResponse<object>.Ok(new { combinations, summary }));
    }

    // ── I7 · Predictive — Optimal Next Scouting Date ────────────────────────

    [HttpGet("next-scouting-date")]
    public async Task<IActionResult> GetNextScoutingDate(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] Guid?     farmId,
        [FromQuery] Guid?     fieldId,
        CancellationToken ct = default)
    {
        var (start, end) = await ResolveRangeAsync(from, to, 180, ct);

        // Last completed session per field
        var lastSessionQ = db.ScoutingSessions
            .Where(s => s.CompletedAt != null && s.CompletedAt >= start && s.CompletedAt <= end && s.FieldId != null);
        if (farmId.HasValue)  lastSessionQ = lastSessionQ.Where(s => s.FarmId == farmId || s.Field!.FarmId == farmId);
        if (fieldId.HasValue) lastSessionQ = lastSessionQ.Where(s => s.FieldId == fieldId);

        var sessions = await lastSessionQ
            .Select(s => new
            {
                FieldId    = s.FieldId!.Value,
                FieldName  = s.Field != null ? s.Field.Name : "(unknown)",
                FarmId     = s.FarmId,
                FarmName   = s.Farm  != null ? s.Farm.Name  : "(unknown)",
                CompletedAt = s.CompletedAt!.Value,
            })
            .ToListAsync(ct);

        // Observations for growth rate calculation
        var obsQ = db.SessionObservations
            .Where(o => !o.IsUnknownPest && o.PestId != null && o.Count > 0
                     && o.Session.CompletedAt >= start && o.Session.CompletedAt <= end
                     && o.Session.FieldId != null);
        if (farmId.HasValue)  obsQ = obsQ.Where(o => o.Session.FarmId == farmId || o.Session.Field!.FarmId == farmId);
        if (fieldId.HasValue) obsQ = obsQ.Where(o => o.Session.FieldId == fieldId);

        // Aggregate weekly totals per field directly in SQL using DateDiffDay,
        // which EF Core translates to DATEDIFF(DAY, @start, CompletedAt) / 7.
        // This avoids pulling every raw row and is significantly faster.
        var obsAgg = await obsQ
            .GroupBy(o => new
            {
                FieldId   = o.Session.FieldId!.Value,
                WeekIndex = EF.Functions.DateDiffDay(start, o.Session.CompletedAt!.Value) / 7,
            })
            .Select(g => new
            {
                g.Key.FieldId,
                g.Key.WeekIndex,
                WeekTotal = g.Sum(o => o.Count ?? 0),
            })
            .OrderBy(g => g.WeekIndex)
            .ToListAsync(ct);

        // Group into per-field ordered lists of weekly totals (already ordered by WeekIndex)
        var weeklyByField = obsAgg
            .GroupBy(o => o.FieldId)
            .ToDictionary(
                g => g.Key,
                g => g.OrderBy(o => o.WeekIndex).Select(o => o.WeekTotal).ToList());

        var tz = await tzService.GetUserTimeZoneAsync(ct);
        var today = ToLocalDate(DateTime.UtcNow, tz);

        var recommendations = sessions
            .GroupBy(s => s.FieldId)
            .Select(fg =>
            {
                var lastSession = fg.OrderByDescending(s => s.CompletedAt).First();
                var fieldWeeks  = weeklyByField.GetValueOrDefault(fg.Key) ?? [];
                var lastDate    = ToLocalDate(lastSession.CompletedAt, tz);

                int daysSinceLast = (today - lastDate).Days;
                int baseInterval  = 7; // default weekly

                double growthRate = 0;
                if (fieldWeeks.Count >= 2)
                {
                    double first = fieldWeeks[0], last = fieldWeeks[^1];
                    growthRate = first > 0 ? (last - first) / first : last > 0 ? 1 : 0;
                }

                // Adjust interval by growth rate
                int recommendedInterval;
                string urgency;
                string rationale;

                if (growthRate >= 1.0)
                {
                    recommendedInterval = 3;
                    urgency = "Critical";
                    rationale = "Population has doubled or more — visit within 3 days.";
                }
                else if (growthRate >= 0.5)
                {
                    recommendedInterval = 4;
                    urgency = "High";
                    rationale = "Rapid growth detected — visit within 4 days.";
                }
                else if (growthRate >= 0.2)
                {
                    recommendedInterval = 5;
                    urgency = "Medium";
                    rationale = "Moderate growth — standard 5-day interval recommended.";
                }
                else if (growthRate <= -0.2)
                {
                    recommendedInterval = 10;
                    urgency = "Low";
                    rationale = "Population declining — can safely wait up to 10 days.";
                }
                else
                {
                    recommendedInterval = baseInterval;
                    urgency = "Low";
                    rationale = "Population stable — standard weekly visit is sufficient.";
                }

                var nextDate      = lastDate.AddDays(recommendedInterval);
                int daysUntilNext = (nextDate - today).Days;
                bool isOverdue    = daysUntilNext < 0;

                return (object?)new
                {
                    fieldId             = fg.Key,
                    fieldName           = lastSession.FieldName,
                    farmName            = lastSession.FarmName,
                    lastSessionDate     = lastDate.ToString("yyyy-MM-dd"),
                    daysSinceLastSession = daysSinceLast,
                    recommendedIntervalDays = recommendedInterval,
                    nextRecommendedDate = nextDate.ToString("yyyy-MM-dd"),
                    daysUntilNext,
                    isOverdue,
                    urgency,
                    rationale,
                    growthRate          = Math.Round(growthRate, 3),
                };
            })
            .Where(r => r != null)
            .OrderBy(r => ((dynamic)r!).daysUntilNext)
            .ToList<object>();

        var urgent     = recommendations.Count(r => (int)((dynamic)r!).daysUntilNext <= 3);
        var soon       = recommendations.Count(r => { var d = (int)((dynamic)r!).daysUntilNext; return d >= 4 && d <= 7; });
        var onSchedule = recommendations.Count(r => (int)((dynamic)r!).daysUntilNext > 7);

        return Ok(ApiResponse<object>.Ok(new { recommendations, summary = new { total = recommendations.Count, urgent, soon, onSchedule } }));
    }

    // ── I8 · Predictive — Seasonal Pressure Forecast ────────────────────────

    [HttpGet("seasonal-pressure")]
    public async Task<IActionResult> GetSeasonalPressure(
        [FromQuery] Guid? farmId,
        [FromQuery] Guid? fieldId,
        CancellationToken ct = default)
    {
        var end   = DateTime.UtcNow;
        var start = end.AddMonths(-18);

        var obsQ = db.SessionObservations
            .Where(o => !o.IsUnknownPest && o.PestId != null && o.Count > 0
                     && o.Session.CompletedAt >= start && o.Session.CompletedAt <= end);
        if (farmId.HasValue)  obsQ = obsQ.Where(o => o.Session.FarmId == farmId || o.Session.Field!.FarmId == farmId);
        if (fieldId.HasValue) obsQ = obsQ.Where(o => o.Session.FieldId == fieldId);

        // Aggregate in SQL — one row per pest × calendar-month, not one row per observation
        var monthlyTotals = await obsQ
            .GroupBy(o => new
            {
                o.PestId,
                PestName = o.Pest!.CommonName,
                Month    = o.Session.CompletedAt!.Value.Month,
            })
            .Select(g => new
            {
                g.Key.PestId,
                g.Key.PestName,
                g.Key.Month,
                Total = g.Sum(o => o.Count ?? 0),
            })
            .ToListAsync(ct);

        if (monthlyTotals.Count == 0)
            return Ok(ApiResponse<object>.Ok(new { calendar = Array.Empty<object>(), peakPests = Array.Empty<object>() }));

        // "Current month" follows the user's local calendar
        var nowLocal    = ToLocalDate(DateTime.UtcNow, await tzService.GetUserTimeZoneAsync(ct));
        var next6Months = Enumerable.Range(0, 6)
            .Select(i => new DateTime(nowLocal.Year, nowLocal.Month, 1).AddMonths(i))
            .ToList();

        // Build monthly profiles per pest from the already-aggregated data
        var byPest = monthlyTotals
            .GroupBy(r => (r.PestId, r.PestName))
            .Select(pg =>
            {
                var pestId2   = pg.Key.PestId;
                var pestName  = pg.Key.PestName;

                // Monthly totals per calendar month (1–12) — already summed by SQL
                var byMonth = pg.ToDictionary(r => r.Month, r => (double)r.Total);

                // Forecast each of the next 6 months
                var forecasts6 = next6Months.Select(m => new
                {
                    month       = m.ToString("yyyy-MM"),
                    monthLabel  = m.ToString("MMMM yyyy"),
                    predictedCount = (int)(byMonth.TryGetValue(m.Month, out var hist) ? hist / 2 : 0), // avg of historical same-month
                    historicalAvg  = byMonth.TryGetValue(m.Month, out var h2) ? (int)h2 : 0,
                }).ToList();

                int peakMonth = byMonth.Any() ? byMonth.MaxBy(kv => kv.Value).Key : 0;
                int peakTotal = byMonth.Any() ? (int)byMonth.Values.Max() : 0;

                return new
                {
                    pestId   = pestId2,
                    pestName,
                    peakMonth,
                    peakMonthName = peakMonth > 0 ? new DateTime(2000, peakMonth, 1).ToString("MMMM") : "Unknown",
                    peakTotal,
                    forecasts = forecasts6.Cast<object>().ToList(),
                    monthlyProfile = byMonth.OrderBy(kv => kv.Key)
                        .Select(kv => new { month = kv.Key, monthName = new DateTime(2000, kv.Key, 1).ToString("MMM"), total = (int)kv.Value })
                        .ToList<object>(),
                };
            })
            .OrderByDescending(p => p.peakTotal)
            .ToList();

        // Calendar: per forecast month — top 3 expected pests
        var calendar = next6Months.Select(m => new
        {
            month      = m.ToString("yyyy-MM"),
            monthLabel = m.ToString("MMMM yyyy"),
            topPests   = byPest
                .Where(p => p.peakMonth == m.Month || p.monthlyProfile.Any(mp => (int)((dynamic)mp).month == m.Month && (int)((dynamic)mp).total > 0))
                .OrderByDescending(p =>
                {
                    var mp = p.monthlyProfile.FirstOrDefault(x => (int)((dynamic)x).month == m.Month);
                    return mp != null ? (int)((dynamic)mp).total : 0;
                })
                .Take(3)
                .Select(p => new
                {
                    pestId   = p.pestId,
                    pestName = p.pestName,
                    expectedCount = p.monthlyProfile
                        .Where(x => (int)((dynamic)x).month == m.Month)
                        .Select(x => (int)((dynamic)x).total)
                        .FirstOrDefault(),
                    isPeak = p.peakMonth == m.Month,
                })
                .ToList<object>(),
        }).ToList<object>();

        return Ok(ApiResponse<object>.Ok(new { calendar, peakPests = byPest.Take(10).ToList<object>() }));
    }

    // ── I9 · Predictive — Weather-Correlated Risk Index ────────────────────────

    /// <summary>
    /// Correlates temperature recorded during scouting sessions with observed pest counts.
    /// Returns a per-pest temperature-sensitivity coefficient and a current-week risk index
    /// derived from the most recent sessions' temperatures.  No external weather API required —
    /// uses the TemperatureCelsius field stored on ScoutingSession.
    /// </summary>
    [HttpGet("weather-risk")]
    public async Task<IActionResult> GetWeatherRisk(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] Guid?     farmId,
        [FromQuery] Guid?     fieldId,
        [FromQuery] Guid?     pestId,
        CancellationToken ct = default)
    {
        var (start, end) = await ResolveRangeAsync(from, to, 180, ct);

        var obsQ = db.SessionObservations
            .Where(o => !o.IsUnknownPest && o.PestId != null && o.Count > 0
                     && o.Session.CompletedAt >= start && o.Session.CompletedAt <= end
                     && o.Session.TemperatureCelsius != null);

        if (farmId.HasValue)  obsQ = obsQ.Where(o => o.Session.FarmId == farmId || o.Session.Field!.FarmId == farmId);
        if (fieldId.HasValue) obsQ = obsQ.Where(o => o.Session.FieldId == fieldId);
        if (pestId.HasValue)  obsQ = obsQ.Where(o => o.PestId == pestId);

        var obs = await obsQ
            .Select(o => new
            {
                o.PestId,
                PestName    = o.Pest!.CommonName,
                o.Count,
                o.ThresholdCount,
                Temp        = o.Session.TemperatureCelsius!.Value,
                CompletedAt = o.Session.CompletedAt!.Value,
            })
            .ToListAsync(ct);

        if (obs.Count == 0)
            return Ok(ApiResponse<object>.Ok(new { pests = Array.Empty<object>(), summary = new { totalPests = 0, highRisk = 0, dataPoints = 0 } }));

        // Most recent average temperature (proxy for "current conditions")
        double recentTempAvg = obs
            .OrderByDescending(o => o.CompletedAt)
            .Take(10)
            .Average(o => (double)o.Temp);

        var pests = obs
            .GroupBy(o => (o.PestId, o.PestName))
            .Select(pg =>
            {
                var pestId2  = pg.Key.PestId;
                var pestName = pg.Key.PestName;
                var pts      = pg.Select(o => (Temp: (double)o.Temp, Count: (double)(o.Count ?? 0))).ToList();

                if (pts.Count < 3)
                    return (object?)null;

                int n       = pts.Count;
                double xMean = pts.Average(p => p.Temp);
                double yMean = pts.Average(p => p.Count);
                double ssXX  = pts.Sum(p => Math.Pow(p.Temp - xMean, 2));
                double ssXY  = pts.Sum(p => (p.Temp - xMean) * (p.Count - yMean));
                double slope = ssXX > 0 ? ssXY / ssXX : 0;  // counts per °C
                double intercept = yMean - slope * xMean;

                // Pearson r for correlation strength
                double ssYY = pts.Sum(p => Math.Pow(p.Count - yMean, 2));
                double r    = ssXX > 0 && ssYY > 0 ? ssXY / Math.Sqrt(ssXX * ssYY) : 0;

                // Projected count at current temperature
                double projected = Math.Max(0, intercept + slope * recentTempAvg);
                int    threshold = pg.Max(o => o.ThresholdCount) ?? 0;

                double riskRaw = threshold > 0 ? projected / threshold : projected / Math.Max(yMean, 1);
                string riskLevel = riskRaw >= 0.8 ? "High" : riskRaw >= 0.4 ? "Medium" : "Low";

                string tempInfluence = Math.Abs(r) < 0.2   ? "None"
                                     : r > 0               ? "Positive"   // warmer → more pests
                                                           : "Negative";  // cooler → more pests

                // Temperature profile: group by 5°C buckets
                var tempBuckets = pts
                    .GroupBy(p => (int)(p.Temp / 5) * 5)
                    .OrderBy(g => g.Key)
                    .Select(g => new
                    {
                        tempRange    = $"{g.Key}–{g.Key + 5}°C",
                        avgCount     = (int)g.Average(p => p.Count),
                        observations = g.Count(),
                    })
                    .ToList<object>();

                return (object?)new
                {
                    pestId           = pestId2,
                    pestName,
                    dataPoints       = n,
                    correlation      = Math.Round(r, 3),
                    tempInfluence,
                    slopePerDegree   = Math.Round(slope, 3),
                    optimalTempRange = pts.OrderByDescending(p => p.Count).Take(5).Any()
                        ? $"{(int)pts.OrderByDescending(p => p.Count).Take(5).Min(p => p.Temp)}–{(int)pts.OrderByDescending(p => p.Count).Take(5).Max(p => p.Temp)}°C"
                        : "N/A",
                    currentTempAvg   = Math.Round(recentTempAvg, 1),
                    projectedCount   = (int)Math.Round(projected),
                    threshold,
                    riskIndex        = Math.Round(Math.Min(riskRaw, 2.0), 3),
                    riskLevel,
                    temperatureProfile = tempBuckets,
                };
            })
            .Where(p => p != null)
            .OrderByDescending(p => ((dynamic)p!).riskIndex)
            .ToList<object>();

        var summary = new
        {
            totalPests      = pests.Count,
            highRisk        = pests.Count(p => (string)((dynamic)p!).riskLevel == "High"),
            dataPoints      = obs.Count,
            currentTempAvg  = Math.Round(recentTempAvg, 1),
        };

        return Ok(ApiResponse<object>.Ok(new { pests, summary }));
    }

    // ── I10 · Predictive — Trap Saturation Prediction ────────────────────────

    [HttpGet("trap-saturation")]
    public async Task<IActionResult> GetTrapSaturation(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] Guid?     farmId,
        CancellationToken ct = default)
    {
        var (start, end) = await ResolveRangeAsync(from, to, 90, ct);

        var trapQ = db.Traps.Where(t => t.IsEnabled && t.DeletedAt == null);
        if (farmId.HasValue) trapQ = trapQ.Where(t => t.Field != null && t.Field.FarmId == farmId);

        var traps = await trapQ
            .Select(t => new { t.Id, t.Name, FarmName = t.Field != null && t.Field.Farm != null ? t.Field.Farm.Name : "(unknown)", t.FieldId })
            .ToListAsync(ct);

        var trapIds = traps.Select(t => t.Id).ToList();

        var obs = await db.SessionObservations
            .Where(o => o.TrapId != null && trapIds.Contains(o.TrapId!.Value)
                     && o.Count > 0 && o.Session.CompletedAt >= start && o.Session.CompletedAt <= end)
            .Select(o => new
            {
                TrapId      = o.TrapId!.Value,
                o.Count,
                CompletedAt = o.Session.CompletedAt!.Value,
            })
            .ToListAsync(ct);

        var predictions = traps.Select(trap =>
        {
            var checks = obs.Where(o => o.TrapId == trap.Id)
                .GroupBy(o => Monday(o.CompletedAt))
                .OrderBy(g => g.Key)
                .Select(wg => new { WeekStart = wg.Key, Total = wg.Sum(o => o.Count ?? 0) })
                .ToList();

            if (checks.Count == 0)
                return (object?)new
                {
                    trapId       = trap.Id,
                    trapName     = trap.Name,
                    farmName     = trap.FarmName,
                    checkCount   = 0,
                    currentRate  = 0,
                    trend        = "Stable",
                    weeksToPeak  = (int?)null,
                    saturationRisk = "Unknown",
                    weeklyHistory  = Array.Empty<object>(),
                };

            int n = checks.Count;
            double xMean = (n - 1) / 2.0;
            double yMean = checks.Average(w => (double)w.Total);
            double ssXX  = Enumerable.Range(0, n).Sum(i => Math.Pow(i - xMean, 2));
            double ssXY  = checks.Select((w, i) => (i - xMean) * (w.Total - yMean)).Sum();
            double slope  = ssXX > 0 ? ssXY / ssXX : 0;
            double intercept = yMean - slope * xMean;
            double current = Math.Max(0, intercept + slope * (n - 1));

            // Saturation = 20% above the historic peak catch week (minimum 500).
            // This represents the point where trap effectiveness starts to degrade.
            int peakSoFar    = checks.Max(w => w.Total);
            int satThreshold = Math.Max((int)(peakSoFar * 1.2), 500);

            int? weeksToPeak = null;
            if (slope > 0.1 && current < satThreshold)
                weeksToPeak = (int)Math.Ceiling((satThreshold - current) / slope);

            string satRisk = weeksToPeak.HasValue
                ? weeksToPeak.Value <= 4  ? "Critical"
                : weeksToPeak.Value <= 12 ? "High"
                : weeksToPeak.Value <= 26 ? "Medium"
                : "Low"
                : "Low";

            string trend = slope > 0.5 ? "Rising" : slope < -0.5 ? "Falling" : "Stable";

            return (object?)new
            {
                trapId         = trap.Id,
                trapName       = trap.Name,
                farmName       = trap.FarmName,
                checkCount     = n,
                currentRate    = (int)Math.Round(current),
                peakRate       = peakSoFar,
                slope          = Math.Round(slope, 2),
                trend,
                saturationThreshold = satThreshold,
                weeksToPeak,
                saturationRisk = satRisk,
                weeklyHistory  = checks.Select(w => new { weekStart = w.WeekStart.ToString("yyyy-MM-dd"), total = w.Total }).ToList<object>(),
            };
        })
        .Where(p => p != null)
        .OrderByDescending(p => ((dynamic)p!).saturationRisk == "Critical" ? 4
                              : ((dynamic)p!).saturationRisk == "High"     ? 3
                              : ((dynamic)p!).saturationRisk == "Medium"   ? 2 : 1)
        .ThenByDescending(p => ((dynamic)p!).currentRate)
        .ToList<object>();

        var summary = new
        {
            totalTraps   = predictions.Count,
            critical     = predictions.Count(p => (string)((dynamic)p!).saturationRisk == "Critical"),
            high         = predictions.Count(p => (string)((dynamic)p!).saturationRisk == "High"),
            avgCatchRate = predictions.Any() ? (int)predictions.Average(p => (double)((dynamic)p!).currentRate) : 0,
        };

        return Ok(ApiResponse<object>.Ok(new { traps = predictions, summary }));
    }

    // ── A1 · Actionable — Spray Timing Recommendation ───────────────────────

    /// <summary>
    /// For each pest × field combination with a rising trend, projects how many days
    /// until the population is expected to breach its configured action threshold,
    /// and recommends a treatment window (act now vs. act within N days).
    /// </summary>
    [HttpGet("spray-timing")]
    public async Task<IActionResult> GetSprayTiming(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] Guid?     farmId,
        [FromQuery] Guid?     fieldId,
        [FromQuery] Guid?     pestId,
        CancellationToken ct = default)
    {
        var (start, end) = await ResolveRangeAsync(from, to, 180, ct);

        var obsQ = db.SessionObservations
            .Where(o => !o.IsUnknownPest && o.PestId != null && o.Count > 0
                     && o.ThresholdCount != null && o.ThresholdCount > 0
                     && o.Session.CompletedAt >= start && o.Session.CompletedAt <= end
                     && o.Session.FieldId != null);

        if (farmId.HasValue)  obsQ = obsQ.Where(o => o.Session.FarmId == farmId || o.Session.Field!.FarmId == farmId);
        if (fieldId.HasValue) obsQ = obsQ.Where(o => o.Session.FieldId == fieldId);
        if (pestId.HasValue)  obsQ = obsQ.Where(o => o.PestId == pestId);

        var obs = await obsQ
            .Select(o => new
            {
                o.PestId,
                PestName    = o.Pest!.CommonName,
                FieldId     = o.Session.FieldId!.Value,
                FieldName   = o.Session.Field != null ? o.Session.Field.Name : "(unknown)",
                FarmName    = o.Session.Farm  != null ? o.Session.Farm.Name
                            : o.Session.Field != null && o.Session.Field.Farm != null ? o.Session.Field.Farm.Name : null,
                o.ThresholdCount,
                o.Count,
                CompletedAt = o.Session.CompletedAt!.Value,
            })
            .ToListAsync(ct);

        if (obs.Count == 0)
            return Ok(ApiResponse<object>.Ok(new { recommendations = Array.Empty<object>(), summary = new { total = 0, urgent = 0, upcoming = 0, monitor = 0 } }));

        var recommendations = obs
            .GroupBy(o => (o.PestId, o.FieldId))
            .Select(grp =>
            {
                var first     = grp.First();
                var threshold = grp.Max(o => o.ThresholdCount) ?? 0;
                if (threshold == 0) return null;

                var weekly = grp
                    .GroupBy(o => Monday(o.CompletedAt))
                    .OrderBy(g => g.Key)
                    .Select(wg => (WeekStart: wg.Key, Total: wg.Sum(o => o.Count ?? 0)))
                    .ToList();

                int n = weekly.Count;
                if (n < 2) return null;

                // OLS slope (count change per week)
                double xMean    = (n - 1) / 2.0;
                double yMean    = weekly.Average(w => (double)w.Total);
                double ssXX     = Enumerable.Range(0, n).Sum(i => Math.Pow(i - xMean, 2));
                double ssXY     = weekly.Select((w, i) => (i - xMean) * (w.Total - yMean)).Sum();
                double slope    = ssXX > 0 ? ssXY / ssXX : 0;
                double intercept = yMean - slope * xMean;

                // Only surface rising or near-threshold combinations
                double currentProjected = Math.Max(0, intercept + slope * n);
                if (slope <= 0 && currentProjected < threshold * 0.7) return null;

                // Weeks until threshold breach (solve: intercept + slope*x = threshold)
                int weeksUntilBreach;
                if (slope > 0)
                {
                    double wk = (threshold - intercept) / slope;
                    weeksUntilBreach = wk <= n ? 0 : (int)Math.Ceiling(wk - n);
                }
                else
                {
                    weeksUntilBreach = currentProjected >= threshold ? 0 : 99;
                }

                // Projected count at 4 and 8 weeks
                double proj4wk = Math.Max(0, intercept + slope * (n + 4));
                double proj8wk = Math.Max(0, intercept + slope * (n + 8));

                string urgency;
                string action;
                if (weeksUntilBreach == 0)
                {
                    urgency = "Immediate";
                    action  = $"Population is already at or above threshold. Apply treatment now — delaying further will worsen the infestation.";
                }
                else if (weeksUntilBreach <= 2)
                {
                    urgency = "Urgent";
                    action  = $"Act within {weeksUntilBreach * 7} days. At the current trajectory the population reaches threshold in ~{weeksUntilBreach} week{(weeksUntilBreach == 1 ? "" : "s")}.";
                }
                else if (weeksUntilBreach <= 6)
                {
                    urgency = "Upcoming";
                    action  = $"Schedule treatment in the next {weeksUntilBreach * 7} days to stay ahead of the projected breach.";
                }
                else
                {
                    urgency = "Monitor";
                    action  = "Population is rising but a breach is not imminent. Continue regular monitoring.";
                }

                return (object?)new
                {
                    pestId              = first.PestId,
                    pestName            = first.PestName,
                    fieldId             = first.FieldId,
                    fieldName           = first.FieldName,
                    farmName            = first.FarmName,
                    currentCount        = (int)Math.Round(currentProjected),
                    threshold,
                    weeklySlope         = Math.Round(slope, 2),
                    weeksUntilBreach,
                    projectedAt4Weeks   = (int)Math.Round(proj4wk),
                    projectedAt8Weeks   = (int)Math.Round(proj8wk),
                    multiplierAt8Weeks  = threshold > 0 ? Math.Round(proj8wk / threshold, 1) : 0,
                    urgency,
                    action,
                    dataPoints          = n,
                };
            })
            .Where(r => r != null)
            .OrderBy(r =>
            {
                string u = (string)((dynamic)r!).urgency;
                return u == "Immediate" ? 0 : u == "Urgent" ? 1 : u == "Upcoming" ? 2 : 3;
            })
            .ThenByDescending(r => ((dynamic)r!).weeklySlope)
            .ToList<object>();

        var summary = new
        {
            total    = recommendations.Count,
            urgent   = recommendations.Count(r => (string)((dynamic)r!).urgency is "Immediate" or "Urgent"),
            upcoming = recommendations.Count(r => (string)((dynamic)r!).urgency == "Upcoming"),
            monitor  = recommendations.Count(r => (string)((dynamic)r!).urgency == "Monitor"),
        };

        return Ok(ApiResponse<object>.Ok(new { recommendations, summary }));
    }

    // ── A2 · Actionable — Scout Priority Queue ──────────────────────────────

    /// <summary>
    /// Ranks all fields by a composite risk score built from: population growth trend,
    /// days since last visit, number of recent threshold breaches, and whether the field
    /// is currently in its historical peak-pressure season. Returns an ordered priority
    /// queue that scouts can use to plan their day.
    /// </summary>
    [HttpGet("scout-priority")]
    public async Task<IActionResult> GetScoutPriority(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] Guid?     farmId,
        [FromQuery] Guid?     fieldId,
        CancellationToken ct = default)
    {
        var (start, end) = await ResolveRangeAsync(from, to, 180, ct);
        var tz    = await tzService.GetUserTimeZoneAsync(ct);
        var today = ToLocalDate(DateTime.UtcNow, tz);

        // ── 1. Observation trend per field
        var obsQ = db.SessionObservations
            .Where(o => !o.IsUnknownPest && o.PestId != null && o.Count > 0
                     && o.Session.CompletedAt >= start && o.Session.CompletedAt <= end
                     && o.Session.FieldId != null);

        if (farmId.HasValue)  obsQ = obsQ.Where(o => o.Session.FarmId == farmId || o.Session.Field!.FarmId == farmId);
        if (fieldId.HasValue) obsQ = obsQ.Where(o => o.Session.FieldId == fieldId);

        var obsData = await obsQ
            .Select(o => new
            {
                FieldId     = o.Session.FieldId!.Value,
                FieldName   = o.Session.Field != null ? o.Session.Field.Name : "(unknown)",
                FarmName    = o.Session.Farm  != null ? o.Session.Farm.Name
                            : o.Session.Field != null && o.Session.Field.Farm != null ? o.Session.Field.Farm.Name : null,
                o.ThresholdCount,
                o.Count,
                CompletedAt = o.Session.CompletedAt!.Value,
                IsAboveThreshold = o.Count > (o.ThresholdCount ?? int.MaxValue),
            })
            .ToListAsync(ct);

        // ── 2. Latest session per field ──────────────────────────────────────
        var sessQ = db.ScoutingSessions
            .Where(s => s.DeletedAt == null && s.CompletedAt != null && s.FieldId != null
                     && s.CompletedAt >= start && s.CompletedAt <= end);

        if (farmId.HasValue)  sessQ = sessQ.Where(s => s.FarmId == farmId || s.Field!.FarmId == farmId);
        if (fieldId.HasValue) sessQ = sessQ.Where(s => s.FieldId == fieldId);

        var sessions = await sessQ
            .Select(s => new
            {
                FieldId     = s.FieldId!.Value,
                FieldName   = s.Field != null ? s.Field.Name : "(unknown)",
                FarmName    = s.Farm  != null ? s.Farm.Name
                            : s.Field != null && s.Field.Farm != null ? s.Field.Farm.Name : null,
                CompletedAt = s.CompletedAt!.Value,
            })
            .ToListAsync(ct);

        // Collect all field IDs appearing in either set
        var allFieldIds = obsData.Select(o => o.FieldId)
            .Union(sessions.Select(s => s.FieldId))
            .Distinct()
            .ToHashSet();

        var lastSessionByField = sessions
            .GroupBy(s => s.FieldId)
            .ToDictionary(g => g.Key, g => g.Max(s => s.CompletedAt));

        var fieldMeta = sessions
            .GroupBy(s => s.FieldId)
            .ToDictionary(g => g.Key, g => (FieldName: g.First().FieldName, FarmName: g.First().FarmName));

        // Also collect meta from obs for fields with obs but no completed sessions
        foreach (var o in obsData.GroupBy(o => o.FieldId))
        {
            if (!fieldMeta.ContainsKey(o.Key))
                fieldMeta[o.Key] = (o.First().FieldName, o.First().FarmName);
        }

        var priorityList = allFieldIds.Select(fid =>
        {
            var meta  = fieldMeta.GetValueOrDefault(fid, ("(unknown)", null));

            // ── Trend score (0–40 pts): OLS slope normalised by max threshold ──
            var fieldObs = obsData.Where(o => o.FieldId == fid).OrderBy(o => o.CompletedAt).ToList();
            double trendScore = 0;
            double growthRate = 0;
            int topPestCount  = 0;
            string topPest    = "None";

            if (fieldObs.Count >= 2)
            {
                var weekly = fieldObs
                    .GroupBy(o => Monday(o.CompletedAt))
                    .OrderBy(g => g.Key)
                    .Select(wg => wg.Sum(o => o.Count ?? 0))
                    .ToList();

                int wn       = weekly.Count;
                double xMean = (wn - 1) / 2.0;
                double yMean = weekly.Average();
                double ssXX  = Enumerable.Range(0, wn).Sum(i => Math.Pow(i - xMean, 2));
                double ssXY  = weekly.Select((v, i) => (i - xMean) * (v - yMean)).Sum();
                double slope = ssXX > 0 ? ssXY / ssXX : 0;

                growthRate  = yMean > 0 ? slope / yMean : 0;
                trendScore  = Math.Min(40, Math.Max(0, growthRate * 100));
            }

            // Breaches
            int breachCount = fieldObs.Count(o => o.IsAboveThreshold);

            // Top pest by count
            var byPest = fieldObs
                .GroupBy(o => o.FieldName) // re-group by pest would need pestName — use count total instead
                .OrderByDescending(g => g.Sum(o => o.Count ?? 0))
                .FirstOrDefault();
            topPestCount = fieldObs.Sum(o => o.Count ?? 0);

            // ── Recency score (0–35 pts): longer since last visit = higher score ─
            double recencyScore = 0;
            int daysSinceLast   = -1;
            if (lastSessionByField.TryGetValue(fid, out var lastSess))
            {
                daysSinceLast = (today - ToLocalDate(lastSess, tz)).Days;
                recencyScore  = Math.Min(35, daysSinceLast * 35.0 / 30.0); // caps at 30 days
            }
            else
            {
                recencyScore  = 35; // never visited
                daysSinceLast = -1;
            }

            // ── Breach score (0–25 pts) ──────────────────────────────────────
            double breachScore = Math.Min(25, breachCount * 5.0);

            // ── Combined priority score ──────────────────────────────────────
            double priorityScore = trendScore + recencyScore + breachScore;

            string urgency = priorityScore >= 70 ? "Critical"
                           : priorityScore >= 45 ? "High"
                           : priorityScore >= 20 ? "Medium" : "Low";

            return (object?)new
            {
                fieldId         = fid,
                fieldName       = meta.FieldName,
                farmName        = meta.FarmName,
                priorityScore   = Math.Round(priorityScore, 1),
                urgency,
                growthRate      = Math.Round(growthRate, 3),
                daysSinceLastSession = daysSinceLast,
                recentBreaches  = breachCount,
                totalObsCount   = topPestCount,
                trendScore      = Math.Round(trendScore, 1),
                recencyScore    = Math.Round(recencyScore, 1),
                breachScore     = Math.Round(breachScore, 1),
            };
        })
        .Where(p => p != null)
        .OrderByDescending(p => ((dynamic)p!).priorityScore)
        .Select((p, i) => (object)new
        {
            rank                 = i + 1,
            fieldId              = ((dynamic)p!).fieldId,
            fieldName            = ((dynamic)p!).fieldName,
            farmName             = ((dynamic)p!).farmName,
            priorityScore        = ((dynamic)p!).priorityScore,
            urgency              = ((dynamic)p!).urgency,
            growthRate           = ((dynamic)p!).growthRate,
            daysSinceLastSession = ((dynamic)p!).daysSinceLastSession,
            recentBreaches       = ((dynamic)p!).recentBreaches,
            totalObsCount        = ((dynamic)p!).totalObsCount,
            trendScore           = ((dynamic)p!).trendScore,
            recencyScore         = ((dynamic)p!).recencyScore,
            breachScore          = ((dynamic)p!).breachScore,
        })
        .ToList<object>();

        var summary = new
        {
            totalFields = priorityList.Count,
            critical    = priorityList.Count(p => (string)((dynamic)p!).urgency == "Critical"),
            high        = priorityList.Count(p => (string)((dynamic)p!).urgency == "High"),
            medium      = priorityList.Count(p => (string)((dynamic)p!).urgency == "Medium"),
            low         = priorityList.Count(p => (string)((dynamic)p!).urgency == "Low"),
        };

        return Ok(ApiResponse<object>.Ok(new { fields = priorityList, summary }));
    }

    // ── A3 · Actionable — Treatment Effectiveness Scoring ───────────────────

    /// <summary>
    /// For each pest × field combination that recorded a threshold breach in the period,
    /// compares the average observation count in the two sessions before the breach
    /// against the two sessions after. Scores the apparent effectiveness of the
    /// response as Effective / Partially Effective / Ineffective.
    /// </summary>
    [HttpGet("treatment-effectiveness")]
    public async Task<IActionResult> GetTreatmentEffectiveness(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] Guid?     farmId,
        [FromQuery] Guid?     fieldId,
        [FromQuery] Guid?     pestId,
        CancellationToken ct = default)
    {
        // Use a wider look-back so we can capture sessions both before and after breaches
        var (start, end) = await ResolveRangeAsync(from, to, 365, ct);

        var obsQ = db.SessionObservations
            .Where(o => !o.IsUnknownPest && o.PestId != null && o.Count > 0
                     && o.ThresholdCount != null && o.ThresholdCount > 0
                     && o.Session.CompletedAt != null
                     && o.Session.FieldId != null);

        if (farmId.HasValue)  obsQ = obsQ.Where(o => o.Session.FarmId == farmId || o.Session.Field!.FarmId == farmId);
        if (fieldId.HasValue) obsQ = obsQ.Where(o => o.Session.FieldId == fieldId);
        if (pestId.HasValue)  obsQ = obsQ.Where(o => o.PestId == pestId);

        var obs = await obsQ
            .Select(o => new
            {
                o.PestId,
                PestName    = o.Pest!.CommonName,
                FieldId     = o.Session.FieldId!.Value,
                FieldName   = o.Session.Field != null ? o.Session.Field.Name : "(unknown)",
                FarmName    = o.Session.Farm  != null ? o.Session.Farm.Name
                            : o.Session.Field != null && o.Session.Field.Farm != null ? o.Session.Field.Farm.Name : null,
                o.ThresholdCount,
                o.Count,
                CompletedAt = o.Session.CompletedAt!.Value,
            })
            .ToListAsync(ct);

        if (obs.Count == 0)
            return Ok(ApiResponse<object>.Ok(new
            {
                scores  = Array.Empty<object>(),
                summary = new { total = 0, effective = 0, partial = 0, ineffective = 0, insufficient = 0 },
            }));

        var tz = await tzService.GetUserTimeZoneAsync(ct);
        var (startLocalDate, endLocalDate) = (ToLocalDate(start, tz), ToLocalDate(end, tz));

        var scores = obs
            .GroupBy(o => (o.PestId, o.FieldId))
            .Select(grp =>
            {
                var first     = grp.First();
                var threshold = grp.Max(o => o.ThresholdCount) ?? 0;

                // All sessions with obs for this pest+field, ordered chronologically
                // (one "session day" = the user's local calendar day)
                var bySession = grp
                    .GroupBy(o => ToLocalDate(o.CompletedAt, tz))
                    .OrderBy(g => g.Key)
                    .Select(sg => (Date: sg.Key, Total: sg.Sum(o => o.Count ?? 0), IsAbove: sg.Any(o => (o.Count ?? 0) > threshold)))
                    .ToList();

                // Find the first breach point within the queried range
                var breachIdx = bySession
                    .Select((s, i) => (s, i))
                    .Where(x => x.s.IsAbove && x.s.Date >= startLocalDate && x.s.Date <= endLocalDate)
                    .Select(x => (int?)x.i)
                    .FirstOrDefault();

                if (breachIdx == null) return null;

                int idx     = breachIdx.Value;
                var preSess  = bySession.Take(idx).TakeLast(2).ToList();
                var postSess = bySession.Skip(idx + 1).Take(2).ToList();

                double preAvg  = preSess.Any()  ? preSess.Average(s => (double)s.Total)  : 0;
                double postAvg = postSess.Any() ? postSess.Average(s => (double)s.Total) : 0;

                if (postSess.Count == 0)
                {
                    return (object?)new
                    {
                        pestId              = first.PestId,
                        pestName            = first.PestName,
                        fieldId             = first.FieldId,
                        fieldName           = first.FieldName,
                        farmName            = first.FarmName,
                        threshold,
                        breachCount         = bySession.Count(s => s.IsAbove),
                        preBreachAvg        = Math.Round(preAvg, 1),
                        postBreachAvg       = 0.0,
                        percentChange       = 0.0,
                        effectiveness       = "Insufficient Data",
                        dataQuality         = "No follow-up sessions found after the breach — cannot score treatment.",
                    };
                }

                double pctChange = preAvg > 0 ? (postAvg - preAvg) / preAvg * 100.0 : (postAvg > 0 ? 100.0 : 0.0);

                string effectiveness = pctChange <= -50 ? "Effective"
                    : pctChange <= -20 ? "Partially Effective"
                    : "Ineffective";

                string dataQuality = preSess.Count < 2 || postSess.Count < 2
                    ? "Limited data — fewer than 2 sessions before or after the breach."
                    : "Good — based on 2 sessions before and 2 sessions after the breach.";

                return (object?)new
                {
                    pestId        = first.PestId,
                    pestName      = first.PestName,
                    fieldId       = first.FieldId,
                    fieldName     = first.FieldName,
                    farmName      = first.FarmName,
                    threshold,
                    breachCount   = bySession.Count(s => s.IsAbove),
                    preBreachAvg  = Math.Round(preAvg, 1),
                    postBreachAvg = Math.Round(postAvg, 1),
                    percentChange = Math.Round(pctChange, 1),
                    effectiveness,
                    dataQuality,
                };
            })
            .Where(s => s != null)
            .OrderBy(s =>
            {
                string e = (string)((dynamic)s!).effectiveness;
                return e == "Ineffective" ? 0 : e == "Partially Effective" ? 1 : e == "Effective" ? 2 : 3;
            })
            .ThenByDescending(s => ((dynamic)s!).breachCount)
            .ToList<object>();

        var summary = new
        {
            total        = scores.Count,
            effective    = scores.Count(s => (string)((dynamic)s!).effectiveness == "Effective"),
            partial      = scores.Count(s => (string)((dynamic)s!).effectiveness == "Partially Effective"),
            ineffective  = scores.Count(s => (string)((dynamic)s!).effectiveness == "Ineffective"),
            insufficient = scores.Count(s => (string)((dynamic)s!).effectiveness == "Insufficient Data"),
        };

        return Ok(ApiResponse<object>.Ok(new { scores, summary }));
    }

    // ── A4 · Actionable — Overdue Action Alerts ──────────────────────────────

    /// <summary>
    /// Finds threshold breaches in the selected period that did not receive a follow-up
    /// scouting session within the expected response window — 48 hours for severe breaches
    /// (count ≥ 2× threshold), 7 days otherwise. Returns these as overdue alerts ordered
    /// by how long ago the breach occurred.
    /// </summary>
    [HttpGet("overdue-alerts")]
    public async Task<IActionResult> GetOverdueAlerts(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] Guid?     farmId,
        [FromQuery] Guid?     fieldId,
        CancellationToken ct = default)
    {
        var (start, end) = await ResolveRangeAsync(from, to, 90, ct);
        var now = DateTime.UtcNow;

        // ── 1. All threshold breaches in period
        var obsQ = db.SessionObservations
            .Where(o => !o.IsUnknownPest && o.PestId != null
                     && o.Count != null && o.ThresholdCount != null && o.ThresholdCount > 0
                     && o.Count > o.ThresholdCount
                     && o.Session.CompletedAt >= start && o.Session.CompletedAt <= end
                     && o.Session.FieldId != null);

        if (farmId.HasValue)  obsQ = obsQ.Where(o => o.Session.FarmId == farmId || o.Session.Field!.FarmId == farmId);
        if (fieldId.HasValue) obsQ = obsQ.Where(o => o.Session.FieldId == fieldId);

        var breaches = await obsQ
            .Select(o => new
            {
                o.PestId,
                PestName    = o.Pest!.CommonName,
                FieldId     = o.Session.FieldId!.Value,
                FieldName   = o.Session.Field != null ? o.Session.Field.Name : "(unknown)",
                FarmName    = o.Session.Farm  != null ? o.Session.Farm.Name
                            : o.Session.Field != null && o.Session.Field.Farm != null ? o.Session.Field.Farm.Name : null,
                ScoutName   = o.Session.Scouter != null
                                ? (o.Session.Scouter.FirstName + " " + o.Session.Scouter.LastName).Trim()
                                : null,
                o.ThresholdCount,
                o.Count,
                BreachDate  = o.Session.CompletedAt!.Value,
            })
            .ToListAsync(ct);

        // ── 2. All completed sessions on breached fields after breach dates ───
        var breachedFieldIds = breaches.Select(b => b.FieldId).Distinct().ToList();

        var followUpSessions = await db.ScoutingSessions
            .Where(s => s.DeletedAt == null && s.CompletedAt != null
                     && s.FieldId != null
                     && breachedFieldIds.Contains(s.FieldId.Value)
                     && s.CompletedAt > start)
            .Select(s => new { FieldId = s.FieldId!.Value, CompletedAt = s.CompletedAt!.Value })
            .ToListAsync(ct);

        // ── 3. For each unique pest×field breach, check for follow-up ────────
        var alerts = breaches
            .GroupBy(b => (b.PestId, b.FieldId))
            .Select(grp =>
            {
                var first         = grp.First();
                var latestBreach  = grp.Max(b => b.BreachDate);
                var maxCount      = grp.Max(b => b.Count ?? 0);
                var threshold     = grp.Max(b => b.ThresholdCount) ?? 0;

                bool isSevere        = maxCount >= threshold * 2;
                int  responseWindowH = isSevere ? 48 : 168; // 48h or 7 days
                var  deadline        = latestBreach.AddHours(responseWindowH);

                // Look for any completed session on this field AFTER the breach
                var followUp = followUpSessions
                    .Where(s => s.FieldId == first.FieldId && s.CompletedAt > latestBreach)
                    .OrderBy(s => s.CompletedAt)
                    .FirstOrDefault();

                bool hasFollowUp   = followUp != null;
                bool isOverdue     = !hasFollowUp && now > deadline;

                if (!isOverdue) return null; // only surface actual overdue alerts

                double hoursOverdue = (now - deadline).TotalHours;

                string urgency = isSevere         ? "Critical"
                               : hoursOverdue > 72 ? "High"
                               : "Medium";

                return (object?)new
                {
                    pestId          = first.PestId,
                    pestName        = first.PestName,
                    fieldId         = first.FieldId,
                    fieldName       = first.FieldName,
                    farmName        = first.FarmName,
                    scoutName       = first.ScoutName,
                    breachDate      = latestBreach.ToString("yyyy-MM-dd"),
                    peakCount       = maxCount,
                    threshold,
                    isSevere,
                    responseWindowHours = responseWindowH,
                    hoursOverdue    = (int)Math.Round(hoursOverdue),
                    daysOverdue     = Math.Round(hoursOverdue / 24.0, 1),
                    urgency,
                };
            })
            .Where(a => a != null)
            .OrderBy(a =>
            {
                string u = (string)((dynamic)a!).urgency;
                return u == "Critical" ? 0 : u == "High" ? 1 : 2;
            })
            .ThenByDescending(a => ((dynamic)a!).hoursOverdue)
            .ToList<object>();

        var summary = new
        {
            total     = alerts.Count,
            critical  = alerts.Count(a => (string)((dynamic)a!).urgency == "Critical"),
            high      = alerts.Count(a => (string)((dynamic)a!).urgency == "High"),
            medium    = alerts.Count(a => (string)((dynamic)a!).urgency == "Medium"),
        };

        return Ok(ApiResponse<object>.Ok(new { alerts, summary }));
    }

    // ── A5 · Actionable — Under-scouted High-Risk Zones ─────────────────────

    /// <summary>
    /// Cross-references fields with low scouting coverage (less than 50% of the 4-session
    /// monthly target) against fields that currently show high pest pressure, flagging
    /// the combination as an intelligence blind spot.
    /// </summary>
    [HttpGet("underscouted-zones")]
    public async Task<IActionResult> GetUnderscoutedZones(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] Guid?     farmId,
        CancellationToken ct = default)
    {
        var (start, end) = await ResolveRangeAsync(from, to, 90, ct);
        // "This month" = the user's local calendar month, as a UTC boundary instant
        var tz           = await tzService.GetUserTimeZoneAsync(ct);
        var nowLocal     = ToLocalDate(DateTime.UtcNow, tz);
        var monthStart   = LocalToUtc(new DateTime(nowLocal.Year, nowLocal.Month, 1, 0, 0, 0), tz);

        // ── 1. Sessions this month per field ─────────────────────────────────
        var sessQ = db.ScoutingSessions
            .Where(s => s.DeletedAt == null && s.CompletedAt != null
                     && s.FieldId != null && s.CompletedAt >= monthStart);

        if (farmId.HasValue) sessQ = sessQ.Where(s => s.FarmId == farmId || s.Field!.FarmId == farmId);

        var monthlySessions = await sessQ
            .GroupBy(s => s.FieldId!.Value)
            .Select(g => new { FieldId = g.Key, SessionCount = g.Count() })
            .ToListAsync(ct);

        // ── 2. All fields (for coverage denominator) ─────────────────────────
        var fieldQ = db.Fields.Where(f => f.DeletedAt == null);
        if (farmId.HasValue) fieldQ = fieldQ.Where(f => f.FarmId == farmId);

        var allFields = await fieldQ
            .Select(f => new
            {
                f.Id,
                FieldName = f.Name,
                FarmName  = f.Farm != null ? f.Farm.Name : null,
            })
            .ToListAsync(ct);

        // ── 3. Pest pressure per field — aggregated in SQL ───────────────────
        var obsBaseQ = db.SessionObservations
            .Where(o => !o.IsUnknownPest && o.PestId != null && o.Count > 0
                     && o.Session.CompletedAt >= start && o.Session.CompletedAt <= end
                     && o.Session.FieldId != null);

        if (farmId.HasValue) obsBaseQ = obsBaseQ.Where(o => o.Session.FarmId == farmId || o.Session.Field!.FarmId == farmId);

        // Total obs + breach count per field — one SQL GROUP BY
        var fieldObsSummary = await obsBaseQ
            .GroupBy(o => o.Session.FieldId!.Value)
            .Select(g => new
            {
                FieldId     = g.Key,
                TotalObs    = g.Sum(o => o.Count ?? 0),
                BreachCount = g.Count(o => o.ThresholdCount != null && o.Count > o.ThresholdCount),
            })
            .ToListAsync(ct);

        // Top pest per field — one SQL GROUP BY, pick max per field in memory (small result set)
        var pestByField = await obsBaseQ
            .Where(o => o.PestId != null)
            .GroupBy(o => new { FieldId = o.Session.FieldId!.Value, PestName = o.Pest!.CommonName })
            .Select(g => new { g.Key.FieldId, g.Key.PestName, Total = g.Sum(o => o.Count ?? 0) })
            .ToListAsync(ct);

        var topPestMap = pestByField
            .GroupBy(x => x.FieldId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.Total).First().PestName);

        var obsByField = fieldObsSummary.ToDictionary(x => x.FieldId, x => x.TotalObs);
        var breachByField = fieldObsSummary.ToDictionary(x => x.FieldId, x => x.BreachCount);

        // Compute median total obs across all fields for "high pressure" threshold
        double medianObs = obsByField.Any()
            ? obsByField.Values.OrderBy(v => v).Skip(obsByField.Count / 2).First()
            : 0;

        const int TARGET_SESSIONS = 4;

        var zones = allFields.Select(f =>
        {
            int sessionsThisMonth = monthlySessions.FirstOrDefault(s => s.FieldId == f.Id)?.SessionCount ?? 0;
            double coveragePct    = Math.Min(100.0, sessionsThisMonth / (double)TARGET_SESSIONS * 100.0);

            int totalObs    = obsByField.GetValueOrDefault(f.Id, 0);
            int breachCount = breachByField.GetValueOrDefault(f.Id, 0);

            bool isLowCoverage  = coveragePct < 50.0;
            bool isHighPressure = totalObs > medianObs && totalObs > 0;

            if (!isLowCoverage) return null; // only surface under-scouted fields

            string riskLevel = isHighPressure && breachCount > 0 ? "Critical"
                             : isHighPressure                    ? "High"
                             : "Low";

            string topPest = topPestMap.TryGetValue(f.Id, out var tp) ? tp : "None";

            return (object?)new
            {
                fieldId           = f.Id,
                fieldName         = f.FieldName,
                farmName          = f.FarmName,
                sessionsThisMonth,
                targetSessions    = TARGET_SESSIONS,
                coveragePct       = Math.Round(coveragePct, 1),
                totalObsInPeriod  = totalObs,
                breachCount,
                topPest,
                isHighPressure,
                riskLevel,
                blindSpot         = isHighPressure,
                message           = isHighPressure
                    ? $"Only {sessionsThisMonth}/{TARGET_SESSIONS} sessions this month but high pest pressure detected ({totalObs} observations). This is an intelligence blind spot."
                    : $"Only {sessionsThisMonth}/{TARGET_SESSIONS} sessions this month. Increase scouting frequency to meet coverage target.",
            };
        })
        .Where(z => z != null)
        .OrderBy(z =>
        {
            string r = (string)((dynamic)z!).riskLevel;
            return r == "Critical" ? 0 : r == "High" ? 1 : 2;
        })
        .ThenByDescending(z => ((dynamic)z!).totalObsInPeriod)
        .ToList<object>();

        var summary = new
        {
            totalUnderScouted = zones.Count,
            criticalBlindSpots = zones.Count(z => (string)((dynamic)z!).riskLevel == "Critical"),
            highRisk           = zones.Count(z => (string)((dynamic)z!).riskLevel == "High"),
            low                = zones.Count(z => (string)((dynamic)z!).riskLevel == "Low"),
        };

        return Ok(ApiResponse<object>.Ok(new { zones, summary }));
    }

    // ── E1 · Environmental — Temperature × Pest Activity Index ──────────────

    /// <summary>
    /// Computes per-pest temperature sensitivity coefficients: Pearson correlation,
    /// slope (counts per °C), optimal temperature range, and a heat-map of average
    /// count per 5°C temperature bucket.  Uses only sessions where TemperatureCelsius
    /// was recorded. Does NOT require a live weather feed.
    /// </summary>
    [HttpGet("temperature-activity")]
    public async Task<IActionResult> GetTemperatureActivity(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] Guid?     farmId,
        [FromQuery] Guid?     fieldId,
        [FromQuery] Guid?     pestId,
        CancellationToken ct = default)
    {
        var (start, end) = await ResolveRangeAsync(from, to, 365, ct);

        var obsQ = db.SessionObservations
            .Where(o => !o.IsUnknownPest && o.PestId != null && o.Count > 0
                     && o.Session.CompletedAt >= start && o.Session.CompletedAt <= end
                     && o.Session.TemperatureCelsius != null);

        if (farmId.HasValue)  obsQ = obsQ.Where(o => o.Session.FarmId == farmId || o.Session.Field!.FarmId == farmId);
        if (fieldId.HasValue) obsQ = obsQ.Where(o => o.Session.FieldId == fieldId);
        if (pestId.HasValue)  obsQ = obsQ.Where(o => o.PestId == pestId);

        var obs = await obsQ
            .Select(o => new
            {
                o.PestId,
                PestName    = o.Pest!.CommonName,
                o.Count,
                Temp        = o.Session.TemperatureCelsius!.Value,
                CompletedAt = o.Session.CompletedAt!.Value,
            })
            .ToListAsync(ct);

        if (obs.Count == 0)
            return Ok(ApiResponse<object>.Ok(new
            {
                pests   = Array.Empty<object>(),
                heatMap = Array.Empty<object>(),
                summary = new { totalPests = 0, tempSensitive = 0, coldFavoring = 0, dataPoints = 0 },
            }));

        var pests2 = obs
            .GroupBy(o => (o.PestId, o.PestName))
            .Select(pg =>
            {
                var pestId2  = pg.Key.PestId;
                var pestName = pg.Key.PestName;
                var pts      = pg.Select(o => (Temp: o.Temp, Count: (double)(o.Count ?? 0))).ToList();

                if (pts.Count < 3) return (object?)null;

                int    n     = pts.Count;
                double xMean = pts.Average(p => p.Temp);
                double yMean = pts.Average(p => p.Count);
                double ssXX  = pts.Sum(p => Math.Pow(p.Temp - xMean, 2));
                double ssXY  = pts.Sum(p => (p.Temp - xMean) * (p.Count - yMean));
                double ssYY  = pts.Sum(p => Math.Pow(p.Count - yMean, 2));
                double slope = ssXX > 0 ? ssXY / ssXX : 0;
                double r     = ssXX > 0 && ssYY > 0 ? ssXY / Math.Sqrt(ssXX * ssYY) : 0;

                // 5°C buckets
                var buckets = pts
                    .GroupBy(p => (int)(p.Temp / 5) * 5)
                    .OrderBy(g => g.Key)
                    .Select(g => new
                    {
                        bucket       = g.Key,
                        tempRange    = $"{g.Key}–{g.Key + 5}°C",
                        avgCount     = Math.Round(g.Average(p => p.Count), 1),
                        observations = g.Count(),
                    })
                    .ToList<object>();

                // Peak temp bucket
                var peakBucket = pts
                    .GroupBy(p => (int)(p.Temp / 5) * 5)
                    .OrderByDescending(g => g.Average(p => p.Count))
                    .First();
                string optimalRange = $"{peakBucket.Key}–{peakBucket.Key + 5}°C";

                string influence = Math.Abs(r) < 0.2 ? "None"
                                 : r > 0             ? "Warm-Favoring"
                                                     : "Cold-Favoring";

                string sensitivity = Math.Abs(r) >= 0.6 ? "Strong"
                                   : Math.Abs(r) >= 0.35 ? "Moderate"
                                   : "Weak";

                return (object?)new
                {
                    pestId       = pestId2,
                    pestName,
                    dataPoints   = n,
                    correlation  = Math.Round(r, 3),
                    slopePerDegC = Math.Round(slope, 3),
                    optimalTempRange = optimalRange,
                    influence,
                    sensitivity,
                    avgCount     = Math.Round(yMean, 1),
                    avgTemp      = Math.Round(xMean, 1),
                    buckets,
                };
            })
            .Where(p => p != null)
            .OrderByDescending(p => Math.Abs((double)((dynamic)p!).correlation))
            .ToList<object>();

        // Global heat map: all pests combined — avg count per temp bucket
        var globalHeatMap = obs
            .GroupBy(o => (int)(o.Temp / 5) * 5)
            .OrderBy(g => g.Key)
            .Select(g => new
            {
                bucket       = g.Key,
                tempRange    = $"{g.Key}–{g.Key + 5}°C",
                avgCount     = Math.Round(g.Average(o => (double)(o.Count ?? 0)), 1),
                observations = g.Count(),
                pestCount    = g.Select(o => o.PestId).Distinct().Count(),
            })
            .ToList<object>();

        var summary = new
        {
            totalPests   = pests2.Count,
            tempSensitive = pests2.Count(p => (string)((dynamic)p!).influence == "Warm-Favoring"),
            coldFavoring  = pests2.Count(p => (string)((dynamic)p!).influence == "Cold-Favoring"),
            dataPoints   = obs.Count,
            overallAvgTemp = Math.Round(obs.Average(o => o.Temp), 1),
        };

        return Ok(ApiResponse<object>.Ok(new { pests = pests2, heatMap = globalHeatMap, summary }));
    }

    // ── E2 · Environmental — Rainfall Lag Effect ─────────────────────────────

    /// <summary>
    /// Detects whether pest populations tend to spike 7–14 days after a detectable
    /// "wet event" — approximated as a week where the average session temperature
    /// dropped ≥ 3°C below the preceding 4-week rolling average (a cold-snap proxy
    /// commonly associated with rainfall in temperate climates).
    ///
    /// Returns per-pest lag correlation scores plus a timeline of detected wet events
    /// and subsequent pest responses.  A note is included prompting users to connect
    /// a weather feed (e.g. OpenWeatherMap) for precise rainfall data.
    /// </summary>
    [HttpGet("rainfall-lag")]
    public async Task<IActionResult> GetRainfallLag(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] Guid?     farmId,
        [FromQuery] Guid?     fieldId,
        [FromQuery] Guid?     pestId,
        CancellationToken ct = default)
    {
        var (start, end) = await ResolveRangeAsync(from, to, 365, ct);

        // Pull weekly average temperature per session week
        var sessQ = db.ScoutingSessions
            .Where(s => s.CompletedAt >= start && s.CompletedAt <= end
                     && s.TemperatureCelsius != null && s.DeletedAt == null);

        if (farmId.HasValue)  sessQ = sessQ.Where(s => s.FarmId == farmId || s.Field!.FarmId == farmId);
        if (fieldId.HasValue) sessQ = sessQ.Where(s => s.FieldId == fieldId);

        // Pull obs for pest count signal
        var obsQ = db.SessionObservations
            .Where(o => !o.IsUnknownPest && o.PestId != null && o.Count > 0
                     && o.Session.CompletedAt >= start && o.Session.CompletedAt <= end
                     && o.Session.TemperatureCelsius != null);

        if (farmId.HasValue)  obsQ = obsQ.Where(o => o.Session.FarmId == farmId || o.Session.Field!.FarmId == farmId);
        if (fieldId.HasValue) obsQ = obsQ.Where(o => o.Session.FieldId == fieldId);
        if (pestId.HasValue)  obsQ = obsQ.Where(o => o.PestId == pestId);

        // Pre-aggregate in SQL: weekly avg temp
        var weeklyTemps = await sessQ
            .GroupBy(s => s.CompletedAt!.Value.DayOfYear / 7 + s.CompletedAt!.Value.Year * 54)
            .Select(g => new
            {
                WeekIndex = g.Key,
                WeekStart = g.Min(s => s.CompletedAt!.Value),
                AvgTemp   = g.Average(s => s.TemperatureCelsius!.Value),
                Sessions  = g.Count(),
            })
            .OrderBy(g => g.WeekIndex)
            .ToListAsync(ct);

        // Pre-aggregate in SQL: weekly total count per pest
        var weeklyObs = await obsQ
            .GroupBy(o => new
            {
                o.PestId,
                PestName  = o.Pest!.CommonName,
                WeekIndex = o.Session.CompletedAt!.Value.DayOfYear / 7 + o.Session.CompletedAt!.Value.Year * 54,
            })
            .Select(g => new
            {
                g.Key.PestId,
                g.Key.PestName,
                g.Key.WeekIndex,
                WeekStart  = g.Min(o => o.Session.CompletedAt!.Value),
                WeeklyCount = g.Sum(o => o.Count ?? 0),
            })
            .ToListAsync(ct);

        if (weeklyTemps.Count < 4 || weeklyObs.Count == 0)
            return Ok(ApiResponse<object>.Ok(new
            {
                wetEvents = Array.Empty<object>(),
                pests     = Array.Empty<object>(),
                summary   = new { wetEventsFound = 0, pestsAnalysed = 0, dataNote = "Insufficient data. At least 4 weeks of temperature-recorded sessions required." },
            }));

        // Detect wet events: weekly temp drops ≥ 3°C below 4-week rolling average
        var wetEvents = new List<(int WeekIndex, DateTime WeekStart, double TempDrop)>();
        for (int i = 4; i < weeklyTemps.Count; i++)
        {
            double rolling4Avg = weeklyTemps.Skip(i - 4).Take(4).Average(w => w.AvgTemp);
            double drop        = rolling4Avg - weeklyTemps[i].AvgTemp;
            if (drop >= 3.0)
                wetEvents.Add((weeklyTemps[i].WeekIndex, Monday(weeklyTemps[i].WeekStart), drop));
        }

        var pestWeekMap = weeklyObs
            .GroupBy(o => (o.PestId, o.PestName))
            .ToDictionary(
                g => g.Key,
                g => g.ToDictionary(o => o.WeekIndex, o => o.WeeklyCount));

        // Lag lookup: index → week index map
        var weekIndexByPos = weeklyTemps.Select((w, i) => (w.WeekIndex, Pos: i)).ToDictionary(x => x.WeekIndex, x => x.Pos);

        var pestResults = pestWeekMap
            .Select(kv =>
            {
                var (pid, pname) = kv.Key;
                var countByWeek  = kv.Value;

                if (wetEvents.Count == 0) return (object?)null;

                // For each wet event, find the max count spike in the 7–21 day window after
                var lagMatches = wetEvents.Select(we =>
                {
                    // Weeks 1–3 after the wet event
                    var lagCounts = Enumerable.Range(1, 3).Select(lag =>
                    {
                        var targetIdx = weeklyTemps
                            .Skip(weekIndexByPos.GetValueOrDefault(we.WeekIndex, 0) + lag)
                            .FirstOrDefault();
                        if (targetIdx == null) return 0;
                        return countByWeek.GetValueOrDefault(targetIdx.WeekIndex, 0);
                    }).ToList();

                    // Baseline: avg count in 2 weeks before event
                    var baselineCounts = Enumerable.Range(1, 2).Select(lag =>
                    {
                        int pos = weekIndexByPos.GetValueOrDefault(we.WeekIndex, 0) - lag;
                        if (pos < 0) return 0;
                        return countByWeek.GetValueOrDefault(weeklyTemps[pos].WeekIndex, 0);
                    }).ToList();

                    int peakLag     = lagCounts.IndexOf(lagCounts.Max()) + 1; // 1, 2, or 3 weeks
                    int peakCount   = lagCounts.Max();
                    double baseline = baselineCounts.Any() ? baselineCounts.Average() : 0;
                    double spike    = baseline > 0 ? (peakCount - baseline) / baseline * 100.0 : peakCount > 0 ? 100.0 : 0;

                    return new { we.WeekStart, we.TempDrop, peakLag, peakCount, baseline = (int)baseline, spikePct = Math.Round(spike, 1) };
                }).ToList();

                int eventsWithSpike = lagMatches.Count(m => m.spikePct > 20);
                double avgLagWeeks  = lagMatches.Where(m => m.spikePct > 20).Select(m => (double)m.peakLag).DefaultIfEmpty(0).Average();
                double avgSpike     = lagMatches.Where(m => m.spikePct > 20).Select(m => m.spikePct).DefaultIfEmpty(0).Average();

                string lagConfidence = eventsWithSpike >= 3 && avgSpike > 50 ? "Strong"
                                     : eventsWithSpike >= 2                   ? "Moderate"
                                     : eventsWithSpike == 1                   ? "Weak"
                                     : "None";

                return (object?)new
                {
                    pestId          = pid,
                    pestName        = pname,
                    wetEventsTotal  = wetEvents.Count,
                    eventsWithSpike,
                    lagConfidence,
                    avgLagWeeks     = Math.Round(avgLagWeeks, 1),
                    avgLagDays      = (int)Math.Round(avgLagWeeks * 7),
                    avgSpikePct     = Math.Round(avgSpike, 1),
                    lagDetail       = lagMatches.Cast<object>().ToList(),
                };
            })
            .Where(p => p != null)
            .OrderByDescending(p => ((dynamic)p!).lagConfidence == "Strong" ? 3
                                  : ((dynamic)p!).lagConfidence == "Moderate" ? 2
                                  : ((dynamic)p!).lagConfidence == "Weak" ? 1 : 0)
            .ThenByDescending(p => ((dynamic)p!).avgSpikePct)
            .ToList<object>();

        var wetEventList = wetEvents
            .Select(we => new { weekStart = we.WeekStart.ToString("yyyy-MM-dd"), tempDrop = Math.Round(we.TempDrop, 1) })
            .ToList<object>();

        var summary2 = new
        {
            wetEventsFound  = wetEvents.Count,
            pestsAnalysed   = pestResults.Count,
            strongLag       = pestResults.Count(p => (string)((dynamic)p!).lagConfidence == "Strong"),
            moderateLag     = pestResults.Count(p => (string)((dynamic)p!).lagConfidence == "Moderate"),
            dataNote        = "Wet events are approximated as weeks where avg session temperature dropped ≥3°C below the 4-week rolling average. Connect an OpenWeatherMap feed for precise rainfall data.",
        };

        return Ok(ApiResponse<object>.Ok(new { wetEvents = wetEventList, pests = pestResults, summary = summary2 }));
    }

    // ── E3 · Environmental — Drought Stress Correlation ──────────────────────

    /// <summary>
    /// Identifies drought periods — rolling 30-day windows where the average session
    /// temperature was more than 2°C above the long-term mean — and correlates them
    /// with elevated pest breach rates. Pests that breach significantly more often
    /// during hot/dry periods are flagged as drought-stress indicators.
    /// </summary>
    [HttpGet("drought-stress")]
    public async Task<IActionResult> GetDroughtStress(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] Guid?     farmId,
        [FromQuery] Guid?     fieldId,
        [FromQuery] Guid?     pestId,
        CancellationToken ct = default)
    {
        var (start, end) = await ResolveRangeAsync(from, to, 365, ct);

        var obsQ = db.SessionObservations
            .Where(o => !o.IsUnknownPest && o.PestId != null
                     && o.ThresholdCount != null && o.ThresholdCount > 0
                     && o.Session.CompletedAt >= start && o.Session.CompletedAt <= end
                     && o.Session.TemperatureCelsius != null
                     && o.Session.FieldId != null);

        if (farmId.HasValue)  obsQ = obsQ.Where(o => o.Session.FarmId == farmId || o.Session.Field!.FarmId == farmId);
        if (fieldId.HasValue) obsQ = obsQ.Where(o => o.Session.FieldId == fieldId);
        if (pestId.HasValue)  obsQ = obsQ.Where(o => o.PestId == pestId);

        // Aggregate in SQL: per session-date + pest — total count, threshold, avg temp.
        // "Session date" follows the user's local calendar (offset shift translates to DATEADD).
        var tzOffsetMinutes = (int)(await tzService.GetUserTimeZoneAsync(ct)).GetUtcOffset(DateTime.UtcNow).TotalMinutes;
        var sessionAgg = await obsQ
            .GroupBy(o => new
            {
                o.PestId,
                PestName    = o.Pest!.CommonName,
                SessionDate = o.Session.CompletedAt!.Value.AddMinutes(tzOffsetMinutes).Date,
                Temp        = o.Session.TemperatureCelsius!.Value,
            })
            .Select(g => new
            {
                g.Key.PestId,
                g.Key.PestName,
                g.Key.SessionDate,
                g.Key.Temp,
                TotalCount    = g.Sum(o => o.Count ?? 0),
                MaxThreshold  = g.Max(o => o.ThresholdCount) ?? 0,
                IsAbove       = g.Sum(o => o.Count ?? 0) > (g.Max(o => o.ThresholdCount) ?? 0),
            })
            .ToListAsync(ct);

        if (sessionAgg.Count == 0)
            return Ok(ApiResponse<object>.Ok(new
            {
                droughtPeriods = Array.Empty<object>(),
                pests          = Array.Empty<object>(),
                summary        = new { droughtDays = 0, normalDays = 0, pestsAnalysed = 0, dataNote = "No temperature-recorded sessions with threshold data found." },
            }));

        // Global long-term mean temperature
        double longTermMean = sessionAgg.Select(s => s.Temp).Average();

        // Classify each session date as drought (> 2°C above LTM) or normal
        var dateTemps = sessionAgg
            .GroupBy(s => s.SessionDate)
            .ToDictionary(g => g.Key, g => g.Average(s => s.Temp));

        // 30-day rolling drought flag: a date is "drought" if the avg temp over
        // its surrounding 30-day window (±15 days) exceeds LTM + 2°C
        var droughtDates = new HashSet<DateTime>();
        var sortedDates   = dateTemps.Keys.OrderBy(d => d).ToList();
        foreach (var d in sortedDates)
        {
            var window30 = dateTemps
                .Where(kv => Math.Abs((kv.Key - d).TotalDays) <= 15)
                .Select(kv => kv.Value)
                .ToList();
            if (window30.Count >= 3 && window30.Average() > longTermMean + 2.0)
                droughtDates.Add(d);
        }

        int droughtDayCount = droughtDates.Count;
        int normalDayCount  = sortedDates.Count - droughtDayCount;

        // Per-pest: breach rate during drought vs normal periods
        var pestStats = sessionAgg
            .GroupBy(s => (s.PestId, s.PestName))
            .Select(pg =>
            {
                var droughtSess = pg.Where(s => droughtDates.Contains(s.SessionDate)).ToList();
                var normalSess  = pg.Where(s => !droughtDates.Contains(s.SessionDate)).ToList();

                int droughtBreaches = droughtSess.Count(s => s.IsAbove);
                int normalBreaches  = normalSess.Count(s => s.IsAbove);

                double droughtBreachRate = droughtSess.Count > 0 ? (double)droughtBreaches / droughtSess.Count * 100.0 : 0;
                double normalBreachRate  = normalSess.Count  > 0 ? (double)normalBreaches  / normalSess.Count  * 100.0 : 0;

                double avgCountDrought = droughtSess.Any() ? droughtSess.Average(s => (double)s.TotalCount) : 0;
                double avgCountNormal  = normalSess.Any()  ? normalSess.Average(s => (double)s.TotalCount)  : 0;

                double droughtBias = normalBreachRate > 0
                    ? (droughtBreachRate - normalBreachRate) / normalBreachRate * 100.0
                    : droughtBreachRate > 0 ? 100.0 : 0.0;

                string stressLink = droughtBias >= 50 && droughtBreaches >= 3 ? "Strong"
                                  : droughtBias >= 20 && droughtBreaches >= 2 ? "Moderate"
                                  : droughtBias >= 5                           ? "Weak"
                                  : "None";

                return (object?)new
                {
                    pestId              = pg.Key.PestId,
                    pestName            = pg.Key.PestName,
                    droughtSessions     = droughtSess.Count,
                    normalSessions      = normalSess.Count,
                    droughtBreaches,
                    normalBreaches,
                    droughtBreachRate   = Math.Round(droughtBreachRate, 1),
                    normalBreachRate    = Math.Round(normalBreachRate, 1),
                    avgCountDrought     = Math.Round(avgCountDrought, 1),
                    avgCountNormal      = Math.Round(avgCountNormal, 1),
                    droughtBiasPct      = Math.Round(droughtBias, 1),
                    stressLink,
                };
            })
            .Where(p => p != null)
            .OrderByDescending(p => ((dynamic)p!).stressLink == "Strong" ? 3
                                  : ((dynamic)p!).stressLink == "Moderate" ? 2
                                  : ((dynamic)p!).stressLink == "Weak" ? 1 : 0)
            .ThenByDescending(p => ((dynamic)p!).droughtBiasPct)
            .ToList<object>();

        // Drought period ranges (contiguous drought dates)
        var droughtPeriods = new List<object>();
        DateTime? periodStart = null;
        DateTime? periodEnd   = null;
        foreach (var d in sortedDates)
        {
            bool isDrought = droughtDates.Contains(d);
            if (isDrought)
            {
                periodStart ??= d;
                periodEnd    = d;
            }
            else if (periodStart.HasValue)
            {
                droughtPeriods.Add(new { start = periodStart.Value.ToString("yyyy-MM-dd"), end = periodEnd!.Value.ToString("yyyy-MM-dd"), days = (int)(periodEnd.Value - periodStart.Value).TotalDays + 1 });
                periodStart = null;
            }
        }
        if (periodStart.HasValue)
            droughtPeriods.Add(new { start = periodStart.Value.ToString("yyyy-MM-dd"), end = periodEnd!.Value.ToString("yyyy-MM-dd"), days = (int)(periodEnd!.Value - periodStart.Value).TotalDays + 1 });

        var summary3 = new
        {
            droughtDays     = droughtDayCount,
            normalDays      = normalDayCount,
            longTermMeanTemp = Math.Round(longTermMean, 1),
            droughtThreshold = Math.Round(longTermMean + 2.0, 1),
            pestsAnalysed   = pestStats.Count,
            droughtStress   = pestStats.Count(p => (string)((dynamic)p!).stressLink is "Strong" or "Moderate"),
            dataNote        = "Drought is approximated as 30-day windows where the average session temperature exceeds the long-term mean by ≥ 2°C. Connect a weather/soil-moisture feed for precision.",
        };

        return Ok(ApiResponse<object>.Ok(new { droughtPeriods, pests = pestStats, summary = summary3 }));
    }

    // ── C1 · Containment — Containment Zone Recommendation ──────────────────

    /// <summary>
    /// For each pest with a measurable spread vector, identifies fields that are
    /// not yet affected but lie within ±60° of the spread bearing and within
    /// 2× the weekly spread distance — forming a recommended containment perimeter.
    /// </summary>
    [HttpGet("containment-zones")]
    public async Task<IActionResult> GetContainmentZones(
        [FromQuery] DateTime?  from,
        [FromQuery] DateTime?  to,
        [FromQuery] Guid?      farmId,
        [FromQuery] Guid?      pestId,
        CancellationToken ct = default)
    {
        var (start, end) = await ResolveRangeAsync(from, to, 180, ct);
        var tenantId = Guid.Parse(User.FindFirst("tid")?.Value ?? User.FindFirst("TenantId")?.Value ?? Guid.Empty.ToString());

        // Weekly GPS centroids per pest (same as spread-direction)
        var obsQ = db.SessionObservations
            .Where(o => !o.IsUnknownPest && o.PestId != null && o.Count > 0
                     && o.Session.CompletedAt >= start && o.Session.CompletedAt <= end
                     && o.Session.DeletedAt == null
                     && (o.Session.Farm!.Latitude != null || o.Session.Field!.Farm!.Latitude != null));

        if (farmId.HasValue) obsQ = obsQ.Where(o => o.Session.FarmId == farmId || o.Session.Field!.FarmId == farmId);
        if (pestId.HasValue) obsQ = obsQ.Where(o => o.PestId == pestId);

        var raw = await obsQ
            .Select(o => new
            {
                o.PestId,
                PestName = o.Pest!.CommonName,
                o.Count,
                o.Session.CompletedAt,
                Lat = o.Session.Farm!.Latitude ?? o.Session.Field!.Farm!.Latitude ?? 0,
                Lng = o.Session.Farm!.Longitude ?? o.Session.Field!.Farm!.Longitude ?? 0,
                FieldId   = o.Session.FieldId,
                FieldName = o.Session.Field!.Name,
                FarmName  = o.Session.Farm!.Name ?? o.Session.Field!.Farm!.Name,
                FarmId    = o.Session.FarmId ?? o.Session.Field!.FarmId,
            })
            .ToListAsync(ct);

        // All farms in tenant (to find unaffected ones for perimeter)
        var allFarms = await db.Farms
            .Where(f => f.TenantId == tenantId && f.DeletedAt == null
                     && f.Latitude != null && f.Longitude != null)
            .Select(f => new { f.Id, f.Name, Lat = f.Latitude!.Value, Lng = f.Longitude!.Value })
            .ToListAsync(ct);

        var results = raw
            .GroupBy(o => (o.PestId, o.PestName))
            .Select(pg =>
            {
                var weeks = pg
                    .GroupBy(o => Monday(o.CompletedAt!.Value))
                    .OrderBy(g => g.Key)
                    .Select(g => new
                    {
                        Week    = g.Key,
                        CentLat = g.Average(o => o.Lat),
                        CentLng = g.Average(o => o.Lng),
                        Fields  = g.Select(o => (o.FieldId, o.FieldName)).Distinct().ToList(),
                        MaxCount = g.Max(o => o.Count ?? 0),
                    })
                    .ToList();

                if (weeks.Count < 2) return (object?)null;

                // Compute overall spread vector (first → last centroid)
                var first = weeks.First();
                var last  = weeks.Last();
                double spreadBearing = Bearing(first.CentLat, first.CentLng, last.CentLat, last.CentLng);
                double spreadKm      = HaversineKm(first.CentLat, first.CentLng, last.CentLat, last.CentLng);
                double weekSpan      = Math.Max((last.Week - first.Week).TotalDays / 7.0, 1);
                double kmPerWeek     = spreadKm / weekSpan;

                // Affected fields (any field in any week)
                var affectedFarmIds = pg.Select(o => o.FarmId).Where(f => f != default).ToHashSet();

                // Latest front: last weekly centroid
                var frontLat = last.CentLat;
                var frontLng = last.CentLng;

                // Find origin field (first week, highest count field)
                var originField = pg.Where(o => Monday(o.CompletedAt!.Value) == first.Week)
                                    .OrderByDescending(o => o.Count)
                                    .FirstOrDefault();

                // Affected inside zone
                var insideZone = pg
                    .GroupBy(o => (o.FieldId, o.FieldName, o.FarmName))
                    .Select(g => new
                    {
                        fieldId      = g.Key.FieldId,
                        fieldName    = g.Key.FieldName ?? "Unknown",
                        farmName     = g.Key.FarmName ?? "Unknown",
                        firstDetected = g.Min(o => o.CompletedAt!.Value).ToString("yyyy-MM-dd"),
                        peakCount    = g.Max(o => o.Count ?? 0),
                    })
                    .ToList<object>();

                // Candidate perimeter: unaffected farms within 2× weekly spread distance of front
                double perimeterRadius = Math.Max(kmPerWeek * 2, 5.0); // at least 5 km
                var perimeter = allFarms
                    .Where(f => !affectedFarmIds.Contains(f.Id))
                    .Select(f =>
                    {
                        double distKm     = HaversineKm(frontLat, frontLng, f.Lat, f.Lng);
                        double bearingToF = Bearing(frontLat, frontLng, f.Lat, f.Lng);
                        double angDiff    = Math.Abs(((bearingToF - spreadBearing + 540) % 360) - 180);
                        bool   inPath     = angDiff <= 60 && distKm <= perimeterRadius;
                        return new { f.Id, f.Name, f.Lat, f.Lng, distKm, bearingToF, inPath, angDiff };
                    })
                    .Where(f => f.distKm <= perimeterRadius * 2) // show nearby even if off-path
                    .OrderBy(f => !f.inPath)
                    .ThenBy(f => f.distKm)
                    .Take(10)
                    .Select(f => (object)new
                    {
                        farmId      = f.Id,
                        farmName    = f.Name,
                        lat         = Math.Round(f.Lat, 4),
                        lng         = Math.Round(f.Lng, 4),
                        distanceKm  = Math.Round(f.distKm, 1),
                        bearing     = Math.Round(f.bearingToF, 0),
                        inPath      = f.inPath,
                        urgency     = f.inPath ? "High" : "Monitor",
                    })
                    .ToList();

                return (object?)new
                {
                    pestId         = pg.Key.PestId,
                    pestName       = pg.Key.PestName,
                    spreadBearing  = Math.Round(spreadBearing, 0),
                    spreadDirection = BearingLabel(spreadBearing),
                    spreadKmTotal  = Math.Round(spreadKm, 1),
                    spreadKmPerWeek = Math.Round(kmPerWeek, 1),
                    weeksObserved  = weeks.Count,
                    perimeterRadius = Math.Round(perimeterRadius, 1),
                    currentFront   = new
                    {
                        lat      = Math.Round(frontLat, 4),
                        lng      = Math.Round(frontLng, 4),
                        fieldName = last.Fields.FirstOrDefault().FieldName ?? "Unknown",
                    },
                    insideZone,
                    containmentPerimeter = perimeter,
                    zonesRecommended     = perimeter.Count(p => ((dynamic)p).inPath == true),
                };
            })
            .Where(p => p != null)
            .OrderByDescending(p => ((dynamic)p!).zonesRecommended)
            .ThenByDescending(p => ((dynamic)p!).spreadKmPerWeek)
            .ToList<object>();

        return Ok(ApiResponse<object>.Ok(new
        {
            pests   = results,
            summary = new
            {
                pestsWithVector   = results.Count,
                fieldsInPerimeter = results.Sum(p => ((dynamic)p).zonesRecommended),
                // Count distinct fields across all pests — not the sum of per-pest lists,
                // which would double-count a field that has multiple pests.
                totalInsideZone   = results
                    .SelectMany(p => (List<object>)((dynamic)p).insideZone)
                    .Select(z => $"{((dynamic)z).fieldName}|{((dynamic)z).farmName}")
                    .Distinct()
                    .Count(),
            },
        }));
    }

    // ── C2 · Containment — Quarantine Field Flag ─────────────────────────────

    /// <summary>
    /// Detects pest species recorded on a field for the first time within the
    /// selected period. Flags genuinely new-to-tenant species at the highest risk
    /// level and non-system (tenant-created) pests as potential new introductions.
    /// </summary>
    [HttpGet("quarantine-flags")]
    public async Task<IActionResult> GetQuarantineFlags(
        [FromQuery] DateTime?  from,
        [FromQuery] DateTime?  to,
        [FromQuery] Guid?      farmId,
        [FromQuery] Guid?      fieldId,
        CancellationToken ct = default)
    {
        var (start, end) = await ResolveRangeAsync(from, to, 180, ct);

        // ── Query 1: observations within the selected period ONLY ─────────────
        // The date predicate lets SQL Server use the CompletedAt index — no full-table scan.
        var periodQ = db.SessionObservations
            .Where(o => !o.IsUnknownPest && o.PestId != null && o.Count > 0
                     && o.Session.CompletedAt != null
                     && o.Session.DeletedAt == null
                     && o.Session.FieldId != null
                     && o.Session.CompletedAt >= start
                     && o.Session.CompletedAt <= end);

        if (farmId.HasValue)  periodQ = periodQ.Where(o => o.Session.FarmId == farmId || o.Session.Field!.FarmId == farmId);
        if (fieldId.HasValue) periodQ = periodQ.Where(o => o.Session.FieldId == fieldId);

        var inPeriod = await periodQ
            // Flatten CompletedAt to a scalar column BEFORE grouping.
            // Without this, EF Core accesses it via a navigation property inside GroupBy
            // and emits a correlated scalar subquery per group for g.Min(...) — causing 70+ second queries.
            .Select(o => new
            {
                PestId      = o.PestId!.Value,
                FieldId     = o.Session.FieldId!.Value,
                CompletedAt = o.Session.CompletedAt!.Value,
                Count       = o.Count ?? 0,
            })
            .GroupBy(x => new { x.PestId, x.FieldId })
            .Select(g => new
            {
                g.Key.PestId,
                g.Key.FieldId,
                MinDate        = g.Min(x => x.CompletedAt),
                TotalObsCount  = g.Count(),
                TotalPestCount = g.Sum(x => x.Count),
            })
            .ToListAsync(ct);

        if (!inPeriod.Any())
            return Ok(ApiResponse<object>.Ok(new
            {
                flags   = Array.Empty<object>(),
                summary = new
                {
                    totalFlags        = 0,
                    genuineNewSpecies = 0,
                    newToField        = 0,
                    nonSystemPests    = 0,
                    dataNote          = "No new pest detections found in the selected date range.",
                },
            }));

        // ── Query 2: which pest×field pairs have ANY record BEFORE the period? ─
        // Scoped to only the candidate IDs found in query 1 — IN list stays tiny.
        var candidatePestIds  = inPeriod.Select(r => r.PestId).Distinct().ToList();
        var candidateFieldIds = inPeriod.Select(r => r.FieldId).Distinct().ToList();

        var lookbackQ = db.SessionObservations
            .Where(o => !o.IsUnknownPest && o.PestId != null && o.Count > 0
                     && o.Session.CompletedAt != null
                     && o.Session.DeletedAt == null
                     && o.Session.FieldId != null
                     && o.Session.CompletedAt < start
                     && candidatePestIds.Contains(o.PestId!.Value)
                     && candidateFieldIds.Contains(o.Session.FieldId!.Value));

        if (farmId.HasValue)  lookbackQ = lookbackQ.Where(o => o.Session.FarmId == farmId || o.Session.Field!.FarmId == farmId);
        if (fieldId.HasValue) lookbackQ = lookbackQ.Where(o => o.Session.FieldId == fieldId);

        var preExistingPairs = await lookbackQ
            .Select(o => new { PestId = o.PestId!.Value, FieldId = o.Session.FieldId!.Value })
            .Distinct()
            .ToListAsync(ct);

        var preExistingSet = preExistingPairs.Select(x => (x.PestId, x.FieldId)).ToHashSet();

        // Only combos with NO prior record are genuine first detections in scope
        var flagged = inPeriod.Where(r => !preExistingSet.Contains((r.PestId, r.FieldId))).ToList();

        if (!flagged.Any())
            return Ok(ApiResponse<object>.Ok(new
            {
                flags   = Array.Empty<object>(),
                summary = new
                {
                    totalFlags        = 0,
                    genuineNewSpecies = 0,
                    newToField        = 0,
                    nonSystemPests    = 0,
                    dataNote          = "No new pest detections found in the selected date range.",
                },
            }));

        // ── Query 3: new-to-tenant check ──────────────────────────────────────
        // Was this pest seen on ANY field (in scope) before the period started?
        var flaggedPestIds  = flagged.Select(r => r.PestId).Distinct().ToList();
        var flaggedFieldIds = flagged.Select(r => r.FieldId).Distinct().ToList();

        var tenantLookbackQ = db.SessionObservations
            .Where(o => !o.IsUnknownPest && o.PestId != null && o.Count > 0
                     && o.Session.CompletedAt != null
                     && o.Session.DeletedAt == null
                     && o.Session.FieldId != null
                     && o.Session.CompletedAt < start
                     && flaggedPestIds.Contains(o.PestId!.Value));

        if (farmId.HasValue)  tenantLookbackQ = tenantLookbackQ.Where(o => o.Session.FarmId == farmId || o.Session.Field!.FarmId == farmId);
        if (fieldId.HasValue) tenantLookbackQ = tenantLookbackQ.Where(o => o.Session.FieldId == fieldId);

        var pestSeenBeforePeriod = await tenantLookbackQ
            .Select(o => o.PestId!.Value)
            .Distinct()
            .ToListAsync(ct);

        var notNewToTenantSet = pestSeenBeforePeriod.ToHashSet();

        // ── Queries 4 & 5: pest + field metadata — tiny targeted lookups ───────
        var pestMeta = await db.Pests
            .Where(p => flaggedPestIds.Contains(p.Id))
            .Select(p => new { p.Id, p.CommonName, p.IsSystemPest })
            .ToListAsync(ct);

        var fieldMeta = await db.Fields
            .Where(f => flaggedFieldIds.Contains(f.Id))
            .Select(f => new { f.Id, FieldName = f.Name, FarmName = f.Farm != null ? f.Farm.Name : null })
            .ToListAsync(ct);

        var pestMetaMap  = pestMeta.ToDictionary(p => p.Id);
        var fieldMetaMap = fieldMeta.ToDictionary(f => f.Id);

        // ── Build response ────────────────────────────────────────────────────
        var flags = flagged.Select(r =>
        {
            pestMetaMap.TryGetValue(r.PestId, out var pm);
            fieldMetaMap.TryGetValue(r.FieldId, out var fm);

            bool newToTenant = !notNewToTenantSet.Contains(r.PestId);
            int  daysSince   = (int)(DateTime.UtcNow - r.MinDate).TotalDays;

            string introType = newToTenant ? "New to tenant" : "New to field";
            string riskLevel = newToTenant                   ? "High"
                             : pm is { IsSystemPest: false } ? "Elevated"
                             : "Standard";

            return (object)new
            {
                pestId           = r.PestId,
                pestName         = pm?.CommonName ?? "Unknown",
                isSystemPest     = pm?.IsSystemPest ?? true,
                fieldId          = r.FieldId,
                fieldName        = fm?.FieldName ?? "Unknown",
                farmName         = fm?.FarmName  ?? "Unknown",
                firstSeen        = r.MinDate.ToString("yyyy-MM-dd"),
                daysSinceFirst   = daysSince,
                totalObsCount    = r.TotalObsCount,
                totalPestCount   = r.TotalPestCount,
                introductionType = introType,
                riskLevel,
                isNewToTenant    = newToTenant,
                recommendation   = newToTenant
                    ? "Species not previously recorded on this organisation. Consider reporting to the local agricultural authority and increasing monitoring frequency."
                    : "First detection on this field. Increase scouting frequency and compare with neighboring fields for spread patterns.",
            };
        })
        .OrderBy(f => ((dynamic)f).riskLevel == "High" ? 0 : ((dynamic)f).riskLevel == "Elevated" ? 1 : 2)
        .ThenBy(f => ((dynamic)f).daysSinceFirst)
        .ToList();

        return Ok(ApiResponse<object>.Ok(new
        {
            flags,
            summary = new
            {
                totalFlags         = flags.Count,
                genuineNewSpecies  = flags.Count(f => (bool)((dynamic)f).isNewToTenant),
                newToField         = flags.Count(f => !(bool)((dynamic)f).isNewToTenant),
                nonSystemPests     = flags.Count(f => !(bool)((dynamic)f).isSystemPest),
                dataNote           = "A flag is raised whenever a pest is recorded on a field (or tenant) for the first time within the selected date range. Widen the range to include the full season for best coverage.",
            },
        }));
    }

    // ── C3 · Containment — Entry Point Analysis ──────────────────────────────

    /// <summary>
    /// Identifies the most likely entry point for each pest outbreak by finding the
    /// origin field (earliest detection) and measuring its farm's distance from the
    /// tenant's farm cluster centroid. Peripheral farms are the most probable
    /// entry points for new introductions.
    /// </summary>
    [HttpGet("entry-point-analysis")]
    public async Task<IActionResult> GetEntryPointAnalysis(
        [FromQuery] DateTime?  from,
        [FromQuery] DateTime?  to,
        [FromQuery] Guid?      farmId,
        [FromQuery] Guid?      pestId,
        CancellationToken ct = default)
    {
        var (start, end) = await ResolveRangeAsync(from, to, 365, ct);
        var tenantId = Guid.Parse(User.FindFirst("tid")?.Value ?? User.FindFirst("TenantId")?.Value ?? Guid.Empty.ToString());

        var obsQ = db.SessionObservations
            .Where(o => !o.IsUnknownPest && o.PestId != null && o.Count > 0
                     && o.Session.CompletedAt >= start && o.Session.CompletedAt <= end
                     && o.Session.DeletedAt == null);

        if (farmId.HasValue) obsQ = obsQ.Where(o => o.Session.FarmId == farmId || o.Session.Field!.FarmId == farmId);
        if (pestId.HasValue) obsQ = obsQ.Where(o => o.PestId == pestId);

        // Aggregate per pest + farm/field (push to SQL)
        var agg = await obsQ
            .GroupBy(o => new
            {
                o.PestId,
                PestName  = o.Pest!.CommonName,
                FieldId   = o.Session.FieldId,
                FieldName = o.Session.Field!.Name,
                FarmId    = o.Session.FarmId ?? o.Session.Field!.FarmId,
                FarmName  = o.Session.Farm!.Name ?? o.Session.Field!.Farm!.Name,
                FarmLat   = o.Session.Farm!.Latitude ?? o.Session.Field!.Farm!.Latitude,
                FarmLng   = o.Session.Farm!.Longitude ?? o.Session.Field!.Farm!.Longitude,
            })
            .Select(g => new
            {
                g.Key.PestId,
                g.Key.PestName,
                g.Key.FieldId,
                g.Key.FieldName,
                g.Key.FarmId,
                g.Key.FarmName,
                g.Key.FarmLat,
                g.Key.FarmLng,
                FirstSeen    = g.Min(o => o.Session.CompletedAt!.Value),
                WeekCount    = g.Count(),
                MaxCount     = g.Max(o => o.Count ?? 0),
            })
            .ToListAsync(ct);

        // Tenant farm centroid (GPS available farms only)
        var allFarmCoords = await db.Farms
            .Where(f => f.TenantId == tenantId && f.DeletedAt == null
                     && f.Latitude != null && f.Longitude != null)
            .Select(f => new { Lat = f.Latitude!.Value, Lng = f.Longitude!.Value })
            .ToListAsync(ct);

        double clusterLat = allFarmCoords.Count > 0 ? allFarmCoords.Average(f => f.Lat) : 0;
        double clusterLng = allFarmCoords.Count > 0 ? allFarmCoords.Average(f => f.Lng) : 0;

        // Median farm-to-centroid distance (for peripherality scoring)
        var farmDistances = allFarmCoords.Select(f => HaversineKm(clusterLat, clusterLng, f.Lat, f.Lng)).OrderBy(d => d).ToList();
        double medianDist = farmDistances.Count > 0 ? farmDistances[farmDistances.Count / 2] : 0;

        var pestResults = agg
            .GroupBy(r => (r.PestId, r.PestName))
            .Select(pg =>
            {
                // Origin = field with earliest first detection
                var origin = pg.OrderBy(r => r.FirstSeen).First();

                // Spread chain: all other fields ordered by first detection
                var chain = pg
                    .OrderBy(r => r.FirstSeen)
                    .Select(r => new
                    {
                        fieldId         = r.FieldId,
                        fieldName       = r.FieldName ?? "Unknown",
                        farmId          = r.FarmId,
                        farmName        = r.FarmName ?? "Unknown",
                        farmLat         = r.FarmLat != null ? Math.Round(r.FarmLat.Value, 4) : (double?)null,
                        farmLng         = r.FarmLng != null ? Math.Round(r.FarmLng.Value, 4) : (double?)null,
                        firstSeen       = r.FirstSeen.ToString("yyyy-MM-dd"),
                        daysAfterOrigin = (int)(r.FirstSeen - origin.FirstSeen).TotalDays,
                        maxCount        = r.MaxCount,
                        weekCount       = r.WeekCount,
                    })
                    .ToList<object>();

                // Peripherality of origin farm
                double originDistFromCentroid = (origin.FarmLat.HasValue && origin.FarmLng.HasValue)
                    ? HaversineKm(clusterLat, clusterLng, origin.FarmLat.Value, origin.FarmLng.Value)
                    : 0;

                bool isPeripheral = originDistFromCentroid > medianDist;
                string entryVector = !origin.FarmLat.HasValue ? "unknown"
                                   : isPeripheral              ? "peripheral"
                                   : "central";

                string entryPointNote = entryVector switch
                {
                    "peripheral" => $"Origin farm '{origin.FarmName}' lies {Math.Round(originDistFromCentroid, 1)} km from your farm cluster centroid — it is on the perimeter. Consider adding boundary traps and checking for road-side or irrigation-channel entry routes.",
                    "central"    => $"Origin farm '{origin.FarmName}' is within the central cluster ({Math.Round(originDistFromCentroid, 1)} km from centroid). The pest may have entered via internal movement (shared equipment, workers, or plant material) rather than a perimeter breach.",
                    _            => "GPS coordinates are not set for this farm. Add GPS on the Farms page for entry point analysis.",
                };

                return (object?)new
                {
                    pestId            = pg.Key.PestId,
                    pestName          = pg.Key.PestName,
                    spreadChainLength = chain.Count,
                    originField       = new
                    {
                        fieldId      = origin.FieldId,
                        fieldName    = origin.FieldName ?? "Unknown",
                        farmId       = origin.FarmId,
                        farmName     = origin.FarmName ?? "Unknown",
                        farmLat      = origin.FarmLat != null ? Math.Round(origin.FarmLat.Value, 4) : (double?)null,
                        farmLng      = origin.FarmLng != null ? Math.Round(origin.FarmLng.Value, 4) : (double?)null,
                        firstSeen    = origin.FirstSeen.ToString("yyyy-MM-dd"),
                        maxCount     = origin.MaxCount,
                        weekCount    = origin.WeekCount,
                    },
                    spreadChain                = chain,
                    entryVector,
                    originDistFromCentroidKm   = Math.Round(originDistFromCentroid, 1),
                    clusterMedianDistKm        = Math.Round(medianDist, 1),
                    isPeripheralEntry          = isPeripheral,
                    entryPointNote,
                };
            })
            .Where(p => p != null)
            .OrderByDescending(p => (bool)((dynamic)p!).isPeripheralEntry)
            .ThenByDescending(p => (int)((dynamic)p!).spreadChainLength)
            .ToList<object>();

        return Ok(ApiResponse<object>.Ok(new
        {
            pests   = pestResults,
            clusterCentroid = new { lat = Math.Round(clusterLat, 4), lng = Math.Round(clusterLng, 4) },
            summary = new
            {
                pestsAnalysed     = pestResults.Count,
                peripheralEntries = pestResults.Count(p => (bool)((dynamic)p).isPeripheralEntry),
                centralEntries    = pestResults.Count(p => !(bool)((dynamic)p).isPeripheralEntry && (string)((dynamic)p).entryVector != "unknown"),
                unknownGps        = pestResults.Count(p => (string)((dynamic)p).entryVector == "unknown"),
                dataNote          = "Entry vector is determined by comparing the outbreak origin farm's position to the median distance of all your farms from the tenant centroid. Set GPS coordinates on all farms (Farms page) for best results.",
            },
        }));
    }

    // ── C4 · Containment — Resistance Pattern Detection ──────────────────────

    /// <summary>
    /// Identifies field × pest combinations where threshold breaches have recurred
    /// across multiple calendar years without improvement — a signal of potential
    /// pesticide resistance or persistent infestation that is not responding to
    /// current control measures.
    /// </summary>
    [HttpGet("resistance-patterns")]
    public async Task<IActionResult> GetResistancePatterns(
        [FromQuery] DateTime?  from,
        [FromQuery] DateTime?  to,
        [FromQuery] Guid?      farmId,
        [FromQuery] Guid?      fieldId,
        [FromQuery] Guid?      pestId,
        CancellationToken ct = default)
    {
        var (start, end) = await ResolveRangeAsync(from, to, 730, ct); // default 2 years

        var obsQ = db.SessionObservations
            .Where(o => !o.IsUnknownPest && o.PestId != null
                     && o.ThresholdCount != null && o.ThresholdCount > 0
                     && o.Session.CompletedAt != null
                     && o.Session.DeletedAt == null
                     && o.Session.FieldId != null);

        if (farmId.HasValue)  obsQ = obsQ.Where(o => o.Session.FarmId == farmId || o.Session.Field!.FarmId == farmId);
        if (fieldId.HasValue) obsQ = obsQ.Where(o => o.Session.FieldId == fieldId);
        if (pestId.HasValue)  obsQ = obsQ.Where(o => o.PestId == pestId);

        // Pre-aggregate to SQL: per pest + field + year
        var yearlyAgg = await obsQ
            .GroupBy(o => new
            {
                o.PestId,
                PestName  = o.Pest!.CommonName,
                FieldId   = o.Session.FieldId!.Value,
                FieldName = o.Session.Field!.Name,
                FarmName  = o.Session.Farm!.Name ?? o.Session.Field!.Farm!.Name,
                Year      = o.Session.CompletedAt!.Value.Year,
            })
            .Select(g => new
            {
                g.Key.PestId,
                g.Key.PestName,
                g.Key.FieldId,
                g.Key.FieldName,
                g.Key.FarmName,
                g.Key.Year,
                SessionCount = g.Count(),
                BreachCount  = g.Count(o => o.Count > o.ThresholdCount),
                AvgCount     = g.Average(o => (double)(o.Count ?? 0)),
            })
            .Where(g => g.BreachCount > 0)
            .OrderBy(g => g.Year)
            .ToListAsync(ct);

        if (yearlyAgg.Count == 0)
            return Ok(ApiResponse<object>.Ok(new
            {
                patterns = Array.Empty<object>(),
                summary  = new { totalPatterns = 0, likelyResistance = 0, possibleResistance = 0, dataNote = "No multi-year threshold breach data found in the selected period." },
            }));

        var patterns = yearlyAgg
            .GroupBy(r => (r.PestId, r.PestName, r.FieldId, r.FieldName, r.FarmName))
            .Where(pg => pg.Select(r => r.Year).Distinct().Count() >= 2) // must span ≥ 2 years
            .Select(pg =>
            {
                var seasons = pg.OrderBy(r => r.Year).Select(r => (object)new
                {
                    year         = r.Year,
                    sessionCount = r.SessionCount,
                    breachCount  = r.BreachCount,
                    breachRate   = Math.Round((double)r.BreachCount / r.SessionCount * 100, 1),
                    avgCount     = Math.Round(r.AvgCount, 1),
                }).ToList();

                int totalBreachYears = seasons.Count;
                double firstRate = (double)((dynamic)seasons.First()).breachRate;
                double lastRate  = (double)((dynamic)seasons.Last()).breachRate;
                double rateChange = lastRate - firstRate;

                string trend = rateChange >= 15  ? "Worsening"
                             : rateChange <= -15 ? "Improving"
                             : "Stable";

                string resistanceRisk = (totalBreachYears >= 3 && trend != "Improving") ? "Likely"
                                      : (totalBreachYears >= 2 && trend == "Worsening") ? "Likely"
                                      : totalBreachYears >= 2                            ? "Possible"
                                      : "Monitor";

                string recommendation = resistanceRisk == "Likely"
                    ? "Rotate pesticide mode-of-action immediately. Conduct resistance testing if available. Increase scouting frequency and consider biocontrol or cultural controls."
                    : "Evaluate current treatment effectiveness. Consider alternating control methods and improving field hygiene between seasons.";

                return (object)new
                {
                    pestId          = pg.Key.PestId,
                    pestName        = pg.Key.PestName,
                    fieldId         = pg.Key.FieldId,
                    fieldName       = pg.Key.FieldName ?? "Unknown",
                    farmName        = pg.Key.FarmName ?? "Unknown",
                    totalBreachYears,
                    trend,
                    resistanceRisk,
                    rateChangePoints = Math.Round(rateChange, 1),
                    breachSeasons   = seasons,
                    recommendation,
                };
            })
            .OrderBy(p => ((dynamic)p).resistanceRisk == "Likely"   ? 0 : 1)
            .ThenByDescending(p => (int)((dynamic)p).totalBreachYears)
            .ThenByDescending(p => (double)((dynamic)p).rateChangePoints)
            .ToList<object>();

        return Ok(ApiResponse<object>.Ok(new
        {
            patterns,
            summary = new
            {
                totalPatterns     = patterns.Count,
                likelyResistance  = patterns.Count(p => (string)((dynamic)p).resistanceRisk == "Likely"),
                possibleResistance = patterns.Count(p => (string)((dynamic)p).resistanceRisk == "Possible"),
                yearsAnalysed     = (int)(end - start).TotalDays / 365,
                dataNote          = "A pattern is flagged when the same pest breaches its threshold on the same field in 2 or more distinct calendar years. No treatment records are required — this analysis is based on observation counts and configured thresholds alone.",
            },
        }));
    }

    // ── Math helpers ────────────────────────────────────────────────────────

    private static DateTime Monday(DateTime d)
    {
        var diff = (7 + (d.DayOfWeek - DayOfWeek.Monday)) % 7;
        return d.Date.AddDays(-diff);
    }

    /// <summary>
    /// Bearing in degrees (0 = North, 90 = East, 180 = South, 270 = West).
    /// </summary>
    private static double Bearing(double lat1, double lng1, double lat2, double lng2)
    {
        var dLat = (lat2 - lat1) * Math.PI / 180;
        var dLng = (lng2 - lng1) * Math.PI / 180;
        var y    = Math.Sin(dLng) * Math.Cos(lat2 * Math.PI / 180);
        var x    = Math.Cos(lat1 * Math.PI / 180) * Math.Sin(lat2 * Math.PI / 180)
                 - Math.Sin(lat1 * Math.PI / 180) * Math.Cos(lat2 * Math.PI / 180) * Math.Cos(dLng);
        var bearing = Math.Atan2(y, x) * 180 / Math.PI;
        return (bearing + 360) % 360;
    }

    private static string BearingLabel(double deg) => deg switch
    {
        < 22.5  => "N",
        < 67.5  => "NE",
        < 112.5 => "E",
        < 157.5 => "SE",
        < 202.5 => "S",
        < 247.5 => "SW",
        < 292.5 => "W",
        < 337.5 => "NW",
        _       => "N",
    };

    /// <summary>Cumulative distribution function of the standard normal distribution (Abramowitz &amp; Stegun).</summary>
    private static double NormalCdf(double z)
    {
        const double a1 =  0.319381530, a2 = -0.356563782, a3 = 1.781477937,
                     a4 = -1.821255978, a5 =  1.330274429;
        double t    = 1.0 / (1.0 + 0.2316419 * Math.Abs(z));
        double poly = t * (a1 + t * (a2 + t * (a3 + t * (a4 + t * a5))));
        double pdf  = Math.Exp(-0.5 * z * z) / Math.Sqrt(2 * Math.PI);
        double cdf  = 1.0 - pdf * poly;
        return z >= 0 ? cdf : 1.0 - cdf;
    }

    /// <summary>Haversine great-circle distance in km.</summary>
    private static double HaversineKm(double lat1, double lng1, double lat2, double lng2)
    {
        const double R = 6371;
        var dLat = (lat2 - lat1) * Math.PI / 180;
        var dLng = (lng2 - lng1) * Math.PI / 180;
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2)
              + Math.Cos(lat1 * Math.PI / 180) * Math.Cos(lat2 * Math.PI / 180)
              * Math.Sin(dLng / 2) * Math.Sin(dLng / 2);
        return R * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
    }

    // ── Presence Map ────────────────────────────────────────────────────────

    /// <summary>
    /// For each field × pest combination that has at least one presence-type
    /// observation (IsPresent != null), returns the current status (Present /
    /// Absent), first-ever detection date, and whether this is a new introduction
    /// or a newly cleared field within the selected period.
    /// </summary>
    [HttpGet("presence-map")]
    public async Task<IActionResult> GetPresenceMap(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] Guid?     farmId,
        [FromQuery] Guid?     fieldId,
        [FromQuery] Guid?     pestId,
        CancellationToken ct = default)
    {
        var (start, end) = await ResolveRangeAsync(from, to, 180, ct);

        // ── All presence observations within the filter period ───────────────
        var q = db.SessionObservations
            .Where(o => o.IsPresent != null
                     && !o.IsUnknownPest
                     && o.PestId != null
                     && o.Session.FieldId != null
                     && o.Session.CompletedAt != null
                     && o.Session.CompletedAt >= start
                     && o.Session.CompletedAt <= end);

        if (farmId.HasValue)  q = q.Where(o => o.Session.FarmId == farmId || o.Session.Field!.FarmId == farmId);
        if (fieldId.HasValue) q = q.Where(o => o.Session.FieldId == fieldId);
        if (pestId.HasValue)  q = q.Where(o => o.PestId == pestId);

        var rows = await q
            .Select(o => new
            {
                o.PestId,
                PestName  = o.Pest!.CommonName,
                FieldId   = o.Session.FieldId!.Value,
                FieldName = o.Session.Field!.Name,
                FarmName  = o.Session.Farm != null ? o.Session.Farm.Name
                          : o.Session.Field.Farm != null ? o.Session.Field.Farm.Name : null,
                o.IsPresent,
                ObservedAt = o.Session.CompletedAt!.Value,
            })
            .ToListAsync(ct);

        // ── First-ever detection (all time, same scope filters) ──────────────
        var firstQ = db.SessionObservations
            .Where(o => o.IsPresent == true
                     && !o.IsUnknownPest
                     && o.PestId != null
                     && o.Session.FieldId != null
                     && o.Session.CompletedAt != null);

        if (farmId.HasValue)  firstQ = firstQ.Where(o => o.Session.FarmId == farmId || o.Session.Field!.FarmId == farmId);
        if (fieldId.HasValue) firstQ = firstQ.Where(o => o.Session.FieldId == fieldId);
        if (pestId.HasValue)  firstQ = firstQ.Where(o => o.PestId == pestId);

        var firstDetections = await firstQ
            .GroupBy(o => new { o.PestId, FieldId = o.Session.FieldId!.Value })
            .Select(g => new { g.Key.PestId, g.Key.FieldId, FirstAt = g.Min(o => o.Session.CompletedAt) })
            .ToListAsync(ct);

        var firstMap = firstDetections.ToDictionary(x => (x.PestId, x.FieldId), x => x.FirstAt);

        // ── Group and derive status ──────────────────────────────────────────
        var byPest = rows
            .GroupBy(r => (r.PestId, r.PestName))
            .Select(pg =>
            {
                var fields = pg
                    .GroupBy(r => (r.FieldId, r.FieldName, r.FarmName))
                    .Select(fg =>
                    {
                        var lastPresent = fg.Where(r => r.IsPresent == true) .MaxBy(r => r.ObservedAt);
                        var lastAbsent  = fg.Where(r => r.IsPresent == false).MaxBy(r => r.ObservedAt);

                        string   status;
                        DateTime? statusAt;
                        if      (lastPresent == null && lastAbsent == null) { status = "Unknown"; statusAt = null; }
                        else if (lastPresent == null)                        { status = "Absent";  statusAt = lastAbsent!.ObservedAt; }
                        else if (lastAbsent  == null)                        { status = "Present"; statusAt = lastPresent.ObservedAt; }
                        else if (lastPresent.ObservedAt >= lastAbsent.ObservedAt) { status = "Present"; statusAt = lastPresent.ObservedAt; }
                        else                                                  { status = "Absent";  statusAt = lastAbsent.ObservedAt; }

                        firstMap.TryGetValue((pg.Key.PestId, fg.Key.FieldId), out var firstAt);

                        return new
                        {
                            fg.Key.FieldId,
                            fg.Key.FieldName,
                            fg.Key.FarmName,
                            Status                = status,
                            StatusAt              = statusAt,
                            FirstDetectedAt       = firstAt,
                            IsNewIntroduction     = firstAt.HasValue && firstAt >= start,
                            IsNewlyClear          = status == "Absent" && lastPresent != null,
                            ConfirmedPresentCount = fg.Count(r => r.IsPresent == true),
                            ConfirmedAbsentCount  = fg.Count(r => r.IsPresent == false),
                        };
                    })
                    .OrderBy(f => f.FarmName).ThenBy(f => f.FieldName)
                    .ToList();

                return new
                {
                    pg.Key.PestId,
                    pg.Key.PestName,
                    Fields              = fields,
                    NewIntroductions    = fields.Count(f => f.IsNewIntroduction),
                    ActivePresenceCount = fields.Count(f => f.Status == "Present"),
                };
            })
            .OrderByDescending(p => p.NewIntroductions)
            .ThenByDescending(p => p.ActivePresenceCount)
            .ThenBy(p => p.PestName)
            .ToList();

        var allFields = byPest.SelectMany(p => p.Fields).ToList();
        var summary = new
        {
            PestsTracked     = byPest.Count,
            NewIntroductions = allFields.Count(f => f.IsNewIntroduction),
            NewlyClear       = allFields.Count(f => f.IsNewlyClear),
            ActivePresence   = allFields.Count(f => f.Status == "Present"),
            ConfirmedAbsent  = allFields.Count(f => f.Status == "Absent"),
        };

        return Ok(ApiResponse<object>.Ok(new { summary, pests = byPest }));
    }

    // ── IM2 · GPS Hotspot Map ────────────────────────────────────────────────

    [HttpGet("hotspot-map")]
    public async Task<IActionResult> GetHotspotMap(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] Guid?     farmId,
        [FromQuery] Guid?     fieldId,
        [FromQuery] Guid?     pestId,
        CancellationToken ct = default)
    {
        try
        {
            var (start, end) = await ResolveRangeAsync(from, to, 180, ct);

            var q = db.SessionObservations
                .Where(o => !o.IsUnknownPest
                         && o.PestId != null
                         && o.Session.CompletedAt != null
                         && o.Session.CompletedAt >= start
                         && o.Session.CompletedAt <= end
                         && o.Latitude  != null
                         && o.Longitude != null);

            if (farmId.HasValue)  q = q.Where(o => o.Session.FarmId == farmId || o.Session.Field!.FarmId == farmId);
            if (fieldId.HasValue) q = q.Where(o => o.Session.FieldId == fieldId);
            if (pestId.HasValue)  q = q.Where(o => o.PestId == pestId);

            var points = await q
                .OrderBy(o => o.Session.CompletedAt)
                .Select(o => new
                {
                    PestName      = o.Pest!.CommonName,
                    FieldName     = o.Session.Field != null ? o.Session.Field.Name : null,
                    FarmName      = o.Session.Farm  != null ? o.Session.Farm.Name
                                  : o.Session.Field != null && o.Session.Field.Farm != null ? o.Session.Field.Farm.Name : null,
                    ScoutName     = o.Session.Scouter != null ? o.Session.Scouter.UserName : null,
                    o.Count,
                    o.ThresholdCount,
                    o.IsPresent,
                    ObservedAt    = (DateTime?)(o.ObservedAt ?? o.Session.CompletedAt),
                    Lat           = o.Latitude!.Value,
                    Lng           = o.Longitude!.Value,
                })
                .ToListAsync(ct);

            var summary = new
            {
                TotalPoints      = points.Count,
                Breaches         = points.Count(p => p.ThresholdCount != null && p.Count > p.ThresholdCount),
                ConfirmedPresent = points.Count(p => p.IsPresent == true),
                ConfirmedAbsent  = points.Count(p => p.IsPresent == false),
            };

            return Ok(ApiResponse<object>.Ok(new { summary, points }));
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            return NoContent();
        }
    }

    // ── Private record ──────────────────────────────────────────────────────

    private sealed record RawObs(
        Guid        PestId,
        string      PestName,
        int?        ThresholdCount,
        int?        Count,
        double      Lat,
        double      Lng,
        DateTime    CompletedAt,
        Guid?       FieldId,
        string?     FieldName,
        string?     FarmName);
}
