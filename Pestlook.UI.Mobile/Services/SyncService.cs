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

            // ── Phase 2: Sync UP — observations ──────────────────────
            await PushAdHocSessionsAsync();
            await PushPlannedObservationsAsync();

            // ── Phase 3: Sync UP — photos ─────────────────────────────
            await PushPendingPhotosAsync();

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

            var fieldsRes = await _api.GetFieldsAsync();
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
                Id           = t.Id.ToString(),
                Name         = t.Name,
                Description  = t.Description,
                IsSystemType = t.IsSystemType
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
        var sw = System.Diagnostics.Stopwatch.StartNew();
        System.Diagnostics.Debug.WriteLine($"[SYNC] PullPlannedSessions — start");

        OnProgress?.Invoke("↓ Pulling planned sessions...");
        var t0 = sw.ElapsedMilliseconds;
        var sessionsRes = await _api.GetPlannedSessionsAsync();
        System.Diagnostics.Debug.WriteLine($"[SYNC] GetPlannedSessionsAsync — {sw.ElapsedMilliseconds - t0}ms  success={sessionsRes.Success}  count={sessionsRes.Data?.Count ?? -1}");

        if (!sessionsRes.Success || sessionsRes.Data is null)
        {
            OnError?.Invoke($"Could not load planned sessions: {sessionsRes.Message ?? "Server error"}");
            return;
        }

        var scouterId = _api.CurrentUser?.Id;
        var sessions = sessionsRes.Data;
        for (int i = 0; i < sessions.Count; i++)
        {
            var detail = sessions[i];
            var tSession = sw.ElapsedMilliseconds;
            OnProgress?.Invoke($"↓ Planned session {i + 1}/{sessions.Count}: {detail.FieldName ?? detail.FarmName ?? detail.Id.ToString()[..8]}");

            var serverId = detail.Id.ToString();

            // Remove any orphaned copy that was saved with a random GUID instead of the server ID
            var t1 = sw.ElapsedMilliseconds;
            var orphan = await _db.GetSessionByRemoteIdAsync(serverId);
            System.Diagnostics.Debug.WriteLine($"[SYNC]   [{i+1}/{sessions.Count}] GetSessionByRemoteId — {sw.ElapsedMilliseconds - t1}ms  orphan={orphan?.Id ?? "none"}");
            if (orphan is not null && orphan.Id != serverId)
            {
                System.Diagnostics.Debug.WriteLine(
                    $"[SYNC] Removing orphaned session {orphan.Id} (RemoteId={serverId}, Status={orphan.Status})");
                await _db.DeleteSessionAsync(orphan.Id);
            }

            // Preserve local completed state if the scout finished the session offline but it
            // hasn't been pushed to the server yet — the pull must not clobber CompletedAt/Status.
            var t2 = sw.ElapsedMilliseconds;
            var existing = await _db.GetSessionAsync(serverId);
            System.Diagnostics.Debug.WriteLine($"[SYNC]   [{i+1}/{sessions.Count}] GetSession — {sw.ElapsedMilliseconds - t2}ms  exists={existing is not null}");
            var isLocallyCompleted = existing?.Status == SessionStatus.Completed && existing.SyncedAt is null;

            var t3 = sw.ElapsedMilliseconds;
            await _db.SaveSessionAsync(new LocalSession
            {
                Id               = serverId,
                RemoteId         = serverId,
                TenantId         = detail.TenantId.ToString(),
                ScouterId        = detail.ScouterId ?? scouterId,
                FarmId           = detail.FarmId?.ToString(),
                FarmName         = detail.FarmName,
                FieldId          = detail.FieldId?.ToString(),
                FieldName        = detail.FieldName,
                IsPlanned        = true,
                ScheduledDate    = detail.ScheduledDate,
                Status           = isLocallyCompleted ? SessionStatus.Completed : (detail.IsCompleted ? SessionStatus.Synced : SessionStatus.Active),
                WeatherCondition = !string.IsNullOrEmpty(detail.WeatherConditions) ? detail.WeatherConditions : existing?.WeatherCondition,
                Temperature      = detail.TemperatureCelsius.HasValue ? (int)detail.TemperatureCelsius.Value : (existing?.Temperature ?? 0),
                Notes            = detail.Notes ?? existing?.Notes,
                StartedAt        = detail.StartedAt ?? existing?.StartedAt ?? DateTime.UtcNow,
                CompletedAt      = isLocallyCompleted ? existing!.CompletedAt : detail.CompletedAt,
                SyncedAt         = existing?.SyncedAt
            });
            System.Diagnostics.Debug.WriteLine($"[SYNC]   [{i+1}/{sessions.Count}] SaveSession — {sw.ElapsedMilliseconds - t3}ms");

            if (detail.Observations is null)
            {
                System.Diagnostics.Debug.WriteLine($"[SYNC]   [{i+1}/{sessions.Count}] No observations — session total {sw.ElapsedMilliseconds - tSession}ms");
                continue;
            }

            var sessionId        = detail.Id.ToString();
            var t4 = sw.ElapsedMilliseconds;
            var existingObs      = await _db.GetObservationsForSessionAsync(sessionId);
            System.Diagnostics.Debug.WriteLine($"[SYNC]   [{i+1}/{sessions.Count}] GetObservations — {sw.ElapsedMilliseconds - t4}ms  count={existingObs.Count}");

            // IDs of observations the scout has modified or added offline — preserve these
            var dirtyRemoteIds = existingObs
                .Where(o => o.IsDirty && !string.IsNullOrEmpty(o.RemoteId))
                .Select(o => o.RemoteId!)
                .ToHashSet();

            // Delete stale clean copies so they don't accumulate and get re-pushed
            var t5 = sw.ElapsedMilliseconds;
            var staleList = existingObs.Where(o => !o.IsDirty).ToList();
            foreach (var stale in staleList)
                await _db.DeleteObservationAsync(stale.Id);
            System.Diagnostics.Debug.WriteLine($"[SYNC]   [{i+1}/{sessions.Count}] DeleteStaleObs ({staleList.Count}) — {sw.ElapsedMilliseconds - t5}ms");

            var t6 = sw.ElapsedMilliseconds;
            int saved = 0, skipped = 0;
            foreach (var o in detail.Observations)
            {
                // Don't overwrite an observation the scout has already modified locally
                if (dirtyRemoteIds.Contains(o.Id.ToString())) { skipped++; continue; }

                await _db.SaveObservationAsync(new LocalObservation
                {
                    Id                  = o.Id.ToString(),
                    RemoteId            = o.Id.ToString(),
                    SessionId           = sessionId,
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
                    IsDirty             = false,
                    CreatedAt           = o.CreatedAt == default ? DateTime.UtcNow : o.CreatedAt,
                    ObservedAt          = o.ObservedAt
                });
                saved++;
            }
            System.Diagnostics.Debug.WriteLine($"[SYNC]   [{i+1}/{sessions.Count}] SaveObservations saved={saved} skipped={skipped} — {sw.ElapsedMilliseconds - t6}ms");
            System.Diagnostics.Debug.WriteLine($"[SYNC]   [{i+1}/{sessions.Count}] Session total — {sw.ElapsedMilliseconds - tSession}ms");
        }

        System.Diagnostics.Debug.WriteLine($"[SYNC] PullPlannedSessions — DONE  total={sw.ElapsedMilliseconds}ms");
    }

    // ── Phase 2a: push completed ad-hoc sessions ──────────────────────────────

    private async Task PushAdHocSessionsAsync()
    {
        var sessions = await _db.GetPendingAdHocSessionsAsync(_api.CurrentUser?.Id);
        if (sessions.Count == 0) return;

        for (int si = 0; si < sessions.Count; si++)
        {
            var session = sessions[si];
            OnProgress?.Invoke($"↑ Uploading session {si + 1}/{sessions.Count}...");

            Guid remoteSessionId;

            // Reuse existing remote session if a previous sync already created it
            if (!string.IsNullOrEmpty(session.RemoteId) && Guid.TryParse(session.RemoteId, out remoteSessionId))
            {
                // Session already created on server — skip StartSessionAsync
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

                // Save RemoteId immediately so a retry won't create a duplicate
                session.RemoteId = remoteSessionId.ToString();
                await _db.SaveSessionAsync(session);
            }

            var observations = await _db.GetObservationsForSessionAsync(session.Id);
            for (int oi = 0; oi < observations.Count; oi++)
            {
                var obs = observations[oi];
                // Skip observations already pushed successfully
                if (!obs.IsDirty && !string.IsNullOrEmpty(obs.RemoteId)) continue;

                OnProgress?.Invoke($"↑ Session {si + 1}/{sessions.Count} — obs {oi + 1}/{observations.Count}");
                var obsRes = await _api.AddObservationAsync(remoteSessionId, BuildObsRequest(obs));
                if (obsRes.Success && obsRes.Data is not null)
                {
                    obs.RemoteId = obsRes.Data.Id.ToString();
                    obs.IsDirty  = false;
                    await _db.SaveObservationAsync(obs);
                }
                else
                {
                    OnError?.Invoke($"Failed to upload observation: {obsRes.Message ?? "Server error"}");
                }
            }

            await _api.CompleteSessionAsync(remoteSessionId,
                session.WeatherCondition,
                session.Temperature != 0 ? (double?)session.Temperature : null,
                session.Notes,
                session.StartedAt != default ? session.StartedAt : null);
            session.Status   = SessionStatus.Synced;
            session.SyncedAt = DateTime.UtcNow;
            await _db.SaveSessionAsync(session);
        }
    }

    private async Task PushPlannedObservationsAsync()
    {
        var sessions = await _db.GetPlannedSessionsAsync();
        foreach (var session in sessions)
        {
            if (session.Status == SessionStatus.Synced) continue; // already fully synced
            if (!Guid.TryParse(session.RemoteId, out var remoteSessionId)) continue;

            var dirty = await _db.GetDirtyObservationsForSessionAsync(session.Id);
            if (dirty.Count > 0)
            {
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

            // If the session was completed offline, mark it complete on the server now
            if (session.CompletedAt.HasValue && session.SyncedAt is null)
            {
                OnProgress?.Invoke($"↑ Completing session {session.FieldName ?? session.FarmName ?? "session"} on server...");
                await _api.CompleteSessionAsync(remoteSessionId,
                    session.WeatherCondition,
                    session.Temperature != 0 ? (double?)session.Temperature : null,
                    session.Notes,
                    session.StartedAt != default ? session.StartedAt : null);
                session.Status   = SessionStatus.Synced;
                session.SyncedAt = DateTime.UtcNow;
                await _db.SaveSessionAsync(session);
            }
        }
    }

    // ── Phase 3: push pending photos ─────────────────────────────────────────

    private async Task PushPendingPhotosAsync()
    {
        // 3a — delete photos that were removed locally after having been uploaded
        var deletePending = await _db.GetDeletePendingPhotosAsync();
        foreach (var photo in deletePending)
        {
            if (string.IsNullOrEmpty(photo.RemoteUrl)) { await _db.DeletePhotoAsync(photo.Id); continue; }

            // Find the parent observation to get sessionId / remoteObsId
            var obs = await _db.GetObservationAsync(photo.ObservationId);
            if (obs is null) { await _db.DeletePhotoAsync(photo.Id); continue; }

            if (Guid.TryParse(obs.RemoteId, out var remoteObsId) &&
                Guid.TryParse(obs.SessionId, out var remoteSessionId))
            {
                var res = await _api.DeleteObservationPhotoAsync(remoteSessionId, remoteObsId, photo.RemoteUrl);
                if (res.Success)
                {
                    PhotoService.DeleteLocalFile(photo.LocalFilePath);
                    await _db.DeletePhotoAsync(photo.Id);
                }
                else
                {
                    OnError?.Invoke($"Photo delete failed: {res.Message ?? "Server error"}");
                }
            }
            else
            {
                // No remote observation — just clean up locally
                PhotoService.DeleteLocalFile(photo.LocalFilePath);
                await _db.DeletePhotoAsync(photo.Id);
            }
        }

        // 3b — upload photos that haven't been uploaded yet
        // We need all observations that have a RemoteId (so we know the server ID to POST to)
        var sessions = await _db.GetSessionsAsync();
        foreach (var session in sessions)
        {
            if (string.IsNullOrEmpty(session.RemoteId)) continue;
            if (!Guid.TryParse(session.RemoteId, out var remoteSessionId)) continue;

            var observations = await _db.GetObservationsForSessionAsync(session.Id);
            foreach (var obs in observations)
            {
                if (string.IsNullOrEmpty(obs.RemoteId)) continue;
                if (!Guid.TryParse(obs.RemoteId, out var remoteObsId)) continue;

                var unuploaded = await _db.GetUnuploadedPhotosForObservationAsync(obs.Id);
                if (unuploaded.Count == 0) continue;

                OnProgress?.Invoke($"↑ Uploading {unuploaded.Count} photo(s) for observation...");
                var paths = unuploaded.Select(p => p.LocalFilePath).ToList();
                var res   = await _api.UploadObservationPhotosAsync(remoteSessionId, remoteObsId, paths);

                if (res.Success && res.Data is not null)
                {
                    // Server returns the full list of URLs; the new ones are appended at the end
                    var newUrls = res.Data.TakeLast(unuploaded.Count).ToList();
                    for (var i = 0; i < unuploaded.Count; i++)
                    {
                        var photo = unuploaded[i];
                        photo.RemoteUrl    = i < newUrls.Count ? newUrls[i] : res.Data.LastOrDefault();
                        photo.UploadedAt   = DateTime.UtcNow;
                        await _db.SavePhotoAsync(photo);
                    }
                }
                else
                {
                    OnError?.Invoke($"Photo upload failed: {res.Message ?? "Server error"}");
                }
            }
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static SessionObservationRequest BuildObsRequest(LocalObservation obs) => new()
    {
        ObservationType = !string.IsNullOrEmpty(obs.TrapId) ? "Trap" : "AdHoc",
        PestId          = Guid.TryParse(obs.PestId, out var pid) ? pid : null,
        IsUnknownPest   = obs.IsUnknownPest,
        CaptureMode     = obs.CaptureMode switch { 1 => "Presence", _ => "Count" },
        Count           = obs.Count,
        IsPresent       = obs.IsPresent,
        TrapId          = Guid.TryParse(obs.TrapId, out var tid) ? tid : null,
        CapturedLat     = obs.CapturedLat,
        CapturedLng     = obs.CapturedLng,
        Notes           = obs.Notes,
        LifeStage       = obs.LifeStage switch { 0 => "Egg", 1 => "Larva", 2 => "Nymph", 3 => "Pupa", 4 => "Adult", 5 => "Unknown", _ => null },
        IsPlanned       = obs.IsPlanned,
        ObservedAt      = obs.ObservedAt
    };
}

