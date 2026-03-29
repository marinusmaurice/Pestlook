using Pestlook.WebAPI.Domain.Enums;

namespace Pestlook.WebAPI.DTOs.Auth;

public sealed record SignUpRequest(
    string TenantName,
    string TenantSlug,
    SubscriptionPlan SubscriptionPlan,
    string Email,
    string Password,
    string FirstName,
    string LastName);
