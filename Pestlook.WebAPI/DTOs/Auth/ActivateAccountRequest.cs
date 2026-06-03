namespace Pestlook.WebAPI.DTOs.Auth;

public sealed record ActivateAccountRequest(string UserId, string Token);
