using Pestlook.WebAPI.DTOs.Auth;

namespace Pestlook.WebAPI.Infrastructure.Services.Interfaces;

public interface IAuthService
{
    Task<TokenResponse> SignUpAsync(SignUpRequest request, string ipAddress, CancellationToken ct = default);
    Task<TokenResponse> RegisterAsync(RegisterRequest request, string ipAddress, CancellationToken ct = default);
    Task<TokenResponse> LoginAsync(LoginRequest request, string ipAddress, CancellationToken ct = default);
    Task<TokenResponse> RefreshTokenAsync(RefreshTokenRequest request, string ipAddress, CancellationToken ct = default);
    Task RevokeTokenAsync(string refreshToken, string ipAddress, CancellationToken ct = default);

    Task ConfirmEmailAsync(ConfirmEmailRequest request, CancellationToken ct = default);
    Task ForgotPasswordAsync(ForgotPasswordRequest request, CancellationToken ct = default);
    Task ResetPasswordAsync(ResetPasswordRequest request, CancellationToken ct = default);
    Task InviteMemberAsync(InviteMemberRequest request, CancellationToken ct = default);
}
