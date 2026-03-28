using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using FluentAssertions;
using Microsoft.Extensions.Options;
using Pestlook.WebAPI.Domain.Entities;
using Pestlook.WebAPI.Infrastructure.Services;
using Pestlook.WebAPI.Options;

namespace Pestlook.Tests.Unit.Services;

public sealed class TokenServiceTests
{
    private static TokenService BuildService(JwtOptions? opts = null)
    {
        opts ??= new JwtOptions
        {
            Secret = "super-secret-key-that-is-at-least-32-chars!!",
            Issuer = "TestIssuer",
            Audience = "TestAudience",
            AccessTokenExpiryMinutes = 15,
            RefreshTokenExpiryDays = 7
        };

        return new TokenService(Options.Create(opts));
    }

    private static ApplicationUser TestUser() => new()
    {
        Id = Guid.NewGuid().ToString(),
        Email = "test@example.com",
        UserName = "test@example.com",
        FirstName = "John",
        LastName = "Doe",
        TenantId = Guid.NewGuid()
    };

    [Fact]
    public void GenerateAccessToken_ShouldReturnValidJwt()
    {
        var svc = BuildService();
        var user = TestUser();

        var token = svc.GenerateAccessToken(user, ["User"]);

        token.Should().NotBeNullOrEmpty();
        var handler = new JwtSecurityTokenHandler();
        handler.CanReadToken(token).Should().BeTrue();
    }

    [Fact]
    public void GenerateAccessToken_ShouldContainExpectedClaims()
    {
        var svc = BuildService();
        var user = TestUser();

        var token = svc.GenerateAccessToken(user, ["User", "Admin"]);

        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);
        jwt.Subject.Should().Be(user.Id);
        jwt.Claims.Should().Contain(c => c.Type == "email" && c.Value == user.Email);
        jwt.Claims.Should().Contain(c => c.Type == "tenantId" && c.Value == user.TenantId.ToString());
        jwt.Claims.Should().Contain(c => c.Value == "User");
        jwt.Claims.Should().Contain(c => c.Value == "Admin");
    }

    [Fact]
    public void GenerateAccessToken_ShouldUseConfiguredIssuerAndAudience()
    {
        var svc = BuildService();
        var user = TestUser();

        var token = svc.GenerateAccessToken(user, []);

        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);
        jwt.Issuer.Should().Be("TestIssuer");
        jwt.Audiences.Should().Contain("TestAudience");
    }

    [Fact]
    public void GenerateRefreshToken_ShouldReturnNonEmptyBase64String()
    {
        var svc = BuildService();

        var t1 = svc.GenerateRefreshToken();
        var t2 = svc.GenerateRefreshToken();

        t1.Should().NotBeNullOrEmpty();
        t2.Should().NotBeNullOrEmpty();
        t1.Should().NotBe(t2);

        Convert.FromBase64String(t1).Length.Should().Be(64);
    }

    [Fact]
    public void GetPrincipalFromExpiredToken_ShouldReturnPrincipalForExpiredToken()
    {
        var opts = new JwtOptions
        {
            Secret = "super-secret-key-that-is-at-least-32-chars!!",
            Issuer = "TestIssuer",
            Audience = "TestAudience",
            AccessTokenExpiryMinutes = -1   // expired immediately
        };

        var svc = BuildService(opts);
        var user = TestUser();

        var expiredToken = svc.GenerateAccessToken(user, []);
        var principal = svc.GetPrincipalFromExpiredToken(expiredToken);

        principal.Should().NotBeNull();
        principal!.FindFirstValue(ClaimTypes.NameIdentifier).Should().Be(user.Id);
    }

    [Fact]
    public void GetPrincipalFromExpiredToken_WithTamperedToken_ShouldReturnNull()
    {
        var svc = BuildService();

        var principal = svc.GetPrincipalFromExpiredToken("this.is.garbage");

        principal.Should().BeNull();
    }
}
