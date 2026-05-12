using Asp.Versioning;
using AutoMapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pestlook.WebAPI.Data;
using Pestlook.WebAPI.Domain.Entities;
using Pestlook.WebAPI.DTOs.BillingSnapshots;
using Pestlook.WebAPI.DTOs.Common;
using Pestlook.WebAPI.Infrastructure;
using Pestlook.WebAPI.Infrastructure.Services.Interfaces;

namespace Pestlook.WebAPI.Controllers.v1;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/billing-snapshots")]
[Authorize(Roles = "Admin")]
public sealed class BillingSnapshotsController(
    ApplicationDbContext db,
    ITenantContext tenantContext,
    ICurrentUserService currentUserService,
    IMapper mapper) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<List<BillingSnapshotResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var snapshots = await db.BillingSnapshots
            .OrderByDescending(b => b.BillingMonth)
            .ToListAsync(ct);
        return Ok(ApiResponse<List<BillingSnapshotResponse>>.Ok(mapper.Map<List<BillingSnapshotResponse>>(snapshots)));
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<BillingSnapshotResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var snapshot = await db.BillingSnapshots.FirstOrDefaultAsync(b => b.Id == id, ct);
        if (snapshot is null) return NotFound(ApiResponse<object>.Fail("Billing snapshot not found."));
        return Ok(ApiResponse<BillingSnapshotResponse>.Ok(mapper.Map<BillingSnapshotResponse>(snapshot)));
    }

    /// <summary>
    /// Generate a billing snapshot for the given month.
    /// Counts MonitoringPoints where DeletedAt IS NULL AND IsActive = true for this tenant.
    /// </summary>
    [HttpPost("generate")]
    [ProducesResponseType(typeof(ApiResponse<BillingSnapshotResponse>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Generate([FromQuery] int year, [FromQuery] int month, CancellationToken ct)
    {
        if (tenantContext.TenantId is null)
            return BadRequest(ApiResponse<object>.Fail("Tenant context is required."));

        if (year < 2000 || year > 2100 || month < 1 || month > 12)
            return BadRequest(ApiResponse<object>.Fail("Invalid year or month."));

        var billingMonth = new DateTime(year, month, 1, 0, 0, 0);

        var alreadyExists = await db.BillingSnapshots
            .AnyAsync(b => b.TenantId == tenantContext.TenantId.Value && b.BillingMonth == billingMonth, ct);
        if (alreadyExists)
            return Conflict(ApiResponse<object>.Fail($"A snapshot for {year}-{month:D2} already exists."));

        var activePointCount = await db.Traps
            .CountAsync(t => t.IsEnabled, ct);

        var snapshot = new BillingSnapshot
        {
            TenantId = tenantContext.TenantId.Value,
            OwnerId = currentUserService.UserId!,
            BillingMonth = billingMonth,
            ActivePointCount = activePointCount,
            AmountCents = activePointCount * 500, // $5.00 per active point
            Status = "pending"
        };
        db.BillingSnapshots.Add(snapshot);
        await db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(GetById), new { id = snapshot.Id },
            ApiResponse<BillingSnapshotResponse>.Ok(mapper.Map<BillingSnapshotResponse>(snapshot), "Billing snapshot generated."));
    }
}
