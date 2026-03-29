namespace Pestlook.WebAPI.Domain.Entities;

public sealed class ScoutingSession : IHasTenant
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;
    public string ScouterId { get; set; } = string.Empty;
    public ApplicationUser Scouter { get; set; } = null!;
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
    public string? WeatherConditions { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DeletedAt { get; set; }

    public ICollection<PestObservation> PestObservations { get; set; } = [];
}
