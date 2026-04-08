using Pestlook.UI.Mobile.Data;

namespace Pestlook.UI.Mobile.Services;

public class SyncService
{
    private readonly LocalDatabase _db;
    private readonly ApiClient _api;
    private readonly ConnectivityService _connectivity;
    private bool _syncing;

    public event Action<string>? OnProgress;
    public event Action<string>? OnError;
    public event Action? OnCompleted;
    public bool IsSyncing => _syncing;

    public SyncService(LocalDatabase db, ApiClient api, ConnectivityService connectivity)
    {
        _db = db;
        _api = api;
        _connectivity = connectivity;
    }

    /// <summary>
    /// Full sync in two phases:
    ///   Phase 1 — Sync DOWN: reference data (farms, fields, pests, trap types, traps)
    ///             then planned sessions with their observations.
    ///   Phase 2 — Sync UP:   completed ad-hoc sessions, then dirty planned observations.
    /// </summary>
    public async Task SyncAsync()
    {
        if (_syncing)  { OnError?.Invoke("Sync already in progress"); return; }
        if (!_connectivity.IsOnline) { OnError?.Invoke("No internet connection"); return; }
        if (!_api.IsLoggedIn)        { OnError?.Invoke("Not logged in — please sign in again"); return; }

        _syncing = true;
        try
        {
            // ── Phase 1: Sync DOWN ────────────────────────────────────
            await SyncDownReferenceDataAsync();
            await PullPlannedSessionsAsync();

            // ── Phase 2: Sync UP ──────────────────────────────────────
            await PushAdHocSessionsAsync();
            await PushPlannedObservationsAsync();

            OnCompleted?.Invoke();
        }
        catch (Exception ex)
        {
            OnError?.Invoke(ex.Message);
        }
        finally
        {
            _syncing = false;
        }
    }

    // ── Phase 1a: pull reference data ─────────────────────────────────────────

    private async Task SyncDownReferenceDataAsync()
    {
        OnProgress?.Invoke("↓ Syncing farms & fields...");
        var farmsRes = await _api.GetFarmsAsync();
        if (farmsRes.Success && farmsRes.Data is not null)
        {
            await _db.SaveFarmsAsync(farmsRes.Data.Select(f => new CachedFarm
            {
                Id       = f.Id.ToString(),
                Name     = f.Name,
                Location = f.Address,
                IsActive = f.IsActive
            }).ToList());

            foreach (var farm in farmsRes.Data.Where(f => f.IsActive))
            {
                var fieldsRes = await _api.GetFieldsAsync(farm.Id);
                if (fieldsRes.Success && fieldsRes.Data is not null)
                    await _db.SaveFieldsAsync(fieldsRes.Data.Select(f => new CachedField
                    {
                        Id       = f.Id.ToString(),
                        FarmId   = f.FarmId.ToString(),
                        Name     = f.Name,
                        CropType = f.CropType,
                        IsActive = f.IsActive
                    }).ToList());
            }
        }

        OnProgress?.Invoke("↓ Syncing pests...");
        var pestsRes = await _api.GetPestsAsync();
        if (pestsRes.Success && pestsRes.Data is not null)
            await _db.SavePestsAsync(pestsRes.Data.Select(p => new CachedPest
            {
                Id                 = p.Id.ToString(),
                CommonName         = p.CommonName,
                ScientificName     = p.ScientificName,
                Category           = p.Category switch { "Insect" => 0, "Disease" => 1, "Weed" => 2, "Rodent" => 3, _ => 4 },
                DefaultCaptureMode = p.DefaultCaptureMode switch { "Count" => 0, "Presence" => 1, _ => 0 },
                AlertThreshold     = p.ThresholdCount,
                IsSystemPest       = false
            }).ToList());

        OnProgress?.Invoke("↓ Syncing trap types...");
        var trapTypesRes = await _api.GetTrapTypesAsync();
        if (trapTypesRes.Success && trapTypesRes.Data is not null)
            await _db.SaveTrapTypesAsync(trapTypesRes.Data.Select(t => new CachedTrapType
            {
                Id          = t.Id.ToString(),
                Name        = t.Name,
                Description = t.Description
            }).ToList());

        OnProgress?.Invoke("↓ Syncing traps...");
        var trapsRes = await _api.GetTrapsAsync();
        if (trapsRes.Success && trapsRes.Data is not null)
            await _db.SaveTrapsAsync(trapsRes.Data.Select(t => new CachedTrap
            {
                Id                  = t.Id.ToString(),
                Name                = t.Name,
                Barcode             = t.Barcode,
                TrapTypeId          = t.TrapTypeId?.ToString(),
                TrapTypeName        = t.TrapTypeName,
                MonitoringPointId   = t.MonitoringPointId?.ToString(),
                MonitoringPointName = t.MonitoringPointName,
                Latitude            = t.Latitude,
                Longitude           = t.Longitude,
                IsEnabled           = t.IsEnabled,
                Notes               = t.Notes
            }).ToList());
    }

