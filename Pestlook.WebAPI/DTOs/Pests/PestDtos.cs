using System.ComponentModel.DataAnnotations;
using Pestlook.WebAPI.Domain.Enums;

namespace Pestlook.WebAPI.DTOs.Pests;

public sealed record CreatePestRequest(
    [Required, MaxLength(200)] string Name,
    [Required] PestCategory Category);

public sealed record UpdatePestRequest(
    [Required, MaxLength(200)] string Name,
    [Required] PestCategory Category);

public sealed record PestResponse(
    Guid Id,
    Guid TenantId,
    string Name,
    PestCategory Category,
    bool IsSystem);
