namespace Pestlook.WebAPI.DTOs.ScoutingSessions;

public sealed record StartScoutingSessionRequest(
    string? WeatherConditions,
    double? TemperatureCelsius,
    string? Notes);

public sealed record CompleteScoutingSessionRequest(
    string? WeatherConditions,
    double? TemperatureCelsius,
    string? Notes);

public sealed record ScoutingSessionResponse(
    Guid Id,
    Guid TenantId,
    string ScouterId,
    string? ScouterName,
    DateTime StartedAt,
    DateTime? CompletedAt,
    string? WeatherConditions,
    double? TemperatureCelsius,
    string? Notes,
    DateTime CreatedAt,
    int ObservationCount)
{
    public ScoutingSessionResponse() : this(default, default, string.Empty, default, default, default, default, default, default, default, default) { }
}
