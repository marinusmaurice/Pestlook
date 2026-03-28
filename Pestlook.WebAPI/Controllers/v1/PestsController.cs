using Asp.Versioning;
using AutoMapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Pestlook.WebAPI.Data;
using Pestlook.WebAPI.Domain.Entities;
using Pestlook.WebAPI.Domain.Enums;
using Pestlook.WebAPI.DTOs.Common;
using Pestlook.WebAPI.DTOs.Pests;
using Pestlook.WebAPI.Infrastructure;

namespace Pestlook.WebAPI.Controllers.v1;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/pests")]
[Authorize]
[EnableRateLimiting("global")]
public sealed class PestsController(
    ApplicationDbContext db,
    IMapper mapper,
    ITenantContext tenantContext) : ControllerBase
{
    // GET /api/v1/pests
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<IList<PestResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var pests = await db.Pests.AsNoTracking().OrderBy(p => p.Name).ToListAsync(ct);
        return Ok(ApiResponse<IList<PestResponse>>.Ok(mapper.Map<IList<PestResponse>>(pests)));
    }

    // GET /api/v1/pests/{id}
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<PestResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var pest = await db.Pests.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id, ct)
            ?? throw new KeyNotFoundException("Pest not found.");
        return Ok(ApiResponse<PestResponse>.Ok(mapper.Map<PestResponse>(pest)));
    }

    // POST /api/v1/pests
    [HttpPost]
    [Authorize(Roles = "Agronomist,Farmer")]
    [ProducesResponseType(typeof(ApiResponse<PestResponse>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] CreatePestRequest request, CancellationToken ct)
    {
        if (tenantContext.TenantId is null)
            throw new InvalidOperationException("Tenant could not be resolved.");

        var pest = new Pest
        {
            TenantId = tenantContext.TenantId.Value,
            Name = request.Name,
            Category = request.Category,
            IsSystem = false
        };
        db.Pests.Add(pest);
        await db.SaveChangesAsync(ct);
        var response = mapper.Map<PestResponse>(pest);
        return CreatedAtAction(nameof(GetById), new { id = pest.Id, version = "1" }, ApiResponse<PestResponse>.Ok(response));
    }

    // PUT /api/v1/pests/{id}
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Agronomist,Farmer")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdatePestRequest request, CancellationToken ct)
    {
        var pest = await db.Pests.FirstOrDefaultAsync(p => p.Id == id, ct)
            ?? throw new KeyNotFoundException("Pest not found.");

        if (pest.IsSystem)
            throw new InvalidOperationException("System pests cannot be modified.");

        pest.Name = request.Name;
        pest.Category = request.Category;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    // DELETE /api/v1/pests/{id}
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Agronomist")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var pest = await db.Pests.FirstOrDefaultAsync(p => p.Id == id, ct)
            ?? throw new KeyNotFoundException("Pest not found.");

        if (pest.IsSystem)
            throw new InvalidOperationException("System pests cannot be deleted.");

        db.Pests.Remove(pest);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
