using Asp.Versioning;
using AutoMapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pestlook.WebAPI.Data;
using Pestlook.WebAPI.Domain.Entities;
using Pestlook.WebAPI.Domain.Enums;
using Pestlook.WebAPI.DTOs.Common;
using Pestlook.WebAPI.DTOs.MonitoringPoints;
using Pestlook.WebAPI.Infrastructure;
using Pestlook.WebAPI.Infrastructure.Services.Interfaces;

namespace Pestlook.WebAPI.Controllers.v1;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/monitoring-points")]
[Authorize]
public sealed class MonitoringPointsController(
    ApplicationDbContext db,
    ITenantContext tenantContext,
    ICurrentUserService currentUserService,
    IMapper mapper) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<List<MonitoringPointResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll([FromQuery] Guid? fieldId, CancellationToken ct)
    {
        var query = db.MonitoringPoints
            .Include(mp => mp.MonitoringPointPests)
                .ThenInclude(mpp => mpp.Pest)
            .AsQueryable();

        if (fieldId.HasValue)
            query = query.Where(mp => mp.FieldId == fieldId.Value);

        var points = await query.OrderBy(mp => mp.Name).ToListAsync(ct);
        return Ok(ApiResponse<List<MonitoringPointResponse>>.Ok(mapper.Map<List<MonitoringPointResponse>>(points)));
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<MonitoringPointResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var point = await db.MonitoringPoints
            .Include(mp => mp.MonitoringPointPests)
                .ThenInclude(mpp => mpp.Pest)
            .FirstOrDefaultAsync(mp => mp.Id == id, ct);

        if (point is null) return NotFound(ApiResponse<object>.Fail("Monitoring point not found."));
        return Ok(ApiResponse<MonitoringPointResponse>.Ok(mapper.Map<MonitoringPointResponse>(point)));
    }

    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<MonitoringPointResponse>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] CreateMonitoringPointRequest request, CancellationToken ct)
    {
        if (tenantContext.TenantId is null)
            return BadRequest(ApiResponse<object>.Fail("Tenant context is required."));

        var fieldExists = await db.Fields.AnyAsync(f => f.Id == request.FieldId, ct);
        if (!fieldExists) return BadRequest(ApiResponse<object>.Fail("Field not found."));

        var point = new MonitoringPoint
        {
            TenantId = tenantContext.TenantId.Value,
            FieldId = request.FieldId,
            PointType = request.PointType,
            Name = request.Name,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            TrapType = request.TrapType,
            CreatedByUserId = currentUserService.UserId
        };

        if (request.PestIds is { Count: > 0 })
        {
            foreach (var pestId in request.PestIds.Distinct())
            {
                point.MonitoringPointPests.Add(new MonitoringPointPest
                {
                    PestId = pestId,
                    IsTargeted = true
                });
            }
        }

        db.MonitoringPoints.Add(point);
        await db.SaveChangesAsync(ct);

        var created = await db.MonitoringPoints
            .Include(mp => mp.MonitoringPointPests)
                .ThenInclude(mpp => mpp.Pest)
            .FirstAsync(mp => mp.Id == point.Id, ct);

        var response = mapper.Map<MonitoringPointResponse>(created);
        return CreatedAtAction(nameof(GetById), new { id = point.Id }, ApiResponse<MonitoringPointResponse>.Ok(response, "Monitoring point created."));
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<MonitoringPointResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateMonitoringPointRequest request, CancellationToken ct)
    {
        var point = await db.MonitoringPoints
            .Include(mp => mp.MonitoringPointPests)
                .ThenInclude(mpp => mpp.Pest)
            .FirstOrDefaultAsync(mp => mp.Id == id, ct);

        if (point is null) return NotFound(ApiResponse<object>.Fail("Monitoring point not found."));

        point.Name = request.Name;
        point.Latitude = request.Latitude;
        point.Longitude = request.Longitude;
        point.TrapType = request.TrapType;
        point.IsActive = request.IsActive;
        point.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);
        return Ok(ApiResponse<MonitoringPointResponse>.Ok(mapper.Map<MonitoringPointResponse>(point)));
    }

    /// <summary>Assign a pest to a monitoring point (fixed points only).</summary>
    [HttpPost("{id:guid}/pests")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AssignPest(Guid id, [FromBody] AssignPestRequest request, CancellationToken ct)
    {
        var point = await db.MonitoringPoints.FirstOrDefaultAsync(mp => mp.Id == id, ct);
        if (point is null) return NotFound(ApiResponse<object>.Fail("Monitoring point not found."));

        if (point.PointType == MonitoringPointType.ScoutingVisit)
            return BadRequest(ApiResponse<object>.Fail("Cannot assign pests to transient scouting visits."));

        var pestExists = await db.Pests.AnyAsync(p => p.Id == request.PestId, ct);
        if (!pestExists) return BadRequest(ApiResponse<object>.Fail("Pest not found."));

        var alreadyAssigned = await db.MonitoringPointPests
            .AnyAsync(mpp => mpp.MonitoringPointId == id && mpp.PestId == request.PestId, ct);

        if (alreadyAssigned)
            return BadRequest(ApiResponse<object>.Fail("Pest is already assigned to this monitoring point."));

        db.MonitoringPointPests.Add(new MonitoringPointPest
        {
            MonitoringPointId = id,
            PestId = request.PestId,
            IsTargeted = request.IsTargeted
        });

        await db.SaveChangesAsync(ct);
        return Ok(ApiResponse<object>.Ok(null!, "Pest assigned."));
    }

    /// <summary>Remove a pest assignment from a monitoring point.</summary>
    [HttpDelete("{id:guid}/pests/{pestId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RemovePest(Guid id, Guid pestId, CancellationToken ct)
    {
        var assignment = await db.MonitoringPointPests
            .FirstOrDefaultAsync(mpp => mpp.MonitoringPointId == id && mpp.PestId == pestId, ct);

        if (assignment is null) return NotFound(ApiResponse<object>.Fail("Pest assignment not found."));

        db.MonitoringPointPests.Remove(assignment);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var point = await db.MonitoringPoints.FirstOrDefaultAsync(mp => mp.Id == id, ct);
        if (point is null) return NotFound(ApiResponse<object>.Fail("Monitoring point not found."));

        point.DeletedAt = DateTime.UtcNow;
        point.IsActive = false;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
