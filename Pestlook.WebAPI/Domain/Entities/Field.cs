namespace Pestlook.WebAPI.Domain.Entities;

public sealed class Field : IHasTenant
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid FarmId { get; set; }
    public Farm Farm { get; set; } = null!;
    public Guid TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? GeoBoundary { get; set; }
    public double? AreaHectares { get; set; }
    public string? CropType { get; set; }
    public string? Season { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DeletedAt { get; set; }

    public ICollection<MonitoringPoint> MonitoringPoints { get; set; } = [];
}
