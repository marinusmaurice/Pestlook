using Asp.Versioning;
using AutoMapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pestlook.WebAPI.Data;
using Pestlook.WebAPI.Domain.Entities;
using Pestlook.WebAPI.DTOs.Common;
using Pestlook.WebAPI.DTOs.Pests;
using Pestlook.WebAPI.Infrastructure;

namespace Pestlook.WebAPI.Controllers.v1;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/pests")]
[Authorize]
public sealed class PestsController(
    ApplicationDbContext db,
    ITenantContext tenantContext,
    IMapper mapper) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<List<PestResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var pests = await db.Pests.OrderBy(p => p.CommonName).ToListAsync(ct);
        return Ok(ApiResponse<List<PestResponse>>.Ok(mapper.Map<List<PestResponse>>(pests)));
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<PestResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var pest = await db.Pests.FirstOrDefaultAsync(p => p.Id == id, ct);
        if (pest is null) return NotFound(ApiResponse<object>.Fail("Pest not found."));
        return Ok(ApiResponse<PestResponse>.Ok(mapper.Map<PestResponse>(pest)));
    }

    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<PestResponse>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] CreatePestRequest request, CancellationToken ct)
    {
        if (tenantContext.TenantId is null)
            return BadRequest(ApiResponse<object>.Fail("Tenant context is required."));

        var pest = new Pest
        {
            TenantId = tenantContext.TenantId.Value,
            CommonName = request.CommonName,
            ScientificName = request.ScientificName,
            Category = request.Category,
            DefaultCaptureMode = request.DefaultCaptureMode,
            ThresholdCount = request.ThresholdCount,
            Description = request.Description,
            ImageUrl = request.ImageUrl,
            IsSystemPest = false
        };
        db.Pests.Add(pest);
        await db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(GetById), new { id = pest.Id },
            ApiResponse<PestResponse>.Ok(mapper.Map<PestResponse>(pest), "Pest created."));
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<PestResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdatePestRequest request, CancellationToken ct)
    {
        var pest = await db.Pests.FirstOrDefaultAsync(p => p.Id == id, ct);
        if (pest is null) return NotFound(ApiResponse<object>.Fail("Pest not found."));
        if (pest.IsSystemPest) return BadRequest(ApiResponse<object>.Fail("System pests cannot be modified."));

        pest.CommonName = request.CommonName;
        pest.ScientificName = request.ScientificName;
        pest.Category = request.Category;
        pest.DefaultCaptureMode = request.DefaultCaptureMode;
        pest.ThresholdCount = request.ThresholdCount;
        pest.Description = request.Description;
        pest.ImageUrl = request.ImageUrl;
        await db.SaveChangesAsync(ct);

        return Ok(ApiResponse<PestResponse>.Ok(mapper.Map<PestResponse>(pest)));
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var pest = await db.Pests.FirstOrDefaultAsync(p => p.Id == id, ct);
        if (pest is null) return NotFound(ApiResponse<object>.Fail("Pest not found."));
        if (pest.IsSystemPest) return BadRequest(ApiResponse<object>.Fail("System pests cannot be deleted."));

        pest.DeletedAt = DateTime.Now;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
