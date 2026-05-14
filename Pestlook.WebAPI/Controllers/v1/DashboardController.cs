using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pestlook.WebAPI.Data;
using Pestlook.WebAPI.DTOs.Common;
using Pestlook.WebAPI.DTOs.Dashboard;
using Pestlook.WebAPI.Domain.Enums;
using Pestlook.WebAPI.Infrastructure;

namespace Pestlook.WebAPI.Controllers.v1;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/dashboard")]
[Authorize]
public sealed class DashboardController(ApplicationDbContext db, ITenantContext tenant) : ControllerBase
{
    /// <summary>
    /// Returns all data needed by the web dashboard in a single round-trip.
    /// Every sub-query is a focused SQL projection — no entity graph loading,
    /// no N+1, all queries run in parallel.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<DashboardResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        // Capture once so all queries share the same non-nullable value.
        // The global query filter uses (tenantId IS NULL OR ...) which prevents
        // SQL Server from using an index seek; using a direct equality here avoids that.
        var tenantId = tenant.TenantId;

        var farmCount             = await db.Farms.CountAsync(ct);
        var trapCount             = await db.Traps.CountAsync(ct);
        var enabledTrapCount      = await db.Traps.CountAsync(t => t.IsEnabled, ct);
        var sessionCount          = await db.ScoutingSessions.CountAsync(ct);
        var completedSessionCount = await db.ScoutingSessions.CountAsync(ss => ss.CompletedAt != null, ct);
        var outstandingSessionCount = sessionCount - completedSessionCount;
        var observationCount      = await db.SessionObservations
            .Where(o => o.Session.CompletedAt != null)
            .CountAsync(ct);

        var sessions = await db.ScoutingSessions
            .OrderByDescending(ss => ss.CreatedAt)
            .Take(5)
            .Select(ss => new DashboardSession(
                ss.Id,
                ss.Scouter != null ? ss.Scouter.FirstName + " " + ss.Scouter.LastName : null,
                ss.StartedAt,
                ss.CompletedAt,
                ss.SessionObservations.Count))
            .ToListAsync(ct);

        // IgnoreQueryFilters + direct equality lets SQL Server use IX_SessionObservations_TenantId_CreatedAt
        // with a seek rather than a scan caused by the (param IS NULL OR ...) query-filter pattern.
        var activity = tenantId.HasValue
            ? await db.SessionObservations
                .IgnoreQueryFilters()
                .Where(o => o.TenantId == tenantId.Value && o.Session.CompletedAt != null && o.ObservedAt != null)
                .OrderByDescending(o => o.ObservedAt)
                .Take(5)
                .Select(o => new DashboardObservation(
                    o.Id,
                    o.Pest != null ? o.Pest.CommonName : null,
                    o.IsUnknownPest,
                    o.Count,
                    o.CreatedAt,
                    o.ObservedAt,
                    o.LifeStage != null ? o.LifeStage.ToString() : null,
                    o.Session.Farm != null ? o.Session.Farm.Name : null,
                    o.Session.Field != null ? o.Session.Field.Name : null))
                .ToListAsync(ct)
            : await db.SessionObservations
                .Where(o => o.Session.CompletedAt != null && o.ObservedAt != null)
                .OrderByDescending(o => o.ObservedAt)
                .Take(5)
                .Select(o => new DashboardObservation(
                    o.Id,
                    o.Pest != null ? o.Pest.CommonName : null,
                    o.IsUnknownPest,
                    o.Count,
                    o.CreatedAt,
                    o.ObservedAt,
                    o.LifeStage != null ? o.LifeStage.ToString() : null,
                    o.Session.Farm != null ? o.Session.Farm.Name : null,
                    o.Session.Field != null ? o.Session.Field.Name : null))
                .ToListAsync(ct);

        var traps = await db.Traps
            .Select(t => new DashboardTrap(t.Id, t.Name, t.IsEnabled, t.Latitude, t.Longitude))
            .ToListAsync(ct);

        var threeMonthsAgo = DateTime.Now.AddMonths(-3);

        var topPests = await db.SessionObservations
            .Where(o => !o.IsUnknownPest
                     && o.PestId != null
                     && o.Session.CompletedAt != null
                     && o.Session.CompletedAt >= threeMonthsAgo)
            .GroupBy(o => o.PestId)
            .Select(g => new
            {
                PestId     = g.Key,
                TotalCount = g.Sum(o => o.Count ?? 1)
            })
            .OrderByDescending(x => x.TotalCount)
            .Take(5)
            .Join(db.Pests,
                x => x.PestId,
                p => p.Id,
                (x, p) => new DashboardTopPest(p.CommonName, x.TotalCount))
            .ToListAsync(ct);

        var stats    = new DashboardStats(farmCount, trapCount, enabledTrapCount, sessionCount, completedSessionCount, outstandingSessionCount, observationCount);
        var response = new DashboardResponse(stats, sessions, activity, traps, topPests);

        return Ok(ApiResponse<DashboardResponse>.Ok(response));
    }
}
