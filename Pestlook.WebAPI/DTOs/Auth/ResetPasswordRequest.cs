namespace Pestlook.WebAPI.DTOs.Auth;

public sealed record ResetPasswordRequest(string UserId, string Token, string NewPassword);
