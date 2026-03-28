namespace Pestlook.WebAPI.DTOs.Auth;

public sealed record RegisterRequest(
    string Email,
    string Password,
    string FirstName,
    string LastName);
