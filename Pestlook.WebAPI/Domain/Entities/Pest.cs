using Pestlook.WebAPI.Domain.Enums;

namespace Pestlook.WebAPI.Domain.Entities;

public sealed class Pest : IHasTenant
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;
    public string Name { get; set; } = string.Empty;
    public string? ScientificName { get; set; }
    public PestCategory Category { get; set; }
    public int? ThresholdCount { get; set; }
    public bool IsDefault { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DeletedAt { get; set; }

    public ICollection<MonitoringPointPest> MonitoringPointPests { get; set; } = [];
}
