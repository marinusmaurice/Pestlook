using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace Pestlook.WebAPI.Data;

/// <summary>
/// SQL Server datetime2 stores no timezone, so EF materializes DateTime with
/// Kind.Unspecified. The application guarantees only UTC is ever written, so
/// this converter stamps Kind.Utc on read and normalizes any accidental local
/// value to UTC on write. Applied model-wide via ConfigureConventions.
/// </summary>
public sealed class UtcDateTimeValueConverter : ValueConverter<DateTime, DateTime>
{
    public UtcDateTimeValueConverter() : base(
        toDb   => toDb.Kind == DateTimeKind.Local ? toDb.ToUniversalTime() : toDb,
        fromDb => DateTime.SpecifyKind(fromDb, DateTimeKind.Utc))
    {
    }
}
