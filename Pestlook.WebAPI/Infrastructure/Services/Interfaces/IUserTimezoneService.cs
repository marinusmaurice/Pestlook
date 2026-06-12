namespace Pestlook.WebAPI.Infrastructure.Services.Interfaces;

/// <summary>
/// Resolves the current user's IANA timezone (Users.Timezone) for analytics
/// that group by local day/week. Storage and transport remain UTC — this is
/// the only sanctioned server-side use of a local timezone.
/// </summary>
public interface IUserTimezoneService
{
    /// <summary>The current user's timezone, falling back to UTC when unset.</summary>
    Task<TimeZoneInfo> GetUserTimeZoneAsync(CancellationToken ct = default);
}
