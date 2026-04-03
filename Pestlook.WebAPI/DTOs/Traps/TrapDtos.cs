namespace Pestlook.WebAPI.DTOs.Traps;

public sealed record CreateTrapRequest(
    string Name,
    string? Barcode,
    Guid? TrapTypeId,
    Guid? FieldId,
    double? Latitude,
    double? Longitude,
    string? Notes);

public sealed record UpdateTrapRequest(
    string Name,
    string? Barcode,
    Guid? TrapTypeId,
    Guid? FieldId,
    double? Latitude,
    double? Longitude,
    bool IsEnabled,
    string? Notes);

public sealed record TrapResponse(
    Guid Id,
    Guid TenantId,
    string Name,
    string? Barcode,
    Guid? TrapTypeId,
    string? TrapTypeName,
    Guid? FieldId,
    string? FieldName,
    string? FarmName,
    double? Latitude,
    double? Longitude,
    bool IsEnabled,
    string? Notes,
    DateTime CreatedAt,
    DateTime UpdatedAt)
{
    public TrapResponse() : this(default, default, string.Empty, default, default, default, default, default, default, default, default, default, default, default, default) { }
}
