
using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.Extensions.FileProviders;
using Pestlook.WebAPI.Extensions;
using Pestlook.WebAPI.Infrastructure.Filters;
using Pestlook.WebAPI.Infrastructure.Json;
using Pestlook.WebAPI.Options;
using Serilog;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

// ── Serilog ───────────────────────────────────────────────────────────────────
builder.Host.AddSerilog(builder.Configuration);

// ── Options ───────────────────────────────────────────────────────────────────
builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.SectionName));
builder.Services.Configure<CorsSettings>(builder.Configuration.GetSection(CorsSettings.SectionName));
builder.Services.Configure<RateLimitSettings>(builder.Configuration.GetSection(RateLimitSettings.SectionName));
builder.Services.Configure<PhotoStorageOptions>(builder.Configuration.GetSection(PhotoStorageOptions.SectionName));

// ── Infrastructure ────────────────────────────────────────────────────────────
builder.Services.AddDatabase(builder.Configuration);
builder.Services.AddIdentityConfiguration();
builder.Services.AddJwtAuthentication(builder.Configuration);
builder.Services.AddRateLimiting(builder.Configuration);
builder.Services.AddCorsPolicy(builder.Configuration);
builder.Services.AddApiVersioningConfiguration();
builder.Services.AddApplicationServices(builder.Configuration);
builder.Services.AddValidationConfiguration();
builder.Services.AddMappingConfiguration();

// ── Controllers + Validation ──────────────────────────────────────────────────
builder.Services.AddControllers(options => options.Filters.Add<ActionLoggingFilter>())
    .AddJsonOptions(opt =>
    {
        opt.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        // All DateTime values cross the wire as UTC ISO 8601 with a trailing Z.
        opt.JsonSerializerOptions.Converters.Add(new UtcDateTimeJsonConverter());
    });
builder.Services.AddFluentValidationAutoValidation();

// ── OpenAPI ───────────────────────────────────────────────────────────────────
builder.Services.AddOpenApiDocumentation();

// ── Health checks ─────────────────────────────────────────────────────────────
builder.Services.AddHealthChecks();

var app = builder.Build();

// ── Canonical host: 301 www.pestlook.com → pestlook.com ─────────────────────
app.Use(async (context, next) =>
{
    var host = context.Request.Host.Host;
    if (host.StartsWith("www.", StringComparison.OrdinalIgnoreCase))
    {
        var newHost = host[4..];
        var url = $"https://{newHost}{context.Request.PathBase}{context.Request.Path}{context.Request.QueryString}";
        context.Response.Redirect(url, permanent: true);
        return;
    }
    await next();
});

// ── Middleware pipeline ───────────────────────────────────────────────────────
app.UseSecurityPipeline();            // Exception → ReqRes Logging → Security Headers → HTTPS
app.UseSerilogRequestLogging();       // Serilog structured access log
app.UseCors("AllowFrontend");
app.UseRateLimiter();
app.UseAuthentication();
app.UseTenantResolution();            // JWT "tenantId" claim → ITenantContext (must run after authentication)
app.UseAuthorization();

// ── Serve SPA static files from Pestlook.UI.Web ──────────────────────────────
var spaRoot = Path.GetFullPath(Path.Combine(app.Environment.ContentRootPath, "..", "Pestlook.UI.Web"));
// .apk is not in the default MIME map; without this the Android download 404s.
var spaContentTypes = new Microsoft.AspNetCore.StaticFiles.FileExtensionContentTypeProvider();
spaContentTypes.Mappings[".apk"] = "application/vnd.android.package-archive";
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(spaRoot),
    RequestPath  = "",
    ContentTypeProvider = spaContentTypes,
    OnPrepareResponse = ctx =>
    {
        var path = ctx.File.Name;
        // JS and CSS always revalidate — catches sub-module imports that can't carry ?v= stamps
        if (path.EndsWith(".js", StringComparison.OrdinalIgnoreCase) ||
            path.EndsWith(".css", StringComparison.OrdinalIgnoreCase))
        {
            ctx.Context.Response.Headers["Cache-Control"] = "no-cache";
        }
        else
        {
            ctx.Context.Response.Headers["Cache-Control"] = "no-store";
        }
    }
});

// ── Serve observation photos from disk ───────────────────────────────────────
var photoOpts = app.Configuration.GetSection(PhotoStorageOptions.SectionName).Get<PhotoStorageOptions>()
    ?? new PhotoStorageOptions();
var photoRoot = Path.IsPathRooted(photoOpts.RootPath)
    ? photoOpts.RootPath
    : Path.Combine(app.Environment.ContentRootPath, photoOpts.RootPath);
Directory.CreateDirectory(photoRoot);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider    = new PhysicalFileProvider(photoRoot),
    RequestPath     = photoOpts.RequestPath,
    OnPrepareResponse = ctx =>
    {
        ctx.Context.Response.Headers["Cache-Control"] = "public, max-age=86400";
    }
});

// ── Endpoints ─────────────────────────────────────────────────────────────────
app.MapControllers().RequireRateLimiting("global");
app.MapHealthChecks("/health");

if (app.Environment.IsDevelopment())
{
    app.UseOpenApiDocs();             // /openapi/v1.json + /scalar/v1
}

// ── SPA fallback — non-API, non-file requests serve index.html ────────────────
// Read from disk on every request (not cached at startup) so a frontend-only
// deploy (index.html/CSS/JS updated without restarting the API process) is
// picked up immediately instead of requiring an API restart.
var indexHtmlPath = Path.Combine(spaRoot, "index.html");
app.MapFallback(async context =>
{
    var buildStamp = File.GetLastWriteTimeUtc(indexHtmlPath).ToString("yyyyMMddHHmmss");
    var indexHtml = (await File.ReadAllTextAsync(indexHtmlPath)).Replace("__BUILD__", buildStamp);
    context.Response.ContentType = "text/html";
    await context.Response.WriteAsync(indexHtml);
});

// ── Database migration ────────────────────────────────────────────────────────
app.UseDatabaseMigration();

// ── Seed roles ────────────────────────────────────────────────────────────────
app.UseRolesSeeding();

// ── Seed dev/demo data ────────────────────────────────────────────────────────
app.UseDevDataSeeding();

app.Run();

// Required for WebApplicationFactory<Program> in integration tests
public partial class Program { }
