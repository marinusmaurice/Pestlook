using Pestlook.WebAPI.DTOs.Auth;

namespace Pestlook.WebAPI.Infrastructure.Services.Interfaces;

public interface IAuthService
{
    Task<TokenResponse> RegisterAsync(RegisterRequest request, string ipAddress, CancellationToken ct = default);
    Task<TokenResponse> LoginAsync(LoginRequest request, string ipAddress, CancellationToken ct = default);
    Task<TokenResponse> RefreshTokenAsync(RefreshTokenRequest request, string ipAddress, CancellationToken ct = default);
    Task RevokeTokenAsync(string refreshToken, string ipAddress, CancellationToken ct = default);
}
