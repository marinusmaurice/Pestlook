using Pestlook.WebAPI.Domain.Enums;

namespace Pestlook.WebAPI.Domain.Entities;

public sealed class MonitoringPoint : IHasTenant
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public MonitoringPointType Type { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public Guid? FarmId { get; set; }
    public Farm? Farm { get; set; }
    public Guid? FieldId { get; set; }
    public Field? Field { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<MonitoringPointPest> MonitoringPointPests { get; set; } = [];
    public ICollection<Observation> Observations { get; set; } = [];
}
