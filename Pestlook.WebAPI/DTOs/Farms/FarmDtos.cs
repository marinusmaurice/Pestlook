using System.ComponentModel.DataAnnotations;

namespace Pestlook.WebAPI.DTOs.Farms;

public sealed record CreateFarmRequest(
    [Required, MaxLength(200)] string Name);

public sealed record UpdateFarmRequest(
    [Required, MaxLength(200)] string Name);

public sealed record FarmResponse(
    Guid Id,
    Guid TenantId,
    string Name,
    DateTime CreatedAt);
