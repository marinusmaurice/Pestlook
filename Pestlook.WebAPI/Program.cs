
using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.Extensions.FileProviders;
using Pestlook.WebAPI.Extensions;
using Pestlook.WebAPI.Infrastructure.Filters;
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
        opt.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddFluentValidationAutoValidation();

// ── OpenAPI ───────────────────────────────────────────────────────────────────
builder.Services.AddOpenApiDocumentation();

// ── Health checks ─────────────────────────────────────────────────────────────
builder.Services.AddHealthChecks();

var app = builder.Build();

// ── Middleware pipeline ───────────────────────────────────────────────────────
app.UseSecurityPipeline();            // Exception → ReqRes Logging → Security Headers → HTTPS
app.UseSerilogRequestLogging();       // Serilog structured access log
app.UseCors("AllowFrontend");
app.UseRateLimiter();
app.UseTenantResolution();            // X-Tenant-ID → ITenantContext
app.UseAuthentication();
app.UseAuthorization();

// ── Serve SPA static files from Pestlook.UI.Web ──────────────────────────────
var spaRoot = Path.GetFullPath(Path.Combine(app.Environment.ContentRootPath, "..", "Pestlook.UI.Web"));
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(spaRoot),
    RequestPath  = "",
    OnPrepareResponse = ctx =>
    {
        ctx.Context.Response.Headers["Cache-Control"] = "no-store";
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
app.MapFallback(async context =>
{
    context.Response.ContentType = "text/html";
    await context.Response.SendFileAsync(Path.Combine(spaRoot, "index.html"));
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
