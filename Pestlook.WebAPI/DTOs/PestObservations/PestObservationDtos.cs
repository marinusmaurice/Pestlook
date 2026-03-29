using Pestlook.WebAPI.Domain.Enums;

namespace Pestlook.WebAPI.DTOs.PestObservations;

public sealed record CreatePestObservationRequest(
    Guid SessionId,
    Guid MonitoringPointId,
    Guid? PestId,
    bool IsUnknownPest,
    string? UnknownPestDescription,
    CaptureMode CaptureMode,
    int? Count,
    bool? Present,
    string? LifeStage,
    double? CapturedLat,
    double? CapturedLng,
    List<string>? PhotoUrls,
    string? Notes,
    DateTime? ObservedAt);

public sealed record PestObservationResponse(
    Guid Id,
    Guid TenantId,
    Guid SessionId,
    Guid MonitoringPointId,
    Guid? PestId,
    string? PestName,
    bool IsUnknownPest,
    string? UnknownPestDescription,
    CaptureMode CaptureMode,
    int? Count,
    bool? Present,
    string? LifeStage,
    double? CapturedLat,
    double? CapturedLng,
    List<string> PhotoUrls,
    string? Notes,
    DateTime ObservedAt,
    DateTime CreatedAt)
{
    public PestObservationResponse() : this(default, default, default, default, default, default, default, default, default, default, default, default, default, default, new List<string>(), default, default, default) { }
}
