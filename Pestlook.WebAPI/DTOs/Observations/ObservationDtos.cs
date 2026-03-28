using System.ComponentModel.DataAnnotations;
using Pestlook.WebAPI.Domain.Enums;

namespace Pestlook.WebAPI.DTOs.Observations;

public sealed record ObservationPestRequest(
    Guid? PestId,
    string? PestName,
    int? Count,
    bool? IsPresent);

public sealed record CreateObservationRequest(
    Guid? MonitoringPointId,
    double? Latitude,
    double? Longitude,
    [Required] DateTime ObservedAt,
    string? Notes,
    string? ImageUrl,
    [Required] IReadOnlyList<ObservationPestRequest> Pests);

public sealed record ObservationPestResponse(
    Guid Id,
    Guid? PestId,
    string? PestName,
    int? Count,
    bool? IsPresent);

public sealed record ObservationResponse(
    Guid Id,
    Guid TenantId,
    Guid? MonitoringPointId,
    double? Latitude,
    double? Longitude,
    DateTime ObservedAt,
    string CreatedByUserId,
    string? Notes,
    string? ImageUrl,
    IReadOnlyList<ObservationPestResponse> Pests);
