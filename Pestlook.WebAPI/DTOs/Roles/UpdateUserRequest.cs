namespace Pestlook.WebAPI.DTOs.Roles;

public sealed record UpdateUserRequest(
    string FirstName,
    string LastName,
    bool IsActive,
    string Role);
