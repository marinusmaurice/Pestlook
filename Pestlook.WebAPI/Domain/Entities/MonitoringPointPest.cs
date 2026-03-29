namespace Pestlook.WebAPI.Domain.Entities;

public sealed class MonitoringPointPest
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid MonitoringPointId { get; set; }
    public MonitoringPoint MonitoringPoint { get; set; } = null!;
    public Guid PestId { get; set; }
    public Pest Pest { get; set; } = null!;
    public bool AllowUnknown { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
    public string? AssignedByUserId { get; set; }
    public ApplicationUser? AssignedBy { get; set; }
    public DateTime? DeletedAt { get; set; }
}
