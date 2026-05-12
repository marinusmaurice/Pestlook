using System.Diagnostics;

namespace Pestlook.WebAPI.Infrastructure.Middleware;

public sealed class RequestResponseLoggingMiddleware(
    RequestDelegate next,
    ILogger<RequestResponseLoggingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        var sw = Stopwatch.StartNew();
        var requestId = context.TraceIdentifier;
        var requestStart = DateTimeOffset.Now;

        logger.LogInformation(
            "→ {Method} {Path} | TraceId: {TraceId} | IP: {Ip}",
            context.Request.Method,
            context.Request.Path,
            requestId,
            context.Connection.RemoteIpAddress);

        context.Response.OnStarting(() =>
        {
            context.Response.Headers["X-Request-Start"]  = requestStart.ToUnixTimeMilliseconds().ToString();
            context.Response.Headers["X-Response-Time"]  = sw.ElapsedMilliseconds.ToString();
            context.Response.Headers["X-Request-Id"]     = requestId;
            return Task.CompletedTask;
        });

        await next(context);

        sw.Stop();
        var level = context.Response.StatusCode >= 500
            ? LogLevel.Error
            : context.Response.StatusCode >= 400
                ? LogLevel.Warning
                : LogLevel.Information;

        logger.Log(level,
            "← {Method} {Path} | {StatusCode} | {Elapsed}ms | TraceId: {TraceId}",
            context.Request.Method,
            context.Request.Path,
            context.Response.StatusCode,
            sw.ElapsedMilliseconds,
            requestId);
    }
}
