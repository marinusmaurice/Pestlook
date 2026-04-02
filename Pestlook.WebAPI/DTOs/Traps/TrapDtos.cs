namespace Pestlook.WebAPI.DTOs.Traps;

public sealed record CreateTrapRequest(
    string Name,
    string? Barcode,
    Guid? TrapTypeId,
    double? Latitude,
    double? Longitude,
    string? Notes);

public sealed record UpdateTrapRequest(
    string Name,
    string? Barcode,
    Guid? TrapTypeId,
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
    double? Latitude,
    double? Longitude,
    bool IsEnabled,
    string? Notes,
    DateTime CreatedAt,
    DateTime UpdatedAt)
{
    public TrapResponse() : this(default, default, string.Empty, default, default, default, default, default, default, default, default, default) { }
}
