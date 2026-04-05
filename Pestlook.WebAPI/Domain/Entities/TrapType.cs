namespace Pestlook.WebAPI.Domain.Entities;

/// <summary>System-wide catalogue of physical trap types (delta, sticky card, pheromone, etc.).</summary>
public sealed class TrapType : IAuditableByUser
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }

    public string? CreatedByUserId { get; set; }
    public string? UpdatedByUserId { get; set; }
    public string? DeletedByUserId { get; set; }
}
