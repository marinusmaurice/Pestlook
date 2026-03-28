using Pestlook.WebAPI.Domain.Enums;

namespace Pestlook.WebAPI.DTOs.Pests;

public sealed record CreatePestRequest(
    string Name,
    string? ScientificName,
    PestCategory Category,
    int? ThresholdCount);

public sealed record UpdatePestRequest(
    string Name,
    string? ScientificName,
    PestCategory Category,
    int? ThresholdCount);

public sealed record PestResponse(
    Guid Id,
    Guid TenantId,
    string Name,
    string? ScientificName,
    PestCategory Category,
    int? ThresholdCount,
    bool IsDefault,
    DateTime CreatedAt);
