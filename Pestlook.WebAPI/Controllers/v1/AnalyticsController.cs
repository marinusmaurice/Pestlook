using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using Pestlook.WebAPI.Data;
using Pestlook.WebAPI.Domain.Enums;
using Pestlook.WebAPI.DTOs.Common;
using Pestlook.WebAPI.DTOs.ScoutingSessions;

namespace Pestlook.WebAPI.Controllers.v1;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/analytics")]
[Authorize]
public sealed class AnalyticsController(ApplicationDbContext db) : ControllerBase
{
    /// <summary>
    /// Returns all scouting sessions with their full observation payloads.
    /// Used exclusively by the analytics/reports pages — the standard
    /// GET /scouting-sessions endpoint deliberately omits observations for performance.
    /// </summary>
    [HttpGet("sessions")]
    [ProducesResponseType(typeof(ApiResponse<List<ScoutingSessionResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSessionsWithObservations(CancellationToken ct)
    {
        var projected = await db.ScoutingSessions
            .Select(ss => new
            {
                ss.Id,
                ss.TenantId,
                ss.ScouterId,
                ss.IsPlanned,
                ss.ScheduledDate,
                ss.StartedAt,
                ss.CompletedAt,
                ss.WeatherConditions,
                ss.TemperatureCelsius,
                ss.Notes,
                ss.CreatedAt,
                ss.FieldId,
                ss.FarmId,
                FieldFarmId   = ss.Field != null ? (Guid?)ss.Field.FarmId : null,
                FieldName     = ss.Field != null ? ss.Field.Name : null,
                FarmName      = ss.Farm  != null ? ss.Farm.Name
                              : ss.Field != null && ss.Field.Farm != null ? ss.Field.Farm.Name : null,
                ScouterName   = ss.Scouter   != null ? ss.Scouter.FirstName   + " " + ss.Scouter.LastName   : null,
                CreatedByName = ss.CreatedBy != null ? ss.CreatedBy.FirstName + " " + ss.CreatedBy.LastName : null,
                UpdatedByName = ss.UpdatedBy != null ? ss.UpdatedBy.FirstName + " " + ss.UpdatedBy.LastName : null,
                Observations  = ss.SessionObservations.Select(o => new
                {
                    o.Id,
                    o.ObservationType,
                    o.IsPlanned,
                    o.TrapId,
                    TrapName      = o.Trap != null ? o.Trap.Name : null,
                    o.PestId,
                    PestName      = o.Pest != null ? o.Pest.CommonName : null,
                    o.CaptureMode,
                    o.Count,
                    o.IsPresent,
                    o.Latitude,
                    o.Longitude,
                    o.IsUnknownPest,
                    o.Notes,
                    o.LifeStage,
                    o.ThresholdCount,
                    o.SortOrder,
                    o.PhotoUrlsJson,
                    o.ObservationGroupId,
                    CreatedByName = o.CreatedBy != null ? o.CreatedBy.FirstName + " " + o.CreatedBy.LastName : null,
                    UpdatedByName = o.UpdatedBy != null ? o.UpdatedBy.FirstName + " " + o.UpdatedBy.LastName : null
                }).ToList()
            })
            .OrderByDescending(ss => ss.CreatedAt)
            .ToListAsync(ct);

        var sessions = projected.Select(p => new ScoutingSessionResponse(
            p.Id, p.TenantId, p.ScouterId, p.ScouterName, p.IsPlanned,
            p.ScheduledDate, p.StartedAt, p.CompletedAt, p.WeatherConditions,
            p.TemperatureCelsius, p.Notes, p.CreatedAt, p.FieldId,
            p.FarmId ?? p.FieldFarmId, p.FieldName, p.FarmName,
            p.Observations.Count,
            p.Observations.Count(o => o.ObservationType == ObservationType.Trap),
            p.Observations.Count(o => o.ObservationType == ObservationType.AdHoc),
            p.Observations.Select(o => new SessionObservationResponse(
                o.Id, o.ObservationType, o.IsPlanned, o.TrapId, o.TrapName,
                o.PestId, o.PestName, o.CaptureMode, o.Count, o.IsPresent,
                o.Latitude, o.Longitude, o.IsUnknownPest, o.Notes, o.LifeStage,
                o.ThresholdCount, o.SortOrder,
                o.PhotoUrlsJson is not null
                    ? JsonSerializer.Deserialize<List<string>>(o.PhotoUrlsJson) ?? []
                    : [],
                o.ObservationGroupId, o.CreatedByName, o.UpdatedByName)).ToList(),
            p.CreatedByName, p.UpdatedByName)).ToList();

        return Ok(ApiResponse<List<ScoutingSessionResponse>>.Ok(sessions));
    }
}
