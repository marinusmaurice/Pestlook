using Pestlook.WebAPI.Domain.Enums;

namespace Pestlook.WebAPI.Domain.Entities;

public sealed class MonitoringPoint : IHasTenant
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }

    public Guid? FarmId { get; set; }
    public Farm? Farm { get; set; }

    public Guid? FieldId { get; set; }
    public Field? Field { get; set; }

    public string? CreatedByUserId { get; set; }
    public ApplicationUser? CreatedBy { get; set; }

    public string? Name { get; set; }
    public MonitoringPointType PointType { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }

    public Guid? TrapTypeId { get; set; }
    public TrapType? TrapType { get; set; }

    public bool IsActive { get; set; } = true;
    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DeletedAt { get; set; }

    public ICollection<MonitoringPointPest> MonitoringPointPests { get; set; } = [];
    public ICollection<PestObservation> PestObservations { get; set; } = [];
}
