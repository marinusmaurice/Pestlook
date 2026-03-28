using Asp.Versioning;
using AutoMapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Pestlook.WebAPI.Data;
using Pestlook.WebAPI.Domain.Entities;
using Pestlook.WebAPI.DTOs.Common;
using Pestlook.WebAPI.DTOs.MonitoringPoints;

namespace Pestlook.WebAPI.Controllers.v1;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/monitoring-points")]
[Authorize]
[EnableRateLimiting("global")]
public sealed class MonitoringPointsController(ApplicationDbContext db, IMapper mapper) : ControllerBase
{
    // GET /api/v1/monitoring-points
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<IList<MonitoringPointResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll([FromQuery] Guid? farmId, [FromQuery] Guid? fieldId, CancellationToken ct)
    {
        var query = db.MonitoringPoints
            .AsNoTracking()
            .Include(mp => mp.MonitoringPointPests)
            .AsQueryable();

        if (farmId.HasValue) query = query.Where(mp => mp.FarmId == farmId);
        if (fieldId.HasValue) query = query.Where(mp => mp.FieldId == fieldId);

        var points = await query.OrderBy(mp => mp.Name).ToListAsync(ct);
        return Ok(ApiResponse<IList<MonitoringPointResponse>>.Ok(mapper.Map<IList<MonitoringPointResponse>>(points)));
    }

    // GET /api/v1/monitoring-points/{id}
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<MonitoringPointResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var point = await db.MonitoringPoints
            .AsNoTracking()
            .Include(mp => mp.MonitoringPointPests)
            .FirstOrDefaultAsync(mp => mp.Id == id, ct)
            ?? throw new KeyNotFoundException("Monitoring point not found.");
        return Ok(ApiResponse<MonitoringPointResponse>.Ok(mapper.Map<MonitoringPointResponse>(point)));
    }

    // POST /api/v1/monitoring-points
    [HttpPost]
    [Authorize(Roles = "Agronomist,Farmer")]
    [ProducesResponseType(typeof(ApiResponse<MonitoringPointResponse>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] CreateMonitoringPointRequest request, CancellationToken ct)
    {
        var point = new MonitoringPoint
        {
            Name = request.Name,
            Type = request.Type,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            FarmId = request.FarmId,
            FieldId = request.FieldId
        };
        db.MonitoringPoints.Add(point);
        await db.SaveChangesAsync(ct);

        await db.Entry(point).Collection(mp => mp.MonitoringPointPests).LoadAsync(ct);
        var response = mapper.Map<MonitoringPointResponse>(point);
        return CreatedAtAction(nameof(GetById), new { id = point.Id, version = "1" }, ApiResponse<MonitoringPointResponse>.Ok(response));
    }

    // PUT /api/v1/monitoring-points/{id}
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Agronomist,Farmer")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateMonitoringPointRequest request, CancellationToken ct)
    {
        var point = await db.MonitoringPoints.FirstOrDefaultAsync(mp => mp.Id == id, ct)
            ?? throw new KeyNotFoundException("Monitoring point not found.");

        point.Name = request.Name;
        point.Type = request.Type;
        point.Latitude = request.Latitude;
        point.Longitude = request.Longitude;
        point.FarmId = request.FarmId;
        point.FieldId = request.FieldId;
        point.IsActive = request.IsActive;

        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    // DELETE /api/v1/monitoring-points/{id}
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Agronomist")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var point = await db.MonitoringPoints.FirstOrDefaultAsync(mp => mp.Id == id, ct)
            ?? throw new KeyNotFoundException("Monitoring point not found.");
        db.MonitoringPoints.Remove(point);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    // POST /api/v1/monitoring-points/{id}/pests/{pestId}
    [HttpPost("{id:guid}/pests/{pestId:guid}")]
    [Authorize(Roles = "Agronomist,Farmer")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AssignPest(Guid id, Guid pestId, CancellationToken ct)
    {
        var pointExists = await db.MonitoringPoints.AnyAsync(mp => mp.Id == id, ct);
        if (!pointExists) throw new KeyNotFoundException("Monitoring point not found.");

        var pestExists = await db.Pests.AnyAsync(p => p.Id == pestId, ct);
        if (!pestExists) throw new KeyNotFoundException("Pest not found.");

        var alreadyLinked = await db.MonitoringPointPests
            .AnyAsync(mpp => mpp.MonitoringPointId == id && mpp.PestId == pestId, ct);
        if (alreadyLinked) throw new InvalidOperationException("Pest is already assigned to this monitoring point.");

        db.MonitoringPointPests.Add(new MonitoringPointPest { MonitoringPointId = id, PestId = pestId });
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    // DELETE /api/v1/monitoring-points/{id}/pests/{pestId}
    [HttpDelete("{id:guid}/pests/{pestId:guid}")]
    [Authorize(Roles = "Agronomist,Farmer")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RemovePest(Guid id, Guid pestId, CancellationToken ct)
    {
        var link = await db.MonitoringPointPests
            .FirstOrDefaultAsync(mpp => mpp.MonitoringPointId == id && mpp.PestId == pestId, ct)
            ?? throw new KeyNotFoundException("Pest assignment not found.");

        db.MonitoringPointPests.Remove(link);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
