using Pestlook.WebAPI.Domain.Enums;

namespace Pestlook.WebAPI.Domain.Entities;

public sealed class Tenant
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public SubscriptionPlan SubscriptionPlan { get; set; } = SubscriptionPlan.Basic;
    public int MonitoringPointQuota { get; set; } = 10;
    public DateTime CreatedAt { get; set; } = DateTime.Now;

    public ICollection<ApplicationUser> Users { get; set; } = [];
    public ICollection<Farm> Farms { get; set; } = [];
    public ICollection<ScoutingSession> ScoutingSessions { get; set; } = [];
    public ICollection<BillingSnapshot> BillingSnapshots { get; set; } = [];
}
