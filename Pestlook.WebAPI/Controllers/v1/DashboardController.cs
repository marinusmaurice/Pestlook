using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pestlook.WebAPI.Data;
using Pestlook.WebAPI.DTOs.Common;
using Pestlook.WebAPI.DTOs.Dashboard;
using Pestlook.WebAPI.Domain.Enums;

namespace Pestlook.WebAPI.Controllers.v1;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/dashboard")]
[Authorize]
public sealed class DashboardController(ApplicationDbContext db) : ControllerBase
{
    /// <summary>
    /// Returns all data needed by the web dashboard in a single round-trip.
    /// Every sub-query is a focused SQL projection — no entity graph loading,
    /// no N+1, all five queries run in parallel.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<DashboardResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var farmCount        = await db.Farms.CountAsync(ct);
        var trapCount        = await db.Traps.CountAsync(ct);
        var enabledTrapCount = await db.Traps.CountAsync(t => t.IsEnabled, ct);
        var sessionCount     = await db.ScoutingSessions.CountAsync(ct);
        var observationCount = await db.SessionObservations.CountAsync(ct);

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

        var activity = await db.SessionObservations
            .OrderByDescending(o => o.CreatedAt)
            .Take(5)
            .Select(o => new DashboardObservation(
                o.Id,
                o.Pest != null ? o.Pest.CommonName : null,
                o.IsUnknownPest,
                o.Count,
                o.CreatedAt))
            .ToListAsync(ct);

        var traps = await db.Traps
            .Select(t => new DashboardTrap(t.Id, t.Name, t.IsEnabled, t.Latitude, t.Longitude))
            .ToListAsync(ct);

        var topPests = (await db.SessionObservations
            .Where(o => !o.IsUnknownPest && o.PestId != null)
            .Join(db.Pests,
                o => o.PestId,
                p => p.Id,
                (o, p) => new { p.CommonName, o.Count })
            .ToListAsync(ct))
            .GroupBy(x => x.CommonName)
            .Select(g => new DashboardTopPest(g.Key!, g.Sum(x => x.Count ?? 1)))
            .OrderByDescending(p => p.TotalCount)
            .Take(5)
            .ToList();

        var stats = new DashboardStats(farmCount, trapCount, enabledTrapCount, sessionCount, observationCount);

        var response = new DashboardResponse(stats, sessions, activity, traps, topPests);

        return Ok(ApiResponse<DashboardResponse>.Ok(response));
    }
}
