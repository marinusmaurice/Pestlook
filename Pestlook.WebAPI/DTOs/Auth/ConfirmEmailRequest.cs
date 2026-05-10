namespace Pestlook.WebAPI.DTOs.Auth;

public sealed record ConfirmEmailRequest(string UserId, string Token);
