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

        app.UseHttpsRedirection();
        app.UseHsts();

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

    public static WebApplication UseRolesSeeding(this WebApplication app)
    {
        using var scope = app.Services.CreateScope();
        var roleManager = scope.ServiceProvider.GetRequiredService<Microsoft.AspNetCore.Identity.RoleManager<Microsoft.AspNetCore.Identity.IdentityRole>>();

        foreach (var role in new[] { "Agronomist", "Farmer", "Scout" })
        {
            if (!roleManager.RoleExistsAsync(role).GetAwaiter().GetResult())
                roleManager.CreateAsync(new Microsoft.AspNetCore.Identity.IdentityRole(role)).GetAwaiter().GetResult();
        }

        return app;
    }
}
