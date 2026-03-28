using Asp.Versioning;
using AutoMapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Pestlook.WebAPI.Data;
using Pestlook.WebAPI.Domain.Entities;
using Pestlook.WebAPI.DTOs.Common;
using Pestlook.WebAPI.DTOs.Fields;

namespace Pestlook.WebAPI.Controllers.v1;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/fields")]
[Authorize]
[EnableRateLimiting("global")]
public sealed class FieldsController(ApplicationDbContext db, IMapper mapper) : ControllerBase
{
    // GET /api/v1/fields?farmId=
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<IList<FieldResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll([FromQuery] Guid? farmId, CancellationToken ct)
    {
        var query = db.Fields.AsNoTracking().AsQueryable();
        if (farmId.HasValue)
            query = query.Where(f => f.FarmId == farmId);

        var fields = await query.OrderBy(f => f.Name).ToListAsync(ct);
        return Ok(ApiResponse<IList<FieldResponse>>.Ok(mapper.Map<IList<FieldResponse>>(fields)));
    }

    // GET /api/v1/fields/{id}
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<FieldResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var field = await db.Fields.AsNoTracking().FirstOrDefaultAsync(f => f.Id == id, ct)
            ?? throw new KeyNotFoundException("Field not found.");
        return Ok(ApiResponse<FieldResponse>.Ok(mapper.Map<FieldResponse>(field)));
    }

    // POST /api/v1/fields
    [HttpPost]
    [Authorize(Roles = "Agronomist,Farmer")]
    [ProducesResponseType(typeof(ApiResponse<FieldResponse>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] CreateFieldRequest request, CancellationToken ct)
    {
        var farmExists = await db.Farms.AnyAsync(f => f.Id == request.FarmId, ct);
        if (!farmExists) throw new KeyNotFoundException("Farm not found.");

        var field = new Field
        {
            FarmId = request.FarmId,
            Name = request.Name,
            BoundaryGeoJson = request.BoundaryGeoJson
        };

        db.Fields.Add(field);
        await db.SaveChangesAsync(ct);
        var response = mapper.Map<FieldResponse>(field);
        return CreatedAtAction(nameof(GetById), new { id = field.Id, version = "1" }, ApiResponse<FieldResponse>.Ok(response));
    }

    // PUT /api/v1/fields/{id}
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Agronomist,Farmer")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateFieldRequest request, CancellationToken ct)
    {
        var field = await db.Fields.FirstOrDefaultAsync(f => f.Id == id, ct)
            ?? throw new KeyNotFoundException("Field not found.");
        field.Name = request.Name;
        field.BoundaryGeoJson = request.BoundaryGeoJson;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    // DELETE /api/v1/fields/{id}
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Agronomist")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var field = await db.Fields.FirstOrDefaultAsync(f => f.Id == id, ct)
            ?? throw new KeyNotFoundException("Field not found.");
        db.Fields.Remove(field);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
