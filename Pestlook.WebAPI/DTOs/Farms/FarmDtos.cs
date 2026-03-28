namespace Pestlook.WebAPI.DTOs.Farms;

public sealed record CreateFarmRequest(
    string Name,
    string? Address,
    string? BoundaryGeoJson);

public sealed record UpdateFarmRequest(
    string Name,
    string? Address,
    string? BoundaryGeoJson);

public sealed record FarmResponse(
    Guid Id,
    Guid TenantId,
    string Name,
    string? Address,
    string? BoundaryGeoJson,
    DateTime CreatedAt,
    DateTime UpdatedAt);
