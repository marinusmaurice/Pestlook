using Asp.Versioning;
using AutoMapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using Pestlook.WebAPI.Data;
using Pestlook.WebAPI.Domain.Entities;
using Pestlook.WebAPI.Domain.Enums;
using Pestlook.WebAPI.DTOs.Common;
using Pestlook.WebAPI.DTOs.ScoutingSessions;
using Pestlook.WebAPI.Infrastructure;
using Pestlook.WebAPI.Infrastructure.Services.Interfaces;

namespace Pestlook.WebAPI.Controllers.v1;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/scouting-sessions")]
[Authorize]
public sealed class ScoutingSessionsController(
    ApplicationDbContext db,
    ITenantContext tenantContext,
    ICurrentUserService currentUserService,
    IMapper mapper,
    ILogger<ScoutingSessionsController> logger) : ControllerBase
{
    private IQueryable<ScoutingSession> FullQuery() =>
        db.ScoutingSessions
          .Include(ss => ss.Scouter)
          .Include(ss => ss.CreatedBy)
          .Include(ss => ss.UpdatedBy)
          .Include(ss => ss.Farm)
          .Include(ss => ss.Field).ThenInclude(f => f!.Farm)
          .Include(ss => ss.SessionObservations).ThenInclude(so => so.Trap)
          .Include(ss => ss.SessionObservations).ThenInclude(so => so.Pest)
          .Include(ss => ss.SessionObservations).ThenInclude(so => so.CreatedBy)
          .Include(ss => ss.SessionObservations).ThenInclude(so => so.UpdatedBy)
          .AsSplitQuery();

    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<List<ScoutingSessionResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        // Single aggregation query instead of 3 correlated subqueries per row
        var obsCounts = await db.SessionObservations
            .GroupBy(o => new { o.SessionId, o.ObservationType })
            .Select(g => new { g.Key.SessionId, g.Key.ObservationType, Count = g.Count() })
            .ToListAsync(ct);

        var obsLookup = obsCounts
            .GroupBy(x => x.SessionId)
            .ToDictionary(
                g => g.Key,
                g => (
                    Total: g.Sum(x => x.Count),
                    Trap:  g.Where(x => x.ObservationType == ObservationType.Trap).Sum(x => x.Count),
                    AdHoc: g.Where(x => x.ObservationType == ObservationType.AdHoc).Sum(x => x.Count)
                ));

        var projected = await db.ScoutingSessions
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
                FieldFarmId = ss.Field != null ? (Guid?)ss.Field.FarmId : null,
                FieldName   = ss.Field != null ? ss.Field.Name : null,
                FarmName    = ss.Farm  != null ? ss.Farm.Name
                            : ss.Field != null && ss.Field.Farm != null ? ss.Field.Farm.Name : null,
                ScouterName    = ss.Scouter   != null ? ss.Scouter.FirstName   + " " + ss.Scouter.LastName   : null,
                CreatedByName  = ss.CreatedBy != null ? ss.CreatedBy.FirstName + " " + ss.CreatedBy.LastName : null,
                UpdatedByName  = ss.UpdatedBy != null ? ss.UpdatedBy.FirstName + " " + ss.UpdatedBy.LastName : null
            })
            .OrderByDescending(ss => ss.CreatedAt)
            .ToListAsync(ct);

        var sessions = projected
            .Select(p =>
            {
                var counts = obsLookup.TryGetValue(p.Id, out var c) ? c : (Total: 0, Trap: 0, AdHoc: 0);
                return new ScoutingSessionResponse(
                    p.Id, p.TenantId, p.ScouterId, p.ScouterName, p.IsPlanned,
                    p.ScheduledDate, p.StartedAt, p.CompletedAt, p.WeatherConditions,
                    p.TemperatureCelsius, p.Notes, p.CreatedAt, p.FieldId,
                    p.FarmId ?? p.FieldFarmId, p.FieldName, p.FarmName,
                    counts.Total, counts.Trap, counts.AdHoc, [], p.CreatedByName, p.UpdatedByName);
            })
            .ToList();

        return Ok(ApiResponse<List<ScoutingSessionResponse>>.Ok(sessions));
    }

    /// <summary>All planned sessions with full observation lists — one call replaces N+1 mobile sync pattern.</summary>
    [HttpGet("planned")]
    [ProducesResponseType(typeof(ApiResponse<List<ScoutingSessionResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPlanned(CancellationToken ct)
    {
        var projected = await db.ScoutingSessions
            .Where(ss => ss.IsPlanned)
            .OrderBy(ss => ss.ScheduledDate)
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
                FieldFarmId    = ss.Field != null ? (Guid?)ss.Field.FarmId : null,
                FieldName      = ss.Field != null ? ss.Field.Name : null,
                FarmName       = ss.Farm  != null ? ss.Farm.Name
                               : ss.Field != null && ss.Field.Farm != null ? ss.Field.Farm.Name : null,
                ScouterName    = ss.Scouter   != null ? ss.Scouter.FirstName   + " " + ss.Scouter.LastName   : null,
                CreatedByName  = ss.CreatedBy != null ? ss.CreatedBy.FirstName + " " + ss.CreatedBy.LastName : null,
                UpdatedByName  = ss.UpdatedBy != null ? ss.UpdatedBy.FirstName + " " + ss.UpdatedBy.LastName : null,
                Observations   = ss.SessionObservations.Select(o => new
                {
                    o.Id,
                    o.ObservationType,
                    o.IsPlanned,
                    o.TrapId,
                    TrapName       = o.Trap  != null ? o.Trap.Name  : null,
                    o.PestId,
                    PestName       = o.Pest  != null ? o.Pest.CommonName : null,
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
                    CreatedByName  = o.CreatedBy != null ? o.CreatedBy.FirstName + " " + o.CreatedBy.LastName : null,
                    UpdatedByName  = o.UpdatedBy != null ? o.UpdatedBy.FirstName + " " + o.UpdatedBy.LastName : null
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
                    ? System.Text.Json.JsonSerializer.Deserialize<List<string>>(o.PhotoUrlsJson) ?? []
                    : [],
                o.ObservationGroupId, o.CreatedByName, o.UpdatedByName)).ToList(),
            p.CreatedByName, p.UpdatedByName)).ToList();

        return Ok(ApiResponse<List<ScoutingSessionResponse>>.Ok(sessions));
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<ScoutingSessionResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var session = await FullQuery().FirstOrDefaultAsync(ss => ss.Id == id, ct);
        if (session is null) return NotFound(ApiResponse<object>.Fail("Scouting session not found."));
        return Ok(ApiResponse<ScoutingSessionResponse>.Ok(mapper.Map<ScoutingSessionResponse>(session)));
    }

    /// <summary>Start an unplanned (ad-hoc) session — typically called from the mobile app.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<ScoutingSessionResponse>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Start([FromBody] StartScoutingSessionRequest request, CancellationToken ct)
    {
        if (tenantContext.TenantId is null)
            return BadRequest(ApiResponse<object>.Fail("Tenant context is required."));

        var session = new ScoutingSession
        {
            TenantId = tenantContext.TenantId.Value,
            ScouterId = currentUserService.UserId!,
            IsPlanned = false,
            StartedAt = DateTime.UtcNow,
            FieldId = request.FieldId,
            WeatherConditions = request.WeatherConditions,
            TemperatureCelsius = request.TemperatureCelsius,
            Notes = request.Notes
        };
        db.ScoutingSessions.Add(session);
        await db.SaveChangesAsync(ct);

        var created = await FullQuery().FirstAsync(ss => ss.Id == session.Id, ct);
        return CreatedAtAction(nameof(GetById), new { id = session.Id },
            ApiResponse<ScoutingSessionResponse>.Ok(mapper.Map<ScoutingSessionResponse>(created), "Scouting session started."));
    }

    /// <summary>Create a planned session from the web UI.</summary>
    [HttpPost("planned")]
    [ProducesResponseType(typeof(ApiResponse<ScoutingSessionResponse>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreatePlanned([FromBody] CreatePlannedSessionRequest request, CancellationToken ct)
    {
        if (tenantContext.TenantId is null)
            return BadRequest(ApiResponse<object>.Fail("Tenant context is required."));

        var tenantId = tenantContext.TenantId.Value;

        var session = new ScoutingSession
        {
            TenantId = tenantId,
            ScouterId = request.ScouterId,
            IsPlanned = true,
            ScheduledDate = request.ScheduledDate,
            FieldId = request.FieldId,
            FarmId = request.FarmId,
            WeatherConditions = request.WeatherConditions,
            TemperatureCelsius = request.TemperatureCelsius,
            Notes = request.Notes
        };

        if (request.Observations is { Count: > 0 })
        {
            var pestIds = request.Observations.Where(o => o.PestId.HasValue).Select(o => o.PestId!.Value).Distinct().ToList();
            var pestThresholds = pestIds.Count > 0
                ? await db.Pests.Where(p => pestIds.Contains(p.Id)).ToDictionaryAsync(p => p.Id, p => p.ThresholdCount, ct)
                : new Dictionary<Guid, int?>();

            var sortOffset = 0;
            for (var i = 0; i < request.Observations.Count; i++)
            {
                var item = request.Observations[i];
                var groupId = Guid.NewGuid();
                var repeatCount = Math.Max(1, item.RepeatCount);
                var photoJson = item.PhotoUrls is { Count: > 0 } ? JsonSerializer.Serialize(item.PhotoUrls) : null;
                var threshold = (item.CaptureMode == CaptureMode.Count && item.PestId.HasValue && pestThresholds.TryGetValue(item.PestId.Value, out var t)) ? t : null;

                for (var r = 0; r < repeatCount; r++)
                {
                    session.SessionObservations.Add(new SessionObservation
                    {
                        TenantId = tenantId,
                        ObservationType = item.ObservationType,
                        IsPlanned = true,
                        TrapId = item.TrapId,
                        PestId = item.PestId,
                        CaptureMode = item.CaptureMode,
                        Count = item.Count,
                        IsPresent = item.IsPresent,
                        Latitude = item.Latitude,
                        Longitude = item.Longitude,
                        IsUnknownPest = item.IsUnknownPest,
                        Notes = item.Notes,
                        ThresholdCount = threshold,
                        LifeStage = item.LifeStage,
                        PhotoUrlsJson = photoJson,
                        SortOrder = sortOffset + r,
                        ObservationGroupId = groupId
                    });
                }
                sortOffset += repeatCount;
            }
        }

        db.ScoutingSessions.Add(session);
        await db.SaveChangesAsync(ct);

        var created = await FullQuery().FirstAsync(ss => ss.Id == session.Id, ct);
        return CreatedAtAction(nameof(GetById), new { id = session.Id },
            ApiResponse<ScoutingSessionResponse>.Ok(mapper.Map<ScoutingSessionResponse>(created), "Planned session created."));
    }

    /// <summary>Update a planned session.</summary>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<ScoutingSessionResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdatePlanned(Guid id, [FromBody] UpdatePlannedSessionRequest request, CancellationToken ct)
    {
        logger.LogDebug("[UpdatePlanned] START — sessionId={SessionId}, incomingObsCount={Count}",
            id, request.Observations?.Count ?? 0);

        if (tenantContext.TenantId is null)
            return BadRequest(ApiResponse<object>.Fail("Tenant context is required."));

        var session = await FullQuery().FirstOrDefaultAsync(ss => ss.Id == id, ct);
        if (session is null) return NotFound(ApiResponse<object>.Fail("Scouting session not found."));
        if (!session.IsPlanned) return BadRequest(ApiResponse<object>.Fail("Only planned sessions can be updated this way."));
        if (session.CompletedAt.HasValue) return BadRequest(ApiResponse<object>.Fail("Cannot update a completed session."));

        var tenantId = tenantContext.TenantId.Value;

        session.ScouterId = request.ScouterId;
        session.ScheduledDate = request.ScheduledDate;
        session.FieldId = request.FieldId;
        session.FarmId = request.FarmId;
        if (request.WeatherConditions is not null) session.WeatherConditions = request.WeatherConditions;
        if (request.TemperatureCelsius is not null) session.TemperatureCelsius = request.TemperatureCelsius;
        if (request.Notes is not null) session.Notes = request.Notes;


        logger.LogDebug("[UpdatePlanned] PRE-SAVE observation IDs for session {SessionId}: [{Ids}]",
                id, string.Join(", ", session.SessionObservations.Select(o => o.Id)));


        if (request.Observations is not null)
        {
            var existingPlanned = session.SessionObservations.Where(o => o.IsPlanned).ToList();

            // Group existing planned observations by their ObservationGroupId
            var existingByGroup = existingPlanned
                .Where(o => o.ObservationGroupId.HasValue)
                .GroupBy(o => o.ObservationGroupId!.Value)
                .ToDictionary(g => g.Key, g => g.OrderBy(o => o.SortOrder).ToList());

            // Hard-delete any legacy ungrouped observations — they'll be recreated as groups
            var ungrouped = existingPlanned.Where(o => !o.ObservationGroupId.HasValue).ToList();
            db.SessionObservations.RemoveRange(ungrouped);

            // Hard-delete groups that are no longer present in the incoming payload
            var incomingGroupIds = request.Observations
                .Where(o => o.ObservationGroupId.HasValue)
                .Select(o => o.ObservationGroupId!.Value)
                .ToHashSet();
            foreach (var (groupId, groupRecords) in existingByGroup)
            {
                if (!incomingGroupIds.Contains(groupId))
                    db.SessionObservations.RemoveRange(groupRecords);
            }

            var allPestIds = request.Observations.Where(o => o.PestId.HasValue).Select(o => o.PestId!.Value).Distinct().ToList();
            var pestThresholds = allPestIds.Count > 0
                ? await db.Pests.Where(p => allPestIds.Contains(p.Id)).ToDictionaryAsync(p => p.Id, p => p.ThresholdCount, ct)
                : new Dictionary<Guid, int?>();

            var sortOffset = 0;
            for (var i = 0; i < request.Observations.Count; i++)
            {
                var item = request.Observations[i];
                var desired = Math.Max(1, item.RepeatCount);
                var photoJson = item.PhotoUrls is { Count: > 0 } ? JsonSerializer.Serialize(item.PhotoUrls) : null;
                var threshold = (item.CaptureMode == CaptureMode.Count && item.PestId.HasValue && pestThresholds.TryGetValue(item.PestId.Value, out var t)) ? t : null;

                if (item.ObservationGroupId.HasValue &&
                    existingByGroup.TryGetValue(item.ObservationGroupId.Value, out var existingGroup))
                {
                    // If capture mode changed, wipe the whole group and recreate from scratch
                    var existingCaptureMode = existingGroup.First().CaptureMode;
                    if (existingCaptureMode != item.CaptureMode)
                    {
                        db.SessionObservations.RemoveRange(existingGroup);
                        var replacedGroupId = item.ObservationGroupId.Value;
                        for (var r = 0; r < desired; r++)
                        {
                            db.SessionObservations.Add(new SessionObservation
                            {
                                SessionId = id,
                                TenantId = tenantId,
                                ObservationType = item.ObservationType,
                                IsPlanned = true,
                                TrapId = item.TrapId,
                                PestId = item.PestId,
                                CaptureMode = item.CaptureMode,
                                Count = item.Count,
                                IsPresent = item.IsPresent,
                                Latitude = item.Latitude,
                                Longitude = item.Longitude,
                                IsUnknownPest = item.IsUnknownPest,
                                Notes = item.Notes,
                                ThresholdCount = threshold,
                                LifeStage = item.LifeStage,
                                PhotoUrlsJson = photoJson,
                                ObservationGroupId = replacedGroupId,
                                SortOrder = sortOffset + r
                            });
                        }
                    }
                    else
                    {
                        // Trim excess records from the tail of the group
                        if (existingGroup.Count > desired)
                        {
                            db.SessionObservations.RemoveRange(existingGroup.Skip(desired).ToList());
                            existingGroup = existingGroup.Take(desired).ToList();
                        }

                        // Append new records when the desired count grew
                        if (existingGroup.Count < desired)
                        {
                            var toAdd = desired - existingGroup.Count;
                            for (var r = 0; r < toAdd; r++)
                            {
                                db.SessionObservations.Add(new SessionObservation
                                {
                                    SessionId = id,
                                    TenantId = tenantId,
                                    ObservationType = item.ObservationType,
                                    IsPlanned = true,
                                    TrapId = item.TrapId,
                                    PestId = item.PestId,
                                    CaptureMode = item.CaptureMode,
                                    Count = item.Count,
                                    IsPresent = item.IsPresent,
                                    Latitude = item.Latitude,
                                    Longitude = item.Longitude,
                                    IsUnknownPest = item.IsUnknownPest,
                                    Notes = item.Notes,
                                    ThresholdCount = threshold,
                                    LifeStage = item.LifeStage,
                                    PhotoUrlsJson = photoJson,
                                    ObservationGroupId = item.ObservationGroupId,
                                    SortOrder = sortOffset + existingGroup.Count + r
                                });
                            }
                        }

                        // Update metadata on all surviving records
                        for (var r = 0; r < existingGroup.Count; r++)
                        {
                            var obs = existingGroup[r];
                            obs.ObservationType = item.ObservationType;
                            obs.TrapId = item.TrapId;
                            obs.PestId = item.PestId;
                            obs.CaptureMode = item.CaptureMode;
                            obs.Count = item.Count;
                            obs.IsPresent = item.IsPresent;
                            obs.Latitude = item.Latitude;
                            obs.Longitude = item.Longitude;
                            obs.IsUnknownPest = item.IsUnknownPest;
                            obs.Notes = item.Notes;
                            obs.ThresholdCount = threshold;
                            obs.LifeStage = item.LifeStage;
                            obs.PhotoUrlsJson = photoJson;
                            obs.SortOrder = sortOffset + r;
                        }
                    }
                }
                else
                {
                    // New group — create desired number of records sharing a fresh GroupId
                    var groupId = Guid.NewGuid();
                    for (var r = 0; r < desired; r++)
                    {
                        db.SessionObservations.Add(new SessionObservation
                        {
                            SessionId = id,
                            TenantId = tenantId,
                            ObservationType = item.ObservationType,
                            IsPlanned = true,
                            TrapId = item.TrapId,
                            PestId = item.PestId,
                            CaptureMode = item.CaptureMode,
                            Count = item.Count,
                            IsPresent = item.IsPresent,
                            Latitude = item.Latitude,
                            Longitude = item.Longitude,
                            IsUnknownPest = item.IsUnknownPest,
                            Notes = item.Notes,
                            ThresholdCount = threshold,
                            LifeStage = item.LifeStage,
                            PhotoUrlsJson = photoJson,
                            ObservationGroupId = groupId,
                            SortOrder = sortOffset + r
                        });
                    }
                }
                sortOffset += desired;
            }
        }

        try
        {
            
            await db.SaveChangesAsync(ct);

            logger.LogDebug("[UpdatePlanned] POST-SAVE observation IDs for session {SessionId}: [{Ids}]",
                id, string.Join(", ", session.SessionObservations.Select(o => o.Id)));

            logger.LogDebug("[UpdatePlanned] SaveChangesAsync succeeded for session {SessionId}", id);
        }
        catch (Microsoft.EntityFrameworkCore.DbUpdateException ex)
        {
            logger.LogError(ex,
                "[UpdatePlanned] DbUpdateException for session {SessionId} — inner: {Inner}",
                id, ex.InnerException?.Message);
            foreach (var entry in ex.Entries)
                logger.LogError("[UpdatePlanned]   Failed entry: EntityType={Type} State={State} Keys={Keys}",
                    entry.Metadata.ClrType.Name,
                    entry.State,
                    string.Join(", ", entry.Metadata.FindPrimaryKey()!.Properties
                        .Select(p => $"{p.Name}={entry.Property(p.Name).CurrentValue}")));
            throw;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[UpdatePlanned] Unexpected error for session {SessionId}", id);
            throw;
        }

        var updated = await FullQuery().FirstAsync(ss => ss.Id == session.Id, ct);
        return Ok(ApiResponse<ScoutingSessionResponse>.Ok(mapper.Map<ScoutingSessionResponse>(updated), "Session updated."));
    }

    /// <summary>Mark a session as completed.</summary>
    [HttpPatch("{id:guid}/complete")]
    [ProducesResponseType(typeof(ApiResponse<ScoutingSessionResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Complete(Guid id, [FromBody] CompleteScoutingSessionRequest request, CancellationToken ct)
    {
        var session = await FullQuery().FirstOrDefaultAsync(ss => ss.Id == id, ct);
        if (session is null) return NotFound(ApiResponse<object>.Fail("Scouting session not found."));
        if (session.CompletedAt.HasValue) return BadRequest(ApiResponse<object>.Fail("Session already completed."));

        session.CompletedAt = DateTime.UtcNow;
        if (request.StartedAt.HasValue && session.StartedAt is null) session.StartedAt = request.StartedAt;
        if (request.WeatherConditions is not null) session.WeatherConditions = request.WeatherConditions;
        if (request.TemperatureCelsius is not null) session.TemperatureCelsius = request.TemperatureCelsius;
        if (request.Notes is not null) session.Notes = request.Notes;
        await db.SaveChangesAsync(ct);

        return Ok(ApiResponse<ScoutingSessionResponse>.Ok(mapper.Map<ScoutingSessionResponse>(session), "Session completed."));
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var session = await db.ScoutingSessions.FirstOrDefaultAsync(ss => ss.Id == id, ct);
        if (session is null) return NotFound(ApiResponse<object>.Fail("Scouting session not found."));

        db.ScoutingSessions.Remove(session);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    // ── Individual observation CRUD (for the on-the-fly scout flow) ───────────

    /// <summary>Add a single observation to a session.</summary>
    [HttpPost("{sessionId:guid}/observations")]
    [ProducesResponseType(typeof(ApiResponse<SessionObservationResponse>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AddObservation(Guid sessionId, [FromBody] SessionObservationItem request, CancellationToken ct)
    {
        if (tenantContext.TenantId is null)
            return BadRequest(ApiResponse<object>.Fail("Tenant context is required."));

        var session = await db.ScoutingSessions.FirstOrDefaultAsync(ss => ss.Id == sessionId, ct);
        if (session is null) return NotFound(ApiResponse<object>.Fail("Scouting session not found."));
        if (session.CompletedAt.HasValue) return BadRequest(ApiResponse<object>.Fail("Cannot add observations to a completed session."));

        if (request.ObservationType == ObservationType.Trap && request.TrapId is null)
            return BadRequest(ApiResponse<object>.Fail("TrapId is required for Trap observations."));

        var tenantId = tenantContext.TenantId.Value;
        var nextSort = await db.SessionObservations
            .Where(so => so.SessionId == sessionId)
            .MaxAsync(so => (int?)so.SortOrder, ct) ?? -1;

        int? thresholdCount = null;
        if (request.PestId.HasValue && request.CaptureMode == CaptureMode.Count)
            thresholdCount = await db.Pests
                .Where(p => p.Id == request.PestId.Value)
                .Select(p => p.ThresholdCount)
                .FirstOrDefaultAsync(ct);

        var repeatCount = Math.Max(1, request.RepeatCount);
        var groupId = request.ObservationGroupId ?? Guid.NewGuid();
        var photoJson = request.PhotoUrls is { Count: > 0 } ? JsonSerializer.Serialize(request.PhotoUrls) : null;
        var firstId = Guid.Empty;

        for (var r = 0; r < repeatCount; r++)
        {
            var obs = new SessionObservation
            {
                TenantId = tenantId,
                SessionId = sessionId,
                ObservationType = request.ObservationType,
                IsPlanned = request.IsPlanned,
                TrapId = request.TrapId,
                PestId = request.PestId,
                CaptureMode = request.CaptureMode,
                Count = request.Count,
                IsPresent = request.IsPresent,
                Latitude = request.Latitude,
                Longitude = request.Longitude,
                IsUnknownPest = request.IsUnknownPest,
                Notes = request.Notes,
                ThresholdCount = thresholdCount,
                LifeStage = request.LifeStage,
                PhotoUrlsJson = photoJson,
                SortOrder = nextSort + 1 + r,
                ObservationGroupId = groupId
            };
            db.SessionObservations.Add(obs);
            if (r == 0) firstId = obs.Id;
        }

        await db.SaveChangesAsync(ct);

        var created = await db.SessionObservations
            .Include(so => so.Trap)
            .Include(so => so.Pest)
            .FirstAsync(so => so.Id == firstId, ct);

        return CreatedAtAction(nameof(GetById), new { id = sessionId },
            ApiResponse<SessionObservationResponse>.Ok(mapper.Map<SessionObservationResponse>(created), "Observation added."));
    }

    /// <summary>Update a single observation on a session.</summary>
    [HttpPut("{sessionId:guid}/observations/{observationId:guid}")]
    [ProducesResponseType(typeof(ApiResponse<SessionObservationResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateObservation(Guid sessionId, Guid observationId, [FromBody] SessionObservationItem request, CancellationToken ct)
    {
        var obs = await db.SessionObservations
            .Include(so => so.Trap)
            .Include(so => so.Pest)
            .FirstOrDefaultAsync(so => so.Id == observationId && so.SessionId == sessionId, ct);
        if (obs is null) return NotFound(ApiResponse<object>.Fail("Observation not found."));

        var session = await db.ScoutingSessions.FirstOrDefaultAsync(ss => ss.Id == sessionId, ct);
        if (session is not null && session.CompletedAt.HasValue)
            return BadRequest(ApiResponse<object>.Fail("Cannot update observations on a completed session."));

        if (request.ObservationType == ObservationType.Trap && request.TrapId is null)
            return BadRequest(ApiResponse<object>.Fail("TrapId is required for Trap observations."));

        obs.ObservationType = request.ObservationType;
        obs.TrapId = request.TrapId;
        obs.PestId = request.PestId;
        obs.ThresholdCount = (request.PestId.HasValue && request.CaptureMode == CaptureMode.Count)
            ? await db.Pests.Where(p => p.Id == request.PestId.Value).Select(p => p.ThresholdCount).FirstOrDefaultAsync(ct)
            : null;
        obs.CaptureMode = request.CaptureMode;
        obs.Count = request.Count;
        obs.IsPresent = request.IsPresent;
        obs.Latitude = request.Latitude;
        obs.Longitude = request.Longitude;
        obs.IsUnknownPest = request.IsUnknownPest;
        obs.Notes = request.Notes;
        obs.LifeStage = request.LifeStage;
        obs.PhotoUrlsJson = request.PhotoUrls is { Count: > 0 } ? JsonSerializer.Serialize(request.PhotoUrls) : null;

        await db.SaveChangesAsync(ct);

        return Ok(ApiResponse<SessionObservationResponse>.Ok(mapper.Map<SessionObservationResponse>(obs), "Observation updated."));
    }

    /// <summary>Delete a single observation from a session.</summary>
    [HttpDelete("{sessionId:guid}/observations/{observationId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteObservation(Guid sessionId, Guid observationId, CancellationToken ct)
    {
        var obs = await db.SessionObservations
            .FirstOrDefaultAsync(so => so.Id == observationId && so.SessionId == sessionId, ct);
        if (obs is null) return NotFound(ApiResponse<object>.Fail("Observation not found."));

        db.SessionObservations.Remove(obs);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
