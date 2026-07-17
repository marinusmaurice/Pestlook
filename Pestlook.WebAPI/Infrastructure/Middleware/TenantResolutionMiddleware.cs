using Microsoft.EntityFrameworkCore;
using Pestlook.WebAPI.Data;
using Pestlook.WebAPI.Infrastructure;

namespace Pestlook.WebAPI.Infrastructure.Middleware;

/// <summary>
/// Resolves the current tenant from the authenticated user's JWT — never from a
/// client-supplied header. Must run after <c>UseAuthentication()</c> so
/// <see cref="HttpContext.User"/> is populated. Unauthenticated requests get no
/// tenant context (TenantId stays null), which is correct: public endpoints
/// (login, sign-up, etc.) don't need — and shouldn't get — cross-tenant data.
/// </summary>
public sealed class TenantResolutionMiddleware(RequestDelegate next, ILogger<TenantResolutionMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context, ApplicationDbContext db, ITenantContext tenantContext)
    {
        if (context.User.Identity?.IsAuthenticated != true)
        {
            await next(context);
            return;
        }

        var claim = context.User.FindFirst("tenantId")?.Value;
        if (!Guid.TryParse(claim, out var tenantId))
        {
            await next(context);
            return;
        }

        var tenant = await db.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == tenantId);

        if (tenant is null || !tenant.IsActive)
        {
            logger.LogWarning("Authenticated user's tenant {TenantId} not found or inactive", tenantId);
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            await context.Response.WriteAsync("Tenant not found or inactive.");
            return;
        }

        tenantContext.TenantId = tenant.Id;
        tenantContext.TenantSlug = tenant.Slug;

        await next(context);
    }
}
