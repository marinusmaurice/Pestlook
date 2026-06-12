namespace Pestlook.WebAPI.DTOs.Auth;

public sealed record UserInfoResponse(
    string Id,
    string Email,
    string FirstName,
    string LastName,
    bool IsActive,
    Guid TenantId,
    string TenantSlug,
    string TemperatureUnit,
    string? Timezone,
    IList<string> Roles);
