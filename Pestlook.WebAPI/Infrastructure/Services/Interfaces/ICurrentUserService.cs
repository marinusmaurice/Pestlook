namespace Pestlook.WebAPI.Infrastructure.Services.Interfaces;

public interface ICurrentUserService
{
    string? UserId { get; }
    string? Email { get; }
    Guid? TenantId { get; }
    bool IsAuthenticated { get; }
    bool IsInRole(string role);
}
