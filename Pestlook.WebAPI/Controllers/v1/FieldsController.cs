using Asp.Versioning;
using AutoMapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pestlook.WebAPI.Data;
using Pestlook.WebAPI.Domain.Entities;
using Pestlook.WebAPI.DTOs.Common;
using Pestlook.WebAPI.DTOs.Fields;
using Pestlook.WebAPI.Infrastructure;

namespace Pestlook.WebAPI.Controllers.v1;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/fields")]
[Authorize]
public sealed class FieldsController(
    ApplicationDbContext db,
    ITenantContext tenantContext,
    IMapper mapper) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<List<FieldResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll([FromQuery] Guid? farmId, CancellationToken ct)
    {
        var query = db.Fields.AsQueryable();
        if (farmId.HasValue)
            query = query.Where(f => f.FarmId == farmId.Value);

        var fields = await query.OrderBy(f => f.Name).ToListAsync(ct);
        return Ok(ApiResponse<List<FieldResponse>>.Ok(mapper.Map<List<FieldResponse>>(fields)));
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<FieldResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var field = await db.Fields.FirstOrDefaultAsync(f => f.Id == id, ct);
        if (field is null) return NotFound(ApiResponse<object>.Fail("Field not found."));
        return Ok(ApiResponse<FieldResponse>.Ok(mapper.Map<FieldResponse>(field)));
    }

    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<FieldResponse>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] CreateFieldRequest request, CancellationToken ct)
    {
        if (tenantContext.TenantId is null)
            return BadRequest(ApiResponse<object>.Fail("Tenant context is required."));

        var farmExists = await db.Farms.AnyAsync(f => f.Id == request.FarmId, ct);
        if (!farmExists) return BadRequest(ApiResponse<object>.Fail("Farm not found."));

        var field = new Field
        {
            TenantId = tenantContext.TenantId.Value,
            FarmId = request.FarmId,
            Name = request.Name,
            CropType = request.CropType,
            BoundaryGeoJson = request.BoundaryGeoJson
        };

        db.Fields.Add(field);
        await db.SaveChangesAsync(ct);

        var response = mapper.Map<FieldResponse>(field);
        return CreatedAtAction(nameof(GetById), new { id = field.Id }, ApiResponse<FieldResponse>.Ok(response, "Field created."));
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<FieldResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateFieldRequest request, CancellationToken ct)
    {
        var field = await db.Fields.FirstOrDefaultAsync(f => f.Id == id, ct);
        if (field is null) return NotFound(ApiResponse<object>.Fail("Field not found."));

        field.Name = request.Name;
        field.CropType = request.CropType;
        field.BoundaryGeoJson = request.BoundaryGeoJson;
        field.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);
        return Ok(ApiResponse<FieldResponse>.Ok(mapper.Map<FieldResponse>(field)));
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var field = await db.Fields.FirstOrDefaultAsync(f => f.Id == id, ct);
        if (field is null) return NotFound(ApiResponse<object>.Fail("Field not found."));

        field.DeletedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
