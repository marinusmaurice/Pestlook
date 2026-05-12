using Asp.Versioning;
using AutoMapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pestlook.WebAPI.Data;
using Pestlook.WebAPI.Domain.Entities;
using Pestlook.WebAPI.DTOs.Common;
using Pestlook.WebAPI.DTOs.Farms;
using Pestlook.WebAPI.Infrastructure;

namespace Pestlook.WebAPI.Controllers.v1;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/farms")]
[Authorize]
public sealed class FarmsController(
    ApplicationDbContext db,
    ITenantContext tenantContext,
    IMapper mapper) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<List<FarmResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var farms = await db.Farms.OrderBy(f => f.Name).ToListAsync(ct);
        return Ok(ApiResponse<List<FarmResponse>>.Ok(mapper.Map<List<FarmResponse>>(farms)));
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<FarmResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var farm = await db.Farms.FirstOrDefaultAsync(f => f.Id == id, ct);
        if (farm is null) return NotFound(ApiResponse<object>.Fail("Farm not found."));
        return Ok(ApiResponse<FarmResponse>.Ok(mapper.Map<FarmResponse>(farm)));
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(ApiResponse<FarmResponse>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] CreateFarmRequest request, CancellationToken ct)
    {
        if (tenantContext.TenantId is null)
            return BadRequest(ApiResponse<object>.Fail("Tenant context is required."));

        var farm = new Farm
        {
            TenantId = tenantContext.TenantId.Value,
            Name = request.Name,
            Address = request.Address,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            BoundaryGeoJson = request.BoundaryGeoJson
        };
        db.Farms.Add(farm);
        await db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(GetById), new { id = farm.Id },
            ApiResponse<FarmResponse>.Ok(mapper.Map<FarmResponse>(farm), "Farm created."));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(ApiResponse<FarmResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateFarmRequest request, CancellationToken ct)
    {
        var farm = await db.Farms.FirstOrDefaultAsync(f => f.Id == id, ct);
        if (farm is null) return NotFound(ApiResponse<object>.Fail("Farm not found."));

        farm.Name = request.Name;
        farm.Address = request.Address;
        farm.Latitude = request.Latitude;
        farm.Longitude = request.Longitude;
        farm.BoundaryGeoJson = request.BoundaryGeoJson;
        farm.IsActive = request.IsActive;
        farm.UpdatedAt = DateTime.Now;
        await db.SaveChangesAsync(ct);

        return Ok(ApiResponse<FarmResponse>.Ok(mapper.Map<FarmResponse>(farm)));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var farm = await db.Farms
            .Include(f => f.Fields)
            .FirstOrDefaultAsync(f => f.Id == id, ct);

        if (farm is null) return NotFound(ApiResponse<object>.Fail("Farm not found."));

        var now = DateTime.Now;
        var fieldIds = farm.Fields.Select(f => f.Id).ToList();

        foreach (var field in farm.Fields)
            field.DeletedAt = now;

        farm.DeletedAt = now;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
