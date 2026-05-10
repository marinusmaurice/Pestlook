namespace Pestlook.WebAPI.Options;

public sealed class EmailOptions
{
    public const string SectionName = "Email";

    public string SmtpHost { get; init; } = "localhost";
    public int SmtpPort { get; init; } = 587;
    public bool UseSsl { get; init; } = false;
    public string Username { get; init; } = string.Empty;
    public string Password { get; init; } = string.Empty;
    public string FromAddress { get; init; } = "noreply@pestlook.app";
    public string FromName { get; init; } = "Pestlook";

    /// <summary>Base URL of the web front-end used when building email links (e.g. https://app.pestlook.app).</summary>
    public string AppBaseUrl { get; init; } = "http://localhost:4200";
}
