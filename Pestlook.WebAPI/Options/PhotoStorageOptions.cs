namespace Pestlook.WebAPI.Options;

public sealed class PhotoStorageOptions
{
    public const string SectionName = "PhotoStorage";

    /// <summary>Absolute or relative path on disk where observation photos are stored.</summary>
    public string RootPath { get; set; } = "observation-photos";

    /// <summary>URL prefix under which the photos are served as static files.</summary>
    public string RequestPath { get; set; } = "/observation-photos";

    /// <summary>Maximum allowed file size in bytes (default 10 MB).</summary>
    public long MaxFileSizeBytes { get; set; } = 10 * 1024 * 1024;

    /// <summary>Permitted file extensions (lower-case, including dot).</summary>
    public string[] AllowedExtensions { get; set; } = [".jpg", ".jpeg", ".png", ".webp", ".heic"];
}
