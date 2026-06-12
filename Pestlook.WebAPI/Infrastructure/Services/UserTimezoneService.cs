using Microsoft.EntityFrameworkCore;
using Pestlook.WebAPI.Data;
using Pestlook.WebAPI.Infrastructure.Services.Interfaces;

namespace Pestlook.WebAPI.Infrastructure.Services;

public sealed class UserTimezoneService(
    ApplicationDbContext db,
    ICurrentUserService currentUserService,
    ILogger<UserTimezoneService> logger) : IUserTimezoneService
{
    private TimeZoneInfo? _cached;

    public async Task<TimeZoneInfo> GetUserTimeZoneAsync(CancellationToken ct = default)
    {
        if (_cached is not null) return _cached;

        var userId = currentUserService.UserId;
        string? ianaId = null;

        if (userId is not null)
        {
            ianaId = await db.Users
                .IgnoreQueryFilters()
                .Where(u => u.Id == userId)
                .Select(u => u.Timezone)
                .FirstOrDefaultAsync(ct);
        }

        if (!string.IsNullOrWhiteSpace(ianaId) &&
            TimeZoneInfo.TryFindSystemTimeZoneById(ianaId, out var tz))
        {
            _cached = tz;
        }
        else
        {
            if (!string.IsNullOrWhiteSpace(ianaId))
                logger.LogWarning("User {UserId} has unrecognized timezone '{Timezone}'; falling back to UTC", userId, ianaId);
            _cached = TimeZoneInfo.Utc;
        }

        return _cached;
    }
}
