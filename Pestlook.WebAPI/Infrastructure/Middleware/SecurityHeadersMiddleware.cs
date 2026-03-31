namespace Pestlook.WebAPI.Infrastructure.Middleware;

public sealed class SecurityHeadersMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context)
    {
        // Skip security headers for OpenAPI/Scalar dev-only endpoints
        var path = context.Request.Path.Value ?? string.Empty;
        if (path.StartsWith("/openapi", StringComparison.OrdinalIgnoreCase) ||
            path.StartsWith("/scalar", StringComparison.OrdinalIgnoreCase))
        {
            await next(context);
            return;
        }

        var headers = context.Response.Headers;

        headers["X-Content-Type-Options"] = "nosniff";
        headers["X-Frame-Options"] = "SAMEORIGIN";
        headers["X-XSS-Protection"] = "1; mode=block";
        headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
        headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
        headers["Content-Security-Policy"] =
            "default-src 'self'; " +
            "script-src 'self' https://unpkg.com; " +
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com; " +
            "font-src 'self' https://fonts.gstatic.com; " +
            "img-src 'self' data: https://*.tile.openstreetmap.org https://*.google.com https://*.googleapis.com https://unpkg.com; " +
            "connect-src 'self'";

        // HSTS is handled by app.UseHsts() in production; we still set it as a header fallback
        if (!context.Request.IsHttps)
        {
            headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
        }

        await next(context);
    }
}
