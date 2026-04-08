using SQLite;

namespace Pestlook.UI.Mobile.Data;

// ── Session ──────────────────────────────────────────────────
public class LocalSession
{
    [PrimaryKey]
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string? FarmId { get; set; }
    public string? FieldId { get; set; }
    public string? FarmName { get; set; }
    public string? FieldName { get; set; }
    public string? ScouterId { get; set; }
    public string? TenantId { get; set; }
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
    public DateTime? SyncedAt { get; set; }
    /// <summary>0 = Active, 1 = Completed, 2 = Synced</summary>
    public int Status { get; set; }
    public bool IsPlanned { get; set; }
    public DateTime? ScheduledDate { get; set; }
    public string? WeatherCondition { get; set; }
    public int Temperature { get; set; }
    public string? Notes { get; set; }
    /// <summary>Server-assigned Id after sync (may differ from local Id).</summary>
    public string? RemoteId { get; set; }
}

// ── Monitoring Point ─────────────────────────────────────────
public class LocalMonitoringPoint
{
    [PrimaryKey]
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string SessionId { get; set; } = "";
    public string? Name { get; set; }
    /// <summary>0 = Trap, 1 = RandomObservation</summary>
    public int PointType { get; set; }
    public string? TrapTypeId { get; set; }
    public string? TrapTypeName { get; set; }
    public int? TrapCount { get; set; }
    public DateTime? TrapResetAt { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public double? GpsAccuracy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? RemoteId { get; set; }
}

// ── Observation ──────────────────────────────────────────────
public class LocalObservation
{
    [PrimaryKey]
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string SessionId { get; set; } = "";
    public string? PestId { get; set; }
    public string? PestName { get; set; }
    public bool IsUnknownPest { get; set; }
    /// <summary>0 = Count, 1 = PresentAbsent</summary>
    public int CaptureMode { get; set; }
    public int? Count { get; set; }
    public bool? IsPresent { get; set; }
    public string? Notes { get; set; }
    public string? TrapId { get; set; }
    public string? TrapName { get; set; }
    public double? CapturedLat { get; set; }
    public double? CapturedLng { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? RemoteId { get; set; }
    /// <summary>Snapshot of pest economic action threshold at observation creation time.</summary>
    public int? ThresholdCount { get; set; }
    /// <summary>Life stage index matching server LifeStage enum.</summary>
    public int? LifeStage { get; set; }
    /// <summary>0 = AdHoc, 1 = Trap</summary>
    public int ObservationType { get; set; }
    /// <summary>True when pulled from a planned session template; scout fills in Count/IsPresent.</summary>
    public bool IsPlanned { get; set; }
    public string? ObservationGroupId { get; set; }
    public int SortOrder { get; set; }
    /// <summary>True when local changes have not yet been pushed to the server.</summary>
    public bool IsDirty { get; set; }
}

// ── Observation Photo ────────────────────────────────────────
public class LocalObservationPhoto
{
    [PrimaryKey]
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string ObservationId { get; set; } = "";
    public string LocalFilePath { get; set; } = "";
    public string? RemoteUrl { get; set; }
    public DateTime? UploadedAt { get; set; }
}

// ── Cached Pest ──────────────────────────────────────────────
public class CachedPest
{
    [PrimaryKey]
    public string Id { get; set; } = "";
    public string CommonName { get; set; } = "";
    public string? ScientificName { get; set; }
    public int Category { get; set; }
    public int DefaultCaptureMode { get; set; }
    public int? AlertThreshold { get; set; }
    public bool IsSystemPest { get; set; }
    public DateTime CachedAt { get; set; } = DateTime.UtcNow;
}

// ── Cached TrapType ──────────────────────────────────────────
public class CachedTrapType
{
    [PrimaryKey]
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public DateTime CachedAt { get; set; } = DateTime.UtcNow;
}

// ── Cached Farm ──────────────────────────────────────────────
public class CachedFarm
{
    [PrimaryKey]
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string? Location { get; set; }
    public bool IsActive { get; set; }
    public DateTime CachedAt { get; set; } = DateTime.UtcNow;
}

// ── Cached Field ─────────────────────────────────────────────
public class CachedField
{
    [PrimaryKey]
    public string Id { get; set; } = "";
    public string FarmId { get; set; } = "";
    public string Name { get; set; } = "";
    public string? CropType { get; set; }
    public bool IsActive { get; set; }
    public DateTime CachedAt { get; set; } = DateTime.UtcNow;
}

// ── Cached Trap ──────────────────────────────────────────────
public class CachedTrap
{
    [PrimaryKey]
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string? Barcode { get; set; }
    public string? TrapTypeId { get; set; }
    public string? TrapTypeName { get; set; }
    public string? MonitoringPointId { get; set; }
    public string? MonitoringPointName { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public bool IsEnabled { get; set; }
    public string? Notes { get; set; }
    public DateTime CachedAt { get; set; } = DateTime.UtcNow;
}

// ── App Settings ─────────────────────────────────────────────
public class LocalAppSetting
{
    [PrimaryKey]
    public string Key { get; set; } = "";
    public string? Value { get; set; }
}

// ── Local User Session ────────────────────────────────────────
public class LocalUserSession
{
    [PrimaryKey]
    public int Id { get; set; } = 1; // single-row table
    public string UserId { get; set; } = "";
    public string Email { get; set; } = "";
    public string FirstName { get; set; } = "";
    public string LastName { get; set; } = "";
    public string TenantSlug { get; set; } = "";
    public string Roles { get; set; } = ""; // comma-separated
    public DateTime SavedAt { get; set; } = DateTime.UtcNow;
}
