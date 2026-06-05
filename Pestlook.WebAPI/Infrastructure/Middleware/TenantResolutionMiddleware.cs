using Microsoft.EntityFrameworkCore;
using Pestlook.WebAPI.Data;
using Pestlook.WebAPI.Infrastructure;

namespace Pestlook.WebAPI.Infrastructure.Middleware;

public sealed class TenantResolutionMiddleware(RequestDelegate next, ILogger<TenantResolutionMiddleware> logger)
{
    private const string TenantHeader = "X-Tenant-ID";

    public async Task InvokeAsync(HttpContext context, ApplicationDbContext db, ITenantContext tenantContext)
    {
        if (!context.Request.Headers.TryGetValue(TenantHeader, out var slug) || string.IsNullOrWhiteSpace(slug))
        {
            await next(context);
            return;
        }

        var tenant = await db.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Slug == slug.ToString() && t.IsActive);

        if (tenant is null)
        {
            logger.LogWarning("Tenant slug '{Slug}' not found or inactive", slug.ToString());
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            await context.Response.WriteAsync($"Tenant '{slug}' not found.");
            return;
        }

        tenantContext.TenantId = tenant.Id;
        tenantContext.TenantSlug = tenant.Slug;
        tenantContext.ObservationQuota = tenant.ObservationQuota;

        await next(context);
    }
}
