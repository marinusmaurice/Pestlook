namespace Pestlook.WebAPI.DTOs.Reports;

// ── Inbound ──────────────────────────────────────────────────────────────────

public sealed class ReportDefinitionDto
{
    /// <summary>farms | fields | pests | sessions | observations | traps | trapTypes | users</summary>
    public string             Entity         { get; init; } = "";
    public List<string>       Columns        { get; init; } = [];
    public List<ReportFilter> Filters        { get; init; } = [];
    public List<string>       GroupByColumns { get; init; } = [];
    public List<ReportAgg>    Aggregates     { get; init; } = [];
    public string?            OrderByColumn  { get; init; }
    public bool               OrderDesc      { get; init; }
    public int                Page           { get; init; } = 1;
    public int                PageSize       { get; init; } = 50;
}

public sealed record ReportFilter(
    string Column,
    /// <summary>eq | neq | contains | startswith | endswith | gt | gte | lt | lte | isempty | isnotempty</summary>
    string Operator,
    string Value);

public sealed record ReportAgg(
    string Column,
    /// <summary>count | sum | avg | min | max</summary>
    string Function);

public sealed class SaveReportRequest
{
    public string            Name        { get; init; } = "";
    public string?           Description { get; init; }
    public ReportDefinitionDto Definition { get; init; } = new();
}

// ── Outbound ─────────────────────────────────────────────────────────────────

public sealed record ReportColumnMeta(string Key, string Label, string Type, string? Group = null);

public sealed class ReportResultDto
{
    public List<ReportColumnMeta>          Columns    { get; init; } = [];
    public List<Dictionary<string, object?>> Rows     { get; init; } = [];
    public int                             TotalRows  { get; init; }
    public int                             Page       { get; init; }
    public int                             PageSize   { get; init; }
    public int                             TotalPages { get; init; }
}

public sealed class SavedReportDto
{
    public Guid                Id          { get; init; }
    public string              Name        { get; init; } = "";
    public string?             Description { get; init; }
    public ReportDefinitionDto Definition  { get; init; } = new();
    public DateTime            CreatedAt   { get; init; }
    public DateTime            UpdatedAt   { get; init; }
}
