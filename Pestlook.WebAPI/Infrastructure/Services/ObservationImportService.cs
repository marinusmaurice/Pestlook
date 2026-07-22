using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using Pestlook.WebAPI.Data;
using Pestlook.WebAPI.Domain.Entities;
using Pestlook.WebAPI.Domain.Enums;
using Pestlook.WebAPI.DTOs.Import;
using Pestlook.WebAPI.Infrastructure.Exceptions;
using Pestlook.WebAPI.Infrastructure.Services.Interfaces;

namespace Pestlook.WebAPI.Infrastructure.Services;

public sealed class ObservationImportService(
    ApplicationDbContext db,
    ITenantContext tenantContext,
    ICurrentUserService currentUserService) : IObservationImportService
{
    private const int HeaderRow = 11;
    private const int FirstDataRow = 12;
    private const int BlankRowCount = 300;

    private static readonly string[] LifeStageValues = ["Egg", "Larva", "Nymph", "Pupa", "Adult", "Unknown"];
    private static readonly string[] CaptureModeValues = ["Count", "Presence"];
    private static readonly string[] ObservationTypeValues = ["Trap", "AdHoc"];
    private static readonly string[] YesNoValues = ["Yes", "No"];

    // ── Template generation ─────────────────────────────────────────────────────

    public async Task<byte[]> GenerateTemplateAsync(Guid fieldId, CancellationToken ct)
    {
        var field = await db.Fields.Include(f => f.Farm)
            .FirstOrDefaultAsync(f => f.Id == fieldId, ct)
            ?? throw new KeyNotFoundException("Field not found.");

        var traps = await db.Traps
            .Where(t => t.FieldId == fieldId && t.IsEnabled)
            .OrderBy(t => t.Name)
            .Select(t => t.Name)
            .ToListAsync(ct);

        var pests = await db.Pests
            .OrderBy(p => p.CommonName)
            .Select(p => p.CommonName)
            .ToListAsync(ct);

        var scouts = await db.Users
            .OrderBy(u => u.FirstName).ThenBy(u => u.LastName)
            .Select(u => u.FirstName + " " + u.LastName)
            .ToListAsync(ct);

        // Show the temperature field in whichever unit the downloading user prefers —
        // baked into the sheet's own label (not just remembered client-side), so
        // parsing later knows how to convert it back to Celsius regardless of who
        // actually uploads the completed file.
        var tempUnit = await db.Users
            .Where(u => u.Id == currentUserService.UserId)
            .Select(u => u.TemperatureUnit)
            .FirstOrDefaultAsync(ct) ?? "C";

        using var wb = new XLWorkbook();

        // ── Hidden lookups sheet ────────────────────────────────────────────────
        var lookups = wb.Worksheets.Add("Lookups");
        WriteLookupColumn(lookups, "A", "Traps", traps);
        WriteLookupColumn(lookups, "B", "Pests", pests);
        WriteLookupColumn(lookups, "C", "Scouts", scouts);
        WriteLookupColumn(lookups, "D", "LifeStages", LifeStageValues);
        WriteLookupColumn(lookups, "E", "CaptureModes", CaptureModeValues);
        WriteLookupColumn(lookups, "F", "ObservationTypes", ObservationTypeValues);
        WriteLookupColumn(lookups, "G", "YesNo", YesNoValues);
        lookups.Visibility = XLWorksheetVisibility.VeryHidden;

        // ── Main sheet ───────────────────────────────────────────────────────────
        var ws = wb.Worksheets.Add("Import");

        ws.Cell("A1").Value = "PestLook — Paper Scouting Import";
        ws.Range("A1:C1").Merge();
        ws.Cell("A1").Style.Font.Bold = true;
        ws.Cell("A1").Style.Font.FontSize = 14;

        ws.Cell("A3").Value = "Farm";
        ws.Cell("B3").Value = field.Farm.Name;
        ws.Cell("A4").Value = "Field";
        ws.Cell("B4").Value = field.Name;
        LockCell(ws.Cell("B3"));
        LockCell(ws.Cell("B4"));

        ws.Cell("A5").Value = "Session Date *";
        ws.Cell("B5").Style.NumberFormat.Format = "yyyy-mm-dd";
        UnlockCell(ws.Cell("B5"));
        ws.Cell("C5").Value = "e.g. 2026-07-21";
        ws.Cell("C5").Style.Font.FontColor = XLColor.FromHtml("#9AA8A1");
        ws.Cell("C5").Style.Font.Italic = true;
        LockCell(ws.Cell("C5"));
        ws.Cell("C5").Style.Fill.BackgroundColor = XLColor.NoColor;
        // The date-type validation makes newer Excel (2021/365) show its built-in
        // calendar picker on the cell and rejects free text outright — but that
        // picker doesn't appear in every Excel version, so the visible placeholder
        // above and the input-message tooltip below are the format hint that
        // actually works everywhere.
        var dateValidation = ws.Cell("B5").SetDataValidation();
        dateValidation.Date.Between(new DateTime(2020, 1, 1), new DateTime(2035, 12, 31));
        dateValidation.InputTitle = "Session Date";
        dateValidation.InputMessage = "Enter the date scouting happened, format YYYY-MM-DD (e.g. 2026-07-21).";
        dateValidation.ShowInputMessage = true;
        dateValidation.ErrorTitle = "Invalid date";
        dateValidation.ErrorMessage = "Enter a date between 2020-01-01 and 2035-12-31, in YYYY-MM-DD format (e.g. 2026-07-21).";

        ws.Cell("A6").Value = "Scout *";
        UnlockCell(ws.Cell("B6"));
        ApplyListValidation(ws.Cell("B6"), lookups, "C", scouts.Count);

        ws.Cell("A7").Value = "Weather Conditions";
        UnlockCell(ws.Cell("B7"));

        ws.Cell("A8").Value = $"Temperature (°{tempUnit})";
        UnlockCell(ws.Cell("B8"));

        ws.Cell("A9").Value = "Session Notes";
        UnlockCell(ws.Cell("B9"));

        for (var r = 3; r <= 9; r++)
            ws.Cell($"A{r}").Style.Font.Bold = true;

        string[] headers =
        [
            "Observation Type *", "Trap", "Pest Common Name *", "Unknown Pest?",
            "Life Stage", "Capture Mode *", "Count", "Present?",
            "Latitude", "Longitude", "Observed At (HH:MM)", "Notes"
        ];
        for (var i = 0; i < headers.Length; i++)
        {
            var cell = ws.Cell(HeaderRow, i + 1);
            cell.Value = headers[i];
            cell.Style.Font.Bold = true;
            cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#EAF7F0");
        }

        var lastDataRow = FirstDataRow + BlankRowCount - 1;
        for (var r = FirstDataRow; r <= lastDataRow; r++)
            for (var c = 1; c <= headers.Length; c++)
                UnlockCell(ws.Cell(r, c));

        ApplyListValidation(ws.Range(FirstDataRow, 1, lastDataRow, 1), lookups, "F", ObservationTypeValues.Length);
        ApplyListValidation(ws.Range(FirstDataRow, 2, lastDataRow, 2), lookups, "A", traps.Count);
        ApplyListValidation(ws.Range(FirstDataRow, 3, lastDataRow, 3), lookups, "B", pests.Count);
        ApplyListValidation(ws.Range(FirstDataRow, 4, lastDataRow, 4), lookups, "G", YesNoValues.Length);
        ApplyListValidation(ws.Range(FirstDataRow, 5, lastDataRow, 5), lookups, "D", LifeStageValues.Length);
        ApplyListValidation(ws.Range(FirstDataRow, 6, lastDataRow, 6), lookups, "E", CaptureModeValues.Length);
        ApplyListValidation(ws.Range(FirstDataRow, 8, lastDataRow, 8), lookups, "G", YesNoValues.Length);

        var observedAtRange = ws.Range(FirstDataRow, 11, lastDataRow, 11);
        observedAtRange.Style.NumberFormat.Format = "hh:mm";
        var timeValidation = observedAtRange.SetDataValidation();
        timeValidation.Time.Between(TimeSpan.Zero, new TimeSpan(23, 59, 0));
        timeValidation.InputTitle = "Observed At";
        timeValidation.InputMessage = "Optional. 24-hour time, format HH:MM (e.g. 14:30).";
        timeValidation.ShowInputMessage = true;
        timeValidation.ErrorTitle = "Invalid time";
        timeValidation.ErrorMessage = "Enter a 24-hour time in HH:MM format (e.g. 14:30), or leave it blank.";

        ws.Column(1).Width = 16;
        ws.Column(2).Width = 16;
        ws.Column(3).Width = 20;
        ws.Column(4).Width = 12;
        ws.Column(5).Width = 12;
        ws.Column(6).Width = 14;
        ws.Column(12).Width = 28;
        ws.SheetView.FreezeRows(HeaderRow);

        ws.Protect().AllowElement(XLSheetProtectionElements.SelectUnlockedCells);

        using var stream = new MemoryStream();
        wb.SaveAs(stream);
        return stream.ToArray();
    }

    private static void WriteLookupColumn(IXLWorksheet ws, string col, string header, IReadOnlyList<string> values)
    {
        ws.Cell($"{col}1").Value = header;
        for (var i = 0; i < values.Count; i++)
            ws.Cell($"{col}{i + 2}").Value = values[i];
    }

    private static void LockCell(IXLCell cell)
    {
        cell.Style.Protection.Locked = true;
        cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#F0F0F0");
    }

    private static void UnlockCell(IXLCell cell) => cell.Style.Protection.Locked = false;

    private static void ApplyListValidation(IXLCell cell, IXLWorksheet lookups, string col, int count)
    {
        if (count == 0) return;
        cell.SetDataValidation().List(lookups.Range($"{col}2:{col}{count + 1}"), true);
    }

    private static void ApplyListValidation(IXLRange range, IXLWorksheet lookups, string col, int count)
    {
        if (count == 0) return;
        range.SetDataValidation().List(lookups.Range($"{col}2:{col}{count + 1}"), true);
    }

    // ── Parsing + validation ─────────────────────────────────────────────────────

    private sealed class ParsedSheet
    {
        public string? FarmName;
        public string? FieldName;
        public Field? Field;
        public string? ScoutName;
        public ApplicationUser? Scout;
        public DateOnly? SessionDate;
        public string? WeatherConditions;
        public double? TemperatureCelsius;
        public string? SessionNotes;
        public readonly List<ImportRowError> SessionErrors = [];
        public readonly List<ParsedRow> Rows = [];
    }

    private sealed class ParsedRow
    {
        public int RowNumber;
        public string? ObservationType;
        public string? TrapName;
        public Trap? Trap;
        public string? PestCommonName;
        public Pest? Pest;
        public bool IsUnknownPest;
        public string? LifeStage;
        public string? CaptureMode;
        public int? Count;
        public bool? IsPresent;
        public double? Latitude;
        public double? Longitude;
        public TimeOnly? ObservedAtTime;
        public string? Notes;
        public readonly List<string> Errors = [];
    }

    private async Task<ParsedSheet> ParseAsync(Stream fileStream, CancellationToken ct)
    {
        var sheet = new ParsedSheet();

        using var wb = new XLWorkbook(fileStream);
        var ws = wb.Worksheet("Import");

        sheet.FarmName = ws.Cell("B3").GetString().Trim();
        sheet.FieldName = ws.Cell("B4").GetString().Trim();
        sheet.ScoutName = ws.Cell("B6").GetString().Trim();
        sheet.WeatherConditions = NullIfEmpty(ws.Cell("B7").GetString());
        sheet.SessionNotes = NullIfEmpty(ws.Cell("B9").GetString());

        // The unit is baked into the header label (set from the downloader's own
        // preference at template-generation time — see GenerateTemplateAsync) so
        // conversion is correct regardless of who actually uploads the file.
        var isFahrenheit = ws.Cell("A8").GetString().Contains("°F");
        var tempText = ws.Cell("B8").GetString().Trim();
        if (!string.IsNullOrEmpty(tempText))
        {
            if (double.TryParse(tempText, out var temp))
                sheet.TemperatureCelsius = isFahrenheit ? (temp - 32) * 5 / 9 : temp;
            else
                sheet.SessionErrors.Add(new ImportRowError(8, "Temperature", $"'{tempText}' is not a number."));
        }

        var dateCell = ws.Cell("B5");
        if (dateCell.TryGetValue<DateTime>(out var dateVal))
        {
            sheet.SessionDate = DateOnly.FromDateTime(dateVal);
        }
        else
        {
            var dateText = dateCell.GetString().Trim();
            if (string.IsNullOrEmpty(dateText))
                sheet.SessionErrors.Add(new ImportRowError(5, "Session Date", "Session Date is required."));
            else if (DateOnly.TryParse(dateText, out var parsed))
                sheet.SessionDate = parsed;
            else
                sheet.SessionErrors.Add(new ImportRowError(5, "Session Date", $"'{dateText}' is not a valid date."));
        }

        if (string.IsNullOrEmpty(sheet.FarmName) || string.IsNullOrEmpty(sheet.FieldName))
        {
            sheet.SessionErrors.Add(new ImportRowError(3, "Farm/Field", "Farm and Field must be present — do not clear the locked header cells."));
        }
        else
        {
            sheet.Field = await db.Fields.Include(f => f.Farm)
                .FirstOrDefaultAsync(f =>
                    f.Name.ToLower() == sheet.FieldName.ToLower() &&
                    f.Farm.Name.ToLower() == sheet.FarmName.ToLower(), ct);
            if (sheet.Field is null)
                sheet.SessionErrors.Add(new ImportRowError(4, "Field", $"No field named '{sheet.FieldName}' on farm '{sheet.FarmName}' was found. Was it renamed or deleted since this sheet was downloaded?"));
        }

        if (string.IsNullOrEmpty(sheet.ScoutName))
        {
            sheet.SessionErrors.Add(new ImportRowError(6, "Scout", "Scout is required."));
        }
        else
        {
            sheet.Scout = await db.Users.FirstOrDefaultAsync(u =>
                (u.FirstName + " " + u.LastName).ToLower() == sheet.ScoutName.ToLower() ||
                u.Email!.ToLower() == sheet.ScoutName.ToLower(), ct);
            if (sheet.Scout is null)
                sheet.SessionErrors.Add(new ImportRowError(6, "Scout", $"No team member named '{sheet.ScoutName}' was found."));
        }

        var lastRow = ws.LastRowUsed()?.RowNumber() ?? FirstDataRow - 1;
        for (var r = FirstDataRow; r <= lastRow; r++)
        {
            var row = ws.Row(r);
            var obsType = row.Cell(1).GetString().Trim();
            var trapName = row.Cell(2).GetString().Trim();
            var pestName = row.Cell(3).GetString().Trim();

            // Skip fully blank rows silently — leftover unused template rows.
            if (string.IsNullOrEmpty(obsType) && string.IsNullOrEmpty(trapName) && string.IsNullOrEmpty(pestName))
                continue;

            var parsed = new ParsedRow { RowNumber = r, ObservationType = NullIfEmpty(obsType), TrapName = NullIfEmpty(trapName), Notes = NullIfEmpty(row.Cell(12).GetString()) };

            var unknownText = row.Cell(4).GetString().Trim();
            parsed.IsUnknownPest = unknownText.Equals("Yes", StringComparison.OrdinalIgnoreCase);
            parsed.PestCommonName = NullIfEmpty(pestName);
            parsed.LifeStage = NullIfEmpty(row.Cell(5).GetString());
            parsed.CaptureMode = NullIfEmpty(row.Cell(6).GetString());

            var countText = row.Cell(7).GetString().Trim();
            if (!string.IsNullOrEmpty(countText))
            {
                if (int.TryParse(countText, out var count) && count >= 0) parsed.Count = count;
                else parsed.Errors.Add($"Count '{countText}' must be a non-negative whole number.");
            }

            var presentText = row.Cell(8).GetString().Trim();
            if (!string.IsNullOrEmpty(presentText))
            {
                if (presentText.Equals("Yes", StringComparison.OrdinalIgnoreCase)) parsed.IsPresent = true;
                else if (presentText.Equals("No", StringComparison.OrdinalIgnoreCase)) parsed.IsPresent = false;
                else parsed.Errors.Add($"Present? must be Yes or No, got '{presentText}'.");
            }

            var latText = row.Cell(9).GetString().Trim();
            if (!string.IsNullOrEmpty(latText))
            {
                if (double.TryParse(latText, out var lat)) parsed.Latitude = lat;
                else parsed.Errors.Add($"Latitude '{latText}' is not a number.");
            }

            var lonText = row.Cell(10).GetString().Trim();
            if (!string.IsNullOrEmpty(lonText))
            {
                if (double.TryParse(lonText, out var lon)) parsed.Longitude = lon;
                else parsed.Errors.Add($"Longitude '{lonText}' is not a number.");
            }

            var timeText = row.Cell(11).GetString().Trim();
            if (!string.IsNullOrEmpty(timeText))
            {
                if (TimeOnly.TryParse(timeText, out var time)) parsed.ObservedAtTime = time;
                else parsed.Errors.Add($"Observed At '{timeText}' is not a valid time (use HH:MM).");
            }

            // ── Cross-field validation ──────────────────────────────────────────
            if (string.IsNullOrEmpty(parsed.ObservationType))
                parsed.Errors.Add("Observation Type is required.");
            else if (!ObservationTypeValues.Contains(parsed.ObservationType, StringComparer.OrdinalIgnoreCase))
                parsed.Errors.Add($"Observation Type must be Trap or AdHoc, got '{parsed.ObservationType}'.");

            if (string.Equals(parsed.ObservationType, "Trap", StringComparison.OrdinalIgnoreCase))
            {
                if (string.IsNullOrEmpty(parsed.TrapName))
                {
                    parsed.Errors.Add("Trap is required for a Trap observation.");
                }
                else if (sheet.Field is not null)
                {
                    parsed.Trap = await db.Traps.FirstOrDefaultAsync(t =>
                        t.FieldId == sheet.Field.Id &&
                        (t.Name.ToLower() == parsed.TrapName.ToLower() || t.Barcode == parsed.TrapName), ct);
                    if (parsed.Trap is null)
                        parsed.Errors.Add($"No trap named '{parsed.TrapName}' was found on this field.");
                }
            }

            if (parsed.IsUnknownPest)
            {
                parsed.PestCommonName = null;
            }
            else if (string.IsNullOrEmpty(parsed.PestCommonName))
            {
                parsed.Errors.Add("Pest Common Name is required unless Unknown Pest? is Yes.");
            }
            else
            {
                parsed.Pest = await db.Pests.FirstOrDefaultAsync(p => p.CommonName.ToLower() == parsed.PestCommonName.ToLower(), ct);
                if (parsed.Pest is null)
                    parsed.Errors.Add($"No pest named '{parsed.PestCommonName}' was found in the catalogue.");
            }

            if (string.IsNullOrEmpty(parsed.CaptureMode) && parsed.Pest is not null)
                parsed.CaptureMode = parsed.Pest.DefaultCaptureMode.ToString();

            if (string.IsNullOrEmpty(parsed.CaptureMode))
            {
                parsed.Errors.Add("Capture Mode is required.");
            }
            else if (!CaptureModeValues.Contains(parsed.CaptureMode, StringComparer.OrdinalIgnoreCase))
            {
                parsed.Errors.Add($"Capture Mode must be Count or Presence, got '{parsed.CaptureMode}'.");
            }
            else if (parsed.CaptureMode.Equals("Count", StringComparison.OrdinalIgnoreCase) && parsed.Count is null)
            {
                parsed.Errors.Add("Count is required when Capture Mode is Count.");
            }
            else if (parsed.CaptureMode.Equals("Presence", StringComparison.OrdinalIgnoreCase) && parsed.IsPresent is null)
            {
                parsed.Errors.Add("Present? is required when Capture Mode is Presence.");
            }

            if (!string.IsNullOrEmpty(parsed.LifeStage) && !LifeStageValues.Contains(parsed.LifeStage, StringComparer.OrdinalIgnoreCase))
                parsed.Errors.Add($"Life Stage '{parsed.LifeStage}' is not recognised.");

            sheet.Rows.Add(parsed);
        }

        return sheet;
    }

    private static string? NullIfEmpty(string? s) => string.IsNullOrWhiteSpace(s) ? null : s.Trim();

    private static TimeZoneInfo ResolveTimeZone(string? ianaId) =>
        !string.IsNullOrWhiteSpace(ianaId) && TimeZoneInfo.TryFindSystemTimeZoneById(ianaId, out var tz)
            ? tz
            : TimeZoneInfo.Utc;

    public async Task<ImportValidationResponse> ValidateAsync(Stream fileStream, CancellationToken ct)
    {
        var sheet = await ParseAsync(fileStream, ct);

        var rowPreviews = sheet.Rows.Select(r => new ImportRowPreview(
            r.RowNumber, r.Errors.Count == 0,
            r.ObservationType, r.TrapName, r.PestCommonName, r.IsUnknownPest,
            r.LifeStage, r.CaptureMode, r.Count, r.IsPresent,
            r.Latitude, r.Longitude, r.ObservedAtTime?.ToString("HH:mm"), r.Notes)).ToList();

        var rowErrors = sheet.Rows
            .SelectMany(r => r.Errors.Select(e => new ImportRowError(r.RowNumber, "Row", e)))
            .ToList();

        return new ImportValidationResponse(
            SessionInfoValid: sheet.SessionErrors.Count == 0,
            SessionErrors: sheet.SessionErrors,
            FarmName: sheet.FarmName,
            FieldName: sheet.FieldName,
            ScoutName: sheet.ScoutName,
            SessionDate: sheet.SessionDate?.ToString("yyyy-MM-dd"),
            WeatherConditions: sheet.WeatherConditions,
            TemperatureCelsius: sheet.TemperatureCelsius,
            SessionNotes: sheet.SessionNotes,
            TotalRows: sheet.Rows.Count,
            ValidRowCount: sheet.Rows.Count(r => r.Errors.Count == 0),
            InvalidRowCount: sheet.Rows.Count(r => r.Errors.Count > 0),
            Rows: rowPreviews,
            RowErrors: rowErrors);
    }

    public async Task<ImportCommitResponse> CommitAsync(Stream fileStream, CancellationToken ct)
    {
        var sheet = await ParseAsync(fileStream, ct);

        if (sheet.SessionErrors.Count > 0 || sheet.Field is null || sheet.Scout is null || sheet.SessionDate is null)
            throw new ConflictException("Session information is invalid — re-validate before committing.");
        if (sheet.Rows.Any(r => r.Errors.Count > 0))
            throw new ConflictException("One or more rows are invalid — re-validate before committing.");
        if (sheet.Rows.Count == 0)
            throw new ConflictException("The sheet has no observation rows to import.");

        var tenantId = tenantContext.TenantId ?? throw new InvalidOperationException("Tenant context is required.");

        // Paper sheets record wall-clock times in the scout's own timezone, not UTC —
        // convert using their saved Timezone (falls back to UTC if unset/unrecognized).
        var scoutTimeZone = ResolveTimeZone(sheet.Scout.Timezone);
        var sessionDateTime = TimeZoneInfo.ConvertTimeToUtc(
            DateTime.SpecifyKind(sheet.SessionDate.Value.ToDateTime(TimeOnly.MinValue), DateTimeKind.Unspecified),
            scoutTimeZone);

        var session = new ScoutingSession
        {
            TenantId = tenantId,
            ScouterId = sheet.Scout.Id,
            FieldId = sheet.Field.Id,
            FarmId = sheet.Field.FarmId,
            IsPlanned = false,
            StartedAt = sessionDateTime,
            CompletedAt = sessionDateTime,
            WeatherConditions = sheet.WeatherConditions,
            TemperatureCelsius = sheet.TemperatureCelsius,
            Notes = sheet.SessionNotes,
            CreatedByUserId = currentUserService.UserId,
        };

        var sortOrder = 0;
        foreach (var row in sheet.Rows)
        {
            var observedAt = row.ObservedAtTime.HasValue
                ? TimeZoneInfo.ConvertTimeToUtc(
                    DateTime.SpecifyKind(sheet.SessionDate.Value.ToDateTime(row.ObservedAtTime.Value), DateTimeKind.Unspecified),
                    scoutTimeZone)
                : sessionDateTime;

            session.SessionObservations.Add(new SessionObservation
            {
                TenantId = tenantId,
                ObservationType = row.ObservationType!.Equals("Trap", StringComparison.OrdinalIgnoreCase)
                    ? ObservationType.Trap : ObservationType.AdHoc,
                IsPlanned = false,
                TrapId = row.Trap?.Id,
                PestId = row.Pest?.Id,
                CaptureMode = Enum.Parse<CaptureMode>(row.CaptureMode!, ignoreCase: true),
                Count = row.Count,
                IsPresent = row.IsPresent,
                Latitude = row.Latitude,
                Longitude = row.Longitude,
                IsUnknownPest = row.IsUnknownPest,
                Notes = row.Notes,
                ThresholdCount = row.Pest?.ThresholdCount,
                LifeStage = string.IsNullOrEmpty(row.LifeStage) ? null : Enum.Parse<LifeStage>(row.LifeStage, ignoreCase: true),
                SortOrder = sortOrder++,
                ObservedAt = observedAt,
                CreatedByUserId = currentUserService.UserId,
            });
        }

        db.ScoutingSessions.Add(session);
        await db.SaveChangesAsync(ct);

        return new ImportCommitResponse(session.Id, session.SessionObservations.Count);
    }
}
