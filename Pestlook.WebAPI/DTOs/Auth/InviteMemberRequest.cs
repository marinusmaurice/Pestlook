namespace Pestlook.WebAPI.DTOs.Auth;

public sealed record InviteMemberRequest(string Email, string FirstName, string LastName, string? Role = null);
