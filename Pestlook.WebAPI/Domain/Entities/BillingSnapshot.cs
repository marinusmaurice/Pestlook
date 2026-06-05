namespace Pestlook.WebAPI.Domain.Entities;

public sealed class BillingSnapshot : IHasTenant
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;
    public string OwnerId { get; set; } = string.Empty;
    public ApplicationUser Owner { get; set; } = null!;

    /// <summary>First day of the billing month, e.g., 2026-06-01.</summary>
    public DateTime BillingMonth { get; set; }

    /// <summary>Kept for historical records from the old per-trap billing model.</summary>
    public int ActivePointCount { get; set; }

    /// <summary>Monthly observation quota for this tenant at snapshot time (may be pro-rated).</summary>
    public int ObservationQuota { get; set; }

    /// <summary>Total observations recorded with ObservedAt in the billing month.</summary>
    public int ObservationsCaptured { get; set; }

    /// <summary>Observations counted toward the quota — min(captured, quota).</summary>
    public int ObservationsUsed { get; set; }

    /// <summary>Calculated charge in cents. Flat plan fee, pro-rated for the signup month.</summary>
    public int AmountCents { get; set; }

    /// <summary>Whether this snapshot was pro-rated because the tenant signed up mid-month.</summary>
    public bool IsProRata { get; set; }

    /// <summary>Number of days covered when IsProRata is true.</summary>
    public int? ProRataDays { get; set; }

    /// <summary>pending | paid | failed</summary>
    public string Status { get; set; } = "pending";

    public DateTime CreatedAt { get; set; } = DateTime.Now;
}
