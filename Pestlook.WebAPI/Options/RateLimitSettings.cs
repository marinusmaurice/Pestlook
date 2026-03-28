namespace Pestlook.WebAPI.Options;

public sealed class RateLimitSettings
{
    public const string SectionName = "RateLimit";

    public int GlobalPermitLimit { get; init; } = 100;
    public int GlobalWindowSeconds { get; init; } = 60;
    public int AuthPermitLimit { get; init; } = 10;
    public int AuthWindowSeconds { get; init; } = 60;
    public int QueueLimit { get; init; } = 5;
}
