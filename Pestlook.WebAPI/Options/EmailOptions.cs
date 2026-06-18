namespace Pestlook.WebAPI.Options;

public sealed class EmailOptions
{
    public const string SectionName = "Email";

    public string FromAddress { get; init; } = "noreply@pestlook.com";
    public string FromName { get; init; } = "PestLook";
    public string AppBaseUrl { get; init; } = string.Empty;
    public string AdminAddress { get; init; } = "admin@pestlook.com";
}
