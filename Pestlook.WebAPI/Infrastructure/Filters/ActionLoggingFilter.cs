using Microsoft.AspNetCore.Mvc.Filters;

namespace Pestlook.WebAPI.Infrastructure.Filters;

public sealed class ActionLoggingFilter : IAsyncActionFilter
{
    private static readonly Lock _consoleLock = new();

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var method     = context.HttpContext.Request.Method;
        var controller = context.RouteData.Values["controller"];
        var action     = context.RouteData.Values["action"];
        var path       = context.HttpContext.Request.Path;

        Write(ConsoleColor.DarkBlue, $"[{DateTime.Now:HH:mm:ss}] → {method} {controller}/{action}  {path}");

        var executed = await next();

        var status = executed.HttpContext.Response.StatusCode;
        var color  = executed.Exception is not null || status >= 500 ? ConsoleColor.Red
                   : status >= 400                                    ? ConsoleColor.Yellow
                   :                                                    ConsoleColor.Cyan;

        Write(color, $"[{DateTime.Now:HH:mm:ss}] ← {method} {controller}/{action}  {status}");
    }

    private static void Write(ConsoleColor color, string message)
    {
        lock (_consoleLock)
        {
            var previous = Console.ForegroundColor;
            Console.ForegroundColor = color;
            Console.WriteLine(message);
            Console.ForegroundColor = previous;
        }
    }
}
