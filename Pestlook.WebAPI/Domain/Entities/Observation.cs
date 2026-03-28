namespace Pestlook.WebAPI.Domain.Entities;

public sealed class Observation : IHasTenant
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Guid? MonitoringPointId { get; set; }
    public MonitoringPoint? MonitoringPoint { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public DateTime ObservedAt { get; set; } = DateTime.UtcNow;
    public string CreatedByUserId { get; set; } = string.Empty;
    public ApplicationUser CreatedBy { get; set; } = null!;
    public string? Notes { get; set; }
    public string? ImageUrl { get; set; }

    public ICollection<ObservationPest> ObservationPests { get; set; } = [];
}
