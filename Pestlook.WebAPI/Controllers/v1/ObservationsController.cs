using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pestlook.WebAPI.Data;
using Pestlook.WebAPI.DTOs.Common;
using Pestlook.WebAPI.DTOs.PestObservations;

namespace Pestlook.WebAPI.Controllers.v1;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/pest-observations")]
[Authorize]
public sealed class ObservationsController(ApplicationDbContext db) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<List<PestObservationResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var observations = await db.SessionObservations
            .Include(o => o.Pest)
            .Include(o => o.Trap)
            .OrderByDescending(o => o.CreatedAt)
            .Select(o => new PestObservationResponse(
                o.Id,
                o.TenantId,
                o.SessionId,
                o.TrapId ?? Guid.Empty,
                o.PestId,
                o.Pest != null ? o.Pest.CommonName : null,
                o.IsUnknownPest,
                null,
                o.CaptureMode ?? default,
                o.Count,
                o.IsPresent,
                o.LifeStage != null ? o.LifeStage.ToString() : null,
                o.Latitude,
                o.Longitude,
                o.TrapId,
                o.Trap != null ? o.Trap.Name : null,
                o.PhotoUrlsJson != null
                    ? System.Text.Json.JsonSerializer.Deserialize<List<string>>(o.PhotoUrlsJson) ?? new List<string>()
                    : new List<string>(),
                o.Notes,
                o.CreatedAt,
                o.CreatedAt))
            .ToListAsync(ct);

        return Ok(ApiResponse<List<PestObservationResponse>>.Ok(observations));
    }
}
