using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Pestlook.WebAPI.Data;
using Pestlook.WebAPI.Domain.Entities;
using Pestlook.WebAPI.DTOs.Auth;
using Pestlook.WebAPI.Infrastructure;
using Pestlook.WebAPI.Infrastructure.Services;
using Pestlook.WebAPI.Infrastructure.Services.Interfaces;
using Pestlook.WebAPI.Options;

namespace Pestlook.Tests.Unit.Services;

public sealed class AuthServiceTests : IDisposable
{
    private readonly ApplicationDbContext _db;
    private readonly Mock<UserManager<ApplicationUser>> _userManagerMock;
    private readonly Mock<ITokenService> _tokenServiceMock;
    private readonly ITenantContext _tenantContext;
    private readonly AuthService _sut;

    private static readonly Guid TenantId = Guid.NewGuid();

    public AuthServiceTests()
    {
        var dbOptions = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        _tenantContext = new TenantContext { TenantId = TenantId };

        var currentUserMock = new Mock<ICurrentUserService>();
        var httpContextMock = new Mock<IHttpContextAccessor>();

        _db = new ApplicationDbContext(dbOptions, _tenantContext, currentUserMock.Object, httpContextMock.Object);

        // Seed a tenant
        _db.Tenants.Add(new Tenant { Id = TenantId, Name = "Test Corp", Slug = "test-corp", IsActive = true });
        _db.SaveChanges();

        var store = new Mock<IUserStore<ApplicationUser>>();
        _userManagerMock = new Mock<UserManager<ApplicationUser>>(
            store.Object, null!, null!, null!, null!, null!, null!, null!, null!);

        _tokenServiceMock = new Mock<ITokenService>();
        _tokenServiceMock.Setup(t => t.GenerateAccessToken(It.IsAny<ApplicationUser>(), It.IsAny<IList<string>>()))
            .Returns("mocked.access.token");
        _tokenServiceMock.Setup(t => t.GenerateRefreshToken())
            .Returns("mocked-refresh-token");

        var jwtOptions = Options.Create(new JwtOptions
        {
            Secret = "super-secret-key-that-is-at-least-32-chars!!",
            Issuer = "Test",
            Audience = "Test",
            AccessTokenExpiryMinutes = 15,
            RefreshTokenExpiryDays = 7
        });

        _sut = new AuthService(
            _userManagerMock.Object,
            _tokenServiceMock.Object,
            _db,
            _tenantContext,
            jwtOptions,
            new Mock<ILogger<AuthService>>().Object);
    }

    [Fact]
    public async Task RegisterAsync_WhenTenantNotSet_ShouldThrow()
    {
        _tenantContext.TenantId = null;

        var act = () => _sut.RegisterAsync(
            new RegisterRequest("a@b.com", "P@ssw0rd1!", "A", "B"), "127.0.0.1");

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Tenant*");
    }

    [Fact]
    public async Task RegisterAsync_WhenEmailAlreadyExists_ShouldThrow()
    {
        _tenantContext.TenantId = TenantId;

        _userManagerMock
            .Setup(m => m.FindByEmailAsync("exists@test.com"))
            .ReturnsAsync(new ApplicationUser());

        var act = () => _sut.RegisterAsync(
            new RegisterRequest("exists@test.com", "P@ssw0rd1!", "A", "B"), "127.0.0.1");

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*already registered*");
    }

    [Fact]
    public async Task RegisterAsync_WhenValid_ShouldReturnTokenResponse()
    {
        _tenantContext.TenantId = TenantId;
        var user = new ApplicationUser { Id = Guid.NewGuid().ToString(), TenantId = TenantId, RefreshTokens = [] };

        _userManagerMock.Setup(m => m.FindByEmailAsync(It.IsAny<string>())).ReturnsAsync((ApplicationUser?)null);
        _userManagerMock.Setup(m => m.CreateAsync(It.IsAny<ApplicationUser>(), It.IsAny<string>()))
            .ReturnsAsync(IdentityResult.Success);
        _userManagerMock.Setup(m => m.AddToRoleAsync(It.IsAny<ApplicationUser>(), "User"))
            .ReturnsAsync(IdentityResult.Success);
        _userManagerMock.Setup(m => m.GetRolesAsync(It.IsAny<ApplicationUser>()))
            .ReturnsAsync(["User"]);
        _userManagerMock.Setup(m => m.UpdateAsync(It.IsAny<ApplicationUser>()))
            .ReturnsAsync(IdentityResult.Success);

        var result = await _sut.RegisterAsync(
            new RegisterRequest("new@test.com", "P@ssw0rd1!", "New", "User"), "127.0.0.1");

        result.Should().NotBeNull();
        result.AccessToken.Should().Be("mocked.access.token");
        result.RefreshToken.Should().Be("mocked-refresh-token");
    }

    [Fact]
    public async Task LoginAsync_WhenUserNotFound_ShouldThrowUnauthorized()
    {
        _tenantContext.TenantId = TenantId;

        _userManagerMock
            .Setup(m => m.FindByEmailAsync("ghost@test.com"))
            .ReturnsAsync((ApplicationUser?)null);

        var act = () => _sut.LoginAsync(
            new LoginRequest("ghost@test.com", "pass"), "127.0.0.1");

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    public void Dispose() => _db.Dispose();
}
