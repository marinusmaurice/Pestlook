namespace Pestlook.WebAPI.DTOs.Fields;

public sealed record CreateFieldRequest(
    Guid FarmId,
    string Name,
    string? CropType,
    string? BoundaryGeoJson);

public sealed record UpdateFieldRequest(
    string Name,
    string? CropType,
    string? BoundaryGeoJson);

public sealed record FieldResponse(
    Guid Id,
    Guid FarmId,
    Guid TenantId,
    string Name,
    string? CropType,
    string? BoundaryGeoJson,
    DateTime CreatedAt,
    DateTime UpdatedAt);
