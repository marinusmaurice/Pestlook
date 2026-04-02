namespace Pestlook.WebAPI.Domain.Entities;

public sealed class ScoutingSession : IHasTenant
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    /// <summary>Nullable — a planned session may not have a scout assigned yet.</summary>
    public string? ScouterId { get; set; }
    public ApplicationUser? Scouter { get; set; }

    /// <summary>True when the session was pre-planned from the web UI; false for ad-hoc sessions started by a scout.</summary>
    public bool IsPlanned { get; set; }

    /// <summary>Optional target date for planned sessions.</summary>
    public DateTime? ScheduledDate { get; set; }

    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string? WeatherConditions { get; set; }

    /// <summary>Temperature recorded during the session, always stored in Celsius.</summary>
    public double? TemperatureCelsius { get; set; }

    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DeletedAt { get; set; }

    public ICollection<SessionObservation> SessionObservations { get; set; } = [];
}
