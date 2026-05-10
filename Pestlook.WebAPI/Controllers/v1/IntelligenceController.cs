using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pestlook.WebAPI.Data;
using Pestlook.WebAPI.DTOs.Common;

namespace Pestlook.WebAPI.Controllers.v1;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/intelligence")]
[Authorize]
public sealed class IntelligenceController(ApplicationDbContext db) : ControllerBase
{
    // ── Shared helpers ──────────────────────────────────────────────────────

    private static (DateTime From, DateTime To) ResolveRange(DateTime? from, DateTime? to, int defaultDays = 180)
    {
        var end   = to?.ToUniversalTime()   ?? DateTime.UtcNow;
        var start = from?.ToUniversalTime() ?? end.AddDays(-defaultDays);
        return (start, end);
    }

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
        var (start, end) = ResolveRange(from, to, 180);

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
        var (start, end) = ResolveRange(from, to, 180);

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
        var (start, end) = ResolveRange(from, to, 180);
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
        [FromQuery] double    radiusKm = 5.0)
    {
        var (start, end) = ResolveRange(from, to, 180);
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
        [FromQuery] int       minFarms = 2)
    {
        var (start, end) = ResolveRange(from, to, 365);
        minFarms = Math.Clamp(minFarms, 2, 20);

        // ── 1. Load weekly observation totals per pest × farm ─────────────
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
            .Select(o => new {
                PestId    = o.PestId!.Value,
                PestName  = o.Pest!.CommonName,
                FarmId    = o.Session!.FarmId!.Value,
                FarmName  = o.Session!.Farm!.Name,
                Count     = o.Count!.Value,
                Threshold = o.ThresholdCount,
                At        = o.Session!.CompletedAt!.Value,
            })
            .ToListAsync();

        if (!raw.Any())
            return Ok(ApiResponse<object>.Ok(new {
                outbreaks = Array.Empty<object>(),
                summary   = new { totalOutbreakPests = 0, regionalOutbreaks = 0, peakFarmCount = 0, peakPestName = (string?)null },
            }));

        // ── 2. Group into weekly buckets per pest × farm ──────────────────
        var byPest = raw
            .GroupBy(r => new { r.PestId, r.PestName })
            .Select(pg =>
            {
                var pestId2   = pg.Key.PestId;
                var pestName  = pg.Key.PestName;

                // Farm-level weekly series
                var byFarm = pg
                    .GroupBy(r => new { r.FarmId, r.FarmName })
                    .Select(fg =>
                    {
                        var farmId2   = fg.Key.FarmId;
                        var farmName  = fg.Key.FarmName;
                        var threshold = fg.Max(r => r.Threshold) ?? 0;

                        var weekly = fg
                            .GroupBy(r => Monday(r.At))
                            .Select(wg => new {
                                WeekStart = wg.Key,
                                Count     = wg.Sum(r => r.Count),
                            })
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
        var (windowStart, windowEnd) = ResolveRange(from, to, 180);

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
        var (start, end) = ResolveRange(from, to, 180);

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
        var (start, end) = ResolveRange(from, to, 180);

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

        var obs = await obsQ
            .Select(o => new
            {
                FieldId     = o.Session.FieldId!.Value,
                o.Count,
                CompletedAt = o.Session.CompletedAt!.Value,
                o.ThresholdCount,
            })
            .ToListAsync(ct);

        var today = DateTime.UtcNow.Date;

        var recommendations = sessions
            .GroupBy(s => s.FieldId)
            .Select(fg =>
            {
                var lastSession = fg.OrderByDescending(s => s.CompletedAt).First();
                var fieldObs    = obs.Where(o => o.FieldId == fg.Key).ToList();

                int daysSinceLast = (today - lastSession.CompletedAt.Date).Days;
                int baseInterval  = 7; // default weekly

                double growthRate = 0;
                if (fieldObs.Count >= 2)
                {
                    var weekly = fieldObs
                        .GroupBy(o => Monday(o.CompletedAt))
                        .OrderBy(g => g.Key)
                        .Select(wg => (double)wg.Sum(o => o.Count ?? 0))
                        .ToList();

                    if (weekly.Count >= 2)
                    {
                        double first = weekly[0], last = weekly[^1];
                        growthRate = first > 0 ? (last - first) / first : last > 0 ? 1 : 0;
                    }
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

                var nextDate      = lastSession.CompletedAt.Date.AddDays(recommendedInterval);
                int daysUntilNext = (nextDate - today).Days;
                bool isOverdue    = daysUntilNext < 0;

                return (object?)new
                {
                    fieldId             = fg.Key,
                    fieldName           = lastSession.FieldName,
                    farmName            = lastSession.FarmName,
                    lastSessionDate     = lastSession.CompletedAt.ToString("yyyy-MM-dd"),
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

        var obs = await obsQ
            .Select(o => new
            {
                o.PestId,
                PestName    = o.Pest!.CommonName,
                o.Count,
                CompletedAt = o.Session.CompletedAt!.Value,
            })
            .ToListAsync(ct);

        if (obs.Count == 0)
            return Ok(ApiResponse<object>.Ok(new { calendar = Array.Empty<object>(), peakPests = Array.Empty<object>() }));

        var now         = DateTime.UtcNow;
        var next6Months = Enumerable.Range(0, 6)
            .Select(i => new DateTime(now.Year, now.Month, 1).AddMonths(i))
            .ToList();

        // Build monthly profiles per pest from historical data
        var byPest = obs
            .GroupBy(o => (o.PestId, o.PestName))
            .Select(pg =>
            {
                var pestId2   = pg.Key.PestId;
                var pestName  = pg.Key.PestName;

                // Monthly totals per calendar month (1–12)
                var byMonth = pg
                    .GroupBy(o => o.CompletedAt.Month)
                    .ToDictionary(mg => mg.Key, mg => (double)mg.Sum(o => o.Count ?? 0));

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
        var (start, end) = ResolveRange(from, to, 180);

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
        var (start, end) = ResolveRange(from, to, 90);

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
        var (start, end) = ResolveRange(from, to, 180);

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
        var (start, end) = ResolveRange(from, to, 180);
        var today = DateTime.UtcNow.Date;

        // ── 1. Observation trend per field ───────────────────────────────────
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
                daysSinceLast = (today - lastSess.Date).Days;
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
        var (start, end) = ResolveRange(from, to, 365);

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

        var scores = obs
            .GroupBy(o => (o.PestId, o.FieldId))
            .Select(grp =>
            {
                var first     = grp.First();
                var threshold = grp.Max(o => o.ThresholdCount) ?? 0;

                // All sessions with obs for this pest+field, ordered chronologically
                var bySession = grp
                    .GroupBy(o => o.CompletedAt.Date)
                    .OrderBy(g => g.Key)
                    .Select(sg => (Date: sg.Key, Total: sg.Sum(o => o.Count ?? 0), IsAbove: sg.Sum(o => o.Count ?? 0) > threshold))
                    .ToList();

                // Find the first breach point within the queried range
                var breachIdx = bySession
                    .Select((s, i) => (s, i))
                    .Where(x => x.s.IsAbove && x.s.Date >= start && x.s.Date <= end)
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
        var (start, end) = ResolveRange(from, to, 90);
        var now = DateTime.UtcNow;

        // ── 1. All threshold breaches in period ──────────────────────────────
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
        var (start, end) = ResolveRange(from, to, 90);
        var monthStart   = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);

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

        // ── 3. Pest pressure per field in the selected period ────────────────
        var obsQ = db.SessionObservations
            .Where(o => !o.IsUnknownPest && o.PestId != null && o.Count > 0
                     && o.Session.CompletedAt >= start && o.Session.CompletedAt <= end
                     && o.Session.FieldId != null);

        if (farmId.HasValue) obsQ = obsQ.Where(o => o.Session.FarmId == farmId || o.Session.Field!.FarmId == farmId);

        var obsData = await obsQ
            .Select(o => new
            {
                FieldId  = o.Session.FieldId!.Value,
                PestName = o.Pest!.CommonName,
                o.Count,
                o.ThresholdCount,
                IsAbove  = o.Count > (o.ThresholdCount ?? int.MaxValue),
            })
            .ToListAsync(ct);

        // Compute median total obs across all fields for "high pressure" threshold
        var obsByField = obsData
            .GroupBy(o => o.FieldId)
            .ToDictionary(g => g.Key, g => g.Sum(o => o.Count ?? 0));

        double medianObs = obsByField.Any()
            ? obsByField.Values.OrderBy(v => v).Skip(obsByField.Count / 2).First()
            : 0;

        const int TARGET_SESSIONS = 4;

        var zones = allFields.Select(f =>
        {
            int sessionsThisMonth = monthlySessions.FirstOrDefault(s => s.FieldId == f.Id)?.SessionCount ?? 0;
            double coveragePct    = Math.Min(100.0, sessionsThisMonth / (double)TARGET_SESSIONS * 100.0);

            int totalObs    = obsByField.GetValueOrDefault(f.Id, 0);
            int breachCount = obsData.Where(o => o.FieldId == f.Id).Count(o => o.IsAbove);

            bool isLowCoverage  = coveragePct < 50.0;
            bool isHighPressure = totalObs > medianObs && totalObs > 0;

            if (!isLowCoverage) return null; // only surface under-scouted fields

            string riskLevel = isHighPressure && breachCount > 0 ? "Critical"
                             : isHighPressure                    ? "High"
                             : "Low";

            // Top pest
            string topPest = obsData
                .Where(o => o.FieldId == f.Id)
                .GroupBy(o => o.PestName)
                .OrderByDescending(g => g.Sum(o => o.Count ?? 0))
                .Select(g => g.Key)
                .FirstOrDefault() ?? "None";

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
