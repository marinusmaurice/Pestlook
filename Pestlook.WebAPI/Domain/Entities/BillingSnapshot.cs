namespace Pestlook.WebAPI.Domain.Entities;

public sealed class BillingSnapshot : IHasTenant
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;
    public string OwnerId { get; set; } = string.Empty;
    public ApplicationUser Owner { get; set; } = null!;

    /// <summary>First day of the billing month, e.g., 2024-05-01.</summary>
    public DateTime BillingMonth { get; set; }

    /// <summary>Count of active, non-deleted monitoring points at snapshot time.</summary>
    public int ActivePointCount { get; set; }

    /// <summary>Calculated charge in cents.</summary>
    public int AmountCents { get; set; }

    /// <summary>pending | paid | failed</summary>
    public string Status { get; set; } = "pending";

    public DateTime CreatedAt { get; set; } = DateTime.Now;
}
