namespace Pestlook.WebAPI.DTOs.Farms;

public sealed record CreateFarmRequest(
    string Name,
    string? Address,
    double? Latitude,
    double? Longitude,
    string? BoundaryGeoJson);

public sealed record UpdateFarmRequest(
    string Name,
    string? Address,
    double? Latitude,
    double? Longitude,
    string? BoundaryGeoJson,
    bool IsActive = true);

public sealed record FarmResponse(
    Guid Id,
    Guid TenantId,
    string Name,
    string? Address,
    double? Latitude,
    double? Longitude,
    string? BoundaryGeoJson,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt)
{
    public FarmResponse() : this(default, default, string.Empty, default, default, default, default, true, default, default) { }
}
