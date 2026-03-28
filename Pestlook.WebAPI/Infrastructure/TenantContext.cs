namespace Pestlook.WebAPI.Infrastructure;

public interface ITenantContext
{
    Guid? TenantId { get; set; }
    string? TenantSlug { get; set; }
}

public sealed class TenantContext : ITenantContext
{
    public Guid? TenantId { get; set; }
    public string? TenantSlug { get; set; }
}
