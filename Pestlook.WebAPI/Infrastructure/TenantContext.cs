namespace Pestlook.WebAPI.Infrastructure;

public interface ITenantContext
{
    Guid? TenantId { get; set; }
    string? TenantSlug { get; set; }
    /// <summary>
    /// Monthly observation quota for the current tenant.
    /// 0 means no context is set (system/unauthenticated request) — quota filter is skipped.
    /// </summary>
    int ObservationQuota { get; set; }
}

public sealed class TenantContext : ITenantContext
{
    public Guid? TenantId { get; set; }
    public string? TenantSlug { get; set; }
    public int ObservationQuota { get; set; }
}