    // ── Phase 1b: pull planned sessions ──────────────────────────────────────

    private async Task PullPlannedSessionsAsync()
    {
        OnProgress?.Invoke("↓ Pulling planned sessions...");

        // Clear stale planned data so a shared device only holds the current scout's sessions
        await _db.DeletePlannedSessionsAsync();

        var scouterId = _api.CurrentUser?.Id;
        var sessionsRes = scouterId is not null
            ? await _api.GetSessionsByScoutAsync(scouterId)
            : await _api.GetSessionsAsync();
        if (!sessionsRes.Success || sessionsRes.Data is null)
        {
            OnError?.Invoke($"Could not load sessions: {sessionsRes.Message ?? "Server error"}");
            return;
        }

        var planned = sessionsRes.Data.Where(s => s.IsPlanned).ToList();
        for (int i = 0; i < planned.Count; i++)
        {
            var s = planned[i];
            OnProgress?.Invoke($"↓ Planned session {i + 1}/{planned.Count}: {s.FieldName ?? s.FarmName ?? s.Id.ToString()[..8]}");

            var detailRes = await _api.GetSessionAsync(s.Id);
            if (!detailRes.Success || detailRes.Data is null)
            {
                OnError?.Invoke($"Could not load session detail: {detailRes.Message ?? "Server error"}");
                continue;
            }
            var detail = detailRes.Data;

            await _db.SaveSessionAsync(new LocalSession
            {
                Id             = detail.Id.ToString(),
                RemoteId       = detail.Id.ToString(),
                FarmId         = detail.FarmId?.ToString(),
                FarmName       = detail.FarmName,
                FieldId        = detail.FieldId?.ToString(),
                FieldName      = detail.FieldName,
                IsPlanned      = true,
                ScheduledDate  = detail.ScheduledDate,
                Status         = detail.IsCompleted ? 2 : 0,
                WeatherCondition = detail.WeatherConditions,
                Notes          = detail.Notes,
                StartedAt      = detail.StartedAt ?? DateTime.UtcNow,
                CompletedAt    = detail.CompletedAt
            });

            if (detail.Observations is null) continue;
            foreach (var o in detail.Observations)
            {
                await _db.SaveObservationAsync(new LocalObservation
                {
                    Id                  = o.Id.ToString(),
                    RemoteId            = o.Id.ToString(),
                    SessionId           = detail.Id.ToString(),
                    PestId              = o.PestId?.ToString(),
                    PestName            = o.PestName,
                    IsUnknownPest       = o.IsUnknownPest,
                    CaptureMode         = o.CaptureMode switch { "Count" => 0, "Presence" => 1, _ => 0 },
                    Count               = o.Count,
                    IsPresent           = o.IsPresent,
                    Notes               = o.Notes,
                    TrapId              = o.TrapId?.ToString(),
                    TrapName            = o.TrapName,
                    CapturedLat         = o.CapturedLat,
                    CapturedLng         = o.CapturedLng,
                    LifeStage           = o.LifeStage switch { "Egg" => 0, "Larva" => 1, "Nymph" => 2, "Pupa" => 3, "Adult" => 4, "Unknown" => 5, _ => (int?)null },
                    ThresholdCount      = o.ThresholdCount,
                    IsPlanned           = o.IsPlanned,
                    ObservationGroupId  = o.ObservationGroupId?.ToString(),
                    SortOrder           = o.SortOrder,
                    IsDirty             = false
                });
            }
        }
    }

    // ── Phase 2a: push completed ad-hoc sessions ──────────────────────────────

