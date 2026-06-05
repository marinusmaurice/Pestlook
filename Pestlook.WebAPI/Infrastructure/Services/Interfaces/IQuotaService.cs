using Pestlook.WebAPI.Domain.Entities;
using Pestlook.WebAPI.Domain.Enums;

namespace Pestlook.WebAPI.Infrastructure.Services.Interfaces;

public interface IQuotaService
{
    /// <summary>Current month quota usage for a tenant.</summary>
    Task<QuotaStatus> GetCurrentMonthStatusAsync(Guid tenantId, CancellationToken ct = default);

    /// <summary>Next available MonthlySequence for a tenant's ObservedAt month.</summary>
    Task<int> GetNextSequenceAsync(Guid tenantId, DateTime observedAt, CancellationToken ct = default);

    /// <summary>Plan limits for a given subscription plan, sourced from the DB.</summary>
    Task<SubscriptionPlanConfig> GetPlanConfigAsync(SubscriptionPlan plan, CancellationToken ct = default);

    /// <summary>Billing terms for a specific tenant/month, applying pro-rata on the signup month.</summary>
    (int quota, int amountCents, bool isProRata, int proRataDays) GetBillingTerms(
        int fullQuota, int fullAmountCents, DateTime tenantCreatedAt, int year, int month);
}

public sealed record QuotaStatus(
    int Quota,
    int Used,
    int Captured,
    int Excess,
    bool IsExceeded,
    DateTime BillingMonth,
    bool IsProRata,
    int? ProRataDays);
