using Pestlook.WebAPI.Domain.Enums;

namespace Pestlook.WebAPI.DTOs.Pests;

public sealed record CreatePestRequest(
    string CommonName,
    string? ScientificName,
    PestCategory Category,
    CaptureMode DefaultCaptureMode,
    int? ThresholdCount,
    string? Description,
    string? ImageUrl);

public sealed record UpdatePestRequest(
    string CommonName,
    string? ScientificName,
    PestCategory Category,
    CaptureMode DefaultCaptureMode,
    int? ThresholdCount,
    string? Description,
    string? ImageUrl);

public sealed record PestResponse(
    Guid Id,
    Guid TenantId,
    string CommonName,
    string? ScientificName,
    PestCategory Category,
    CaptureMode DefaultCaptureMode,
    int? ThresholdCount,
    string? Description,
    string? ImageUrl,
    bool IsSystemPest,
    DateTime CreatedAt)
{
    public PestResponse() : this(default, default, string.Empty, default, default, default, default, default, default, default, default) { }
}
