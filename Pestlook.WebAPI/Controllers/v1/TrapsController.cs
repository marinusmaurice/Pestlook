using Asp.Versioning;
using AutoMapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pestlook.WebAPI.Data;
using Pestlook.WebAPI.Domain.Entities;
using Pestlook.WebAPI.DTOs.Common;
using Pestlook.WebAPI.DTOs.Traps;
using Pestlook.WebAPI.Infrastructure;

namespace Pestlook.WebAPI.Controllers.v1;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/traps")]
[Authorize]
public sealed class TrapsController(
    ApplicationDbContext db,
    ITenantContext tenantContext,
    IMapper mapper) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<List<TrapResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll([FromQuery] bool? enabled, CancellationToken ct)
    {
        var traps = await db.Traps
            .Where(t => !enabled.HasValue || t.IsEnabled == enabled.Value)
            .OrderBy(t => t.Name)
            .Select(t => new TrapResponse(
                t.Id, t.TenantId, t.Name, t.Barcode,
                t.TrapTypeId, t.TrapType != null ? t.TrapType.Name : null,
                t.FieldId, t.Field != null ? t.Field.Name : null,
                t.Field != null && t.Field.Farm != null ? t.Field.Farm.Name : null,
                t.Latitude, t.Longitude, t.IsEnabled, t.Notes,
                t.CreatedAt, t.UpdatedAt))
            .ToListAsync(ct);
        return Ok(ApiResponse<List<TrapResponse>>.Ok(traps));
    }

    [HttpGet("paged")]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<TrapResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPaged(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        [FromQuery] string? search = null,
        [FromQuery] string? trapTypeName = null,
        [FromQuery] bool? enabled = null,
        [FromQuery] string sortBy = "name",
        [FromQuery] bool sortDesc = false,
        CancellationToken ct = default)
    {
        page     = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = db.Traps.AsQueryable();

        if (enabled.HasValue)
            query = query.Where(t => t.IsEnabled == enabled.Value);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(t =>
                t.Name.ToLower().Contains(s) ||
                (t.Barcode != null && t.Barcode.ToLower().Contains(s)) ||
                (t.Field != null && t.Field.Name.ToLower().Contains(s)) ||
                (t.Field != null && t.Field.Farm != null && t.Field.Farm.Name.ToLower().Contains(s)) ||
                (t.TrapType != null && t.TrapType.Name.ToLower().Contains(s)));
        }

        if (!string.IsNullOrWhiteSpace(trapTypeName))
            query = query.Where(t => t.TrapType != null && t.TrapType.Name == trapTypeName);

        query = (sortBy.ToLower(), sortDesc) switch
        {
            ("farm",   false) => query.OrderBy(t => t.Field != null && t.Field.Farm != null ? t.Field.Farm.Name : null).ThenBy(t => t.Name),
            ("farm",   true)  => query.OrderByDescending(t => t.Field != null && t.Field.Farm != null ? t.Field.Farm.Name : null).ThenBy(t => t.Name),
            ("field",  false) => query.OrderBy(t => t.Field != null ? t.Field.Name : null).ThenBy(t => t.Name),
            ("field",  true)  => query.OrderByDescending(t => t.Field != null ? t.Field.Name : null).ThenBy(t => t.Name),
            ("type",   false) => query.OrderBy(t => t.TrapType != null ? t.TrapType.Name : null).ThenBy(t => t.Name),
            ("type",   true)  => query.OrderByDescending(t => t.TrapType != null ? t.TrapType.Name : null).ThenBy(t => t.Name),
            ("status", false) => query.OrderBy(t => t.IsEnabled).ThenBy(t => t.Name),
            ("status", true)  => query.OrderByDescending(t => t.IsEnabled).ThenBy(t => t.Name),
            (_,        false) => query.OrderBy(t => t.Name),
            (_,        true)  => query.OrderByDescending(t => t.Name),
        };

        var totalCount = await query.CountAsync(ct);

        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(t => new TrapResponse(
                t.Id, t.TenantId, t.Name, t.Barcode,
                t.TrapTypeId, t.TrapType != null ? t.TrapType.Name : null,
                t.FieldId, t.Field != null ? t.Field.Name : null,
                t.Field != null && t.Field.Farm != null ? t.Field.Farm.Name : null,
                t.Latitude, t.Longitude, t.IsEnabled, t.Notes,
                t.CreatedAt, t.UpdatedAt))
            .ToListAsync(ct);

        return Ok(ApiResponse<PagedResult<TrapResponse>>.Ok(new PagedResult<TrapResponse>(items, totalCount, page, pageSize)));
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<TrapResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var trap = await db.Traps
            .Include(t => t.TrapType)
            .Include(t => t.Field).ThenInclude(f => f!.Farm)
            .FirstOrDefaultAsync(t => t.Id == id, ct);
        if (trap is null) return NotFound(ApiResponse<object>.Fail("Trap not found."));
        return Ok(ApiResponse<TrapResponse>.Ok(mapper.Map<TrapResponse>(trap)));
    }

    [HttpGet("barcode/{barcode}")]
    [ProducesResponseType(typeof(ApiResponse<TrapResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetByBarcode(string barcode, CancellationToken ct)
    {
        var trap = await db.Traps
            .Include(t => t.TrapType)
            .Include(t => t.Field).ThenInclude(f => f!.Farm)
            .FirstOrDefaultAsync(t => t.Barcode == barcode, ct);
        if (trap is null) return NotFound(ApiResponse<object>.Fail("Trap not found."));
        return Ok(ApiResponse<TrapResponse>.Ok(mapper.Map<TrapResponse>(trap)));
    }

    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<TrapResponse>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] CreateTrapRequest request, CancellationToken ct)
    {
        if (tenantContext.TenantId is null)
            return BadRequest(ApiResponse<object>.Fail("Tenant context is required."));

        if (!string.IsNullOrEmpty(request.Barcode))
        {
            var exists = await db.Traps.AnyAsync(t => t.Barcode == request.Barcode, ct);
            if (exists) return BadRequest(ApiResponse<object>.Fail("A trap with that barcode already exists."));
        }

        var trap = new Trap
        {
            TenantId = tenantContext.TenantId.Value,
            Name = request.Name,
            Barcode = request.Barcode,
            TrapTypeId = request.TrapTypeId,
            FieldId = request.FieldId,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            Notes = request.Notes
        };

        db.Traps.Add(trap);
        await db.SaveChangesAsync(ct);

        var created = await db.Traps
            .Include(t => t.TrapType)
            .Include(t => t.Field).ThenInclude(f => f!.Farm)
            .FirstAsync(t => t.Id == trap.Id, ct);

        return CreatedAtAction(nameof(GetById), new { id = trap.Id },
            ApiResponse<TrapResponse>.Ok(mapper.Map<TrapResponse>(created), "Trap created."));
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<TrapResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateTrapRequest request, CancellationToken ct)
    {
        var trap = await db.Traps
            .Include(t => t.TrapType)
            .FirstOrDefaultAsync(t => t.Id == id, ct);
        if (trap is null) return NotFound(ApiResponse<object>.Fail("Trap not found."));

        if (!string.IsNullOrEmpty(request.Barcode) && request.Barcode != trap.Barcode)
        {
            var exists = await db.Traps.AnyAsync(t => t.Barcode == request.Barcode && t.Id != id, ct);
            if (exists) return BadRequest(ApiResponse<object>.Fail("A trap with that barcode already exists."));
        }

        trap.Name = request.Name;
        trap.Barcode = request.Barcode;
        trap.TrapTypeId = request.TrapTypeId;
        trap.FieldId = request.FieldId;
        trap.Latitude = request.Latitude;
        trap.Longitude = request.Longitude;
        trap.IsEnabled = request.IsEnabled;
        trap.Notes = request.Notes;
        trap.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        var updated = await db.Traps
            .Include(t => t.TrapType)
            .Include(t => t.Field).ThenInclude(f => f!.Farm)
            .FirstAsync(t => t.Id == id, ct);
        return Ok(ApiResponse<TrapResponse>.Ok(mapper.Map<TrapResponse>(updated)));
    }

    [HttpPatch("{id:guid}/toggle")]
    [ProducesResponseType(typeof(ApiResponse<TrapResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Toggle(Guid id, CancellationToken ct)
    {
        var trap = await db.Traps
            .Include(t => t.TrapType)
            .FirstOrDefaultAsync(t => t.Id == id, ct);
        if (trap is null) return NotFound(ApiResponse<object>.Fail("Trap not found."));

        trap.IsEnabled = !trap.IsEnabled;
        trap.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        return Ok(ApiResponse<TrapResponse>.Ok(mapper.Map<TrapResponse>(trap),
            trap.IsEnabled ? "Trap enabled." : "Trap disabled."));
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var trap = await db.Traps.FirstOrDefaultAsync(t => t.Id == id, ct);
        if (trap is null) return NotFound(ApiResponse<object>.Fail("Trap not found."));

        trap.DeletedAt = DateTime.UtcNow;
        trap.IsEnabled = false;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
