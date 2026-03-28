namespace Pestlook.WebAPI.Domain.Entities;

public sealed class MonitoringPointPest
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid MonitoringPointId { get; set; }
    public MonitoringPoint MonitoringPoint { get; set; } = null!;
    public Guid PestId { get; set; }
    public Pest Pest { get; set; } = null!;
    public bool IsTargeted { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
