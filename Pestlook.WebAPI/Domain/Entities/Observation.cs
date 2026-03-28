namespace Pestlook.WebAPI.Domain.Entities;

public sealed class Observation : IHasTenant
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }

    public Guid MonitoringPointId { get; set; }
    public MonitoringPoint MonitoringPoint { get; set; } = null!;

    public string ScoutUserId { get; set; } = string.Empty;
    public ApplicationUser Scout { get; set; } = null!;

    // Pest — either linked or free-text for unknowns
    public Guid? PestId { get; set; }
    public Pest? Pest { get; set; }
    public string? PestNameText { get; set; }

    // Data capture — Count OR Presence
    public int? Count { get; set; }
    public bool? Presence { get; set; }

    public string? LifeStage { get; set; }
    public string? Notes { get; set; }
    public string? PhotoUrlsJson { get; set; }   // JSON array stored as string

    public DateTime ObservedAt { get; set; } = DateTime.UtcNow;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
