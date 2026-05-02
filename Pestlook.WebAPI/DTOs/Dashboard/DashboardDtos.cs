namespace Pestlook.WebAPI.DTOs.Dashboard;

/// <summary>Single-payload response for the web dashboard — one HTTP call replaces four.</summary>
public sealed record DashboardResponse(
    DashboardStats Stats,
    List<DashboardSession> RecentSessions,
    List<DashboardObservation> RecentActivity,
    List<DashboardTrap> Traps,
    List<DashboardTopPest> TopPests);

public sealed record DashboardStats(
    int FarmCount,
    int TrapCount,
    int EnabledTrapCount,
    int SessionCount,
    int ObservationCount);

public sealed record DashboardSession(
    Guid Id,
    string? ScouterName,
    DateTime? StartedAt,
    DateTime? CompletedAt,
    int ObservationCount);

public sealed record DashboardObservation(
    Guid Id,
    string? PestName,
    bool IsUnknownPest,
    int? Count,
    DateTime CreatedAt);

public sealed record DashboardTrap(
    Guid Id,
    string Name,
    bool IsEnabled,
    double? Latitude,
    double? Longitude);

public sealed record DashboardTopPest(
    string PestName,
    int TotalCount);
