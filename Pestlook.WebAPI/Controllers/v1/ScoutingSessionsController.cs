using Asp.Versioning;
using AutoMapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pestlook.WebAPI.Data;
using Pestlook.WebAPI.Domain.Entities;
using Pestlook.WebAPI.DTOs.Common;
using Pestlook.WebAPI.DTOs.ScoutingSessions;
using Pestlook.WebAPI.Infrastructure;
using Pestlook.WebAPI.Infrastructure.Services.Interfaces;

namespace Pestlook.WebAPI.Controllers.v1;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/scouting-sessions")]
[Authorize]
public sealed class ScoutingSessionsController(
    ApplicationDbContext db,
    ITenantContext tenantContext,
    ICurrentUserService currentUserService,
    IMapper mapper) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<List<ScoutingSessionResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var sessions = await db.ScoutingSessions
            .Include(ss => ss.Scouter)
            .Include(ss => ss.PestObservations)
            .OrderByDescending(ss => ss.StartedAt)
            .ToListAsync(ct);
        return Ok(ApiResponse<List<ScoutingSessionResponse>>.Ok(mapper.Map<List<ScoutingSessionResponse>>(sessions)));
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<ScoutingSessionResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var session = await db.ScoutingSessions
            .Include(ss => ss.Scouter)
            .Include(ss => ss.PestObservations)
            .FirstOrDefaultAsync(ss => ss.Id == id, ct);
        if (session is null) return NotFound(ApiResponse<object>.Fail("Scouting session not found."));
        return Ok(ApiResponse<ScoutingSessionResponse>.Ok(mapper.Map<ScoutingSessionResponse>(session)));
    }

    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<ScoutingSessionResponse>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Start([FromBody] StartScoutingSessionRequest request, CancellationToken ct)
    {
        if (tenantContext.TenantId is null)
            return BadRequest(ApiResponse<object>.Fail("Tenant context is required."));

        var session = new ScoutingSession
        {
            TenantId = tenantContext.TenantId.Value,
            ScouterId = currentUserService.UserId!,
            WeatherConditions = request.WeatherConditions,
            Notes = request.Notes
        };
        db.ScoutingSessions.Add(session);
        await db.SaveChangesAsync(ct);

        var created = await db.ScoutingSessions
            .Include(ss => ss.Scouter)
            .Include(ss => ss.PestObservations)
            .FirstAsync(ss => ss.Id == session.Id, ct);

        return CreatedAtAction(nameof(GetById), new { id = session.Id },
            ApiResponse<ScoutingSessionResponse>.Ok(mapper.Map<ScoutingSessionResponse>(created), "Scouting session started."));
    }

    /// <summary>Mark a session as completed.</summary>
    [HttpPatch("{id:guid}/complete")]
    [ProducesResponseType(typeof(ApiResponse<ScoutingSessionResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Complete(Guid id, [FromBody] CompleteScoutingSessionRequest request, CancellationToken ct)
    {
        var session = await db.ScoutingSessions
            .Include(ss => ss.Scouter)
            .Include(ss => ss.PestObservations)
            .FirstOrDefaultAsync(ss => ss.Id == id, ct);
        if (session is null) return NotFound(ApiResponse<object>.Fail("Scouting session not found."));
        if (session.CompletedAt.HasValue) return BadRequest(ApiResponse<object>.Fail("Session already completed."));

        session.CompletedAt = DateTime.UtcNow;
        if (request.WeatherConditions is not null) session.WeatherConditions = request.WeatherConditions;
        if (request.Notes is not null) session.Notes = request.Notes;
        await db.SaveChangesAsync(ct);

        return Ok(ApiResponse<ScoutingSessionResponse>.Ok(mapper.Map<ScoutingSessionResponse>(session), "Session completed."));
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var session = await db.ScoutingSessions.FirstOrDefaultAsync(ss => ss.Id == id, ct);
        if (session is null) return NotFound(ApiResponse<object>.Fail("Scouting session not found."));

        db.ScoutingSessions.Remove(session);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
