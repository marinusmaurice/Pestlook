using Asp.Versioning;
using AutoMapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Pestlook.WebAPI.Data;
using Pestlook.WebAPI.Domain.Entities;
using Pestlook.WebAPI.DTOs.Common;
using Pestlook.WebAPI.DTOs.Observations;
using Pestlook.WebAPI.Infrastructure;
using Pestlook.WebAPI.Infrastructure.Services.Interfaces;

namespace Pestlook.WebAPI.Controllers.v1;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/observations")]
[Authorize]
[EnableRateLimiting("global")]
public sealed class ObservationsController(
    ApplicationDbContext db,
    IMapper mapper,
    ITenantContext tenantContext,
    ICurrentUserService currentUserService) : ControllerBase
{
    // GET /api/v1/observations
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<IList<ObservationResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll([FromQuery] Guid? monitoringPointId, CancellationToken ct)
    {
        var query = db.Observations
            .AsNoTracking()
            .Include(o => o.ObservationPests)
            .AsQueryable();

        if (monitoringPointId.HasValue)
            query = query.Where(o => o.MonitoringPointId == monitoringPointId);

        var observations = await query.OrderByDescending(o => o.ObservedAt).ToListAsync(ct);
        return Ok(ApiResponse<IList<ObservationResponse>>.Ok(mapper.Map<IList<ObservationResponse>>(observations)));
    }

    // GET /api/v1/observations/{id}
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<ObservationResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var observation = await db.Observations
            .AsNoTracking()
            .Include(o => o.ObservationPests)
            .FirstOrDefaultAsync(o => o.Id == id, ct)
            ?? throw new KeyNotFoundException("Observation not found.");
        return Ok(ApiResponse<ObservationResponse>.Ok(mapper.Map<ObservationResponse>(observation)));
    }

    // POST /api/v1/observations
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<ObservationResponse>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] CreateObservationRequest request, CancellationToken ct)
    {
        if (tenantContext.TenantId is null)
            throw new InvalidOperationException("Tenant could not be resolved.");

        if (request.MonitoringPointId is null && (request.Latitude is null || request.Longitude is null))
            throw new InvalidOperationException("Either MonitoringPointId or GPS coordinates must be provided.");

        if (request.Pests.Count == 0)
            throw new InvalidOperationException("At least one pest observation is required.");

        // Auto-create an ad-hoc monitoring point for standalone GPS observations
        Guid? resolvedMonitoringPointId = request.MonitoringPointId;
        if (resolvedMonitoringPointId is null)
        {
            var adHoc = new MonitoringPoint
            {
                TenantId = tenantContext.TenantId.Value,
                Name = $"Ad-hoc {request.ObservedAt:yyyy-MM-dd HH:mm}",
                Type = Domain.Enums.MonitoringPointType.Scouting,
                Latitude = request.Latitude!.Value,
                Longitude = request.Longitude!.Value
            };
            db.MonitoringPoints.Add(adHoc);
            await db.SaveChangesAsync(ct);
            resolvedMonitoringPointId = adHoc.Id;
        }

        var observation = new Observation
        {
            TenantId = tenantContext.TenantId.Value,
            MonitoringPointId = resolvedMonitoringPointId,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            ObservedAt = request.ObservedAt,
            CreatedByUserId = currentUserService.UserId!,
            Notes = request.Notes,
            ImageUrl = request.ImageUrl,
            ObservationPests = request.Pests.Select(p => new ObservationPest
            {
                PestId = p.PestId,
                PestName = p.PestName,
                Count = p.Count,
                IsPresent = p.IsPresent
            }).ToList()
        };

        db.Observations.Add(observation);
        await db.SaveChangesAsync(ct);
        var response = mapper.Map<ObservationResponse>(observation);
        return CreatedAtAction(nameof(GetById), new { id = observation.Id, version = "1" }, ApiResponse<ObservationResponse>.Ok(response));
    }

    // DELETE /api/v1/observations/{id}
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Agronomist")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var observation = await db.Observations.FirstOrDefaultAsync(o => o.Id == id, ct)
            ?? throw new KeyNotFoundException("Observation not found.");
        db.Observations.Remove(observation);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
