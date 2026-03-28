
using FluentValidation;
using FluentValidation.AspNetCore;
using Pestlook.WebAPI.Extensions;
using Pestlook.WebAPI.Options;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// ── Serilog ───────────────────────────────────────────────────────────────────
builder.Host.AddSerilog(builder.Configuration);

// ── Options ───────────────────────────────────────────────────────────────────
builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.SectionName));
builder.Services.Configure<CorsSettings>(builder.Configuration.GetSection(CorsSettings.SectionName));
builder.Services.Configure<RateLimitSettings>(builder.Configuration.GetSection(RateLimitSettings.SectionName));

// ── Infrastructure ────────────────────────────────────────────────────────────
builder.Services.AddDatabase(builder.Configuration);
builder.Services.AddIdentityConfiguration();
builder.Services.AddJwtAuthentication(builder.Configuration);
builder.Services.AddRateLimiting(builder.Configuration);
builder.Services.AddCorsPolicy(builder.Configuration);
builder.Services.AddApiVersioningConfiguration();
builder.Services.AddApplicationServices();
builder.Services.AddValidationConfiguration();
builder.Services.AddMappingConfiguration();

// ── Controllers + Validation ──────────────────────────────────────────────────
builder.Services.AddControllers();
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

// ── Endpoints ─────────────────────────────────────────────────────────────────
app.MapControllers().RequireRateLimiting("global");
app.MapHealthChecks("/health");

if (app.Environment.IsDevelopment())
{
    app.UseOpenApiDocs();             // /openapi/v1.json + /scalar/v1
}

// ── Database migration ────────────────────────────────────────────────────────
app.UseDatabaseMigration();

// ── Seed roles ────────────────────────────────────────────────────────────────
app.UseRolesSeeding();

app.Run();

// Required for WebApplicationFactory<Program> in integration tests
public partial class Program { }
