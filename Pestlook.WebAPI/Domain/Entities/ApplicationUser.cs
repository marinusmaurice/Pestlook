using Microsoft.AspNetCore.Identity;

namespace Pestlook.WebAPI.Domain.Entities;

public sealed class ApplicationUser : IdentityUser, IHasTenant
{
    public Guid TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public int FailedLoginAttempts { get; set; }
    public DateTime? LockedUntil { get; set; }

    public ICollection<RefreshToken> RefreshTokens { get; set; } = [];
}
