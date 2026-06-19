using System.Globalization;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pestlook.WebAPI.Data;
using Pestlook.WebAPI.Domain.Entities;
using Pestlook.WebAPI.DTOs.Common;
using Pestlook.WebAPI.DTOs.Reports;
using Pestlook.WebAPI.Infrastructure;

namespace Pestlook.WebAPI.Controllers.v1;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/custom-reports")]
[Authorize]
public sealed class CustomReportController(
    ApplicationDbContext db,
    ITenantContext tenantContext) : ControllerBase
{
    // ── Column registry ──────────────────────────────────────────────────────

    private static readonly Dictionary<string, (string Label, ReportColumnMeta[] Cols)> Schema = new()
    {
        ["farms"] = ("Farms", [
            new("id",            "ID",             "string", "Farm"),
            new("name",          "Farm Name",      "string", "Farm"),
            new("address",       "Address",        "string", "Farm"),
            new("latitude",      "Latitude",       "number", "Farm"),
            new("longitude",     "Longitude",      "number", "Farm"),
            new("areaHectares",  "Area (ha)",      "number", "Farm"),
            new("isActive",      "Active",         "bool",   "Farm"),
            new("createdAt",     "Created",        "date",   "Farm"),
        ]),
        ["fields"] = ("Fields", [
            new("id",            "ID",             "string", "Field"),
            new("name",          "Field Name",     "string", "Field"),
            new("farmName",      "Farm",           "string", "Farm"),
            new("cropType",      "Crop Type",      "string", "Field"),
            new("season",        "Season",         "string", "Field"),
            new("areaHectares",  "Area (ha)",      "number", "Field"),
            new("createdAt",     "Created",        "date",   "Field"),
        ]),
        ["pests"] = ("Pests", [
            new("id",            "ID",             "string", "Pest"),
            new("commonName",    "Common Name",    "string", "Pest"),
            new("scientificName","Scientific Name","string", "Pest"),
            new("category",      "Category",       "string", "Pest"),
            new("thresholdCount","Default Threshold","number","Pest"),
            new("description",   "Description",   "string", "Pest"),
            new("createdAt",     "Created",        "date",   "Pest"),
        ]),
        ["sessions"] = ("Scouting Sessions", [
            new("id",             "ID",              "string",  "Session"),
            new("farmName",       "Farm",            "string",  "Location"),
            new("fieldName",      "Field",           "string",  "Location"),
            new("scouterName",    "Scout",           "string",  "People"),
            new("isPlanned",      "Planned",         "bool",    "Session"),
            new("scheduledDate",  "Scheduled Date",  "date",    "Session"),
            new("startedAt",      "Started",         "date",    "Session"),
            new("completedAt",    "Completed",       "date",    "Session"),
            new("weatherConditions","Weather",       "string",  "Conditions"),
            new("temperatureCelsius","Temp (°C)",    "number",  "Conditions"),
            new("notes",          "Notes",           "string",  "Session"),
            new("observationCount","Observations",   "number",  "Session"),
        ]),
        ["observations"] = ("Session Observations", [
            new("id",             "ID",              "string",  "Observation"),
            new("sessionDate",    "Session Date",    "date",    "Session"),
            new("farmName",       "Farm",            "string",  "Location"),
            new("fieldName",      "Field",           "string",  "Location"),
            new("scouterName",    "Scout",           "string",  "People"),
            new("pestName",       "Pest",            "string",  "Pest"),
            new("trapName",       "Trap",            "string",  "Trap"),
            new("trapTypeName",   "Trap Type",       "string",  "Trap"),
            new("observationType","Type",            "string",  "Observation"),
            new("count",          "Count",           "number",  "Observation"),
            new("thresholdCount", "Threshold",       "number",  "Observation"),
            new("isAboveThreshold","Above Threshold","bool",    "Observation"),
            new("isPresent",      "Present",         "bool",    "Observation"),
            new("lifeStage",      "Life Stage",      "string",  "Observation"),
            new("notes",          "Notes",           "string",  "Observation"),
            new("latitude",       "Latitude",        "number",  "GPS"),
            new("longitude",      "Longitude",       "number",  "GPS"),
            new("observedAt",     "Observed At",     "date",    "Observation"),
        ]),
        ["traps"] = ("Traps", [
            new("id",            "ID",              "string", "Trap"),
            new("name",          "Trap Name",       "string", "Trap"),
            new("fieldName",     "Field",           "string", "Location"),
            new("farmName",      "Farm",            "string", "Location"),
            new("trapTypeName",  "Trap Type",       "string", "Trap"),
            new("barcode",       "Barcode",         "string", "Trap"),
            new("latitude",      "Latitude",        "number", "GPS"),
            new("longitude",     "Longitude",       "number", "GPS"),
            new("isEnabled",     "Enabled",         "bool",   "Trap"),
            new("notes",         "Notes",           "string", "Trap"),
            new("createdAt",     "Created",         "date",   "Trap"),
        ]),
        ["trapTypes"] = ("Trap Types", [
            new("id",            "ID",              "string", "Trap Type"),
            new("name",          "Name",            "string", "Trap Type"),
            new("description",   "Description",     "string", "Trap Type"),
            new("createdAt",     "Created",         "date",   "Trap Type"),
        ]),
        ["users"] = ("Users", [
            new("id",        "ID",         "string", "User"),
            new("firstName", "First Name", "string", "User"),
            new("lastName",  "Last Name",  "string", "User"),
            new("fullName",  "Full Name",  "string", "User"),
            new("email",     "Email",      "string", "User"),
            new("isActive",  "Active",     "bool",   "User"),
        ]),
    };

    // ── Schema ───────────────────────────────────────────────────────────────

    [HttpGet("schema")]
    public IActionResult GetSchema()
    {
        var result = Schema.ToDictionary(
            kvp => kvp.Key,
            kvp => new { label = kvp.Value.Label, columns = kvp.Value.Cols });
        return Ok(ApiResponse<object>.Ok(result));
    }

    // ── Run ──────────────────────────────────────────────────────────────────

    [HttpPost("run")]
    public async Task<IActionResult> Run([FromBody] ReportDefinitionDto def, CancellationToken ct)
    {
        if (!Schema.TryGetValue(def.Entity, out var entityMeta))
            return BadRequest(ApiResponse<object>.Fail($"Unknown entity '{def.Entity}'."));

        var allRows  = await FetchRowsAsync(def.Entity, def.Filters, ct);
        var filtered = ApplyFilters(allRows, def.Filters);

        List<Dictionary<string, object?>> shaped;
        List<ReportColumnMeta> resultCols;

        if (def.GroupByColumns.Count > 0 && def.Aggregates.Count > 0)
        {
            shaped     = ApplyGrouping(filtered, def.GroupByColumns, def.Aggregates);
            resultCols = BuildGroupedCols(entityMeta.Cols, def.GroupByColumns, def.Aggregates);
        }
        else
        {
            shaped     = filtered;
            var requested = def.Columns.Count > 0 ? def.Columns.ToHashSet() : null;
            resultCols = entityMeta.Cols.Where(c => requested == null || requested.Contains(c.Key)).ToList();
            shaped = shaped.Select(r => ProjectRow(r, resultCols)).ToList();
        }

        var (sorted, total) = ApplySortPage(shaped, def.OrderByColumn, def.OrderDesc, def.Page, def.PageSize);

        return Ok(ApiResponse<ReportResultDto>.Ok(new ReportResultDto
        {
            Columns    = resultCols,
            Rows       = sorted,
            TotalRows  = total,
            Page       = def.Page,
            PageSize   = def.PageSize,
            TotalPages = def.PageSize > 0 ? (int)Math.Ceiling((double)total / def.PageSize) : 1,
        }));
    }

    // ── Export CSV ───────────────────────────────────────────────────────────

    [HttpPost("export")]
    public async Task<IActionResult> ExportCsv([FromBody] ReportDefinitionDto def, CancellationToken ct)
    {
        if (!Schema.TryGetValue(def.Entity, out var entityMeta))
            return BadRequest(ApiResponse<object>.Fail($"Unknown entity '{def.Entity}'."));

        var allRows  = await FetchRowsAsync(def.Entity, def.Filters, ct);
        var filtered = ApplyFilters(allRows, def.Filters);

        List<Dictionary<string, object?>> shaped;
        List<ReportColumnMeta> resultCols;

        if (def.GroupByColumns.Count > 0 && def.Aggregates.Count > 0)
        {
            shaped     = ApplyGrouping(filtered, def.GroupByColumns, def.Aggregates);
            resultCols = BuildGroupedCols(entityMeta.Cols, def.GroupByColumns, def.Aggregates);
        }
        else
        {
            var requested = def.Columns.Count > 0 ? def.Columns.ToHashSet() : null;
            resultCols = entityMeta.Cols.Where(c => requested == null || requested.Contains(c.Key)).ToList();
            shaped     = filtered.Select(r => ProjectRow(r, resultCols)).ToList();
        }

        if (def.OrderByColumn is { Length: > 0 })
        {
            shaped = def.OrderDesc
                ? shaped.OrderByDescending(r => r.GetValueOrDefault(def.OrderByColumn)?.ToString()).ToList()
                : shaped.OrderBy(r => r.GetValueOrDefault(def.OrderByColumn)?.ToString()).ToList();
        }

        var csv = new StringBuilder();
        csv.AppendLine(string.Join(",", resultCols.Select(c => CsvEscape(c.Label))));
        foreach (var row in shaped)
            csv.AppendLine(string.Join(",", resultCols.Select(c => CsvEscape(row.GetValueOrDefault(c.Key)?.ToString() ?? ""))));

        var bytes = Encoding.UTF8.GetBytes(csv.ToString());
        return File(bytes, "text/csv", $"pestlook-report-{DateTime.UtcNow:yyyyMMdd-HHmm}.csv");
    }

    // ── Saved reports CRUD ───────────────────────────────────────────────────

    [HttpGet("saved")]
    public async Task<IActionResult> GetSaved(CancellationToken ct)
    {
        var raw = await db.SavedReports
            .OrderByDescending(r => r.UpdatedAt)
            .Select(r => new { r.Id, r.Name, r.Description, r.DefinitionJson, r.CreatedAt, r.UpdatedAt })
            .ToListAsync(ct);

        var reports = raw.Select(r => new SavedReportDto
        {
            Id          = r.Id,
            Name        = r.Name,
            Description = r.Description,
            Definition  = JsonSerializer.Deserialize<ReportDefinitionDto>(r.DefinitionJson, _json) ?? new(),
            CreatedAt   = r.CreatedAt,
            UpdatedAt   = r.UpdatedAt,
        }).ToList();

        return Ok(ApiResponse<List<SavedReportDto>>.Ok(reports));
    }

    [HttpPost("saved")]
    public async Task<IActionResult> CreateSaved([FromBody] SaveReportRequest req, CancellationToken ct)
    {
        if (tenantContext.TenantId is null)
            return BadRequest(ApiResponse<object>.Fail("Tenant context required."));

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";

        var report = new SavedReport
        {
            TenantId        = tenantContext.TenantId.Value,
            CreatedByUserId = userId,
            Name            = req.Name.Trim(),
            Description     = req.Description?.Trim(),
            DefinitionJson  = JsonSerializer.Serialize(req.Definition, _json),
        };

        db.SavedReports.Add(report);
        await db.SaveChangesAsync(ct);

        return Ok(ApiResponse<SavedReportDto>.Ok(new SavedReportDto
        {
            Id          = report.Id,
            Name        = report.Name,
            Description = report.Description,
            Definition  = req.Definition,
            CreatedAt   = report.CreatedAt,
            UpdatedAt   = report.UpdatedAt,
        }));
    }

    [HttpPut("saved/{id:guid}")]
    public async Task<IActionResult> UpdateSaved(Guid id, [FromBody] SaveReportRequest req, CancellationToken ct)
    {
        var report = await db.SavedReports.FirstOrDefaultAsync(r => r.Id == id, ct);
        if (report is null) return NotFound(ApiResponse<object>.Fail("Report not found."));

        report.Name           = req.Name.Trim();
        report.Description    = req.Description?.Trim();
        report.DefinitionJson = JsonSerializer.Serialize(req.Definition, _json);
        report.UpdatedAt      = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);
        return Ok(ApiResponse<object>.Ok(new { id = report.Id }));
    }

    [HttpDelete("saved/{id:guid}")]
    public async Task<IActionResult> DeleteSaved(Guid id, CancellationToken ct)
    {
        var report = await db.SavedReports.FirstOrDefaultAsync(r => r.Id == id, ct);
        if (report is null) return NotFound(ApiResponse<object>.Fail("Report not found."));

        report.DeletedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return Ok(ApiResponse<object>.Ok(new { id }));
    }

    // ── Entity fetchers ──────────────────────────────────────────────────────

    private async Task<List<Dictionary<string, object?>>> FetchRowsAsync(
        string entity, List<ReportFilter> filters, CancellationToken ct)
    {
        // Extract optional date-range hints from filters to push down to SQL
        DateTime? dateFrom = null, dateTo = null;
        foreach (var f in filters)
        {
            if (f.Column is "createdAt" or "sessionDate" or "completedAt" or "startedAt" or "observedAt")
            {
                if (DateTime.TryParse(f.Value, out var d))
                {
                    if (f.Operator is "gte" or "gt" or "eq") dateFrom = d;
                    if (f.Operator is "lte" or "lt")         dateTo   = d;
                }
            }
        }

        return entity switch
        {
            "farms"        => await FetchFarmsAsync(ct),
            "fields"       => await FetchFieldsAsync(ct),
            "pests"        => await FetchPestsAsync(ct),
            "sessions"     => await FetchSessionsAsync(dateFrom, dateTo, ct),
            "observations" => await FetchObservationsAsync(dateFrom, dateTo, ct),
            "traps"        => await FetchTrapsAsync(ct),
            "trapTypes"    => await FetchTrapTypesAsync(ct),
            "users"        => await FetchUsersAsync(ct),
            _              => [],
        };
    }

    private async Task<List<Dictionary<string, object?>>> FetchFarmsAsync(CancellationToken ct)
    {
        var rows = await db.Farms.Select(f => new
        {
            f.Id, f.Name, f.Address, f.Latitude, f.Longitude, f.AreaHectares, f.IsActive, f.CreatedAt,
        }).ToListAsync(ct);

        return rows.Select(f => new Dictionary<string, object?>
        {
            ["id"]           = f.Id,
            ["name"]         = f.Name,
            ["address"]      = f.Address,
            ["latitude"]     = f.Latitude,
            ["longitude"]    = f.Longitude,
            ["areaHectares"] = f.AreaHectares,
            ["isActive"]     = f.IsActive,
            ["createdAt"]    = f.CreatedAt,
        }).ToList();
    }

    private async Task<List<Dictionary<string, object?>>> FetchFieldsAsync(CancellationToken ct)
    {
        var rows = await db.Fields.Select(f => new
        {
            f.Id, f.Name, FarmName = f.Farm != null ? f.Farm.Name : null,
            f.CropType, f.Season, f.AreaHectares, f.CreatedAt,
        }).ToListAsync(ct);

        return rows.Select(f => new Dictionary<string, object?>
        {
            ["id"]           = f.Id,
            ["name"]         = f.Name,
            ["farmName"]     = f.FarmName,
            ["cropType"]     = f.CropType,
            ["season"]       = f.Season,
            ["areaHectares"] = f.AreaHectares,
            ["createdAt"]    = f.CreatedAt,
        }).ToList();
    }

    private async Task<List<Dictionary<string, object?>>> FetchPestsAsync(CancellationToken ct)
    {
        var rows = await db.Pests.Select(p => new
        {
            p.Id, p.CommonName, p.ScientificName,
            Category = p.Category.ToString(),
            p.ThresholdCount, p.Description, p.CreatedAt,
        }).ToListAsync(ct);

        return rows.Select(p => new Dictionary<string, object?>
        {
            ["id"]             = p.Id,
            ["commonName"]     = p.CommonName,
            ["scientificName"] = p.ScientificName,
            ["category"]       = p.Category,
            ["thresholdCount"] = p.ThresholdCount,
            ["description"]    = p.Description,
            ["createdAt"]      = p.CreatedAt,
        }).ToList();
    }

    private async Task<List<Dictionary<string, object?>>> FetchSessionsAsync(
        DateTime? from, DateTime? to, CancellationToken ct)
    {
        var q = db.ScoutingSessions.Where(s => s.DeletedAt == null);
        if (from.HasValue) q = q.Where(s => s.CompletedAt >= from || s.CreatedAt >= from);
        if (to.HasValue)   q = q.Where(s => s.CompletedAt <= to   || s.CreatedAt <= to);

        var rows = await q.Select(s => new
        {
            s.Id,
            FarmName      = s.Farm  != null ? s.Farm.Name
                          : s.Field != null && s.Field.Farm != null ? s.Field.Farm.Name : null,
            FieldName     = s.Field != null ? s.Field.Name : null,
            ScouterName   = s.Scouter != null
                          ? (s.Scouter.FirstName + " " + s.Scouter.LastName).Trim() : null,
            s.IsPlanned,
            s.ScheduledDate,
            s.StartedAt,
            s.CompletedAt,
            s.WeatherConditions,
            s.TemperatureCelsius,
            s.Notes,
            ObservationCount = s.SessionObservations.Count,
        }).ToListAsync(ct);

        return rows.Select(s => new Dictionary<string, object?>
        {
            ["id"]                 = s.Id,
            ["farmName"]           = s.FarmName,
            ["fieldName"]          = s.FieldName,
            ["scouterName"]        = s.ScouterName,
            ["isPlanned"]          = s.IsPlanned,
            ["scheduledDate"]      = s.ScheduledDate,
            ["startedAt"]          = s.StartedAt,
            ["completedAt"]        = s.CompletedAt,
            ["weatherConditions"]  = s.WeatherConditions,
            ["temperatureCelsius"] = s.TemperatureCelsius,
            ["notes"]              = s.Notes,
            ["observationCount"]   = s.ObservationCount,
        }).ToList();
    }

    private async Task<List<Dictionary<string, object?>>> FetchObservationsAsync(
        DateTime? from, DateTime? to, CancellationToken ct)
    {
        var q = db.SessionObservations.Where(o => !o.IsUnknownPest);
        if (from.HasValue) q = q.Where(o => o.Session.CompletedAt >= from);
        if (to.HasValue)   q = q.Where(o => o.Session.CompletedAt <= to);

        var rows = await q.Select(o => new
        {
            o.Id,
            SessionDate   = o.Session.CompletedAt,
            FarmName      = o.Session.Farm  != null ? o.Session.Farm.Name
                          : o.Session.Field != null && o.Session.Field.Farm != null ? o.Session.Field.Farm.Name : null,
            FieldName     = o.Session.Field  != null ? o.Session.Field.Name  : null,
            ScouterName   = o.Session.Scouter != null
                          ? (o.Session.Scouter.FirstName + " " + o.Session.Scouter.LastName).Trim() : null,
            PestName      = o.Pest != null ? o.Pest.CommonName : null,
            TrapName      = o.Trap != null ? o.Trap.Name : null,
            TrapTypeName  = o.Trap != null && o.Trap.TrapType != null ? o.Trap.TrapType.Name : null,
            ObservationType = o.ObservationType.ToString(),
            o.Count,
            o.ThresholdCount,
            IsAboveThreshold = o.Count != null && o.ThresholdCount != null && o.Count > o.ThresholdCount,
            o.IsPresent,
            LifeStage     = o.LifeStage != null ? o.LifeStage.ToString() : null,
            o.Notes,
            o.Latitude,
            o.Longitude,
            o.ObservedAt,
        }).ToListAsync(ct);

        return rows.Select(o => new Dictionary<string, object?>
        {
            ["id"]               = o.Id,
            ["sessionDate"]      = o.SessionDate,
            ["farmName"]         = o.FarmName,
            ["fieldName"]        = o.FieldName,
            ["scouterName"]      = o.ScouterName,
            ["pestName"]         = o.PestName,
            ["trapName"]         = o.TrapName,
            ["trapTypeName"]     = o.TrapTypeName,
            ["observationType"]  = o.ObservationType,
            ["count"]            = o.Count,
            ["thresholdCount"]   = o.ThresholdCount,
            ["isAboveThreshold"] = o.IsAboveThreshold,
            ["isPresent"]        = o.IsPresent,
            ["lifeStage"]        = o.LifeStage,
            ["notes"]            = o.Notes,
            ["latitude"]         = o.Latitude,
            ["longitude"]        = o.Longitude,
            ["observedAt"]       = o.ObservedAt,
        }).ToList();
    }

    private async Task<List<Dictionary<string, object?>>> FetchTrapsAsync(CancellationToken ct)
    {
        var rows = await db.Traps.Select(t => new
        {
            t.Id, t.Name,
            FieldName    = t.Field    != null ? t.Field.Name    : null,
            FarmName     = t.Field    != null && t.Field.Farm != null ? t.Field.Farm.Name : null,
            TrapTypeName = t.TrapType != null ? t.TrapType.Name : null,
            t.Barcode, t.Latitude, t.Longitude, t.IsEnabled, t.Notes, t.CreatedAt,
        }).ToListAsync(ct);

        return rows.Select(t => new Dictionary<string, object?>
        {
            ["id"]           = t.Id,
            ["name"]         = t.Name,
            ["fieldName"]    = t.FieldName,
            ["farmName"]     = t.FarmName,
            ["trapTypeName"] = t.TrapTypeName,
            ["barcode"]      = t.Barcode,
            ["latitude"]     = t.Latitude,
            ["longitude"]    = t.Longitude,
            ["isEnabled"]    = t.IsEnabled,
            ["notes"]        = t.Notes,
            ["createdAt"]    = t.CreatedAt,
        }).ToList();
    }

    private async Task<List<Dictionary<string, object?>>> FetchTrapTypesAsync(CancellationToken ct)
    {
        var rows = await db.TrapTypes.Select(t => new
        {
            t.Id, t.Name, t.Description, t.CreatedAt,
        }).ToListAsync(ct);

        return rows.Select(t => new Dictionary<string, object?>
        {
            ["id"]          = t.Id,
            ["name"]        = t.Name,
            ["description"] = t.Description,
            ["createdAt"]   = t.CreatedAt,
        }).ToList();
    }

    private async Task<List<Dictionary<string, object?>>> FetchUsersAsync(CancellationToken ct)
    {
        var rows = await db.Users.Select(u => new
        {
            u.Id, u.FirstName, u.LastName, u.Email, u.IsActive,
        }).ToListAsync(ct);

        return rows.Select(u => new Dictionary<string, object?>
        {
            ["id"]        = u.Id,
            ["firstName"] = u.FirstName,
            ["lastName"]  = u.LastName,
            ["fullName"]  = $"{u.FirstName} {u.LastName}".Trim(),
            ["email"]     = u.Email,
            ["isActive"]  = u.IsActive,
        }).ToList();
    }

    // ── Filter ───────────────────────────────────────────────────────────────

    private static List<Dictionary<string, object?>> ApplyFilters(
        List<Dictionary<string, object?>> rows, List<ReportFilter> filters)
    {
        if (filters.Count == 0) return rows;
        return rows.Where(r => filters.All(f => MatchesFilter(r, f))).ToList();
    }

    private static bool MatchesFilter(Dictionary<string, object?> row, ReportFilter filter)
    {
        if (!row.TryGetValue(filter.Column, out var raw)) return true;
        var str = raw?.ToString() ?? "";

        return filter.Operator switch
        {
            "eq"         => string.Equals(str, filter.Value, StringComparison.OrdinalIgnoreCase),
            "neq"        => !string.Equals(str, filter.Value, StringComparison.OrdinalIgnoreCase),
            "contains"   => str.Contains(filter.Value, StringComparison.OrdinalIgnoreCase),
            "startswith" => str.StartsWith(filter.Value, StringComparison.OrdinalIgnoreCase),
            "endswith"   => str.EndsWith(filter.Value, StringComparison.OrdinalIgnoreCase),
            "isempty"    => string.IsNullOrEmpty(str),
            "isnotempty" => !string.IsNullOrEmpty(str),
            "gt"         => Compare(raw, filter.Value) > 0,
            "gte"        => Compare(raw, filter.Value) >= 0,
            "lt"         => Compare(raw, filter.Value) < 0,
            "lte"        => Compare(raw, filter.Value) <= 0,
            _            => true,
        };
    }

    private static int Compare(object? val, string filterVal)
    {
        if (val is null) return -1;
        if (val is int    i  && int.TryParse(filterVal, out var fi))       return i.CompareTo(fi);
        if (val is double d  && double.TryParse(filterVal, NumberStyles.Any, CultureInfo.InvariantCulture, out var fd)) return d.CompareTo(fd);
        if (val is DateTime dt && DateTime.TryParse(filterVal, out var fdt)) return dt.CompareTo(fdt);
        if (val is bool   b  && bool.TryParse(filterVal, out var fb))      return b.CompareTo(fb);
        return string.Compare(val.ToString(), filterVal, StringComparison.OrdinalIgnoreCase);
    }

    // ── Grouping ─────────────────────────────────────────────────────────────

    private static List<Dictionary<string, object?>> ApplyGrouping(
        List<Dictionary<string, object?>> rows,
        List<string> groupByCols,
        List<ReportAgg> aggregates)
    {
        return rows
            .GroupBy(r => string.Join(" ", groupByCols.Select(c => r.GetValueOrDefault(c)?.ToString() ?? "")))
            .Select(g =>
            {
                var result = new Dictionary<string, object?>();
                foreach (var col in groupByCols)
                    result[col] = g.First().GetValueOrDefault(col);

                foreach (var agg in aggregates)
                {
                    var key  = $"{agg.Function}_{agg.Column}";
                    var nums = g.Select(r => ToDouble(r.GetValueOrDefault(agg.Column)))
                                .Where(v => v.HasValue).Select(v => v!.Value).ToList();

                    result[key] = agg.Function switch
                    {
                        "count" => (object?)g.Count(),
                        "sum"   => nums.Count > 0 ? Math.Round(nums.Sum(), 4)     : null,
                        "avg"   => nums.Count > 0 ? Math.Round(nums.Average(), 4) : null,
                        "min"   => nums.Count > 0 ? nums.Min()                    : null,
                        "max"   => nums.Count > 0 ? nums.Max()                    : null,
                        _       => null,
                    };
                }

                return result;
            })
            .ToList();
    }

    private static double? ToDouble(object? v) => v switch
    {
        int    i => i,
        double d => d,
        float  f => f,
        long   l => l,
        decimal m => (double)m,
        bool   b => b ? 1 : 0,
        string s when double.TryParse(s, NumberStyles.Any, CultureInfo.InvariantCulture, out var p) => p,
        _ => null,
    };

    // ── Sort + page ───────────────────────────────────────────────────────────

    private static (List<Dictionary<string, object?>> Rows, int Total) ApplySortPage(
        List<Dictionary<string, object?>> rows,
        string? orderBy, bool desc, int page, int pageSize)
    {
        if (!string.IsNullOrEmpty(orderBy))
        {
            rows = desc
                ? rows.OrderByDescending(r => SortKey(r.GetValueOrDefault(orderBy))).ToList()
                : rows.OrderBy(r => SortKey(r.GetValueOrDefault(orderBy))).ToList();
        }

        var total  = rows.Count;
        var paged  = pageSize > 0
            ? rows.Skip((Math.Max(1, page) - 1) * pageSize).Take(pageSize).ToList()
            : rows;

        return (paged, total);
    }

    private static IComparable SortKey(object? v) => v switch
    {
        DateTime dt => dt,
        int      i  => (double)i,
        double   d  => d,
        bool     b  => b ? 1.0 : 0.0,
        _           => v?.ToString() ?? "",
    };

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static Dictionary<string, object?> ProjectRow(Dictionary<string, object?> row, List<ReportColumnMeta> cols)
    {
        var result = new Dictionary<string, object?>(cols.Count);
        foreach (var col in cols)
            result[col.Key] = row.GetValueOrDefault(col.Key);
        return result;
    }

    private static List<ReportColumnMeta> BuildGroupedCols(
        ReportColumnMeta[] allCols, List<string> groupByCols, List<ReportAgg> aggregates)
    {
        var byKey = allCols.ToDictionary(c => c.Key);
        var cols  = groupByCols
            .Select(k => byKey.TryGetValue(k, out var c) ? c : new ReportColumnMeta(k, k, "string"))
            .ToList();

        var aggLabels = new Dictionary<string, string>
        {
            ["count"] = "Count", ["sum"] = "Sum", ["avg"] = "Avg", ["min"] = "Min", ["max"] = "Max",
        };

        foreach (var agg in aggregates)
        {
            var colLabel = byKey.TryGetValue(agg.Column, out var ac) ? ac.Label : agg.Column;
            var label    = $"{aggLabels.GetValueOrDefault(agg.Function, agg.Function)} of {colLabel}";
            cols.Add(new ReportColumnMeta($"{agg.Function}_{agg.Column}", label, "number"));
        }

        return cols;
    }

    private static string CsvEscape(string v)
    {
        if (v.Contains(',') || v.Contains('"') || v.Contains('\n'))
            return $"\"{v.Replace("\"", "\"\"")}\"";
        return v;
    }

    private static readonly JsonSerializerOptions _json = new()
    {
        PropertyNamingPolicy        = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
    };
}
