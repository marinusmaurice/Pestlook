using Pestlook.WebAPI.Domain.Enums;

namespace Pestlook.WebAPI.DTOs.Import;

/// <summary>One problem found on a specific row of an uploaded import sheet.</summary>
public sealed record ImportRowError(int RowNumber, string Column, string Message);

/// <summary>A single parsed (and possibly invalid) observation row from the sheet.</summary>
public sealed record ImportRowPreview(
    int RowNumber,
    bool IsValid,
    string? ObservationType,
    string? TrapName,
    string? PestCommonName,
    bool IsUnknownPest,
    string? LifeStage,
    string? CaptureMode,
    int? Count,
    bool? IsPresent,
    double? Latitude,
    double? Longitude,
    string? ObservedAtTime,
    string? Notes);

/// <summary>Result of parsing + validating an uploaded sheet — nothing is committed yet.</summary>
public sealed record ImportValidationResponse(
    bool SessionInfoValid,
    List<ImportRowError> SessionErrors,
    string? FarmName,
    string? FieldName,
    string? ScoutName,
    string? SessionDate,
    string? WeatherConditions,
    double? TemperatureCelsius,
    string? SessionNotes,
    int TotalRows,
    int ValidRowCount,
    int InvalidRowCount,
    List<ImportRowPreview> Rows,
    List<ImportRowError> RowErrors)
{
    public bool CanCommit => SessionInfoValid && InvalidRowCount == 0 && ValidRowCount > 0;
}

/// <summary>Result of committing a previously-validated sheet.</summary>
public sealed record ImportCommitResponse(Guid SessionId, int ObservationsCreated);
