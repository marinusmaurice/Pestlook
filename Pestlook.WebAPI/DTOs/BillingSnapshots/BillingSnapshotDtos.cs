namespace Pestlook.WebAPI.DTOs.BillingSnapshots;

public sealed record BillingSnapshotResponse(
    Guid Id,
    Guid TenantId,
    string OwnerId,
    DateTime BillingMonth,
    int ActivePointCount,
    int AmountCents,
    string Status,
    DateTime CreatedAt);
