using System.Text.Json;
using System.Text.Json.Serialization;

namespace Pestlook.WebAPI.Infrastructure.Json;

/// <summary>
/// Serializes every DateTime as UTC ISO 8601 with a trailing "Z".
/// On read, values with an offset are normalized to UTC; values without an
/// offset are assumed to already be UTC (clients must send UTC).
/// System.Text.Json applies this converter to DateTime? automatically.
/// </summary>
public sealed class UtcDateTimeJsonConverter : JsonConverter<DateTime>
{
    public override DateTime Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        var value = reader.GetDateTime();
        return value.Kind switch
        {
            DateTimeKind.Utc         => value,
            DateTimeKind.Local       => value.ToUniversalTime(),
            _                        => DateTime.SpecifyKind(value, DateTimeKind.Utc)
        };
    }

    public override void Write(Utf8JsonWriter writer, DateTime value, JsonSerializerOptions options)
    {
        var utc = value.Kind switch
        {
            DateTimeKind.Utc         => value,
            DateTimeKind.Local       => value.ToUniversalTime(),
            _                        => DateTime.SpecifyKind(value, DateTimeKind.Utc)
        };
        writer.WriteStringValue(utc.ToString("yyyy-MM-dd'T'HH:mm:ss.fffffff'Z'"));
    }
}
