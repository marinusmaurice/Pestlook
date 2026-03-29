namespace Pestlook.WebAPI.DTOs.Fields;

public sealed record CreateFieldRequest(
    Guid FarmId,
    string Name,
    string? GeoBoundary,
    double? AreaHectares,
    string? CropType,
    string? Season);

public sealed record UpdateFieldRequest(
    string Name,
    string? GeoBoundary,
    double? AreaHectares,
    string? CropType,
    string? Season);

public sealed record FieldResponse(
    Guid Id,
    Guid FarmId,
    Guid TenantId,
    string Name,
    string? GeoBoundary,
    double? AreaHectares,
    string? CropType,
    string? Season,
    DateTime CreatedAt,
    DateTime UpdatedAt)
{
    public FieldResponse() : this(default, default, default, string.Empty, default, default, default, default, default, default) { }
}
