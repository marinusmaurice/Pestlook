using Asp.Versioning;
using AutoMapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pestlook.WebAPI.Data;
using Pestlook.WebAPI.Domain.Entities;
using Pestlook.WebAPI.DTOs.Common;
using Pestlook.WebAPI.DTOs.TrapTypes;

namespace Pestlook.WebAPI.Controllers.v1;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/trap-types")]
[Authorize]
public sealed class TrapTypesController(
    ApplicationDbContext db,
    IMapper mapper) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<List<TrapTypeResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var types = await db.TrapTypes.OrderBy(t => t.Name).ToListAsync(ct);
        return Ok(ApiResponse<List<TrapTypeResponse>>.Ok(mapper.Map<List<TrapTypeResponse>>(types)));
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<TrapTypeResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var type = await db.TrapTypes.FirstOrDefaultAsync(t => t.Id == id, ct);
        if (type is null) return NotFound(ApiResponse<object>.Fail("Trap type not found."));
        return Ok(ApiResponse<TrapTypeResponse>.Ok(mapper.Map<TrapTypeResponse>(type)));
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(ApiResponse<TrapTypeResponse>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] CreateTrapTypeRequest request, CancellationToken ct)
    {
        var duplicate = await db.TrapTypes.AnyAsync(t => t.Name == request.Name, ct);
        if (duplicate) return BadRequest(ApiResponse<object>.Fail("A trap type with that name already exists."));

        var trapType = new TrapType { Name = request.Name, Description = request.Description };
        db.TrapTypes.Add(trapType);
        await db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(GetById), new { id = trapType.Id },
            ApiResponse<TrapTypeResponse>.Ok(mapper.Map<TrapTypeResponse>(trapType), "Trap type created."));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(ApiResponse<TrapTypeResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateTrapTypeRequest request, CancellationToken ct)
    {
        var trapType = await db.TrapTypes.FirstOrDefaultAsync(t => t.Id == id, ct);
        if (trapType is null) return NotFound(ApiResponse<object>.Fail("Trap type not found."));

        trapType.Name = request.Name;
        trapType.Description = request.Description;
        trapType.UpdatedAt = DateTime.Now;
        await db.SaveChangesAsync(ct);

        return Ok(ApiResponse<TrapTypeResponse>.Ok(mapper.Map<TrapTypeResponse>(trapType)));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var trapType = await db.TrapTypes.FirstOrDefaultAsync(t => t.Id == id, ct);
        if (trapType is null) return NotFound(ApiResponse<object>.Fail("Trap type not found."));

        trapType.DeletedAt = DateTime.Now;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
