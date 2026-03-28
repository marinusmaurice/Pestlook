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
using Pestlook.WebAPI.DTOs.Observations;
using Pestlook.WebAPI.Infrastructure;
using Pestlook.WebAPI.Infrastructure.Services.Interfaces;

namespace Pestlook.WebAPI.Controllers.v1;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/observations")]
[Authorize]
public sealed class ObservationsController(
    ApplicationDbContext db,
    ITenantContext tenantContext,
    ICurrentUserService currentUserService,
    IMapper mapper) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<List<ObservationResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(
        [FromQuery] Guid? monitoringPointId,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        CancellationToken ct)
    {
        var query = db.Observations
            .Include(o => o.Pest)
            .AsQueryable();

        if (monitoringPointId.HasValue)
            query = query.Where(o => o.MonitoringPointId == monitoringPointId.Value);
        if (from.HasValue)
            query = query.Where(o => o.ObservedAt >= from.Value);
        if (to.HasValue)
            query = query.Where(o => o.ObservedAt <= to.Value);

        var observations = await query.OrderByDescending(o => o.ObservedAt).ToListAsync(ct);
        return Ok(ApiResponse<List<ObservationResponse>>.Ok(mapper.Map<List<ObservationResponse>>(observations)));
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<ObservationResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var observation = await db.Observations
            .Include(o => o.Pest)
            .FirstOrDefaultAsync(o => o.Id == id, ct);

        if (observation is null) return NotFound(ApiResponse<object>.Fail("Observation not found."));
        return Ok(ApiResponse<ObservationResponse>.Ok(mapper.Map<ObservationResponse>(observation)));
    }

    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<ObservationResponse>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] CreateObservationRequest request, CancellationToken ct)
    {
        if (tenantContext.TenantId is null)
            return BadRequest(ApiResponse<object>.Fail("Tenant context is required."));

        if (request.PestId is null && string.IsNullOrWhiteSpace(request.PestNameText))
            return BadRequest(ApiResponse<object>.Fail("Either PestId or PestNameText must be provided."));

        if (request.Count is null && request.Presence is null)
            return BadRequest(ApiResponse<object>.Fail("Either Count or Presence must be provided."));

        // Workflow B: if no point exists, auto-create a ScoutingVisit point.
        // Otherwise validate that the provided MonitoringPointId exists.
        var point = await db.MonitoringPoints
            .Include(mp => mp.MonitoringPointPests)
            .FirstOrDefaultAsync(mp => mp.Id == request.MonitoringPointId, ct);

        if (point is null)
            return BadRequest(ApiResponse<object>.Fail("Monitoring point not found."));

        // For fixed points, validate that the pest is on the allowed list (unless free-text unknown)
        if (point.PointType != MonitoringPointType.ScoutingVisit &&
            request.PestId.HasValue &&
            !point.MonitoringPointPests.Any(mpp => mpp.PestId == request.PestId.Value))
        {
            return BadRequest(ApiResponse<object>.Fail("Pest is not assigned to this monitoring point."));
        }

        var observation = new Observation
        {
            TenantId = tenantContext.TenantId.Value,
            MonitoringPointId = request.MonitoringPointId,
            ScoutUserId = currentUserService.UserId!,
            PestId = request.PestId,
            PestNameText = request.PestNameText,
            Count = request.Count,
            Presence = request.Presence,
            LifeStage = request.LifeStage,
            Notes = request.Notes,
            PhotoUrlsJson = request.PhotoUrls is { Count: > 0 }
                ? JsonSerializer.Serialize(request.PhotoUrls)
                : null,
            ObservedAt = request.ObservedAt ?? DateTime.UtcNow
        };

        db.Observations.Add(observation);
        await db.SaveChangesAsync(ct);

        var created = await db.Observations
            .Include(o => o.Pest)
            .FirstAsync(o => o.Id == observation.Id, ct);

        var response = mapper.Map<ObservationResponse>(created);
        return CreatedAtAction(nameof(GetById), new { id = observation.Id }, ApiResponse<ObservationResponse>.Ok(response, "Observation recorded."));
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var observation = await db.Observations.FirstOrDefaultAsync(o => o.Id == id, ct);
        if (observation is null) return NotFound(ApiResponse<object>.Fail("Observation not found."));

        db.Observations.Remove(observation);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
