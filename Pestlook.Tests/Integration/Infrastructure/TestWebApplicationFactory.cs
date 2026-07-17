using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.IdentityModel.Tokens;
using Pestlook.WebAPI.Data;
using Pestlook.WebAPI.Domain.Entities;
using Pestlook.WebAPI.Infrastructure.Services.Interfaces;
using Pestlook.Tests.Helpers;
using System.Text;

namespace Pestlook.Tests.Integration.Infrastructure;

public sealed class TestWebApplicationFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    public static readonly Guid DefaultTenantId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    public static readonly string DefaultTenantSlug = "test-tenant";
    public static readonly string DefaultAdminId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    public static readonly string DefaultAdminEmail = "admin@test-tenant.com";
    private readonly string _dbName = $"TestDb_{Guid.NewGuid():N}";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // Override connection string so Serilog SQL Server sink is never configured in tests
        builder.UseSetting("ConnectionStrings:DefaultConnection", string.Empty);

        // Prevent Program.cs's real dev/demo seeding (appsettings.Development.json's
        // DevSeed:Mode) from running against the InMemory test database — this factory
        // seeds its own minimal, deterministic data via InitializeAsync() below.
        builder.UseSetting("DevSeed:Disabled", "true");

        // Make IOptions<JwtOptions> (used by TokenService) use the same secret as
        // the PostConfigure<JwtBearerOptions> override below, so tokens issued during
        // integration tests are accepted by [Authorize] endpoints.
        builder.UseSetting("Jwt:Secret", JwtTestHelper.TestSecret);
        builder.UseSetting("Jwt:Issuer", JwtTestHelper.TestIssuer);
        builder.UseSetting("Jwt:Audience", JwtTestHelper.TestAudience);

        // Disable effective rate limiting in tests: all requests share the same IP
        // ("unknown") on TestServer, so a real window limit would queue/block tests
        // for up to WindowSeconds. QueueLimit=0 ensures any over-limit request fails
        // immediately (429) rather than hanging, as a safety net.
        builder.UseSetting("RateLimit:GlobalPermitLimit", "1000000");
        builder.UseSetting("RateLimit:AuthPermitLimit", "1000000");
        builder.UseSetting("RateLimit:QueueLimit", "0");

        builder.ConfigureServices(services =>
        {
            // Remove every descriptor AddDbContext<ApplicationDbContext>() registered in
            // Program.cs (the DbContext itself, its options, and the SQL Server provider's
            // per-context configuration) before re-registering with the InMemory provider.
            // RemoveAll<T>() alone is not reliable across EF Core versions — some of these
            // are registered via TryAdd, so a stale SQL Server registration can silently
            // survive and the real dev database gets used instead of the test double.
            var toRemove = services.Where(d =>
                d.ServiceType == typeof(ApplicationDbContext) ||
                d.ServiceType == typeof(DbContextOptions<ApplicationDbContext>) ||
                d.ServiceType == typeof(DbContextOptions) ||
                (d.ServiceType.IsGenericType &&
                 d.ServiceType.GetGenericArguments().Contains(typeof(ApplicationDbContext)))
            ).ToList();
            foreach (var descriptor in toRemove)
                services.Remove(descriptor);

            services.AddDbContext<ApplicationDbContext>((_, options) =>
                options.UseInMemoryDatabase(_dbName));

            // Never let a test hit the real Resend API — replaces the whole IEmailService,
            // so nothing downstream (SignUp activation, password reset, feedback, admin
            // alerts) can burn real email quota during a test run.
            services.RemoveAll<IEmailService>();
            services.AddSingleton<IEmailService, FakeEmailService>();

            // Swap JWT validation to use the test secret
            services.PostConfigure<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme, options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = JwtTestHelper.TestIssuer,
                    ValidAudience = JwtTestHelper.TestAudience,
                    IssuerSigningKey = new SymmetricSecurityKey(
                        Encoding.UTF8.GetBytes(JwtTestHelper.TestSecret))
                };
            });
        });
    }

    // Seed using the app's own service provider AFTER the host is built
    public async Task InitializeAsync()
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var userManager = scope.ServiceProvider.GetRequiredService<Microsoft.AspNetCore.Identity.UserManager<ApplicationUser>>();

        if (!db.Tenants.Any())
        {
            db.Tenants.Add(new Tenant
            {
                Id = DefaultTenantId,
                Name = "Test Tenant",
                Slug = DefaultTenantSlug,
                IsActive = true
            });
            await db.SaveChangesAsync();
        }

        if (await userManager.FindByIdAsync(DefaultAdminId) is null)
        {
            var admin = new ApplicationUser
            {
                Id = DefaultAdminId,
                UserName = DefaultAdminEmail,
                Email = DefaultAdminEmail,
                FirstName = "Admin",
                LastName = "Test",
                TenantId = DefaultTenantId
            };
            await userManager.CreateAsync(admin, "Admin@123!");
            await userManager.AddToRoleAsync(admin, "Admin");
        }
    }

    public new Task DisposeAsync() => base.DisposeAsync().AsTask();

    /// <summary>The fake mailbox — inspect this instead of a real inbox (e.g. to pull an activation link out of a test).</summary>
    public FakeEmailService FakeEmails => (FakeEmailService)Services.GetRequiredService<IEmailService>();

    public HttpClient CreateTenantClient(string? jwtToken = null)
    {
        var client = CreateClient();
        client.DefaultRequestHeaders.Add("X-Tenant-ID", DefaultTenantSlug);

        if (jwtToken is not null)
            client.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", jwtToken);

        return client;
    }

    public HttpClient CreateAdminClient() =>
        CreateTenantClient(jwtToken: JwtTestHelper.GenerateToken(
            DefaultAdminId, DefaultAdminEmail, DefaultTenantId, roles: ["Admin"]));

    public HttpClient CreateScoutClient() =>
        CreateTenantClient(jwtToken: JwtTestHelper.GenerateToken(
            "ssssssss-ssss-ssss-ssss-ssssssssssss", "scout@test-tenant.com",
            DefaultTenantId, roles: ["Scout"]));
}
