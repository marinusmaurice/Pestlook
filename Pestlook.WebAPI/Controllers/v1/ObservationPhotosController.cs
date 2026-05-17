using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using System.Text.Json;
using Pestlook.WebAPI.Data;
using Pestlook.WebAPI.DTOs.Common;
using Pestlook.WebAPI.Infrastructure;
using Pestlook.WebAPI.Infrastructure.Services.Interfaces;
using Pestlook.WebAPI.Options;

namespace Pestlook.WebAPI.Controllers.v1;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/scouting-sessions/{sessionId:guid}/observations/{observationId:guid}/photos")]
[Authorize]
public sealed class ObservationPhotosController(
    ApplicationDbContext db,
    IPhotoStorageService photoStorage,
    IOptions<PhotoStorageOptions> photoOptions,
    ICurrentUserService currentUserService) : ControllerBase
{
    private static readonly JsonSerializerOptions _jsonOpts = new() { PropertyNameCaseInsensitive = true };

    // ── GET /scouting-sessions/{sessionId}/observations/{observationId}/photos ──
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<List<string>>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetPhotos(Guid sessionId, Guid observationId, CancellationToken ct)
    {
        var obs = await db.SessionObservations
            .FirstOrDefaultAsync(o => o.Id == observationId && o.SessionId == sessionId, ct);

        if (obs is null)
            return NotFound(ApiResponse<object>.Fail("Observation not found."));

        var urls = obs.PhotoUrlsJson is not null
            ? JsonSerializer.Deserialize<List<string>>(obs.PhotoUrlsJson, _jsonOpts) ?? []
            : new List<string>();

        return Ok(ApiResponse<List<string>>.Ok(urls));
    }

    // ── POST /scouting-sessions/{sessionId}/observations/{observationId}/photos ──
    [HttpPost]
    [Consumes("multipart/form-data")]
    [ProducesResponseType(typeof(ApiResponse<List<string>>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    [RequestSizeLimit(50 * 1024 * 1024)] // 50 MB request limit (multiple files)
    public async Task<IActionResult> UploadPhotos(
        Guid sessionId,
        Guid observationId,
        [FromForm] IFormFileCollection files,
        CancellationToken ct)
    {
        if (files.Count == 0)
            return BadRequest(ApiResponse<object>.Fail("No files were uploaded."));

        var opts = photoOptions.Value;
        foreach (var file in files)
        {
            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!opts.AllowedExtensions.Contains(ext))
                return BadRequest(ApiResponse<object>.Fail($"File '{file.FileName}' has a disallowed extension. Allowed: {string.Join(", ", opts.AllowedExtensions)}"));

            if (file.Length > opts.MaxFileSizeBytes)
                return BadRequest(ApiResponse<object>.Fail($"File '{file.FileName}' exceeds the {opts.MaxFileSizeBytes / 1024 / 1024} MB limit."));
        }

        var obs = await db.SessionObservations
            .FirstOrDefaultAsync(o => o.Id == observationId && o.SessionId == sessionId, ct);

        if (obs is null)
            return NotFound(ApiResponse<object>.Fail("Observation not found."));

        var existing = obs.PhotoUrlsJson is not null
            ? JsonSerializer.Deserialize<List<string>>(obs.PhotoUrlsJson, _jsonOpts) ?? []
            : new List<string>();

        foreach (var file in files)
        {
            var url = await photoStorage.SaveAsync(obs.TenantId, sessionId, observationId, file, ct);
            existing.Add(url);
        }

        obs.PhotoUrlsJson = JsonSerializer.Serialize(existing);
        obs.UpdatedByUserId = currentUserService.UserId;
        await db.SaveChangesAsync(ct);

        return Ok(ApiResponse<List<string>>.Ok(existing, $"{files.Count} photo(s) uploaded."));
    }

    // ── DELETE /scouting-sessions/{sessionId}/observations/{observationId}/photos ──
    [HttpDelete]
    [ProducesResponseType(typeof(ApiResponse<List<string>>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeletePhoto(
        Guid sessionId,
        Guid observationId,
        [FromQuery] string url,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(url))
            return BadRequest(ApiResponse<object>.Fail("Photo URL is required."));

        var obs = await db.SessionObservations
            .FirstOrDefaultAsync(o => o.Id == observationId && o.SessionId == sessionId, ct);

        if (obs is null)
            return NotFound(ApiResponse<object>.Fail("Observation not found."));

        var existing = obs.PhotoUrlsJson is not null
            ? JsonSerializer.Deserialize<List<string>>(obs.PhotoUrlsJson, _jsonOpts) ?? []
            : new List<string>();

        if (!existing.Remove(url))
            return BadRequest(ApiResponse<object>.Fail("The specified photo URL was not found on this observation."));

        photoStorage.Delete(url);

        obs.PhotoUrlsJson = existing.Count > 0 ? JsonSerializer.Serialize(existing) : null;
        obs.UpdatedByUserId = currentUserService.UserId;
        await db.SaveChangesAsync(ct);

        return Ok(ApiResponse<List<string>>.Ok(existing, "Photo deleted."));
    }
}
