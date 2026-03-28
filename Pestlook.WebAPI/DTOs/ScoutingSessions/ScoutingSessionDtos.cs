namespace Pestlook.WebAPI.DTOs.ScoutingSessions;

public sealed record StartScoutingSessionRequest(
    string? WeatherConditions,
    string? Notes);

public sealed record CompleteScoutingSessionRequest(
    string? WeatherConditions,
    string? Notes);

public sealed record ScoutingSessionResponse(
    Guid Id,
    Guid TenantId,
    string ScouterId,
    DateTime StartedAt,
    DateTime? CompletedAt,
    string? WeatherConditions,
    string? Notes,
    DateTime CreatedAt,
    int ObservationCount);
