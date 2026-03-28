using Pestlook.WebAPI.Domain.Enums;

namespace Pestlook.WebAPI.Domain.Entities;

public sealed class Pest : IHasTenant
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public PestCategory Category { get; set; }
    public bool IsSystem { get; set; }

    public ICollection<MonitoringPointPest> MonitoringPointPests { get; set; } = [];
    public ICollection<ObservationPest> ObservationPests { get; set; } = [];
}
