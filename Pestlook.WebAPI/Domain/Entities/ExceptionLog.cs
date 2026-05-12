namespace Pestlook.WebAPI.Domain.Entities;

public sealed class ExceptionLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? TenantId { get; set; }
    public string? UserId { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? StackTrace { get; set; }
    public string? InnerMessage { get; set; }
    public string? RequestPath { get; set; }
    public string? RequestMethod { get; set; }
    public int StatusCode { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.Now;
}
