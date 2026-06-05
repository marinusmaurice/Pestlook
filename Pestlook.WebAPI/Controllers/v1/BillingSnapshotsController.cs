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
    IQuotaService quotaService,
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
    /// Charges a flat monthly fee based on the tenant's subscription plan,
    /// pro-rated if the tenant signed up during that month.
    /// Observation counts are based on ObservedAt within the billing month.
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

        var tenantId     = tenantContext.TenantId.Value;
        var billingMonth = new DateTime(year, month, 1);
        var monthEnd     = billingMonth.AddMonths(1);

        var alreadyExists = await db.BillingSnapshots
            .AnyAsync(b => b.TenantId == tenantId && b.BillingMonth == billingMonth, ct);
        if (alreadyExists)
            return Conflict(ApiResponse<object>.Fail($"A snapshot for {year}-{month:D2} already exists."));

        var tenant = await db.Tenants
            .IgnoreQueryFilters()
            .FirstAsync(t => t.Id == tenantId, ct);

        var planConfig = await quotaService.GetPlanConfigAsync(tenant.SubscriptionPlan, ct);
        var (quota, amountCents, isProRata, proRataDays) =
            quotaService.GetBillingTerms(planConfig.ObservationQuota, planConfig.AmountCents, tenant.CreatedAt, year, month);

        var captured = await db.SessionObservations
            .CountAsync(o => o.ObservedAt >= billingMonth && o.ObservedAt < monthEnd, ct);

        var used = Math.Min(captured, quota);

        // Active trap count kept for historical context
        var activePointCount = await db.Traps.CountAsync(t => t.IsEnabled, ct);

        var snapshot = new BillingSnapshot
        {
            TenantId             = tenantId,
            OwnerId              = currentUserService.UserId!,
            BillingMonth         = billingMonth,
            ActivePointCount     = activePointCount,
            ObservationQuota     = quota,
            ObservationsCaptured = captured,
            ObservationsUsed     = used,
            AmountCents          = amountCents,
            IsProRata            = isProRata,
            ProRataDays          = isProRata ? proRataDays : null,
            Status               = "pending"
        };

        db.BillingSnapshots.Add(snapshot);
        await db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(GetById), new { id = snapshot.Id },
            ApiResponse<BillingSnapshotResponse>.Ok(mapper.Map<BillingSnapshotResponse>(snapshot), "Billing snapshot generated."));
    }
}
