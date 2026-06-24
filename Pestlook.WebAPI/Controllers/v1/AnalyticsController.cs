using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using Pestlook.WebAPI.Data;
using Pestlook.WebAPI.Domain.Enums;
using Pestlook.WebAPI.DTOs.Common;
using Pestlook.WebAPI.DTOs.ScoutingSessions;
using Pestlook.WebAPI.Infrastructure.Services.Interfaces;

namespace Pestlook.WebAPI.Controllers.v1;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/analytics")]
[Authorize]
public sealed class AnalyticsController(ApplicationDbContext db, IUserTimezoneService tzService) : ControllerBase
{
    // ── Shared filter helpers ───────────────────────────────────────────────

    /// <summary>
    /// Returns the start/end UTC range from the query params.
    /// <paramref name="dateRange"/> accepts: "7", "30", "90", "365", "all".
    /// <paramref name="from"/> / <paramref name="to"/> explicit ISO dates take priority
    /// and are interpreted as calendar dates in the user's timezone.
    /// Day boundaries (00:00:00 / 23:59:59) are the user's local day converted to UTC.
    /// </summary>
    private static (DateTime From, DateTime To) ResolveRange(
        string? dateRange, DateTime? from, DateTime? to, TimeZoneInfo tz)
    {
        var nowLocal = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tz);

        // Normalize end date to local 23:59:59
        var endLocal = (to?.Date ?? nowLocal.Date).AddDays(1).AddSeconds(-1);

        // Normalize start date to local 00:00:00
        var startLocal = from?.Date ?? dateRange switch
        {
            "7"   => nowLocal.AddDays(-7).Date,
            "30"  => nowLocal.AddDays(-30).Date,
            "90"  => nowLocal.AddDays(-90).Date,
            "365" => nowLocal.AddDays(-365).Date,
            "all" => DateTime.UnixEpoch,
            _     => nowLocal.AddDays(-90).Date,
        };

