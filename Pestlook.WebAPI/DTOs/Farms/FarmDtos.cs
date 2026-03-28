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
    string? BoundaryGeoJson);

public sealed record FarmResponse(
    Guid Id,
    Guid TenantId,
    string Name,
    string? Address,
    double? Latitude,
    double? Longitude,
    string? BoundaryGeoJson,
    DateTime CreatedAt,
    DateTime UpdatedAt);
