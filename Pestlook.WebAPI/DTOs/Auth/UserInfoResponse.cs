namespace Pestlook.WebAPI.DTOs.Auth;

public sealed record UserInfoResponse(
    string Id,
    string Email,
    string FirstName,
    string LastName,
    Guid TenantId,
    string TenantSlug,
    IList<string> Roles);
