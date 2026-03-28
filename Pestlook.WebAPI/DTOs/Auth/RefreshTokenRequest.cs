namespace Pestlook.WebAPI.DTOs.Auth;

public sealed record RefreshTokenRequest(string AccessToken, string RefreshToken);