        return (LocalToUtc(startLocal, tz), LocalToUtc(endLocal, tz));
    }

    private static DateTime LocalToUtc(DateTime local, TimeZoneInfo tz) =>
        TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(local, DateTimeKind.Unspecified), tz);

    /// <summary>Local calendar date (midnight, Kind=Unspecified) of a UTC instant — bucket label only.</summary>
    private static DateTime ToLocalDate(DateTime utc, TimeZoneInfo tz) =>
        TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utc, DateTimeKind.Utc), tz).Date;

    /// <summary>Start (Sunday) of the user-local week containing a UTC instant — bucket label only.</summary>
    private static DateTime ToLocalWeekStart(DateTime utc, TimeZoneInfo tz)
    {
        var d = ToLocalDate(utc, tz);
        return d.AddDays(-(int)d.DayOfWeek);
    }

    // ── Legacy full-payload endpoint (kept for backward compat) ────────────

    /// <summary>
    /// Returns scouting sessions with their full observation payloads, paginated.
    /// Used exclusively by the analytics/reports pages — the standard
    /// GET /scouting-sessions endpoint deliberately omits observations for performance.
    /// </summary>
    [HttpGet("sessions")]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<ScoutingSessionResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSessionsWithObservations(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 200,
        CancellationToken ct = default)
    {
        page     = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 500);

        var query = db.ScoutingSessions.OrderByDescending(ss => ss.CreatedAt);

        var totalCount = await query.CountAsync(ct);

        var projected = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(ss => new
            {
                ss.Id,
                ss.TenantId,
                ss.ScouterId,
                ss.IsPlanned,
                ss.ScheduledDate,
                ss.StartedAt,
                ss.CompletedAt,
                ss.WeatherConditions,
                ss.TemperatureCelsius,
                ss.Notes,
                ss.CreatedAt,
                ss.FieldId,
                ss.FarmId,
                FieldFarmId   = ss.Field != null ? (Guid?)ss.Field.FarmId : null,
                FieldName     = ss.Field != null ? ss.Field.Name : null,
                FarmName      = ss.Farm  != null ? ss.Farm.Name
                              : ss.Field != null && ss.Field.Farm != null ? ss.Field.Farm.Name : null,
                ScouterName   = ss.Scouter   != null ? ss.Scouter.FirstName   + " " + ss.Scouter.LastName   : null,
                CreatedByName = ss.CreatedBy != null ? ss.CreatedBy.FirstName + " " + ss.CreatedBy.LastName : null,
                UpdatedByName = ss.UpdatedBy != null ? ss.UpdatedBy.FirstName + " " + ss.UpdatedBy.LastName : null,
                Observations  = ss.SessionObservations.Select(o => new
                {
                    o.Id,
                    o.ObservationType,
                    o.IsPlanned,
                    o.TrapId,
                    TrapName      = o.Trap != null ? o.Trap.Name : null,
                    o.PestId,
                    PestName      = o.Pest != null ? o.Pest.CommonName : null,
                    o.CaptureMode,
                    o.Count,
                    o.IsPresent,
                    o.Latitude,
                    o.Longitude,
                    o.IsUnknownPest,
                    o.Notes,
                    o.LifeStage,
                    o.ThresholdCount,
                    o.SortOrder,
                    o.PhotoUrlsJson,
                    o.ObservationGroupId,
                    CreatedByName = o.CreatedBy != null ? o.CreatedBy.FirstName + " " + o.CreatedBy.LastName : null,
                    UpdatedByName = o.UpdatedBy != null ? o.UpdatedBy.FirstName + " " + o.UpdatedBy.LastName : null,
                    o.ObservedAt,
                    o.CreatedAt
                }).ToList()
            })
            .ToListAsync(ct);

        var sessions = projected.Select(p => new ScoutingSessionResponse(
            p.Id, p.TenantId, p.ScouterId, p.ScouterName, p.IsPlanned,
            p.ScheduledDate, p.StartedAt, p.CompletedAt, p.WeatherConditions,
            p.TemperatureCelsius, p.Notes, p.CreatedAt, p.FieldId,
            p.FarmId ?? p.FieldFarmId, p.FieldName, p.FarmName,
            p.Observations.Count,
            p.Observations.Count(o => o.ObservationType == ObservationType.Trap),
            p.Observations.Count(o => o.ObservationType == ObservationType.AdHoc),
            p.Observations.Select(o => new SessionObservationResponse(
                o.Id, o.ObservationType, o.IsPlanned, o.TrapId, o.TrapName,
                o.PestId, o.PestName, o.CaptureMode, o.Count, o.IsPresent,
                o.Latitude, o.Longitude, o.IsUnknownPest, o.Notes, o.LifeStage,
                o.ThresholdCount, o.SortOrder,
                o.PhotoUrlsJson is not null
                    ? JsonSerializer.Deserialize<List<string>>(o.PhotoUrlsJson) ?? []
                    : [],
                o.ObservationGroupId, o.CreatedByName, o.UpdatedByName, o.ObservedAt, o.CreatedAt)).ToList(),
            p.CreatedByName, p.UpdatedByName)).ToList();

        var paged = new PagedResult<ScoutingSessionResponse>(sessions, totalCount, page, pageSize);
        return Ok(ApiResponse<PagedResult<ScoutingSessionResponse>>.Ok(paged));
    }

    // ── R0 Overview ─────────────────────────────────────────────────────────

    [HttpGet("overview")]
    public async Task<IActionResult> GetOverview(
        [FromQuery] string? dateRange,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] Guid? farmId,
        [FromQuery] Guid? fieldId,
        [FromQuery] string? scoutId,
        CancellationToken ct = default)
    {
        var tz = await tzService.GetUserTimeZoneAsync(ct);
        var (start, end) = ResolveRange(dateRange, from, to, tz);

        var sessQ = db.ScoutingSessions
            .Where(ss => ss.CompletedAt >= start && ss.CompletedAt <= end);
        if (farmId.HasValue)  sessQ = sessQ.Where(ss => ss.FarmId == farmId || ss.Field!.FarmId == farmId);
        if (fieldId.HasValue) sessQ = sessQ.Where(ss => ss.FieldId == fieldId);
        if (scoutId != null)  sessQ = sessQ.Where(ss => ss.ScouterId == scoutId ||
            (ss.Scouter != null && ss.Scouter.FirstName + " " + ss.Scouter.LastName == scoutId));

        var totalSessions = await sessQ.CountAsync(ct);

        // Build a single observation base query filtered via o.Session.* navigation.
        // Starting from SessionObservations avoids the CROSS APPLY that EF emits when
        // using sessQ.SelectMany(ss => ss.SessionObservations...) — which issues one
        // correlated subquery per session row and was causing 20-second runtimes.
        var obsBase = db.SessionObservations
            .Where(o => o.Session.CompletedAt >= start && o.Session.CompletedAt <= end);
        if (farmId.HasValue)  obsBase = obsBase.Where(o => o.Session.FarmId == farmId || o.Session.Field!.FarmId == farmId);
        if (fieldId.HasValue) obsBase = obsBase.Where(o => o.Session.FieldId == fieldId);
        if (scoutId != null)  obsBase = obsBase.Where(o => o.Session.ScouterId == scoutId ||
            (o.Session.Scouter != null && o.Session.Scouter.FirstName + " " + o.Session.Scouter.LastName == scoutId));

        // KPI aggregates — use obsBase (respects all active filters).
        // Previously used a separate obsKpisQ without farm/field/scout filters which
        // caused full-table scans and returned wrong totals when filters were active.
        var totalObservations = await obsBase.SumAsync(o => (int?)(o.Count ?? 0), ct) ?? 0;
        var thresholdBreaches = await obsBase.CountAsync(o => o.ThresholdCount != null && o.Count > o.ThresholdCount, ct);

        // Trend — bucket size adapts to the selected range.
        // Buckets follow the user's local calendar: timestamps are shifted by the
        // timezone's current UTC offset inside SQL (translates to DATEADD).
        // Note: a fixed offset is exact for zones without DST (e.g. Africa/Johannesburg);
        // for DST zones, instants within ~1h of a transition may land in the adjacent bucket.
        var tzOffsetMinutes = (int)tz.GetUtcOffset(DateTime.UtcNow).TotalMinutes;
        var spanDays = (end - start).TotalDays;
        List<object> weeklyObs;
        if (spanDays <= 14)
        {
            // Daily buckets
            var raw = await obsBase
                .GroupBy(o => o.Session.CompletedAt!.Value.AddMinutes(tzOffsetMinutes).Date)
                .Select(g => new { BucketDate = g.Key, TotalObs = g.Sum(o => o.Count ?? 0) })
                .OrderBy(x => x.BucketDate)
                .ToListAsync(ct);
            weeklyObs = raw.Select(x => (object)new { WeekStart = (DateTime?)x.BucketDate, x.TotalObs }).ToList();
        }
        else if (spanDays <= 180)
        {
            // Weekly buckets — group by local week-of-year
            var raw = await obsBase
                .GroupBy(o => o.Session.CompletedAt!.Value.AddMinutes(tzOffsetMinutes).DayOfYear / 7)
                .Select(g => new { WeekIndex = g.Key, TotalObs = g.Sum(o => o.Count ?? 0), WeekStart = g.Min(o => o.Session.CompletedAt) })
                .OrderBy(x => x.WeekIndex)
                .ToListAsync(ct);
            weeklyObs = raw.Select(x => (object)new { x.WeekStart, x.TotalObs }).ToList();
        }
        else
        {
            // Monthly buckets
            var raw = await obsBase
                .GroupBy(o => new { o.Session.CompletedAt!.Value.AddMinutes(tzOffsetMinutes).Year, o.Session.CompletedAt!.Value.AddMinutes(tzOffsetMinutes).Month })
                .Select(g => new { g.Key.Year, g.Key.Month, TotalObs = g.Sum(o => o.Count ?? 0) })
                .OrderBy(x => x.Year).ThenBy(x => x.Month)
                .ToListAsync(ct);
            weeklyObs = raw.Select(x => (object)new { WeekStart = (DateTime?)new DateTime(x.Year, x.Month, 1), x.TotalObs }).ToList();
        }

        // Top 6 pests
        var topPests = await obsBase
            .Where(o => !o.IsUnknownPest && o.PestId != null)
            .GroupBy(o => o.Pest!.CommonName)
            .Select(g => new { PestName = g.Key, TotalCount = g.Sum(o => o.Count ?? 0) })
            .OrderByDescending(x => x.TotalCount)
            .Take(6)
            .ToListAsync(ct);

        return Ok(ApiResponse<object>.Ok(new
        {
            kpis = new
            {
                TotalSessions     = totalSessions,
                CompletedSessions = totalSessions,
                TotalObservations = totalObservations,
                ThresholdBreaches = thresholdBreaches,
            },
            weeklyTrend = weeklyObs,
            topPests,
        }));
    }

    // ── R1 Threshold Alerts ─────────────────────────────────────────────────

    [HttpGet("alerts")]
    public async Task<IActionResult> GetAlerts(
        [FromQuery] string? dateRange,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] Guid? farmId,
        [FromQuery] Guid? fieldId,
        [FromQuery] string? scoutId,
        CancellationToken ct = default)
    {
        var tz = await tzService.GetUserTimeZoneAsync(ct);
        var (start, end) = ResolveRange(dateRange, from, to, tz);

        var obsQ = db.SessionObservations
            .Where(o => !o.IsUnknownPest
                     && o.ThresholdCount != null
                     && o.Count > o.ThresholdCount
                     && o.Session.CompletedAt >= start
                     && o.Session.CompletedAt <= end);

        if (farmId.HasValue)  obsQ = obsQ.Where(o => o.Session.FarmId == farmId || o.Session.Field!.FarmId == farmId);
        if (fieldId.HasValue) obsQ = obsQ.Where(o => o.Session.FieldId == fieldId);
        if (scoutId != null)  obsQ = obsQ.Where(o => o.Session.ScouterId == scoutId ||
            (o.Session.Scouter != null && o.Session.Scouter.FirstName + " " + o.Session.Scouter.LastName == scoutId));

        var breaches = await obsQ
            .OrderByDescending(o => o.Session.CompletedAt)
            .Select(o => new
            {
                PestName      = o.Pest != null ? o.Pest.CommonName : "Unknown",
                FieldName     = o.Session.Field  != null ? o.Session.Field.Name  : null,
                FarmName      = o.Session.Farm   != null ? o.Session.Farm.Name
                              : o.Session.Field  != null && o.Session.Field.Farm != null ? o.Session.Field.Farm.Name : null,
                ObservedCount = o.Count,
                o.ThresholdCount,
                o.Session.CompletedAt,
                ScouterName   = o.Session.Scouter != null
                    ? o.Session.Scouter.FirstName + " " + o.Session.Scouter.LastName : null,
            })
            .ToListAsync(ct);

        var repeatOffenders = breaches
            .GroupBy(b => (b.PestName, b.FieldName))
            .Where(g => g.Count() >= 2)
            .Select(g => new { g.Key.PestName, g.Key.FieldName, BreachCount = g.Count() })
            .OrderByDescending(x => x.BreachCount)
            .ToList();

        var eightWeeksAgo = DateTime.UtcNow.AddDays(-56);
        // Hoisted local: EF parameterizes it into DATEADD; TimeZoneInfo calls
        // inside the lambda are not translatable.
        var tzOffsetMinutes = (int)tz.GetUtcOffset(DateTime.UtcNow).TotalMinutes;
        var weeklyTrend = await db.SessionObservations
            .Where(o => !o.IsUnknownPest
                     && o.ThresholdCount != null
                     && o.Count > o.ThresholdCount
                     && o.Session.CompletedAt >= eightWeeksAgo)
            .GroupBy(o => o.Session.CompletedAt!.Value.AddMinutes(tzOffsetMinutes).DayOfYear / 7)
            .Select(g => new
            {
                WeekIndex = g.Key,
                WeekStart = g.Min(o => o.Session.CompletedAt),
                Breaches  = g.Count(),
            })
            .OrderBy(x => x.WeekIndex)
            .ToListAsync(ct);

        return Ok(ApiResponse<object>.Ok(new { breaches, repeatOffenders, weeklyTrend }));
    }

    // ── R2 Pest Pressure ────────────────────────────────────────────────────

    [HttpGet("pest-pressure")]
    public async Task<IActionResult> GetPestPressure(
        [FromQuery] string? dateRange,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] Guid? farmId,
        [FromQuery] Guid? fieldId,
        [FromQuery] string? scoutId,
        CancellationToken ct = default)
    {
        var tz = await tzService.GetUserTimeZoneAsync(ct);
        var (start, end) = ResolveRange(dateRange, from, to, tz);

        var obsQ = db.SessionObservations
            .Where(o => o.Session.CompletedAt >= start && o.Session.CompletedAt <= end);

        if (farmId.HasValue)  obsQ = obsQ.Where(o => o.Session.FarmId == farmId || o.Session.Field!.FarmId == farmId);
        if (fieldId.HasValue) obsQ = obsQ.Where(o => o.Session.FieldId == fieldId);
        if (scoutId != null)  obsQ = obsQ.Where(o => o.Session.ScouterId == scoutId ||
            (o.Session.Scouter != null && o.Session.Scouter.FirstName + " " + o.Session.Scouter.LastName == scoutId));

        var fieldStats = await obsQ
            .GroupBy(o => new
            {
                FieldId   = o.Session.FieldId,
                FieldName = o.Session.Field != null ? o.Session.Field.Name : null,
                FarmName  = o.Session.Farm  != null ? o.Session.Farm.Name
                          : o.Session.Field != null && o.Session.Field.Farm != null ? o.Session.Field.Farm.Name : null,
            })
            .Select(g => new
            {
                g.Key.FieldId,
                g.Key.FieldName,
                g.Key.FarmName,
                SessionCount = g.Select(o => o.SessionId).Distinct().Count(),
                TotalObs     = g.Sum(o => o.Count ?? 0),
                BreachCount  = g.Count(o => o.ThresholdCount != null && o.Count > o.ThresholdCount),
            })
            .OrderByDescending(x => x.TotalObs)
            .ToListAsync(ct);

        // Top 3 pests per field
        var fieldIds = fieldStats.Where(f => f.FieldId.HasValue).Select(f => f.FieldId!.Value).ToList();
        var topPestsByField = await obsQ
            .Where(o => o.Session.FieldId != null && !o.IsUnknownPest && o.PestId != null)
            .GroupBy(o => new { o.Session.FieldId, PestName = o.Pest!.CommonName })
            .Select(g => new
            {
                g.Key.FieldId,
                g.Key.PestName,
                PestCount = g.Sum(o => o.Count ?? 0),
            })
            .OrderByDescending(x => x.PestCount)
            .ToListAsync(ct);

        var top3ByField = topPestsByField
            .GroupBy(x => x.FieldId)
            .ToDictionary(
                g => g.Key,
                g => g.Take(3).Select(x => new { x.PestName, x.PestCount }).ToList()
            );

        var result = fieldStats.Select(f => new
        {
            f.FieldId,
            f.FieldName,
            f.FarmName,
            f.SessionCount,
            f.TotalObs,
            AvgObsPerSession = f.SessionCount > 0 ? Math.Round((double)f.TotalObs / f.SessionCount, 1) : 0,
            f.BreachCount,
            TopPests = f.FieldId.HasValue && top3ByField.TryGetValue(f.FieldId, out var tp) ? tp : [],
        });

        return Ok(ApiResponse<object>.Ok(new { fields = result }));
    }

    // ── R3 Sessions Summary ─────────────────────────────────────────────────

    [HttpGet("sessions-summary")]
    public async Task<IActionResult> GetSessionsSummary(
        [FromQuery] string? dateRange,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] Guid? farmId,
        [FromQuery] Guid? fieldId,
        [FromQuery] string? scoutId,
        CancellationToken ct = default)
    {
        var tz = await tzService.GetUserTimeZoneAsync(ct);
        var (start, end) = ResolveRange(dateRange, from, to, tz);
        var now = DateTime.UtcNow;

        var sessQ = db.ScoutingSessions
            .Where(ss => (ss.CompletedAt ?? ss.StartedAt ?? ss.ScheduledDate) >= start
                      && (ss.CompletedAt ?? ss.StartedAt ?? ss.ScheduledDate) <= end);

        if (farmId.HasValue)  sessQ = sessQ.Where(ss => ss.FarmId == farmId || ss.Field!.FarmId == farmId);
        if (fieldId.HasValue) sessQ = sessQ.Where(ss => ss.FieldId == fieldId);
        if (scoutId != null)  sessQ = sessQ.Where(ss => ss.ScouterId == scoutId ||
            (ss.Scouter != null && ss.Scouter.FirstName + " " + ss.Scouter.LastName == scoutId));

        var sessions = await sessQ
            .Select(ss => new
            {
                ss.Id,
                ss.IsPlanned,
                ss.ScheduledDate,
                ss.StartedAt,
                ss.CompletedAt,
                ss.ScouterId,
                ScouterName = ss.Scouter != null ? ss.Scouter.FirstName + " " + ss.Scouter.LastName : null,
                FieldName   = ss.Field != null ? ss.Field.Name : null,
                FarmName    = ss.Farm  != null ? ss.Farm.Name
                            : ss.Field != null && ss.Field.Farm != null ? ss.Field.Farm.Name : null,
                ss.WeatherConditions,
                ss.TemperatureCelsius,
                ObsCount = ss.SessionObservations.Count(),
            })
            .OrderByDescending(ss => ss.CompletedAt ?? ss.StartedAt ?? ss.ScheduledDate)
            .ToListAsync(ct);

        var completed = sessions.Where(s => s.CompletedAt != null).ToList();
        var durations = completed
            .Where(s => s.StartedAt != null)
            .Select(s => (int)(s.CompletedAt!.Value - s.StartedAt!.Value).TotalMinutes)
            .Where(d => d >= 0)
            .ToList();

        var kpis = new
        {
            Total            = sessions.Count,
            Completed        = completed.Count,
            Planned          = sessions.Count(s => s.IsPlanned && s.StartedAt == null && s.CompletedAt == null && s.ScheduledDate > now),
            Overdue          = sessions.Count(s => s.IsPlanned && s.StartedAt == null && s.CompletedAt == null && s.ScheduledDate <= now),
            Active           = sessions.Count(s => s.StartedAt != null && s.CompletedAt == null),
            CompletionRate   = sessions.Count > 0 ? Math.Round(100.0 * completed.Count / sessions.Count, 1) : 0,
            AvgDurationMin   = durations.Count > 0 ? (int)durations.Average() : 0,
            MinDurationMin   = durations.Count > 0 ? durations.Min() : 0,
            MaxDurationMin   = durations.Count > 0 ? durations.Max() : 0,
        };

        var scoutCompliance = sessions
            .Where(s => s.ScouterName != null)
            .GroupBy(s => s.ScouterName!)
            .Select(g => new { ScouterName = g.Key, Total = g.Count(), Completed = g.Count(s => s.CompletedAt != null) })
            .OrderByDescending(x => x.Total)
            .ToList();

        // 8-week stacked
        var eightWeeksAgo = now.AddDays(-56);
        var weeklyStacked = sessions
            .Where(s => (s.CompletedAt ?? s.StartedAt ?? s.ScheduledDate) >= eightWeeksAgo)
            .GroupBy(s => ToLocalWeekStart((s.CompletedAt ?? s.StartedAt ?? s.ScheduledDate)!.Value, tz))
            .Select(g => new
            {
                WeekStart = g.Key,
                Completed = g.Count(s => s.CompletedAt != null),
                Planned   = g.Count(s => s.IsPlanned && s.StartedAt == null && s.CompletedAt == null && s.ScheduledDate > now),
                Overdue   = g.Count(s => s.IsPlanned && s.StartedAt == null && s.CompletedAt == null && s.ScheduledDate <= now),
            })
            .OrderBy(x => x.WeekStart)
            .ToList();

        var sessionTable = sessions.Take(150).Select(s => new
        {
            s.Id,
            s.ScheduledDate,
            s.StartedAt,
            s.CompletedAt,
            s.IsPlanned,
            s.FieldName,
            s.FarmName,
            s.ScouterName,
            s.WeatherConditions,
            s.TemperatureCelsius,
            DurationMin = s.StartedAt != null && s.CompletedAt != null
                ? (int)(s.CompletedAt.Value - s.StartedAt.Value).TotalMinutes : (int?)null,
            s.ObsCount,
        });

        return Ok(ApiResponse<object>.Ok(new { kpis, scoutCompliance, weeklyStacked, sessions = sessionTable }));
    }

    // ── R4 Top Pests ────────────────────────────────────────────────────────

    [HttpGet("top-pests")]
    public async Task<IActionResult> GetTopPests(
        [FromQuery] string? dateRange,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] Guid? farmId,
        [FromQuery] Guid? fieldId,
        [FromQuery] string? scoutId,
        CancellationToken ct = default)
    {
        var tz = await tzService.GetUserTimeZoneAsync(ct);
        var (start, end) = ResolveRange(dateRange, from, to, tz);

        var obsQ = db.SessionObservations
            .Where(o => !o.IsUnknownPest
                     && o.PestId != null
                     && o.Session.CompletedAt >= start
                     && o.Session.CompletedAt <= end);

        if (farmId.HasValue)  obsQ = obsQ.Where(o => o.Session.FarmId == farmId || o.Session.Field!.FarmId == farmId);
        if (fieldId.HasValue) obsQ = obsQ.Where(o => o.Session.FieldId == fieldId);
        if (scoutId != null)  obsQ = obsQ.Where(o => o.Session.ScouterId == scoutId ||
            (o.Session.Scouter != null && o.Session.Scouter.FirstName + " " + o.Session.Scouter.LastName == scoutId));

        var pests = await obsQ
            .GroupBy(o => new { o.PestId, PestName = o.Pest!.CommonName, Category = o.Pest.Category })
            .Select(g => new
            {
                g.Key.PestId,
                g.Key.PestName,
                Category     = g.Key.Category.ToString(),
                TotalCount   = g.Sum(o => o.Count ?? 0),
                FieldCount   = g.Select(o => o.Session.FieldId).Distinct().Count(),
                SessionCount = g.Select(o => o.SessionId).Distinct().Count(),
                BreachCount  = g.Count(o => o.ThresholdCount != null && o.Count > o.ThresholdCount),
                ThresholdCount = g.Max(o => o.ThresholdCount),
            })
            .OrderByDescending(x => x.TotalCount)
            .ToListAsync(ct);

        // Top life stage per pest (client-side from the returned obs would be ideal but we do it server-side)
        var pestIds = pests.Select(p => p.PestId).ToList();
        var lifeStages = await obsQ
            .Where(o => o.LifeStage != null)
            .GroupBy(o => new { o.PestId, o.LifeStage })
            .Select(g => new { g.Key.PestId, g.Key.LifeStage, Count = g.Count() })
            .ToListAsync(ct);

        var topLifeStageByPest = lifeStages
            .GroupBy(x => x.PestId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.Count).First().LifeStage?.ToString());

        var result = pests.Select(p => new
        {
            p.PestId,
            p.PestName,
            p.Category,
            p.TotalCount,
            p.FieldCount,
            p.SessionCount,
            p.BreachCount,
            p.ThresholdCount,
            TopLifeStage = p.PestId.HasValue && topLifeStageByPest.TryGetValue(p.PestId, out var ls) ? ls : null,
        });

        return Ok(ApiResponse<object>.Ok(new { pests = result }));
    }

    // ── R5 Trap Performance ─────────────────────────────────────────────────

    [HttpGet("trap-performance")]
    public async Task<IActionResult> GetTrapPerformance(
        [FromQuery] string? dateRange,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] Guid? farmId,
        [FromQuery] Guid? fieldId,
        [FromQuery] string? scoutId,
        CancellationToken ct = default)
    {
        var tz = await tzService.GetUserTimeZoneAsync(ct);
        var (start, end) = ResolveRange(dateRange, from, to, tz);

        var trapsQ = db.Traps.AsQueryable();
        if (farmId.HasValue)  trapsQ = trapsQ.Where(t => t.Field != null && t.Field.FarmId == farmId);
        if (fieldId.HasValue) trapsQ = trapsQ.Where(t => t.FieldId == fieldId);

        var traps = await trapsQ
            .Select(t => new
            {
                t.Id,
                t.Name,
                TrapType  = t.TrapType != null ? t.TrapType.Name : null,
                t.IsEnabled,
                FieldName = t.Field != null ? t.Field.Name : null,
                FarmName  = t.Field != null && t.Field.Farm != null ? t.Field.Farm.Name : null,
            })
            .ToListAsync(ct);

        var trapIds = traps.Select(t => t.Id).ToList();

        var obsQ = db.SessionObservations
            .Where(o => o.TrapId != null
                     && trapIds.Contains(o.TrapId!.Value)
                     && o.Session.CompletedAt >= start
                     && o.Session.CompletedAt <= end);

        if (scoutId != null) obsQ = obsQ.Where(o => o.Session.ScouterId == scoutId ||
            (o.Session.Scouter != null && o.Session.Scouter.FirstName + " " + o.Session.Scouter.LastName == scoutId));

        var obsStats = await obsQ
            .GroupBy(o => o.TrapId)
            .Select(g => new
            {
                TrapId       = g.Key,
                TotalCatches = g.Sum(o => o.Count ?? 0),
                CheckCount   = g.Select(o => o.SessionId).Distinct().Count(),
                LastChecked  = g.Max(o => o.Session.CompletedAt),
            })
            .ToListAsync(ct);

        var topPestByTrap = await obsQ
            .Where(o => o.PestId != null && !o.IsUnknownPest)
            .GroupBy(o => new { o.TrapId, PestName = o.Pest!.CommonName })
            .Select(g => new { g.Key.TrapId, g.Key.PestName, Count = g.Sum(o => o.Count ?? 0) })
            .ToListAsync(ct);

        var topPestMap = topPestByTrap
            .GroupBy(x => x.TrapId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.Count).First().PestName);

        var catchesByType = await obsQ
            .GroupBy(o => o.Trap != null && o.Trap.TrapType != null ? o.Trap.TrapType.Name : "Unknown")
            .Select(g => new { TrapType = g.Key, TotalCatches = g.Sum(o => o.Count ?? 0) })
            .ToListAsync(ct);

        var now = DateTime.UtcNow;
        var statMap = obsStats.ToDictionary(x => x.TrapId);

        var result = traps.Select(t =>
        {
            statMap.TryGetValue(t.Id, out var s);
            var checks  = s?.CheckCount   ?? 0;
            var catches = s?.TotalCatches ?? 0;
            var last    = s?.LastChecked;
            return new
            {
                t.Id,
                TrapName       = t.Name,
                t.TrapType,
                t.IsEnabled,
                t.FieldName,
                t.FarmName,
                CheckCount     = checks,
                TotalCatches   = catches,
                CatchRate      = checks > 0 ? Math.Round((double)catches / checks, 2) : 0,
                LastChecked    = last,
                DaysSinceCheck = last.HasValue ? (int)(now - last.Value).TotalDays : (int?)null,
                TopPest        = topPestMap.TryGetValue(t.Id, out var tp) ? tp : null,
            };
        });

        return Ok(ApiResponse<object>.Ok(new { traps = result, catchesByType }));
    }

    // ── R6 Scout Productivity ───────────────────────────────────────────────

    [HttpGet("scout-productivity")]
    public async Task<IActionResult> GetScoutProductivity(
        [FromQuery] string? dateRange,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] Guid? farmId,
        [FromQuery] Guid? fieldId,
        [FromQuery] string? scoutId,
        CancellationToken ct = default)
    {
        var tz = await tzService.GetUserTimeZoneAsync(ct);
        var (start, end) = ResolveRange(dateRange, from, to, tz);
        var now = DateTime.UtcNow;

        var sessQ = db.ScoutingSessions
            .Where(ss => (ss.CompletedAt ?? ss.StartedAt ?? ss.ScheduledDate) >= start
                      && (ss.CompletedAt ?? ss.StartedAt ?? ss.ScheduledDate) <= end
                      && ss.ScouterId != null);

        if (farmId.HasValue)  sessQ = sessQ.Where(ss => ss.FarmId == farmId || ss.Field!.FarmId == farmId);
        if (fieldId.HasValue) sessQ = sessQ.Where(ss => ss.FieldId == fieldId);
        if (scoutId != null)  sessQ = sessQ.Where(ss => ss.ScouterId == scoutId ||
            (ss.Scouter != null && ss.Scouter.FirstName + " " + ss.Scouter.LastName == scoutId));

        // Step 1: fetch session rows without touching SessionObservations.
        // Selecting ss.SessionObservations.Sum/Count inside a projection produces one
        // correlated subquery per session row — catastrophic at scale.
        var sessionRows = await sessQ
            .Select(ss => new
            {
                ss.Id,
                ss.ScouterId,
                ScouterName = ss.Scouter != null ? ss.Scouter.FirstName + " " + ss.Scouter.LastName : ss.ScouterId,
                ss.IsPlanned,
                ss.ScheduledDate,
                ss.StartedAt,
                ss.CompletedAt,
                ss.FieldId,
                ss.FarmId,
            })
            .ToListAsync(ct);

        // Step 2: aggregate observations in one query using a subquery instead of
        // Contains(sessionIds) — which emits one SQL parameter per session ID and
        // breaks down at scale (600+ parameters seen in logs).
        var obsAgg = await db.SessionObservations
            .Where(o => sessQ.Select(s => s.Id).Contains(o.SessionId))
            .GroupBy(o => o.SessionId)
            .Select(g => new
            {
                SessionId  = g.Key,
                TotalObs   = g.Sum(o => o.Count ?? 0),
                AlertCount = g.Count(o => o.ThresholdCount != null && o.Count > o.ThresholdCount),
            })
            .ToListAsync(ct);

        var obsMap = obsAgg.ToDictionary(x => x.SessionId);

        var sessions = sessionRows.Select(s =>
        {
            obsMap.TryGetValue(s.Id, out var obs);
            return new
            {
                s.Id,
                s.ScouterId,
                s.ScouterName,
                s.IsPlanned,
                s.ScheduledDate,
                s.StartedAt,
                s.CompletedAt,
                s.FieldId,
                s.FarmId,
                TotalObs   = obs?.TotalObs   ?? 0,
                AlertCount = obs?.AlertCount ?? 0,
            };
        }).ToList();

        var scouts = sessions
            .GroupBy(s => s.ScouterName)
            .Select(g =>
            {
                var completedList = g.Where(s => s.CompletedAt != null).ToList();
                var durations = completedList
                    .Where(s => s.StartedAt != null)
                    .Select(s => (s.CompletedAt!.Value - s.StartedAt!.Value).TotalMinutes)
                    .Where(d => d >= 0)
                    .ToList();
                return new
                {
                    ScouterName      = g.Key,
                    TotalSessions    = g.Count(),
                    Completed        = completedList.Count,
                    CompletionRate   = g.Count() > 0 ? Math.Round(100.0 * completedList.Count / g.Count(), 1) : 0,
                    AvgDurationMin   = durations.Count > 0 ? Math.Round(durations.Average(), 1) : 0,
                    TotalObs         = g.Sum(s => s.TotalObs),
                    ObsPerSession    = completedList.Count > 0 ? Math.Round((double)g.Sum(s => s.TotalObs) / completedList.Count, 1) : 0,
                    FieldCount       = g.Select(s => s.FieldId).Distinct().Count(),
                    AlertCount       = g.Sum(s => s.AlertCount),
                    OverdueCount     = g.Count(s => s.IsPlanned && s.StartedAt == null && s.CompletedAt == null && s.ScheduledDate <= now),
                };
            })
            .OrderByDescending(x => x.TotalSessions)
            .ToList();

        // 8-week activity for top 5 scouts
        var top5 = scouts.Take(5).Select(s => s.ScouterName).ToHashSet();
        var eightWeeksAgo = now.AddDays(-56);
        var weeklyActivity = sessions
            .Where(s => s.CompletedAt >= eightWeeksAgo && top5.Contains(s.ScouterName))
            .GroupBy(s => (ScouterName: s.ScouterName, WeekStart: ToLocalWeekStart(s.CompletedAt!.Value, tz)))
            .Select(g => new { g.Key.ScouterName, g.Key.WeekStart, CompletedCount = g.Count() })
            .OrderBy(x => x.WeekStart)
            .ToList();

        return Ok(ApiResponse<object>.Ok(new { scouts, weeklyActivity }));
    }

    // ── R7 Seasonal Trends ──────────────────────────────────────────────────

    [HttpGet("seasonal-trends")]
    public async Task<IActionResult> GetSeasonalTrends(
        [FromQuery] Guid? farmId,
        [FromQuery] Guid? fieldId,
        [FromQuery] string? scoutId,
        CancellationToken ct = default)
    {
        // Always last 18 months
        var tz = await tzService.GetUserTimeZoneAsync(ct);
        var cutoff = DateTime.UtcNow.AddMonths(-18);

        var sessQ = db.ScoutingSessions
            .Where(ss => ss.CompletedAt >= cutoff);

        if (farmId.HasValue)  sessQ = sessQ.Where(ss => ss.FarmId == farmId || ss.Field!.FarmId == farmId);
        if (fieldId.HasValue) sessQ = sessQ.Where(ss => ss.FieldId == fieldId);
        if (scoutId != null)  sessQ = sessQ.Where(ss => ss.ScouterId == scoutId ||
            (ss.Scouter != null && ss.Scouter.FirstName + " " + ss.Scouter.LastName == scoutId));

        var sessions = await sessQ
            .Select(ss => new
            {
                ss.CompletedAt,
                ss.TemperatureCelsius,
                Obs = ss.SessionObservations
                    .Where(o => !o.IsUnknownPest)
                    .Select(o => new { PestName = o.Pest != null ? o.Pest.CommonName : null, o.Count })
                    .ToList(),
            })
            .ToListAsync(ct);

        var monthMap = sessions
            .GroupBy(s =>
            {
                var local = ToLocalDate(s.CompletedAt!.Value, tz);
                return new DateTime(local.Year, local.Month, 1);
            })
            .Select(g =>
            {
                var temps     = g.Where(s => s.TemperatureCelsius.HasValue).Select(s => s.TemperatureCelsius!.Value).ToList();
                var allObs    = g.SelectMany(s => s.Obs).ToList();
                var pestTotals = allObs.Where(o => o.PestName != null)
                    .GroupBy(o => o.PestName!)
                    .Select(pg => new { PestName = pg.Key, PestCount = pg.Sum(o => o.Count ?? 0) })
                    .OrderByDescending(x => x.PestCount)
                    .Take(3)
                    .ToList();

                return new
                {
                    MonthKey      = g.Key.ToString("yyyy-MM"),
                    MonthLabel    = g.Key.ToString("MMM yyyy"),
                    SessionCount  = g.Count(),
                    TotalObs      = allObs.Sum(o => o.Count ?? 0),
                    AvgTempCelsius = temps.Count > 0 ? (double?)Math.Round(temps.Average(), 1) : null,
                    TopPests      = pestTotals,
                };
            })
            .OrderBy(m => m.MonthKey)
            .ToList();

        return Ok(ApiResponse<object>.Ok(new { months = monthMap }));
    }

    // ── R8 Unknown Pests ────────────────────────────────────────────────────

    [HttpGet("unknown-pests")]
    public async Task<IActionResult> GetUnknownPests(
        [FromQuery] string? dateRange,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] Guid? farmId,
        [FromQuery] Guid? fieldId,
        [FromQuery] string? scoutId,
        CancellationToken ct = default)
    {
        var tz = await tzService.GetUserTimeZoneAsync(ct);
        var (start, end) = ResolveRange(dateRange, from, to, tz);

        var obsQ = db.SessionObservations
            .Where(o => o.IsUnknownPest
                     && (o.Session.CompletedAt ?? o.Session.StartedAt) >= start
                     && (o.Session.CompletedAt ?? o.Session.StartedAt) <= end);

        if (farmId.HasValue)  obsQ = obsQ.Where(o => o.Session.FarmId == farmId || o.Session.Field!.FarmId == farmId);
        if (fieldId.HasValue) obsQ = obsQ.Where(o => o.Session.FieldId == fieldId);
        if (scoutId != null)  obsQ = obsQ.Where(o => o.Session.ScouterId == scoutId ||
            (o.Session.Scouter != null && o.Session.Scouter.FirstName + " " + o.Session.Scouter.LastName == scoutId));

        var items = await obsQ
            .OrderByDescending(o => o.Session.CompletedAt ?? o.Session.StartedAt)
            .Select(o => new
            {
                ObservationId = o.Id,
                CompletedAt   = o.Session.CompletedAt ?? o.Session.StartedAt,
                FieldName     = o.Session.Field != null ? o.Session.Field.Name : null,
                FarmName      = o.Session.Farm  != null ? o.Session.Farm.Name
                              : o.Session.Field != null && o.Session.Field.Farm != null ? o.Session.Field.Farm.Name : null,
                ScouterName   = o.Session.Scouter != null
                    ? o.Session.Scouter.FirstName + " " + o.Session.Scouter.LastName : null,
                o.Count,
                o.LifeStage,
                o.Notes,
                o.PhotoUrlsJson,
                HasPhotos = o.PhotoUrlsJson != null && o.PhotoUrlsJson.Length > 2,
            })
            .ToListAsync(ct);

        var kpis = new
        {
            Total          = items.Count,
            WithPhotos     = items.Count(i => i.HasPhotos),
            WithNotes      = items.Count(i => !string.IsNullOrWhiteSpace(i.Notes)),
            FieldsAffected = items.Select(i => i.FieldName).Distinct().Count(),
        };

        var result = items.Select(i => new
        {
            i.ObservationId,
            i.CompletedAt,
            i.FieldName,
            i.FarmName,
            i.ScouterName,
            i.Count,
            LifeStage  = i.LifeStage?.ToString(),
            i.Notes,
            PhotoUrls  = i.PhotoUrlsJson != null
                ? JsonSerializer.Deserialize<List<string>>(i.PhotoUrlsJson) ?? []
                : (List<string>)[],
            IsPriority = (i.Count ?? 0) >= 5 || i.HasPhotos,
        });

        var eightWeeksAgo = DateTime.UtcNow.AddDays(-56);
        var weeklyTrend = items
            .Where(i => i.CompletedAt >= eightWeeksAgo)
            .GroupBy(i => ToLocalWeekStart(i.CompletedAt!.Value, tz))
            .Select(g => new { WeekStart = g.Key, UnknownCount = g.Count() })
            .OrderBy(x => x.WeekStart)
            .ToList();

        return Ok(ApiResponse<object>.Ok(new { kpis, items = result, weeklyTrend }));
    }

    // ── R9 Field Coverage ───────────────────────────────────────────────────

    [HttpGet("field-coverage")]
    public async Task<IActionResult> GetFieldCoverage(
        [FromQuery] Guid? farmId,
        [FromQuery] Guid? fieldId,
        [FromQuery] string? scoutId,
        CancellationToken ct = default)
    {
        var tz         = await tzService.GetUserTimeZoneAsync(ct);
        var now        = DateTime.UtcNow;
        var nowLocal   = TimeZoneInfo.ConvertTimeFromUtc(now, tz);
        // "This month" = the user's local calendar month, as a UTC boundary instant.
        var monthStart = LocalToUtc(new DateTime(nowLocal.Year, nowLocal.Month, 1, 0, 0, 0), tz);
        const int TargetPerMonth = 4;

        var fieldsQ = db.Fields.AsQueryable();
        if (farmId.HasValue)  fieldsQ = fieldsQ.Where(f => f.FarmId == farmId);
        if (fieldId.HasValue) fieldsQ = fieldsQ.Where(f => f.Id == fieldId);

        var fields = await fieldsQ
            .Select(f => new
            {
                f.Id,
                f.Name,
                FarmName = f.Farm != null ? f.Farm.Name : null,
            })
            .ToListAsync(ct);

        var fieldIds = fields.Select(f => f.Id).ToList();

        var sessQ = db.ScoutingSessions
            .Where(ss => ss.FieldId != null
                      && fieldIds.Contains(ss.FieldId!.Value)
                      && ss.CompletedAt != null);

        if (scoutId != null) sessQ = sessQ.Where(ss => ss.ScouterId == scoutId ||
            (ss.Scouter != null && ss.Scouter.FirstName + " " + ss.Scouter.LastName == scoutId));

        var sessions = await sessQ
            .Select(ss => new
            {
                ss.FieldId,
                ss.CompletedAt,
            })
            .ToListAsync(ct);

        // Top pest per field
        var topPests = await db.SessionObservations
            .Where(o => o.Session.FieldId != null
                     && fieldIds.Contains(o.Session.FieldId!.Value)
                     && !o.IsUnknownPest
                     && o.PestId != null)
            .GroupBy(o => new { o.Session.FieldId, PestName = o.Pest!.CommonName })
            .Select(g => new { g.Key.FieldId, g.Key.PestName, Count = g.Sum(o => o.Count ?? 0) })
            .ToListAsync(ct);

        var topPestMap = topPests
            .GroupBy(x => x.FieldId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.Count).First().PestName);

        var sessByField = sessions.GroupBy(s => s.FieldId).ToDictionary(g => g.Key, g => g.ToList());

        var result = fields.Select(f =>
        {
            var allSess  = sessByField.TryGetValue(f.Id, out var sl) ? sl : [];
            var thisMo   = allSess.Count(s => s.CompletedAt >= monthStart);
            var last     = allSess.MaxBy(s => s.CompletedAt)?.CompletedAt;
            var pct      = Math.Min(100, (int)Math.Round(100.0 * thisMo / TargetPerMonth));
            return new
            {
                f.Id,
                f.Name,
                f.FarmName,
                SessionsThisMonth  = thisMo,
                TotalSessions      = allSess.Count,
                CoveragePct        = pct,
                LastSessionAt      = last,
                DaysSinceLastSession = last.HasValue ? (int)(now - last.Value).TotalDays : (int?)null,
                TopPest            = topPestMap.TryGetValue(f.Id, out var tp) ? tp : null,
            };
        })
        .OrderBy(f => f.CoveragePct)
        .ToList();

        return Ok(ApiResponse<object>.Ok(new { targetPerMonth = TargetPerMonth, fields = result }));
    }

    // ── R10 Billing ─────────────────────────────────────────────────────────

    [HttpGet("billing")]
    public async Task<IActionResult> GetBilling(CancellationToken ct = default)
    {
        var snapshots = await db.BillingSnapshots
            .OrderByDescending(b => b.BillingMonth)
            .Select(b => new
            {
                b.BillingMonth,
                b.ActivePointCount,
                b.AmountCents,
                b.Status,
            })
            .ToListAsync(ct);

        var activeTraps = await db.Traps
            .CountAsync(t => t.IsEnabled, ct);

        return Ok(ApiResponse<object>.Ok(new { activeTraps, snapshots }));
    }
}
