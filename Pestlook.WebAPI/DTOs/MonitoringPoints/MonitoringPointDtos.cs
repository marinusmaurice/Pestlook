using System.ComponentModel.DataAnnotations;
using Pestlook.WebAPI.Domain.Enums;

namespace Pestlook.WebAPI.DTOs.MonitoringPoints;

public sealed record CreateMonitoringPointRequest(
    [Required, MaxLength(200)] string Name,
    [Required] MonitoringPointType Type,
    [Required] double Latitude,
    [Required] double Longitude,
    Guid? FarmId,
    Guid? FieldId);

public sealed record UpdateMonitoringPointRequest(
    [Required, MaxLength(200)] string Name,
    [Required] MonitoringPointType Type,
    [Required] double Latitude,
    [Required] double Longitude,
    Guid? FarmId,
    Guid? FieldId,
    bool IsActive);

public sealed record MonitoringPointResponse(
    Guid Id,
    Guid TenantId,
    string Name,
    MonitoringPointType Type,
    double Latitude,
    double Longitude,
    Guid? FarmId,
    Guid? FieldId,
    bool IsActive,
    DateTime CreatedAt,
    IReadOnlyList<Guid> ExpectedPestIds);
