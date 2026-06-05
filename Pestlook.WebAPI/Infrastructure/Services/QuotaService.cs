using Microsoft.EntityFrameworkCore;
using Pestlook.WebAPI.Data;
using Pestlook.WebAPI.Domain.Entities;
using Pestlook.WebAPI.Domain.Enums;
using Pestlook.WebAPI.Infrastructure.Services.Interfaces;

namespace Pestlook.WebAPI.Infrastructure.Services;

public sealed class QuotaService(ApplicationDbContext db) : IQuotaService
{
    public async Task<SubscriptionPlanConfig> GetPlanConfigAsync(SubscriptionPlan plan, CancellationToken ct = default)
    {
        return await db.SubscriptionPlanConfigs.FirstAsync(c => c.Plan == plan, ct);
    }

    public async Task<QuotaStatus> GetCurrentMonthStatusAsync(Guid tenantId, CancellationToken ct = default)
    {
        var tenant = await db.Tenants
            .IgnoreQueryFilters()
            .FirstAsync(t => t.Id == tenantId, ct);

        var config = await GetPlanConfigAsync(tenant.SubscriptionPlan, ct);

        var now = DateTime.Now;
        var (quota, _, isProRata, proRataDays) = GetBillingTerms(
            config.ObservationQuota, config.AmountCents, tenant.CreatedAt, now.Year, now.Month);

        var monthStart = new DateTime(now.Year, now.Month, 1);
        var monthEnd   = monthStart.AddMonths(1);

        var captured = await db.SessionObservations
            .IgnoreQueryFilters()
            .CountAsync(o => o.TenantId == tenantId
                          && o.ObservedAt >= monthStart
                          && o.ObservedAt < monthEnd, ct);

        var used = Math.Min(captured, quota);

        return new QuotaStatus(
            Quota:        quota,
            Used:         used,
            Captured:     captured,
            Excess:       Math.Max(0, captured - quota),
            IsExceeded:   captured > quota,
            BillingMonth: monthStart,
            IsProRata:    isProRata,
            ProRataDays:  isProRata ? proRataDays : null);
    }

    public (int quota, int amountCents, bool isProRata, int proRataDays) GetBillingTerms(
        int fullQuota, int fullAmountCents, DateTime tenantCreatedAt, int year, int month)
    {
        int daysInMonth = DateTime.DaysInMonth(year, month);

        // Pro-rata only for the month the tenant signed up, and only if they didn't sign up on day 1
        if (tenantCreatedAt.Year == year && tenantCreatedAt.Month == month && tenantCreatedAt.Day > 1)
        {
            int daysRemaining      = daysInMonth - tenantCreatedAt.Day + 1;
            int proRataQuota       = Math.Max(1, (int)Math.Floor(fullQuota * (double)daysRemaining / daysInMonth));
            int proRataAmountCents = (int)Math.Floor(fullAmountCents * (double)daysRemaining / daysInMonth);
            return (proRataQuota, proRataAmountCents, true, daysRemaining);
        }

        return (fullQuota, fullAmountCents, false, daysInMonth);
    }

    /// <summary>
    /// Returns the next available MonthlySequence number for a tenant/month.
    /// </summary>
    public async Task<int> GetNextSequenceAsync(Guid tenantId, DateTime observedAt, CancellationToken ct = default)
    {
        var monthStart = new DateTime(observedAt.Year, observedAt.Month, 1);
        var monthEnd   = monthStart.AddMonths(1);

        var count = await db.SessionObservations
            .IgnoreQueryFilters()
            .CountAsync(o => o.TenantId == tenantId
                          && o.ObservedAt >= monthStart
                          && o.ObservedAt < monthEnd
                          && o.MonthlySequence != null, ct);

        return count + 1;
    }
}
