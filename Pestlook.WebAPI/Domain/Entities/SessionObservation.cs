using Pestlook.WebAPI.Domain.Enums;

namespace Pestlook.WebAPI.Domain.Entities;

/// <summary>
/// A single observation item within a scouting session.
/// Covers both trap inspections (<see cref="ObservationType.Trap"/>)
/// and free-form / ad-hoc observations (<see cref="ObservationType.AdHoc"/>).
/// </summary>
public sealed class SessionObservation : IHasTenant, IAuditableByUser
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }

    public Guid SessionId { get; set; }
    public ScoutingSession Session { get; set; } = null!;

    /// <summary>Trap or AdHoc.</summary>
    public ObservationType ObservationType { get; set; }

    /// <summary>True when created upfront from the web UI; false when added on-the-fly by a scout.</summary>
    public bool IsPlanned { get; set; }

    /// <summary>Required when <see cref="ObservationType"/> is <see cref="ObservationType.Trap"/>.</summary>
    public Guid? TrapId { get; set; }
    public Trap? Trap { get; set; }

    /// <summary>Optional pest to check for / observe.</summary>
    public Guid? PestId { get; set; }
    public Pest? Pest { get; set; }

    /// <summary>How the pest should be recorded — existence (Presence) or counting (Count).</summary>
    public CaptureMode? CaptureMode { get; set; }

    // ── Result fields (filled in by the scout) ────────────────────────────────

    public int? Count { get; set; }
    public bool? IsPresent { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public bool IsUnknownPest { get; set; }
    public string? Notes { get; set; }
    public LifeStage? LifeStage { get; set; }

    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>JSON array of photo URLs captured during this observation.</summary>
    public string? PhotoUrlsJson { get; set; }

    /// <summary>
    /// Groups observations created together from a single planned item with a repeat count.
    /// All records sharing the same ObservationGroupId were created as one logical entry.
    /// </summary>
    public Guid? ObservationGroupId { get; set; }

    public string? CreatedByUserId { get; set; }
    public ApplicationUser? CreatedBy { get; set; }
    public string? UpdatedByUserId { get; set; }
    public ApplicationUser? UpdatedBy { get; set; }
    public string? DeletedByUserId { get; set; }
}
