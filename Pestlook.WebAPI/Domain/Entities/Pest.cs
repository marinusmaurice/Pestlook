using Pestlook.WebAPI.Domain.Enums;

namespace Pestlook.WebAPI.Domain.Entities;

public sealed class Pest : IHasTenant, IAuditableByUser
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;
    public string CommonName { get; set; } = string.Empty;
    public string? ScientificName { get; set; }
    public PestCategory Category { get; set; }
    public CaptureMode DefaultCaptureMode { get; set; } = CaptureMode.Count;
    public string? Description { get; set; }
    public bool IsSystemPest { get; set; }
    /// <summary>Economic action threshold — e.g., >5 count triggers an alert.</summary>
    public int? ThresholdCount { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DeletedAt { get; set; }

    public string? CreatedByUserId { get; set; }
    public string? UpdatedByUserId { get; set; }
    public string? DeletedByUserId { get; set; }
}
