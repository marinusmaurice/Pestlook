using Pestlook.WebAPI.DTOs.Auth;

namespace Pestlook.WebAPI.Infrastructure.Services.Interfaces;

public interface IAuthService
{
    Task<SignUpResponse> SignUpAsync(SignUpRequest request, string ipAddress, CancellationToken ct = default);
    Task<TokenResponse> ActivateAccountAsync(string userId, string token, string ipAddress, CancellationToken ct = default);
    Task ResendActivationAsync(string email, CancellationToken ct = default);
    Task<TokenResponse> RegisterAsync(RegisterRequest request, string ipAddress, CancellationToken ct = default);
    Task<TokenResponse> LoginAsync(LoginRequest request, string ipAddress, CancellationToken ct = default);
    Task<TokenResponse> RefreshTokenAsync(RefreshTokenRequest request, string ipAddress, CancellationToken ct = default);
    Task RevokeTokenAsync(string refreshToken, string ipAddress, CancellationToken ct = default);
}
