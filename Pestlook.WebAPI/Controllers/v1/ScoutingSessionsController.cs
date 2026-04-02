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
          .Include(ss => ss.SessionObservations).ThenInclude(so => so.Trap)
          .Include(ss => ss.SessionObservations).ThenInclude(so => so.Pest);

    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<List<ScoutingSessionResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var sessions = await FullQuery()
            .OrderByDescending(ss => ss.CreatedAt)
            .ToListAsync(ct);
        return Ok(ApiResponse<List<ScoutingSessionResponse>>.Ok(mapper.Map<List<ScoutingSessionResponse>>(sessions)));
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
            WeatherConditions = request.WeatherConditions,
            TemperatureCelsius = request.TemperatureCelsius,
            Notes = request.Notes
        };

        if (request.Observations is { Count: > 0 })
        {
            for (var i = 0; i < request.Observations.Count; i++)
            {
                var item = request.Observations[i];
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
                    LifeStage = item.LifeStage,
                    PhotoUrlsJson = item.PhotoUrls is { Count: > 0 } ? JsonSerializer.Serialize(item.PhotoUrls) : null,
                    SortOrder = i
                });
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
        if (request.WeatherConditions is not null) session.WeatherConditions = request.WeatherConditions;
        if (request.TemperatureCelsius is not null) session.TemperatureCelsius = request.TemperatureCelsius;
        if (request.Notes is not null) session.Notes = request.Notes;


        logger.LogDebug("[UpdatePlanned] PRE-SAVE observation IDs for session {SessionId}: [{Ids}]",
                id, string.Join(", ", session.SessionObservations.Select(o => o.Id)));


        if (request.Observations is not null)
        {
            var existingPlanned = session.SessionObservations.Where(o => o.IsPlanned).ToList();
            var incomingIds = request.Observations
                .Where(o => o.Id.HasValue)
                .Select(o => o.Id!.Value)
                .ToHashSet();

            db.SessionObservations.RemoveRange(existingPlanned.Where(o => !incomingIds.Contains(o.Id)).ToList());

            for (var i = 0; i < request.Observations.Count; i++)
            {
                var item = request.Observations[i];
                var photoJson = item.PhotoUrls is { Count: > 0 } ? JsonSerializer.Serialize(item.PhotoUrls) : null;

                if (item.Id.HasValue)
                {
                    var existing = existingPlanned.FirstOrDefault(o => o.Id == item.Id.Value);
                    if (existing is not null)
                    {
                        existing.ObservationType = item.ObservationType;
                        existing.TrapId = item.TrapId;
                        existing.PestId = item.PestId;
                        existing.CaptureMode = item.CaptureMode;
                        existing.Count = item.Count;
                        existing.IsPresent = item.IsPresent;
                        existing.Latitude = item.Latitude;
                        existing.Longitude = item.Longitude;
                        existing.IsUnknownPest = item.IsUnknownPest;
                        existing.Notes = item.Notes;
                        existing.LifeStage = item.LifeStage;
                        existing.PhotoUrlsJson = photoJson;
                        existing.SortOrder = i;
                        continue;
                    }
                }

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
                    LifeStage = item.LifeStage,
                    PhotoUrlsJson = photoJson,
                    SortOrder = i
                });
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

        var obs = new SessionObservation
        {
            TenantId = tenantId,
            SessionId = sessionId,
            ObservationType = request.ObservationType,
            IsPlanned = false,
            TrapId = request.TrapId,
            PestId = request.PestId,
            CaptureMode = request.CaptureMode,
            Count = request.Count,
            IsPresent = request.IsPresent,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            IsUnknownPest = request.IsUnknownPest,
            Notes = request.Notes,
            LifeStage = request.LifeStage,
            PhotoUrlsJson = request.PhotoUrls is { Count: > 0 } ? JsonSerializer.Serialize(request.PhotoUrls) : null,
            SortOrder = nextSort + 1
        };

        db.SessionObservations.Add(obs);
        await db.SaveChangesAsync(ct);

        var created = await db.SessionObservations
            .Include(so => so.Trap)
            .Include(so => so.Pest)
            .FirstAsync(so => so.Id == obs.Id, ct);

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
