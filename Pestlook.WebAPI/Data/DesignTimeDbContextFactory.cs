using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Pestlook.WebAPI.Infrastructure;
using Pestlook.WebAPI.Infrastructure.Services.Interfaces;

namespace Pestlook.WebAPI.Data;

/// <summary>
/// Provides a design-time DbContext instance for EF Core CLI tools (migrations, scaffolding).
/// Bypasses the DI container by supplying stub implementations of context dependencies.
/// </summary>
internal sealed class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<ApplicationDbContext>
{
    public ApplicationDbContext CreateDbContext(string[] args)
    {
        var config = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.json", optional: false)
            .AddEnvironmentVariables()
            .Build();

        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseSqlServer(config.GetConnectionString("DefaultConnection"))
            .Options;

        return new ApplicationDbContext(
            options,
            new TenantContext { TenantId = null },
            new DesignTimeCurrentUserService(),
            new HttpContextAccessor());
    }

    private sealed class DesignTimeCurrentUserService : ICurrentUserService
    {
        public string? UserId => null;
        public string? Email => null;
        public Guid? TenantId => null;
        public bool IsAuthenticated => false;
        public bool IsInRole(string role) => false;
    }
}
