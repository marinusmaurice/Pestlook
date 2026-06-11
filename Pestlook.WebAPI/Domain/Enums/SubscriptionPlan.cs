namespace Pestlook.WebAPI.Domain.Enums;

public enum SubscriptionPlan
{
    // Free plan: 10,000 observations per month.
    // Value 0 so existing tenants stored as Basic (0) map to Free.
    Free = 0,

    // Paid plans disabled — the platform is currently free.
    // Basic = 0,
    // Professional = 1,
    // Enterprise = 2
}
