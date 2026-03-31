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
using Pestlook.WebAPI.DTOs.PestObservations;
using Pestlook.WebAPI.Infrastructure;

namespace Pestlook.WebAPI.Controllers.v1;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/pest-observations")]
[Authorize]
public sealed class PestObservationsController(
    ApplicationDbContext db,
    ITenantContext tenantContext,
    IMapper mapper) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<List<PestObservationResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(
        [FromQuery] Guid? sessionId,
        [FromQuery] Guid? monitoringPointId,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        CancellationToken ct)
    {
        var query = db.PestObservations.Include(o => o.Pest).Include(o => o.Trap).AsQueryable();

        if (sessionId.HasValue)        query = query.Where(o => o.SessionId == sessionId.Value);
        if (monitoringPointId.HasValue) query = query.Where(o => o.MonitoringPointId == monitoringPointId.Value);
        if (from.HasValue)             query = query.Where(o => o.ObservedAt >= from.Value);
        if (to.HasValue)               query = query.Where(o => o.ObservedAt <= to.Value);

        var observations = await query.OrderByDescending(o => o.ObservedAt).ToListAsync(ct);
        return Ok(ApiResponse<List<PestObservationResponse>>.Ok(mapper.Map<List<PestObservationResponse>>(observations)));
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<PestObservationResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var obs = await db.PestObservations
            .Include(o => o.Pest)
            .Include(o => o.Trap)
            .FirstOrDefaultAsync(o => o.Id == id, ct);
        if (obs is null) return NotFound(ApiResponse<object>.Fail("Observation not found."));
        return Ok(ApiResponse<PestObservationResponse>.Ok(mapper.Map<PestObservationResponse>(obs)));
    }

    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<PestObservationResponse>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] CreatePestObservationRequest request, CancellationToken ct)
    {
        if (tenantContext.TenantId is null)
            return BadRequest(ApiResponse<object>.Fail("Tenant context is required."));

        // Must have either a known pest or an unknown description
        if (!request.IsUnknownPest && request.PestId is null)
            return BadRequest(ApiResponse<object>.Fail("PestId is required when IsUnknownPest is false."));

        if (request.IsUnknownPest && string.IsNullOrWhiteSpace(request.UnknownPestDescription))
            return BadRequest(ApiResponse<object>.Fail("UnknownPestDescription is required when IsUnknownPest is true."));

        // Count required for Count mode; Present required for Presence mode
        if (request.CaptureMode == CaptureMode.Count && request.Count is null)
            return BadRequest(ApiResponse<object>.Fail("Count is required when CaptureMode is Count."));

        if (request.CaptureMode == CaptureMode.Presence && request.Present is null)
            return BadRequest(ApiResponse<object>.Fail("Present is required when CaptureMode is Presence."));

        var sessionExists = await db.ScoutingSessions.AnyAsync(ss => ss.Id == request.SessionId, ct);
        if (!sessionExists) return BadRequest(ApiResponse<object>.Fail("Scouting session not found."));

        var point = await db.MonitoringPoints
            .Include(mp => mp.MonitoringPointPests)
            .FirstOrDefaultAsync(mp => mp.Id == request.MonitoringPointId, ct);
        if (point is null) return BadRequest(ApiResponse<object>.Fail("Monitoring point not found."));

        // For fixed points with a known pest — validate it is on the allowed list
        if (point.PointType != MonitoringPointType.ScoutingVisit &&
            !request.IsUnknownPest &&
            request.PestId.HasValue &&
            !point.MonitoringPointPests.Any(mpp => mpp.PestId == request.PestId.Value && mpp.IsActive))
        {
            return BadRequest(ApiResponse<object>.Fail("Pest is not assigned to this monitoring point."));
        }

        var obs = new PestObservation
        {
            TenantId = tenantContext.TenantId.Value,
            SessionId = request.SessionId,
            MonitoringPointId = request.MonitoringPointId,
            PestId = request.IsUnknownPest ? null : request.PestId,
            IsUnknownPest = request.IsUnknownPest,
            UnknownPestDescription = request.UnknownPestDescription,
            CaptureMode = request.CaptureMode,
            Count = request.Count,
            Present = request.Present,
            LifeStage = request.LifeStage,
            CapturedLat = request.CapturedLat,
            CapturedLng = request.CapturedLng,
            TrapId = request.TrapId,
            PhotoUrlsJson = request.PhotoUrls is { Count: > 0 }
                ? JsonSerializer.Serialize(request.PhotoUrls)
                : null,
            Notes = request.Notes,
            ObservedAt = request.ObservedAt ?? DateTime.UtcNow
        };

        db.PestObservations.Add(obs);
        await db.SaveChangesAsync(ct);

        var created = await db.PestObservations
            .Include(o => o.Pest)
            .Include(o => o.Trap)
            .FirstAsync(o => o.Id == obs.Id, ct);

        return CreatedAtAction(nameof(GetById), new { id = obs.Id },
            ApiResponse<PestObservationResponse>.Ok(mapper.Map<PestObservationResponse>(created), "Observation recorded."));
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var obs = await db.PestObservations.FirstOrDefaultAsync(o => o.Id == id, ct);
        if (obs is null) return NotFound(ApiResponse<object>.Fail("Observation not found."));

        db.PestObservations.Remove(obs);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
