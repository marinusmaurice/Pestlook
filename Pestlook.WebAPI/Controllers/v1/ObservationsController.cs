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
        var rows = await db.SessionObservations
            .Include(o => o.Pest)
            .Include(o => o.Trap)
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync(ct);

        var observations = rows.Select(o => new PestObservationResponse(
                o.Id,
                o.TenantId,
                o.SessionId,
                o.TrapId ?? Guid.Empty,
                o.PestId,
                o.Pest?.CommonName,
                o.IsUnknownPest,
                null,
                o.CaptureMode ?? default,
                o.Count,
                o.IsPresent,
                o.LifeStage?.ToString(),
                o.Latitude,
                o.Longitude,
                o.TrapId,
                o.Trap?.Name,
                o.PhotoUrlsJson is not null
                    ? System.Text.Json.JsonSerializer.Deserialize<List<string>>(o.PhotoUrlsJson) ?? []
                    : [],
                o.Notes,
                o.CreatedAt,
                o.CreatedAt))
            .ToList();

        return Ok(ApiResponse<List<PestObservationResponse>>.Ok(observations));
    }
}
