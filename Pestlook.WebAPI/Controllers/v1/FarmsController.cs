using Asp.Versioning;
using AutoMapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Pestlook.WebAPI.Data;
using Pestlook.WebAPI.Domain.Entities;
using Pestlook.WebAPI.DTOs.Common;
using Pestlook.WebAPI.DTOs.Farms;

namespace Pestlook.WebAPI.Controllers.v1;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/farms")]
[Authorize]
[EnableRateLimiting("global")]
public sealed class FarmsController(ApplicationDbContext db, IMapper mapper) : ControllerBase
{
    // GET /api/v1/farms
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<IList<FarmResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var farms = await db.Farms.AsNoTracking().OrderBy(f => f.Name).ToListAsync(ct);
        return Ok(ApiResponse<IList<FarmResponse>>.Ok(mapper.Map<IList<FarmResponse>>(farms)));
    }

    // GET /api/v1/farms/{id}
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<FarmResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var farm = await db.Farms.AsNoTracking().FirstOrDefaultAsync(f => f.Id == id, ct)
            ?? throw new KeyNotFoundException("Farm not found.");
        return Ok(ApiResponse<FarmResponse>.Ok(mapper.Map<FarmResponse>(farm)));
    }

    // POST /api/v1/farms
    [HttpPost]
    [Authorize(Roles = "Agronomist,Farmer")]
    [ProducesResponseType(typeof(ApiResponse<FarmResponse>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] CreateFarmRequest request, CancellationToken ct)
    {
        var farm = new Farm { Name = request.Name };
        db.Farms.Add(farm);
        await db.SaveChangesAsync(ct);
        var response = mapper.Map<FarmResponse>(farm);
        return CreatedAtAction(nameof(GetById), new { id = farm.Id, version = "1" }, ApiResponse<FarmResponse>.Ok(response));
    }

    // PUT /api/v1/farms/{id}
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Agronomist,Farmer")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateFarmRequest request, CancellationToken ct)
    {
        var farm = await db.Farms.FirstOrDefaultAsync(f => f.Id == id, ct)
            ?? throw new KeyNotFoundException("Farm not found.");
        farm.Name = request.Name;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    // DELETE /api/v1/farms/{id}
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Agronomist")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var farm = await db.Farms.FirstOrDefaultAsync(f => f.Id == id, ct)
            ?? throw new KeyNotFoundException("Farm not found.");
        db.Farms.Remove(farm);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
