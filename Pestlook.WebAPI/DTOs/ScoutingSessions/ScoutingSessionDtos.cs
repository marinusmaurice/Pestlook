using Pestlook.WebAPI.Domain.Enums;

namespace Pestlook.WebAPI.DTOs.ScoutingSessions;

// ── Requests ──────────────────────────────────────────────────────────────────

public sealed record StartScoutingSessionRequest(
    Guid? FieldId,
    string? WeatherConditions,
    double? TemperatureCelsius,
    string? Notes);

public sealed record CompleteScoutingSessionRequest(
    string? WeatherConditions,
    double? TemperatureCelsius,
    string? Notes,
    DateTime? StartedAt);

public sealed record CreatePlannedSessionRequest(
    string? ScouterId,
    Guid? FieldId,
    Guid? FarmId,
    DateTime? ScheduledDate,
    string? WeatherConditions,
    double? TemperatureCelsius,
    string? Notes,
    List<SessionObservationItem>? Observations);

public sealed record UpdatePlannedSessionRequest(
    string? ScouterId,
    Guid? FieldId,
    Guid? FarmId,
    DateTime? ScheduledDate,
    string? WeatherConditions,
    double? TemperatureCelsius,
    string? Notes,
    List<SessionObservationItem>? Observations);

/// <summary>A single observation item (trap inspection or ad-hoc) to add to a session.</summary>
public sealed record SessionObservationItem(
    Guid? Id,
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
    List<string>? PhotoUrls,
    Guid? ObservationGroupId = null,
    int RepeatCount = 1,
    bool IsPlanned = false,
    DateTime? ObservedAt = null);

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
    Guid? FieldId,
    Guid? FarmId,
    string? FieldName,
    string? FarmName,
    int ObservationCount,
    int TrapObservationCount,
    int AdHocObservationCount,
    List<SessionObservationResponse> Observations,
    string? CreatedByName,
    string? UpdatedByName)
{
    public ScoutingSessionResponse() : this(default, default, default, default, default, default, default, default, default, default, default, default, default, default, default, default, default, 0, 0, [], default, default) { }
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
    int? ThresholdCount,
    int SortOrder,
    List<string> PhotoUrls,
    Guid? ObservationGroupId,
    string? CreatedByName,
    string? UpdatedByName,
    DateTime? ObservedAt,
    DateTime CreatedAt)
{
    public SessionObservationResponse() : this(default, default, default, default, default, default, default, default, default, default, default, default, default, default, default, default, default, [], default, default, default, default, default) { }
}
