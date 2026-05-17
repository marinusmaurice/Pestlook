namespace Pestlook.UI.Mobile.Services;

/// <summary>
/// Handles taking photos (camera / gallery) and managing local photo files for observations.
/// Files are stored in the app cache directory and are not synced by the OS.
/// </summary>
public class PhotoService
{
    private static string GetObservationPhotoDir(string observationId)
    {
        var dir = Path.Combine(FileSystem.CacheDirectory, "observation-photos", observationId);
        Directory.CreateDirectory(dir);
        return dir;
    }

    /// <summary>
    /// Opens the camera or photo picker and saves the result to the local cache.
    /// Returns the local file path on success, or null if the user cancelled.
    /// </summary>
    public async Task<string?> TakePhotoAsync()
    {
        try
        {
            if (!MediaPicker.Default.IsCaptureSupported)
                return null;

            var photo = await MediaPicker.Default.CapturePhotoAsync();
            return photo is null ? null : await SavePhotoAsync(photo);
        }
        catch (PermissionException)
        {
            return null;
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[Photo] TakePhoto failed: {ex.Message}");
            return null;
        }
    }

    /// <summary>Opens the device photo gallery and saves the chosen image to cache.</summary>
    public async Task<string?> PickPhotoAsync()
    {
        try
        {
            var photo = await MediaPicker.Default.PickPhotoAsync();
            return photo is null ? null : await SavePhotoAsync(photo);
        }
        catch (PermissionException)
        {
            return null;
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[Photo] PickPhoto failed: {ex.Message}");
            return null;
        }
    }

    private static async Task<string?> SavePhotoAsync(FileResult photo)
    {
        // We save to a temp staging area; the observationId folder is created when we attach
        var ext = Path.GetExtension(photo.FileName).ToLowerInvariant();
        if (string.IsNullOrEmpty(ext)) ext = ".jpg";

        var tempDir = Path.Combine(FileSystem.CacheDirectory, "observation-photos", "_staging");
        Directory.CreateDirectory(tempDir);
        var destPath = Path.Combine(tempDir, $"{Guid.NewGuid()}{ext}");

        using var src = await photo.OpenReadAsync();
        using var dst = File.Create(destPath);
        await src.CopyToAsync(dst);
        return destPath;
    }

    /// <summary>
    /// Moves a staged photo file into the observation-specific subfolder.
    /// </summary>
    public static string AttachToObservation(string stagedPath, string observationId)
    {
        var dir = GetObservationPhotoDir(observationId);
        var dest = Path.Combine(dir, Path.GetFileName(stagedPath));
        if (stagedPath != dest)
        {
            File.Move(stagedPath, dest, overwrite: true);
        }
        return dest;
    }

    /// <summary>Deletes a local photo file. Silently succeeds if the file is missing.</summary>
    public static void DeleteLocalFile(string? localFilePath)
    {
        try
        {
            if (!string.IsNullOrEmpty(localFilePath) && File.Exists(localFilePath))
                File.Delete(localFilePath);
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[Photo] DeleteLocalFile failed: {ex.Message}");
        }
    }

    /// <summary>
    /// Deletes all local photo files for a given observation folder.
    /// </summary>
    public static void DeleteObservationPhotos(string observationId)
    {
        try
        {
            var dir = Path.Combine(FileSystem.CacheDirectory, "observation-photos", observationId);
            if (Directory.Exists(dir))
                Directory.Delete(dir, recursive: true);
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[Photo] DeleteObservationPhotos failed: {ex.Message}");
        }
    }

    /// <summary>
    /// Returns a data URI string suitable for use in an &lt;img src="..."&gt; tag inside a Blazor WebView.
    /// Reads the file and base64-encodes it. Capped at 4 MB to prevent OOM.
    /// </summary>
    public static async Task<string?> GetDataUriAsync(string localFilePath)
    {
        try
        {
            if (!File.Exists(localFilePath)) return null;
            var info = new FileInfo(localFilePath);
            if (info.Length > 4 * 1024 * 1024) return null; // too large — skip thumbnail

            var bytes = await File.ReadAllBytesAsync(localFilePath);
            var ext = Path.GetExtension(localFilePath).TrimStart('.').ToLowerInvariant();
            var mime = ext switch { "png" => "image/png", "webp" => "image/webp", _ => "image/jpeg" };
            return $"data:{mime};base64,{Convert.ToBase64String(bytes)}";
        }
        catch
        {
            return null;
        }
    }
}