    private async Task PushAdHocSessionsAsync()
    {
        var sessions = await _db.GetPendingAdHocSessionsAsync();
        if (sessions.Count == 0) return;

        for (int si = 0; si < sessions.Count; si++)
        {
            var session = sessions[si];
            OnProgress?.Invoke($"↑ Uploading session {si + 1}/{sessions.Count}...");

            Guid remoteSessionId;

            // Session may already exist on the server (started while online) — reuse its ID
            // instead of calling StartSession again, which would create a duplicate.
            if (Guid.TryParse(session.RemoteId, out var existingRemoteId))
            {
                remoteSessionId = existingRemoteId;
            }
            else
            {
                var fieldId = Guid.TryParse(session.FieldId, out var fld) ? fld : (Guid?)null;
                var farmId  = Guid.TryParse(session.FarmId,  out var frm) ? frm : (Guid?)null;
                var sessRes = await _api.StartSessionAsync(fieldId, farmId, session.WeatherCondition, session.Notes,
                    session.Temperature != 0 ? session.Temperature : null);
                if (!sessRes.Success || sessRes.Data is null)
                {
                    OnError?.Invoke($"Failed to upload session: {sessRes.Message}");
                    continue;
                }
                remoteSessionId = sessRes.Data.Id;
            }

            var observations = await _db.GetDirtyObservationsForSessionAsync(session.Id);
            for (int oi = 0; oi < observations.Count; oi++)
            {
                OnProgress?.Invoke($"↑ Session {si + 1}/{sessions.Count} — obs {oi + 1}/{observations.Count}");
                var obs    = observations[oi];
                var obsRes = await _api.AddObservationAsync(remoteSessionId, BuildObsRequest(obs));
                if (obsRes.Success && obsRes.Data is not null)
                {
                    obs.RemoteId = obsRes.Data.Id.ToString();
                    obs.IsDirty  = false;
                    await _db.SaveObservationAsync(obs);
                }
            }

            await _api.CompleteSessionAsync(remoteSessionId);
            session.Status   = 2;
            session.SyncedAt = DateTime.UtcNow;
            session.RemoteId = remoteSessionId.ToString();
            await _db.SaveSessionAsync(session);
        }
    }

    // ── Phase 2b: push dirty planned observations ─────────────────────────────

    private async Task PushPlannedObservationsAsync()
    {
        var sessions = await _db.GetPlannedSessionsAsync();
        foreach (var session in sessions)
        {
            if (!Guid.TryParse(session.RemoteId, out var remoteSessionId)) continue;

            var dirty = await _db.GetDirtyObservationsForSessionAsync(session.Id);
            if (dirty.Count == 0) continue;

            OnProgress?.Invoke($"↑ Uploading observations for {session.FieldName ?? session.FarmName ?? "session"}...");
            foreach (var obs in dirty)
            {
                var req = BuildObsRequest(obs);
                if (!string.IsNullOrEmpty(obs.RemoteId) && Guid.TryParse(obs.RemoteId, out var remoteObsId))
                {
                    var res = await _api.UpdateObservationAsync(remoteSessionId, remoteObsId, req);
                    if (res.Success) { obs.IsDirty = false; await _db.SaveObservationAsync(obs); }
                    else OnError?.Invoke($"Update observation failed: {res.Message ?? "Server error"}");
                }
                else
                {
                    var res = await _api.AddObservationAsync(remoteSessionId, req);
                    if (res.Success && res.Data is not null)
                    {
                        obs.RemoteId = res.Data.Id.ToString();
                        obs.IsDirty  = false;
                        await _db.SaveObservationAsync(obs);
                    }
                    else OnError?.Invoke($"Add observation failed: {res.Message ?? "Server error"}");
                }
            }
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static SessionObservationRequest BuildObsRequest(LocalObservation obs) => new()
    {
        ObservationType = obs.TrapId is null ? "AdHoc" : "Trap",
        PestId       = Guid.TryParse(obs.PestId, out var pid) ? pid : null,
        IsUnknownPest = obs.IsUnknownPest,
        CaptureMode  = obs.CaptureMode,
        Count        = obs.Count,
        IsPresent    = obs.IsPresent,
        TrapId       = Guid.TryParse(obs.TrapId, out var tid) ? tid : null,
        CapturedLat  = obs.CapturedLat,
        CapturedLng  = obs.CapturedLng,
        Notes        = obs.Notes,
        LifeStage    = obs.LifeStage
    };
}

