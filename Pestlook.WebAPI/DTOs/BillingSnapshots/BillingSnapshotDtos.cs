namespace Pestlook.WebAPI.DTOs.BillingSnapshots;

public sealed record BillingSnapshotResponse(
    Guid Id,
    Guid TenantId,
    string OwnerId,
    DateTime BillingMonth,
    int ActivePointCount,
    int AmountCents,
    string Status,
    DateTime CreatedAt)
{
    public BillingSnapshotResponse() : this(default, default, string.Empty, default, default, default, string.Empty, default) { }
}
