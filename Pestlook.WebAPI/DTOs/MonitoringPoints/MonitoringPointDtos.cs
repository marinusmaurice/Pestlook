using Pestlook.WebAPI.Domain.Enums;

namespace Pestlook.WebAPI.DTOs.MonitoringPoints;

public sealed record CreateMonitoringPointRequest(
    Guid FieldId,
    MonitoringPointType PointType,
    string? Name,
    double Latitude,
    double Longitude,
    string? TrapType,
    List<Guid>? PestIds);

public sealed record UpdateMonitoringPointRequest(
    string? Name,
    double Latitude,
    double Longitude,
    string? TrapType,
    bool IsActive);

public sealed record AssignPestRequest(Guid PestId, bool IsTargeted = true);

public sealed record MonitoringPointResponse(
    Guid Id,
    Guid FieldId,
    Guid TenantId,
    MonitoringPointType PointType,
    string? Name,
    double Latitude,
    double Longitude,
    string? TrapType,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    List<AssignedPestResponse> AssignedPests);

public sealed record AssignedPestResponse(
    Guid MonitoringPointPestId,
    Guid PestId,
    string PestName,
    bool IsTargeted);
