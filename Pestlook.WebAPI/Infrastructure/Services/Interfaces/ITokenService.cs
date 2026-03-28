using System.Security.Claims;
using Pestlook.WebAPI.Domain.Entities;

namespace Pestlook.WebAPI.Infrastructure.Services.Interfaces;

public interface ITokenService
{
    string GenerateAccessToken(ApplicationUser user, IList<string> roles);
    string GenerateRefreshToken();
    ClaimsPrincipal? GetPrincipalFromExpiredToken(string token);
}
