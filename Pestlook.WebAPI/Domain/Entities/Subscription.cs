using Pestlook.WebAPI.Domain.Enums;

namespace Pestlook.WebAPI.Domain.Entities;

public sealed class Subscription : IHasTenant
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;
    public SubscriptionPlan Plan { get; set; }
    public int MonitoringPointLimit { get; set; }
    public decimal PricePerMonth { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
}
