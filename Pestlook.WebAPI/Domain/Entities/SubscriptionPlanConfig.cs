using Pestlook.WebAPI.Domain.Enums;

namespace Pestlook.WebAPI.Domain.Entities;

public sealed class SubscriptionPlanConfig
{
    public SubscriptionPlan Plan { get; set; }
    public int ObservationQuota { get; set; }
    public int AmountCents { get; set; }
    public int MonitoringPointQuota { get; set; }
}
