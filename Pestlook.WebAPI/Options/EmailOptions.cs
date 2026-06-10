namespace Pestlook.WebAPI.Options;

public sealed class EmailOptions
{
    public const string SectionName = "Email";

    public string Host { get; init; } = string.Empty;
    public int Port { get; init; } = 587;
    public bool EnableSsl { get; init; } = true;
    public string Username { get; init; } = string.Empty;
    public string Password { get; init; } = string.Empty;
    public string FromAddress { get; init; } = string.Empty;
    public string FromName { get; init; } = "PestLook";
    public string AppBaseUrl { get; init; } = string.Empty;

    /// <summary>Address that receives user feedback submissions.</summary>
    public string AdminAddress { get; init; } = "admin@pestlook.com";
}
