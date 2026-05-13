namespace Pestlook.WebAPI.DTOs.Fields;

public sealed record CreateFieldRequest(
    Guid FarmId,
    string Name,
    string? GeoBoundary,
    double? AreaHectares,
    double? Latitude,
    double? Longitude,
    string? CropType,
    string? Season);

public sealed record UpdateFieldRequest(
    string Name,
    string? GeoBoundary,
    double? AreaHectares,
    double? Latitude,
    double? Longitude,
    string? CropType,
    string? Season,
    bool IsActive = true);

public sealed record FieldResponse(
    Guid Id,
    Guid FarmId,
    Guid TenantId,
    string Name,
    string? GeoBoundary,
    double? AreaHectares,
    double? Latitude,
    double? Longitude,
    string? CropType,
    string? Season,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt)
{
    public FieldResponse() : this(default, default, default, string.Empty, default, default, default, default, default, default, true, default, default) { }
}
