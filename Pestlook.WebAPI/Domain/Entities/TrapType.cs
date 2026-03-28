namespace Pestlook.WebAPI.Domain.Entities;

/// <summary>System-wide catalogue of physical trap types (delta, sticky card, pheromone, etc.).</summary>
public sealed class TrapType
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    public ICollection<MonitoringPoint> MonitoringPoints { get; set; } = [];
}
