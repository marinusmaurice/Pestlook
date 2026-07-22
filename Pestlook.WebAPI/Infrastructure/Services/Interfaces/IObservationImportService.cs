using Pestlook.WebAPI.DTOs.Import;

namespace Pestlook.WebAPI.Infrastructure.Services.Interfaces;

public interface IObservationImportService
{
    /// <summary>Generates a pre-filled, field-scoped .xlsx template ready for paper transcription.</summary>
    Task<byte[]> GenerateTemplateAsync(Guid fieldId, CancellationToken ct);

    /// <summary>Parses and validates an uploaded sheet without committing anything.</summary>
    Task<ImportValidationResponse> ValidateAsync(Stream fileStream, CancellationToken ct);

    /// <summary>Re-parses and validates the sheet, then commits it as a completed ScoutingSession. Throws if invalid.</summary>
    Task<ImportCommitResponse> CommitAsync(Stream fileStream, CancellationToken ct);
}
