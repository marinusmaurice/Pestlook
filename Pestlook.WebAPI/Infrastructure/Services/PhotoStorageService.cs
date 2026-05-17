using Microsoft.Extensions.Options;
using Pestlook.WebAPI.Infrastructure.Services.Interfaces;
using Pestlook.WebAPI.Options;

namespace Pestlook.WebAPI.Infrastructure.Services;

public sealed class PhotoStorageService(
    IOptions<PhotoStorageOptions> options,
    IWebHostEnvironment env,
    ILogger<PhotoStorageService> logger) : IPhotoStorageService
{
    private readonly PhotoStorageOptions _opts = options.Value;

    /// <inheritdoc />
    public async Task<string> SaveAsync(
        Guid tenantId,
        Guid sessionId,
        Guid observationId,
        IFormFile file,
        CancellationToken ct = default)
    {
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!_opts.AllowedExtensions.Contains(ext))
            throw new InvalidOperationException($"File extension '{ext}' is not permitted.");

        if (file.Length > _opts.MaxFileSizeBytes)
            throw new InvalidOperationException($"File exceeds the maximum allowed size of {_opts.MaxFileSizeBytes / 1024 / 1024} MB.");

        // Resolve root: absolute path or relative to ContentRootPath
        var root = Path.IsPathRooted(_opts.RootPath)
            ? _opts.RootPath
            : Path.Combine(env.ContentRootPath, _opts.RootPath);

        // Folder: <root>/<tenantId>/<sessionId>/<observationId>/
        var folder = Path.Combine(root, tenantId.ToString(), sessionId.ToString(), observationId.ToString());
        Directory.CreateDirectory(folder);

        var fileName = $"{Guid.NewGuid()}{ext}";
        var filePath = Path.Combine(folder, fileName);

        await using var stream = File.Create(filePath);
        await file.CopyToAsync(stream, ct);

        // Return a server-relative URL: /observation-photos/<tenantId>/<sessionId>/<observationId>/<file>
        var relativeUrl = $"{_opts.RequestPath.TrimEnd('/')}/{tenantId}/{sessionId}/{observationId}/{fileName}";

        logger.LogInformation("Photo saved: {Url}", relativeUrl);
        return relativeUrl;
    }

    /// <inheritdoc />
    public void Delete(string relativeUrl)
    {
        try
        {
            var root = Path.IsPathRooted(_opts.RootPath)
                ? _opts.RootPath
                : Path.Combine(env.ContentRootPath, _opts.RootPath);

            // Strip the request-path prefix to get the file-system sub-path
            var prefix = _opts.RequestPath.TrimEnd('/');
            if (!relativeUrl.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
                return;

            var subPath = relativeUrl[prefix.Length..].TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
            var filePath = Path.Combine(root, subPath);

            if (File.Exists(filePath))
            {
                File.Delete(filePath);
                logger.LogInformation("Photo deleted: {Path}", filePath);
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to delete photo file for URL: {Url}", relativeUrl);
        }
    }
}
