namespace Pestlook.WebAPI.Domain.Entities;

public sealed class Field : IHasTenant
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid FarmId { get; set; }
    public Farm Farm { get; set; } = null!;
    public Guid TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? BoundaryGeoJson { get; set; }

    public ICollection<MonitoringPoint> MonitoringPoints { get; set; } = [];
}
