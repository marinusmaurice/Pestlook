using System.Net;
using System.Text.Json;
using Pestlook.WebAPI.Data;
using Pestlook.WebAPI.Domain.Entities;
using Pestlook.WebAPI.DTOs.Common;
using Pestlook.WebAPI.Infrastructure;
using Pestlook.WebAPI.Infrastructure.Exceptions;
using Pestlook.WebAPI.Infrastructure.Services.Interfaces;

namespace Pestlook.WebAPI.Infrastructure.Middleware;

public sealed class ExceptionHandlingMiddleware(
    RequestDelegate next,
    ILogger<ExceptionHandlingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
        {
            System.Diagnostics.Debug.WriteLine("[ExceptionHandlingMiddleware] Request cancelled by client.");
            context.Response.StatusCode = 499; // Client Closed Request
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception ex)
    {
        var (statusCode, message) = ex switch
        {
            UnauthorizedAccessException => (HttpStatusCode.Unauthorized, ex.Message),
            ConflictException           => (HttpStatusCode.Conflict, ex.Message),
            InvalidOperationException   => (HttpStatusCode.BadRequest, ex.Message),
            KeyNotFoundException        => (HttpStatusCode.NotFound, ex.Message),
            _ => (HttpStatusCode.InternalServerError, "An unexpected error occurred.")
        };

        logger.LogError(ex, "Unhandled exception: {Message} | Path: {Path}", ex.Message, context.Request.Path);

        await PersistExceptionAsync(context, ex, (int)statusCode);

        context.Response.StatusCode = (int)statusCode;
        context.Response.ContentType = "application/json";

        var response = ApiResponse<object>.Fail(message);
        await context.Response.WriteAsync(JsonSerializer.Serialize(response,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }));
    }

    private static async Task PersistExceptionAsync(HttpContext context, Exception ex, int statusCode)
    {
        try
        {
            await using var scope = context.RequestServices.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var currentUser = scope.ServiceProvider.GetRequiredService<ICurrentUserService>();
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();

            db.ExceptionLogs.Add(new ExceptionLog
            {
                TenantId = tenantContext.TenantId,
                UserId = currentUser.UserId,
                Message = ex.Message,
                StackTrace = ex.StackTrace,
                InnerMessage = ex.InnerException?.Message,
                RequestPath = context.Request.Path,
                RequestMethod = context.Request.Method,
                StatusCode = statusCode
            });

            await db.SaveChangesAsync();
        }
        catch
        {
            // Swallow — logging must never crash the pipeline
        }
    }
}
