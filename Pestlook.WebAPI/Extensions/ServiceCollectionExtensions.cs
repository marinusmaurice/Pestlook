using System.Text;
using System.Threading.RateLimiting;
using Asp.Versioning;
using Resend;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Pestlook.WebAPI.Data;
using Pestlook.WebAPI.Domain.Entities;
using Pestlook.WebAPI.Infrastructure;
using Pestlook.WebAPI.Infrastructure.Services;
using Pestlook.WebAPI.Infrastructure.Services.Interfaces;
using Pestlook.WebAPI.OpenApi;
using Pestlook.WebAPI.Options;
using Pestlook.WebAPI.Validators;
using Serilog;
using Serilog.Sinks.MSSqlServer;

namespace Pestlook.WebAPI.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddDatabase(this IServiceCollection services, IConfiguration config)
    {
        services.AddDbContext<ApplicationDbContext>(options =>
            options.UseSqlServer(
                config.GetConnectionString("DefaultConnection"),
                sql => sql.EnableRetryOnFailure(3, TimeSpan.FromSeconds(5), null)));

        return services;
    }

    public static IServiceCollection AddIdentityConfiguration(this IServiceCollection services)
    {
        services.AddIdentity<ApplicationUser, IdentityRole>(options =>
        {
            options.Password.RequireDigit = true;
            options.Password.RequireLowercase = true;
            options.Password.RequireUppercase = true;
            options.Password.RequireNonAlphanumeric = true;
            options.Password.RequiredLength = 8;
            options.User.RequireUniqueEmail = true;
            options.Lockout.AllowedForNewUsers = false;  // handled manually
        })
        .AddEntityFrameworkStores<ApplicationDbContext>()
        .AddDefaultTokenProviders();

        return services;
    }

    public static IServiceCollection AddJwtAuthentication(this IServiceCollection services, IConfiguration config)
    {
        var jwtOptions = config.GetSection(JwtOptions.SectionName).Get<JwtOptions>()!;
        var key = Encoding.UTF8.GetBytes(jwtOptions.Secret);

        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateIssuerSigningKey = true,
                ValidateLifetime = true,
                ValidIssuer = jwtOptions.Issuer,
                ValidAudience = jwtOptions.Audience,
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ClockSkew = TimeSpan.FromSeconds(30)
            };
        });

        services.AddAuthorization();

        return services;
    }

    public static IServiceCollection AddRateLimiting(this IServiceCollection services, IConfiguration config)
    {
        var settings = config.GetSection(RateLimitSettings.SectionName).Get<RateLimitSettings>()
                       ?? new RateLimitSettings();

        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

            options.AddPolicy("global", context =>
                RateLimitPartition.GetFixedWindowLimiter(
                    context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                    _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = settings.GlobalPermitLimit,
                        Window = TimeSpan.FromSeconds(settings.GlobalWindowSeconds),
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                        QueueLimit = settings.QueueLimit
                    }));

            options.AddPolicy("auth", context =>
                RateLimitPartition.GetFixedWindowLimiter(
                    context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                    _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = settings.AuthPermitLimit,
                        Window = TimeSpan.FromSeconds(settings.AuthWindowSeconds),
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                        QueueLimit = 0
                    }));
        });

        return services;
    }

    public static IServiceCollection AddCorsPolicy(this IServiceCollection services, IConfiguration config)
    {
        var corsSettings = config.GetSection(CorsSettings.SectionName).Get<CorsSettings>()
                           ?? new CorsSettings();

        services.AddCors(options =>
            options.AddPolicy("AllowFrontend", policy =>
                policy.WithOrigins(corsSettings.AllowedOrigins)
                      .AllowAnyHeader()
                      .AllowAnyMethod()
                      .AllowCredentials()));

        return services;
    }

    public static IServiceCollection AddApiVersioningConfiguration(this IServiceCollection services)
    {
        services.AddApiVersioning(options =>
        {
            options.DefaultApiVersion = new ApiVersion(1, 0);
            options.AssumeDefaultVersionWhenUnspecified = true;
            options.ReportApiVersions = true;
        });

        return services;
    }

    public static IServiceCollection AddApplicationServices(this IServiceCollection services, IConfiguration config)
    {
        services.AddHttpContextAccessor();
        services.AddScoped<ITenantContext, TenantContext>();
        services.AddScoped<ICurrentUserService, CurrentUserService>();
        services.AddScoped<ITokenService, TokenService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IEmailService, EmailService>();
        services.AddScoped<IPhotoStorageService, PhotoStorageService>();
        services.AddScoped<IUserTimezoneService, UserTimezoneService>();

        services.Configure<EmailOptions>(config.GetSection(EmailOptions.SectionName));
        services.AddHttpClient<ResendClient>();
        services.Configure<ResendClientOptions>(o => o.ApiToken = config["Resend:ApiKey"]!);
        services.AddTransient<IResend, ResendClient>();

        return services;
    }

    public static IServiceCollection AddValidationConfiguration(this IServiceCollection services)
    {
        services.AddValidatorsFromAssemblyContaining<LoginRequestValidator>();

        return services;
    }

    public static IServiceCollection AddMappingConfiguration(this IServiceCollection services)
    {
        services.AddAutoMapper(cfg => cfg.AddMaps(typeof(ServiceCollectionExtensions).Assembly));

        return services;
    }

    public static IServiceCollection AddOpenApiDocumentation(this IServiceCollection services)
    {
        services.AddOpenApi(options =>
        {
            options.AddDocumentTransformer((document, context, cancellationToken) =>
            {
                document.Info.Title       = "Pestlook API";
                document.Info.Version     = "v1";
                document.Info.Description = "Pestlook agricultural management platform API";
                return Task.CompletedTask;
            });

            options.AddDocumentTransformer<BearerSecuritySchemeTransformer>();
        });

        return services;
    }

    public static IHostBuilder AddSerilog(this IHostBuilder host, IConfiguration config)
    {
        host.UseSerilog((ctx, lc) =>
        {
            lc.ReadFrom.Configuration(ctx.Configuration)
              .Enrich.FromLogContext()
              .WriteTo.Console(outputTemplate:
                  "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj} {NewLine}{Exception}");

            if (!ctx.HostingEnvironment.IsDevelopment())
            {
                var connStr = config.GetConnectionString("DefaultConnection");
                if (!string.IsNullOrWhiteSpace(connStr))
                {
                    lc.WriteTo.MSSqlServer(
                        connectionString: connStr,
                        sinkOptions: new MSSqlServerSinkOptions
                        {
                            TableName = "Logs",
                            AutoCreateSqlTable = true
                        });
                }
            }
        });

        return host;
    }
}
