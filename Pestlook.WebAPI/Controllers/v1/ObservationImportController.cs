using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pestlook.WebAPI.DTOs.Common;
using Pestlook.WebAPI.DTOs.Import;
using Pestlook.WebAPI.Infrastructure.Services.Interfaces;

namespace Pestlook.WebAPI.Controllers.v1;

/// <summary>Paper-scouting import — download a field-scoped Excel template, fill it in offline, upload it back.</summary>
[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/import/observations")]
[Authorize]
public sealed class ObservationImportController(IObservationImportService importService) : ControllerBase
{
    private const long MaxUploadBytes = 10 * 1024 * 1024; // 10 MB

    [HttpGet("template")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetTemplate([FromQuery] Guid fieldId, CancellationToken ct)
    {
        var bytes = await importService.GenerateTemplateAsync(fieldId, ct);
        return File(bytes,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            $"pestlook-import-{fieldId}.xlsx");
    }

    [HttpPost("validate")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(MaxUploadBytes)]
    [ProducesResponseType(typeof(ApiResponse<ImportValidationResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Validate(IFormFile file, CancellationToken ct)
    {
        if (file is null || file.Length == 0)
            return BadRequest(ApiResponse<object>.Fail("No file was uploaded."));
        if (!file.FileName.EndsWith(".xlsx", StringComparison.OrdinalIgnoreCase))
            return BadRequest(ApiResponse<object>.Fail("Only .xlsx files are supported."));

        await using var stream = file.OpenReadStream();
        var result = await importService.ValidateAsync(stream, ct);
        return Ok(ApiResponse<ImportValidationResponse>.Ok(result));
    }

    [HttpPost("commit")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(MaxUploadBytes)]
    [ProducesResponseType(typeof(ApiResponse<ImportCommitResponse>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Commit(IFormFile file, CancellationToken ct)
    {
        if (file is null || file.Length == 0)
            return BadRequest(ApiResponse<object>.Fail("No file was uploaded."));
        if (!file.FileName.EndsWith(".xlsx", StringComparison.OrdinalIgnoreCase))
            return BadRequest(ApiResponse<object>.Fail("Only .xlsx files are supported."));

        await using var stream = file.OpenReadStream();
        var result = await importService.CommitAsync(stream, ct);
        return StatusCode(StatusCodes.Status201Created,
            ApiResponse<ImportCommitResponse>.Ok(result, $"Session imported with {result.ObservationsCreated} observation(s)."));
    }
}
