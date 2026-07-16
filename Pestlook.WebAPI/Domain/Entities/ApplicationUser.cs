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

    /// <summary>Display unit for temperatures: "C" (Celsius) or "F" (Fahrenheit). Values are always stored in Celsius.</summary>
    public string TemperatureUnit { get; set; } = "C";

    /// <summary>Display unit for distances: "km" (kilometres) or "mi" (miles). Values are always stored in kilometres.</summary>
    public string DistanceUnit { get; set; } = "km";

    /// <summary>Web UI colour theme id: "light", "dark-a", "dark-b", "dark-cd", "light-e", "dark-f", or "chaos".</summary>
    public string Theme { get; set; } = "light-e";

    /// <summary>
    /// IANA timezone id (e.g. "Africa/Johannesburg"). Used ONLY for server-side
    /// analytics that group by day/week; storage stays UTC. Null until the
    /// frontend detects and saves the browser timezone on first login.
    /// </summary>
    public string? Timezone { get; set; }

    public ICollection<RefreshToken> RefreshTokens { get; set; } = [];
}
