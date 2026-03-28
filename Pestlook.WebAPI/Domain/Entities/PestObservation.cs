using Pestlook.WebAPI.Domain.Enums;

namespace Pestlook.WebAPI.Domain.Entities;

public sealed class PestObservation : IHasTenant
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Guid SessionId { get; set; }
    public ScoutingSession Session { get; set; } = null!;
    public Guid MonitoringPointId { get; set; }
    public MonitoringPoint MonitoringPoint { get; set; } = null!;

    // Pest — either a known pest or an unknown one described in text
    public Guid? PestId { get; set; }
    public Pest? Pest { get; set; }
    public bool IsUnknownPest { get; set; }
    public string? UnknownPestDescription { get; set; }

    public CaptureMode CaptureMode { get; set; }
    public int? Count { get; set; }
    public bool? Present { get; set; }
    /// <summary>e.g., adult, larvae, eggs, nymph</summary>
    public string? LifeStage { get; set; }

    // GPS co-ordinates at moment of capture
    public double? CapturedLat { get; set; }
    public double? CapturedLng { get; set; }

    public string? PhotoUrlsJson { get; set; }
    public string? Notes { get; set; }
    public DateTime ObservedAt { get; set; } = DateTime.UtcNow;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
