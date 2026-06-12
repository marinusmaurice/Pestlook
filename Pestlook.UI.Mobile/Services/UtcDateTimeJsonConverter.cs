using System.Text.Json;
using System.Text.Json.Serialization;

namespace Pestlook.UI.Mobile.Services;

/// <summary>
/// Serializes every DateTime as UTC ISO 8601 with a trailing "Z" when syncing
/// to the API. Values captured on-device are always DateTime.UtcNow; SQLite
/// round-trips them as Kind.Unspecified, which this converter treats as UTC.
/// </summary>
public sealed class UtcDateTimeJsonConverter : JsonConverter<DateTime>
{
    public override DateTime Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        var value = reader.GetDateTime();
        return value.Kind switch
        {
            DateTimeKind.Utc   => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _                  => DateTime.SpecifyKind(value, DateTimeKind.Utc)
        };
    }

    public override void Write(Utf8JsonWriter writer, DateTime value, JsonSerializerOptions options)
    {
        var utc = value.Kind switch
        {
            DateTimeKind.Utc   => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _                  => DateTime.SpecifyKind(value, DateTimeKind.Utc)
        };
        writer.WriteStringValue(utc.ToString("yyyy-MM-dd'T'HH:mm:ss.fffffff'Z'"));
    }
}
