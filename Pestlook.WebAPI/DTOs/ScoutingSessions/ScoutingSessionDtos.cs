using Pestlook.WebAPI.Domain.Enums;

namespace Pestlook.WebAPI.DTOs.ScoutingSessions;

// ── Requests ──────────────────────────────────────────────────────────────────

public sealed record StartScoutingSessionRequest(
    string? WeatherConditions,
    double? TemperatureCelsius,
    string? Notes);

public sealed record CompleteScoutingSessionRequest(
    string? WeatherConditions,
    double? TemperatureCelsius,
    string? Notes);

public sealed record CreatePlannedSessionRequest(
    string? ScouterId,
    DateTime? ScheduledDate,
    string? WeatherConditions,
    double? TemperatureCelsius,
    string? Notes,
    List<SessionObservationItem>? Observations);

public sealed record UpdatePlannedSessionRequest(
    string? ScouterId,
    DateTime? ScheduledDate,
    string? WeatherConditions,
    double? TemperatureCelsius,
    string? Notes,
    List<SessionObservationItem>? Observations);

/// <summary>A single observation item (trap inspection or ad-hoc) to add to a session.</summary>
public sealed record SessionObservationItem(
    ObservationType ObservationType,
    Guid? TrapId,
    Guid? PestId,
    CaptureMode? CaptureMode,
    int? Count,
    bool? IsPresent,
    double? Latitude,
    double? Longitude,
    bool IsUnknownPest,
    string? Notes,
    LifeStage? LifeStage,
    List<string>? PhotoUrls);

// ── Responses ─────────────────────────────────────────────────────────────────

public sealed record ScoutingSessionResponse(
    Guid Id,
    Guid TenantId,
    string? ScouterId,
    string? ScouterName,
    bool IsPlanned,
    DateTime? ScheduledDate,
    DateTime? StartedAt,
    DateTime? CompletedAt,
    string? WeatherConditions,
    double? TemperatureCelsius,
    string? Notes,
    DateTime CreatedAt,
    int ObservationCount,
    List<SessionObservationResponse> Observations)
{
    public ScoutingSessionResponse() : this(default, default, default, default, default, default, default, default, default, default, default, default, default, []) { }
}

public sealed record SessionObservationResponse(
    Guid Id,
    ObservationType ObservationType,
    bool IsPlanned,
    Guid? TrapId,
    string? TrapName,
    Guid? PestId,
    string? PestName,
    CaptureMode? CaptureMode,
    int? Count,
    bool? IsPresent,
    double? Latitude,
    double? Longitude,
    bool IsUnknownPest,
    string? Notes,
    LifeStage? LifeStage,
    int SortOrder,
    List<string> PhotoUrls)
{
    public SessionObservationResponse() : this(default, default, default, default, default, default, default, default, default, default, default, default, default, default, default, default, []) { }
}
