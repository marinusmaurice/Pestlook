using Microsoft.EntityFrameworkCore;
using Pestlook.WebAPI.Data;
using Pestlook.WebAPI.Data.Seeding;
using Pestlook.WebAPI.Infrastructure.Middleware;
using Scalar.AspNetCore;

namespace Pestlook.WebAPI.Extensions;

public static class WebApplicationExtensions
{
    public static WebApplication UseSecurityPipeline(this WebApplication app)
    {
        app.UseMiddleware<ExceptionHandlingMiddleware>();
        app.UseMiddleware<RequestResponseLoggingMiddleware>();
        app.UseMiddleware<SecurityHeadersMiddleware>();

        if (!app.Environment.IsDevelopment())
        {
            app.UseHttpsRedirection();
            app.UseHsts();
        }

        return app;
    }

    public static WebApplication UseTenantResolution(this WebApplication app)
    {
        app.UseMiddleware<TenantResolutionMiddleware>();
        return app;
    }

    public static WebApplication UseOpenApiDocs(this WebApplication app)
    {
        app.MapOpenApi();
        app.MapScalarApiReference(options =>
        {
            options.Title = "Pestlook API";
            options.Theme = ScalarTheme.Purple;
            options.WithPreferredScheme("Bearer");
        });

        return app;
    }

    public static WebApplication UseDatabaseMigration(this WebApplication app)
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        if (db.Database.IsRelational())
            db.Database.Migrate();
        return app;
    }

    public static WebApplication UseRolesSeeding(this WebApplication app)
    {
        using var scope = app.Services.CreateScope();
        var roleManager = scope.ServiceProvider.GetRequiredService<Microsoft.AspNetCore.Identity.RoleManager<Microsoft.AspNetCore.Identity.IdentityRole>>();

        foreach (var role in new[] { "Admin", "Scout" })
        {
            if (!roleManager.RoleExistsAsync(role).GetAwaiter().GetResult())
                roleManager.CreateAsync(new Microsoft.AspNetCore.Identity.IdentityRole(role)).GetAwaiter().GetResult();
        }

        return app;
    }

    public static WebApplication UseDevDataSeeding(this WebApplication app)
    {
        var force = app.Configuration.GetValue<bool>("DevSeed:RunOnce");
        if (!app.Environment.IsDevelopment() && !force)
            return app;

        DevDataSeeder.SeedAsync(app.Services).GetAwaiter().GetResult();
        return app;
    }
}
