using System.Net;
using Microsoft.EntityFrameworkCore;
using Pestlook.WebAPI.Data;
using Pestlook.WebAPI.Data.Seeding;
using Pestlook.WebAPI.Infrastructure.Middleware;
using Pestlook.WebAPI.Infrastructure.Services.Interfaces;
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
        var db     = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<WebApplication>>();

        if (!db.Database.IsRelational())
            return app;

        var pending = db.Database.GetPendingMigrations().ToList();

        if (pending.Count == 0)
        {
            logger.LogInformation("Database migrations: nothing pending.");
            return app;
        }

        logger.LogInformation("Database migrations: {Count} pending — {Migrations}",
            pending.Count, string.Join(", ", pending));

        var appServices = app.Services;
        var pendingSnapshot = pending.ToList();

        try
        {
            db.Database.Migrate();

            logger.LogInformation("Database migrations applied successfully: {Migrations}",
                string.Join(", ", pendingSnapshot));

            // Fire-and-forget success email — don't block startup
            _ = Task.Run(async () =>
            {
                try
                {
                    using var emailScope = appServices.CreateScope();
                    var emailSvc = emailScope.ServiceProvider.GetRequiredService<IEmailService>();
                    var rows = string.Join("", pendingSnapshot.Select(m =>
                        $"<tr><td style='padding:6px 12px;font-family:monospace;font-size:0.85rem;color:#1F2A26;border-bottom:1px solid #E2DFD3;'>{WebUtility.HtmlEncode(m)}</td></tr>"));

                    await emailSvc.SendAdminAlertAsync(
                        $"[PestLook] ✅ {pendingSnapshot.Count} migration(s) applied",
                        BuildMigrationSuccessHtml(pendingSnapshot.Count, rows));
                }
                catch (Exception ex)
                {
                    logger.LogWarning(ex, "Could not send migration success email");
                }
            });
        }
        catch (Exception ex)
        {
            logger.LogCritical(ex, "Database migration failed. Pending: {Migrations}", string.Join(", ", pending));

            _ = Task.Run(async () =>
            {
                try
                {
                    using var emailScope = appServices.CreateScope();
                    var emailSvc = emailScope.ServiceProvider.GetRequiredService<IEmailService>();
                    var rows = string.Join("", pendingSnapshot.Select(m =>
                        $"<tr><td style='padding:6px 12px;font-family:monospace;font-size:0.85rem;color:#1F2A26;border-bottom:1px solid #E2DFD3;'>{WebUtility.HtmlEncode(m)}</td></tr>"));

                    await emailSvc.SendAdminAlertAsync(
                        $"[PestLook] ❌ Migration FAILED — {ex.Message[..Math.Min(80, ex.Message.Length)]}",
                        BuildMigrationFailureHtml(pendingSnapshot.Count, rows, ex));
                }
                catch (Exception emailEx)
                {
                    logger.LogWarning(emailEx, "Could not send migration failure email");
                }
            });

            throw; // still crash startup — the DB is in an unknown state
        }

        return app;
    }

    private static string BuildMigrationSuccessHtml(int count, string migrationRows) => $"""
        <!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head>
        <body style="margin:0;padding:0;background:#F5F5F0;font-family:'Inter',Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F0;padding:40px 0;">
            <tr><td align="center">
              <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;border:1px solid #E2DFD3;">
                <tr><td style="background:#2B6E4F;padding:24px 40px;text-align:center;">
                  <h1 style="margin:0;color:#fff;font-size:1.4rem;font-weight:800;">Pest<span style="color:#E5A52F;">Look</span> — Migration Report</h1>
                </td></tr>
                <tr><td style="padding:32px 40px;">
                  <p style="margin:0 0 8px;font-size:0.95rem;color:#2B6E4F;font-weight:700;">✅ {count} migration(s) applied successfully</p>
                  <p style="margin:0 0 20px;font-size:0.85rem;color:#5A6B62;">Applied at {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC</p>
                  <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E2DFD3;border-radius:8px;overflow:hidden;">
                    {migrationRows}
                  </table>
                </td></tr>
                <tr><td style="background:#F9F7F0;padding:16px 40px;border-top:1px solid #E2DFD3;text-align:center;">
                  <p style="margin:0;font-size:0.78rem;color:#9AA8A1;">PestLook automated system notification</p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body></html>
        """;

    private static string BuildMigrationFailureHtml(int count, string migrationRows, Exception ex) => $"""
        <!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head>
        <body style="margin:0;padding:0;background:#F5F5F0;font-family:'Inter',Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F0;padding:40px 0;">
            <tr><td align="center">
              <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;border:1px solid #E2DFD3;">
                <tr><td style="background:#C0392B;padding:24px 40px;text-align:center;">
                  <h1 style="margin:0;color:#fff;font-size:1.4rem;font-weight:800;">Pest<span style="color:#E5A52F;">Look</span> — Migration FAILED</h1>
                </td></tr>
                <tr><td style="padding:32px 40px;">
                  <p style="margin:0 0 8px;font-size:0.95rem;color:#C0392B;font-weight:700;">❌ {count} pending migration(s) could not be applied</p>
                  <p style="margin:0 0 20px;font-size:0.85rem;color:#5A6B62;">Failed at {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC — the API has shut down.</p>
                  <p style="margin:0 0 8px;font-size:0.85rem;font-weight:600;color:#1F2A26;">Pending migrations:</p>
                  <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E2DFD3;border-radius:8px;overflow:hidden;margin-bottom:20px;">
                    {migrationRows}
                  </table>
                  <p style="margin:0 0 8px;font-size:0.85rem;font-weight:600;color:#1F2A26;">Error:</p>
                  <div style="background:#FDF2F0;border:1px solid #F5C6C0;border-radius:8px;padding:14px;font-family:monospace;font-size:0.8rem;color:#7B2020;white-space:pre-wrap;word-break:break-word;">{WebUtility.HtmlEncode(ex.ToString())}</div>
                </td></tr>
                <tr><td style="background:#F9F7F0;padding:16px 40px;border-top:1px solid #E2DFD3;text-align:center;">
                  <p style="margin:0;font-size:0.78rem;color:#9AA8A1;">PestLook automated system notification</p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body></html>
        """;

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
        // Escape hatch for integration tests: they run with the "Development" environment
        // (needed so other Development-only branches behave normally) but supply their own
        // isolated seed data via TestWebApplicationFactory, so this must not also seed the
        // real dev/demo dataset into the test database.
        if (app.Configuration.GetValue<bool>("DevSeed:Disabled"))
            return app;

        var force = app.Configuration.GetValue<bool>("DevSeed:RunOnce");
        if (!app.Environment.IsDevelopment() && !force)
            return app;

        var logger = app.Services.GetRequiredService<ILogger<WebApplication>>();

        var seedMode = app.Configuration.GetValue<string>("DevSeed:Mode") ?? "demo";

        bool didSeed;
        switch (seedMode.ToLowerInvariant())
        {
            case "single-pest":
                logger.LogInformation("DevSeed: running DataSeederSinglePest (mode=single-pest).");
                didSeed = DataSeederSinglePest.SeedAsync(app.Services).GetAwaiter().GetResult();
                break;

            default: // "demo"
                logger.LogInformation("DevSeed: running DevDataSeeder (mode=demo).");
                didSeed = DevDataSeeder.SeedAsync(app.Services).GetAwaiter().GetResult();
                break;
        }

        if (!didSeed)
        {
            logger.LogInformation("Dev/demo data seeding: already seeded, nothing to do.");
            return app;
        }

        logger.LogInformation("Dev/demo data seeding complete.");

        _ = Task.Run(async () =>
        {
            try
            {
                using var emailScope = app.Services.CreateScope();
                var emailSvc = emailScope.ServiceProvider.GetRequiredService<IEmailService>();
                await emailSvc.SendAdminAlertAsync(
                    "[PestLook] ✅ Dev/demo data seed complete",
                    $"""
                    <!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head>
                    <body style="margin:0;padding:0;background:#F5F5F0;font-family:'Inter',Arial,sans-serif;">
                      <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F0;padding:40px 0;">
                        <tr><td align="center">
                          <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;border:1px solid #E2DFD3;">
                            <tr><td style="background:#2B6E4F;padding:24px 40px;text-align:center;">
                              <h1 style="margin:0;color:#fff;font-size:1.4rem;font-weight:800;">Pest<span style="color:#E5A52F;">Look</span> — Data Seed Report</h1>
                            </td></tr>
                            <tr><td style="padding:32px 40px;">
                              <p style="margin:0 0 8px;font-size:0.95rem;color:#2B6E4F;font-weight:700;">✅ Dev/demo data seeded successfully</p>
                              <p style="margin:0;font-size:0.85rem;color:#5A6B62;">Completed at {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC</p>
                            </td></tr>
                            <tr><td style="background:#F9F7F0;padding:16px 40px;border-top:1px solid #E2DFD3;text-align:center;">
                              <p style="margin:0;font-size:0.78rem;color:#9AA8A1;">PestLook automated system notification</p>
                            </td></tr>
                          </table>
                        </td></tr>
                      </table>
                    </body></html>
                    """);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Could not send data seed email");
            }
        });

        return app;
    }
}
