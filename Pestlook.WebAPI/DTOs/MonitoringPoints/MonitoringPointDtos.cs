using Pestlook.WebAPI.Domain.Enums;

namespace Pestlook.WebAPI.DTOs.MonitoringPoints;

public sealed record CreateMonitoringPointRequest(
    Guid FarmId,
    Guid? FieldId,
    MonitoringPointType PointType,
    string? Name,
    double Latitude,
    double Longitude,
    Guid? TrapTypeId,
    string? Notes,
    List<AssignPestRequest>? Pests);

public sealed record UpdateMonitoringPointRequest(
    string? Name,
    double Latitude,
    double Longitude,
    Guid? TrapTypeId,
    string? Notes,
    bool IsActive);

public sealed record AssignPestRequest(
    Guid PestId,
    bool AllowUnknown = false);

public sealed record MonitoringPointResponse(
    Guid Id,
    Guid TenantId,
    Guid FarmId,
    Guid? FieldId,
    MonitoringPointType PointType,
    string? Name,
    double Latitude,
    double Longitude,
    Guid? TrapTypeId,
    string? TrapTypeName,
    bool IsActive,
    string? Notes,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    List<AssignedPestSummary> AssignedPests)
{
    public MonitoringPointResponse() : this(default, default, default, default, default, default, default, default, default, default, default, default, default, default, new List<AssignedPestSummary>()) { }
};

public sealed record AssignedPestSummary(
    Guid MonitoringPointPestId,
    Guid PestId,
    string PestName,
    bool AllowUnknown,
    bool IsActive)
{
    public AssignedPestSummary() : this(default, default, string.Empty, default, default) { }
}
