namespace Pestlook.WebAPI.Domain.Entities;

/// <summary>
/// Physical trap type catalogue. Rows with <see cref="TenantId"/> == null are system-wide entries
/// shared across all tenants. Rows with a non-null <see cref="TenantId"/> are tenant-specific.
/// </summary>
public sealed class TrapType : IAuditableByUser
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Null for system/shared trap types; set to the owning tenant for custom types.</summary>
    public Guid? TenantId { get; set; }
    public Tenant? Tenant { get; set; }

    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.Now;
    public DateTime? UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }

    public string? CreatedByUserId { get; set; }
    public string? UpdatedByUserId { get; set; }
    public string? DeletedByUserId { get; set; }
}
