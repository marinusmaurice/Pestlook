using System.ComponentModel.DataAnnotations;

namespace Pestlook.WebAPI.DTOs.Fields;

public sealed record CreateFieldRequest(
    [Required] Guid FarmId,
    [Required, MaxLength(200)] string Name,
    string? BoundaryGeoJson);

public sealed record UpdateFieldRequest(
    [Required, MaxLength(200)] string Name,
    string? BoundaryGeoJson);

public sealed record FieldResponse(
    Guid Id,
    Guid FarmId,
    Guid TenantId,
    string Name,
    string? BoundaryGeoJson);
