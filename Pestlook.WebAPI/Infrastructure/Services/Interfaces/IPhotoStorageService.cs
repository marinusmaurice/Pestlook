namespace Pestlook.WebAPI.Infrastructure.Services.Interfaces;

public interface IPhotoStorageService
{
    /// <summary>
    /// Saves an uploaded photo to disk under
    /// <c>{root}/{tenantId}/{sessionId}/{observationId}/</c>.
    /// </summary>
    /// <returns>The server-relative URL that can be stored in the database and served to clients.</returns>
    Task<string> SaveAsync(
        Guid tenantId,
        Guid sessionId,
        Guid observationId,
        IFormFile file,
        CancellationToken ct = default);

    /// <summary>
    /// Deletes the physical file that corresponds to the given server-relative URL.
    /// Silently succeeds if the file does not exist.
    /// </summary>
    void Delete(string relativeUrl);
}
