namespace Pestlook.WebAPI.DTOs.Observations;

public sealed record CreateObservationRequest(
    Guid MonitoringPointId,
    Guid? PestId,
    string? PestNameText,
    int? Count,
    bool? Presence,
    string? LifeStage,
    string? Notes,
    List<string>? PhotoUrls,
    DateTime? ObservedAt);

public sealed record ObservationResponse(
    Guid Id,
    Guid MonitoringPointId,
    Guid TenantId,
    string ScoutUserId,
    Guid? PestId,
    string? PestName,
    string? PestNameText,
    int? Count,
    bool? Presence,
    string? LifeStage,
    string? Notes,
    List<string> PhotoUrls,
    DateTime ObservedAt,
    DateTime CreatedAt);
