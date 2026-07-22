using System.Net;
using System.Net.Http.Json;
using ClosedXML.Excel;
using FluentAssertions;
using Pestlook.Tests.Integration.Infrastructure;
using Pestlook.WebAPI.Domain.Enums;
using Pestlook.WebAPI.DTOs.Auth;
using Pestlook.WebAPI.DTOs.Common;
using Pestlook.WebAPI.DTOs.Farms;
using Pestlook.WebAPI.DTOs.Fields;
using Pestlook.WebAPI.DTOs.Import;
using Pestlook.WebAPI.DTOs.Pests;
using Pestlook.WebAPI.DTOs.Traps;

namespace Pestlook.Tests.Integration.Import;

/// <summary>
/// End-to-end coverage of the paper-scouting import: generate a template for a
/// real field, fill it in exactly as a person would in Excel, upload it, and
/// confirm it lands as a real ScoutingSession with the right observations.
/// </summary>
[Collection("Integration")]
public sealed class ObservationImportTests(TestWebApplicationFactory factory) : IAsyncLifetime
{
    private readonly HttpClient _admin = factory.CreateAdminClient();
    private Guid _fieldId;
    private string _trapName = null!;
    private string _pestName = null!;

    private string _farmName = null!;
    private string _fieldName = null!;

    public async Task InitializeAsync()
    {
        // Names must be unique per test instance: the import resolves Farm/Field by
        // name (matching how a real paper-transcriber's sheet works), and xUnit runs
        // InitializeAsync fresh for every test method against the same shared DB — a
        // hardcoded name here would collide with an earlier test's same-named field.
        var suffix = Guid.NewGuid().ToString("N")[..8];
        _farmName = $"Import Test Farm {suffix}";
        _fieldName = $"Import Test Field {suffix}";

        var farmResp = await _admin.PostAsJsonAsync("/api/v1/farms",
            new CreateFarmRequest(_farmName, null, null, null, null, null));
        var farmId = (await farmResp.Content.ReadFromJsonAsync<ApiResponse<FarmResponse>>())!.Data!.Id;

        var fieldResp = await _admin.PostAsJsonAsync("/api/v1/fields",
            new CreateFieldRequest(farmId, _fieldName, null, null, null, null, null, null, null));
        _fieldId = (await fieldResp.Content.ReadFromJsonAsync<ApiResponse<FieldResponse>>())!.Data!.Id;

        _trapName = $"Trap-{Guid.NewGuid():N}"[..12];
        var trapResp = await _admin.PostAsJsonAsync("/api/v1/traps",
            new CreateTrapRequest(_trapName, null, null, _fieldId, null, null, null));
        trapResp.StatusCode.Should().Be(HttpStatusCode.Created);

        _pestName = $"Pest-{Guid.NewGuid():N}"[..12];
        var pestResp = await _admin.PostAsJsonAsync("/api/v1/pests",
            new CreatePestRequest(_pestName, null, PestCategory.Insect, CaptureMode.Count, 10, null));
        pestResp.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    public async Task DisposeAsync()
    {
        // DefaultAdminId is shared across every test class in this collection —
        // undo any preference change so it can't leak into another test's run.
        await _admin.PatchAsJsonAsync("/api/v1/auth/me/preferences", new UpdatePreferencesRequest("C", "km"));
        await _admin.PatchAsJsonAsync("/api/v1/users/timezone", new UpdateTimezoneRequest("UTC"));
    }

    [Fact]
    public async Task Template_ForRealField_ContainsFarmFieldTrapAndPest()
    {
        var resp = await _admin.GetAsync($"/api/v1/import/observations/template?fieldId={_fieldId}");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        resp.Content.Headers.ContentType!.MediaType.Should().Be("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

        var bytes = await resp.Content.ReadAsByteArrayAsync();
        using var wb = new XLWorkbook(new MemoryStream(bytes));
        var ws = wb.Worksheet("Import");

        ws.Cell("B3").GetString().Should().Be(_farmName);
        ws.Cell("B4").GetString().Should().Be(_fieldName);

        var lookups = wb.Worksheet("Lookups");
        var trapNames = lookups.Column("A").CellsUsed().Skip(1).Select(c => c.GetString()).ToList();
        trapNames.Should().Contain(_trapName);
        var pestNames = lookups.Column("B").CellsUsed().Skip(1).Select(c => c.GetString()).ToList();
        pestNames.Should().Contain(_pestName);
    }

    [Fact]
    public async Task FilledTemplate_Validate_ReportsNoErrorsAndCorrectCounts()
    {
        var fileBytes = await BuildFilledTemplateAsync();

        var validation = await ValidateAsync(fileBytes);

        validation.SessionInfoValid.Should().BeTrue(because: string.Join("; ", validation.SessionErrors.Select(e => e.Message)));
        validation.TotalRows.Should().Be(2);
        validation.ValidRowCount.Should().Be(2);
        validation.InvalidRowCount.Should().Be(0);
        validation.CanCommit.Should().BeTrue();
        validation.FarmName.Should().Be(_farmName);
        validation.FieldName.Should().Be(_fieldName);
    }

    [Fact]
    public async Task FilledTemplate_Commit_CreatesSessionWithBothObservations()
    {
        var fileBytes = await BuildFilledTemplateAsync();

        var preCheck = await ValidateAsync(fileBytes);
        preCheck.CanCommit.Should().BeTrue(
            $"session errors: [{string.Join("; ", preCheck.SessionErrors.Select(e => e.Message))}], row errors: [{string.Join("; ", preCheck.RowErrors.Select(e => $"row{e.RowNumber}:{e.Message}"))}]");

        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(fileBytes);
        fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        content.Add(fileContent, "file", "filled.xlsx");

        var resp = await _admin.PostAsync("/api/v1/import/observations/commit", content);
        resp.StatusCode.Should().Be(HttpStatusCode.Created, await resp.Content.ReadAsStringAsync());

        var body = await resp.Content.ReadFromJsonAsync<ApiResponse<ImportCommitResponse>>();
        body!.Data!.ObservationsCreated.Should().Be(2);

        var sessionResp = await _admin.GetAsync($"/api/v1/scouting-sessions/{body.Data.SessionId}");
        sessionResp.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Template_ForFahrenheitUser_LabelsTemperatureColumnInFahrenheit()
    {
        var prefResp = await _admin.PatchAsJsonAsync("/api/v1/auth/me/preferences",
            new UpdatePreferencesRequest("F", "km"));
        prefResp.StatusCode.Should().Be(HttpStatusCode.OK);

        var resp = await _admin.GetAsync($"/api/v1/import/observations/template?fieldId={_fieldId}");
        var bytes = await resp.Content.ReadAsByteArrayAsync();
        using var wb = new XLWorkbook(new MemoryStream(bytes));
        var ws = wb.Worksheet("Import");

        ws.Cell("A8").GetString().Should().Be("Temperature (°F)");
    }

    [Fact]
    public async Task FahrenheitTemperature_Commit_IsConvertedToCelsiusInTheDatabase()
    {
        var prefResp = await _admin.PatchAsJsonAsync("/api/v1/auth/me/preferences",
            new UpdatePreferencesRequest("F", "km"));
        prefResp.StatusCode.Should().Be(HttpStatusCode.OK);

        // 75.2°F == 24.0°C exactly, avoiding floating-point rounding ambiguity in the assertion.
        var templateResp = await _admin.GetAsync($"/api/v1/import/observations/template?fieldId={_fieldId}");
        var templateBytes = await templateResp.Content.ReadAsByteArrayAsync();
        using var wb = new XLWorkbook(new MemoryStream(templateBytes));
        var ws = wb.Worksheet("Import");

        ws.Cell("A8").GetString().Should().Be("Temperature (°F)", "the label must reflect the unit before we trust the value entered below it");

        ws.Cell("B5").Value = DateTime.UtcNow.Date;
        ws.Cell("B6").Value = "Admin Test";
        ws.Cell("B8").Value = 75.2;
        ws.Cell("A12").Value = "Trap";
        ws.Cell("B12").Value = _trapName;
        ws.Cell("C12").Value = _pestName;
        ws.Cell("F12").Value = "Count";
        ws.Cell("G12").Value = 3;

        using var outStream = new MemoryStream();
        wb.SaveAs(outStream);

        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(outStream.ToArray());
        fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        content.Add(fileContent, "file", "fahrenheit.xlsx");

        var resp = await _admin.PostAsync("/api/v1/import/observations/commit", content);
        resp.StatusCode.Should().Be(HttpStatusCode.Created, await resp.Content.ReadAsStringAsync());
        var commitBody = await resp.Content.ReadFromJsonAsync<ApiResponse<ImportCommitResponse>>();

        // Raw JSON parsing here, not ReadFromJsonAsync<ScoutingSessionResponse> — the
        // response's nested observations carry enum fields that hit a pre-existing,
        // unrelated System.Text.Json/JsonStringEnumConverter mismatch in test HTTP
        // clients (same root cause as PestsControllerTests' known failures). This
        // test only needs the plain numeric TemperatureCelsius field, so avoid it.
        var sessionResp = await _admin.GetAsync($"/api/v1/scouting-sessions/{commitBody!.Data!.SessionId}");
        var doc = System.Text.Json.JsonDocument.Parse(await sessionResp.Content.ReadAsStringAsync());
        var temperatureCelsius = doc.RootElement.GetProperty("data").GetProperty("temperatureCelsius").GetDouble();

        temperatureCelsius.Should().BeApproximately(24.0, 0.01);
    }

    [Fact]
    public async Task FilledTemplate_Commit_ConvertsScoutLocalTimeToUtcUsingScoutTimezone()
    {
        // Africa/Johannesburg is a fixed UTC+2 offset with no DST, so the expected
        // UTC values are unambiguous and stable year-round.
        var tzResp = await _admin.PatchAsJsonAsync("/api/v1/users/timezone", new UpdateTimezoneRequest("Africa/Johannesburg"));
        tzResp.StatusCode.Should().Be(HttpStatusCode.OK);

        var templateResp = await _admin.GetAsync($"/api/v1/import/observations/template?fieldId={_fieldId}");
        var templateBytes = await templateResp.Content.ReadAsByteArrayAsync();
        using var wb = new XLWorkbook(new MemoryStream(templateBytes));
        var ws = wb.Worksheet("Import");

        var sessionDate = new DateTime(2026, 1, 15);
        ws.Cell("B5").Value = sessionDate;
        ws.Cell("B6").Value = "Admin Test";
        ws.Cell("A12").Value = "Trap";
        ws.Cell("B12").Value = _trapName;
        ws.Cell("C12").Value = _pestName;
        ws.Cell("F12").Value = "Count";
        ws.Cell("G12").Value = 4;
        ws.Cell("K12").Value = "09:15"; // 09:15 in Johannesburg == 07:15 UTC

        using var outStream = new MemoryStream();
        wb.SaveAs(outStream);

        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(outStream.ToArray());
        fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        content.Add(fileContent, "file", "tz.xlsx");

        var resp = await _admin.PostAsync("/api/v1/import/observations/commit", content);
        resp.StatusCode.Should().Be(HttpStatusCode.Created, await resp.Content.ReadAsStringAsync());
        var commitBody = await resp.Content.ReadFromJsonAsync<ApiResponse<ImportCommitResponse>>();

        // Raw JSON parsing to sidestep the pre-existing enum-deserialization issue
        // noted elsewhere in this file (ScoutingSessionResponse carries enum fields).
        var sessionResp = await _admin.GetAsync($"/api/v1/scouting-sessions/{commitBody!.Data!.SessionId}");
        var doc = System.Text.Json.JsonDocument.Parse(await sessionResp.Content.ReadAsStringAsync());
        var root = doc.RootElement.GetProperty("data");

        var startedAt = root.GetProperty("startedAt").GetDateTime();
        startedAt.Should().Be(new DateTime(2026, 1, 14, 22, 0, 0, DateTimeKind.Utc),
            "midnight on 2026-01-15 in Johannesburg (UTC+2) is 2026-01-14 22:00 UTC");

        var observation = root.GetProperty("observations").EnumerateArray().Single();
        var observedAt = observation.GetProperty("observedAt").GetDateTime();
        observedAt.Should().Be(new DateTime(2026, 1, 15, 7, 15, 0, DateTimeKind.Utc),
            "09:15 in Johannesburg (UTC+2) is 07:15 UTC");
    }

    [Fact]
    public async Task RowWithUnknownTrap_Validate_ReportsRowError()
    {
        var fileBytes = await BuildFilledTemplateAsync(useBadTrapName: true);

        var validation = await ValidateAsync(fileBytes);

        validation.InvalidRowCount.Should().BeGreaterThan(0);
        validation.CanCommit.Should().BeFalse();
        validation.RowErrors.Should().Contain(e => e.Message.Contains("No trap named"));
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private async Task<byte[]> BuildFilledTemplateAsync(bool useBadTrapName = false)
    {
        var templateResp = await _admin.GetAsync($"/api/v1/import/observations/template?fieldId={_fieldId}");
        var templateBytes = await templateResp.Content.ReadAsByteArrayAsync();

        using var wb = new XLWorkbook(new MemoryStream(templateBytes));
        var ws = wb.Worksheet("Import");

        ws.Cell("B5").Value = DateTime.UtcNow.Date;
        ws.Cell("B6").Value = "Admin Test";
        ws.Cell("B7").Value = "Sunny, light wind";
        ws.Cell("B8").Value = 24.5;
        ws.Cell("B9").Value = "Backlog from last week's paper sheets";

        // Row 12: trap observation
        ws.Cell("A12").Value = "Trap";
        ws.Cell("B12").Value = useBadTrapName ? "Nonexistent Trap XYZ" : _trapName;
        ws.Cell("C12").Value = _pestName;
        ws.Cell("F12").Value = "Count";
        ws.Cell("G12").Value = 6;
        ws.Cell("K12").Value = "09:15";

        // Row 13: ad-hoc, unknown pest, presence mode
        ws.Cell("A13").Value = "AdHoc";
        ws.Cell("D13").Value = "Yes";
        ws.Cell("F13").Value = "Presence";
        ws.Cell("H13").Value = "Yes";
        ws.Cell("L13").Value = "Seen near the irrigation line";

        using var outStream = new MemoryStream();
        wb.SaveAs(outStream);
        return outStream.ToArray();
    }

    private async Task<ImportValidationResponse> ValidateAsync(byte[] fileBytes)
    {
        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(fileBytes);
        fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        content.Add(fileContent, "file", "filled.xlsx");

        var resp = await _admin.PostAsync("/api/v1/import/observations/validate", content);
        resp.StatusCode.Should().Be(HttpStatusCode.OK, await resp.Content.ReadAsStringAsync());
        var body = await resp.Content.ReadFromJsonAsync<ApiResponse<ImportValidationResponse>>();
        return body!.Data!;
    }
}
