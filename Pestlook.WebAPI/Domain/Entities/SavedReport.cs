namespace Pestlook.WebAPI.Domain.Entities;

public sealed class SavedReport : IHasTenant
{
    public Guid   Id              { get; set; } = Guid.NewGuid();
    public Guid   TenantId        { get; set; }
    public string CreatedByUserId { get; set; } = string.Empty;
    public string Name            { get; set; } = string.Empty;
    public string? Description    { get; set; }
    /// <summary>Serialised ReportDefinitionDto.</summary>
    public string DefinitionJson  { get; set; } = string.Empty;
    public DateTime CreatedAt     { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt     { get; set; } = DateTime.UtcNow;
    public DateTime? DeletedAt    { get; set; }
}
