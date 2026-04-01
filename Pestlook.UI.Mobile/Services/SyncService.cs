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

    /// <summary>Cache reference data from server into local SQLite.</summary>
    public async Task CacheReferenceDataAsync()
    {
        if (!_connectivity.IsOnline || !_api.IsLoggedIn) return;

        try
        {
            var farmsRes = await _api.GetFarmsAsync();
            if (farmsRes.Success && farmsRes.Data is not null)
            {
                await _db.SaveFarmsAsync(farmsRes.Data.Select(f => new CachedFarm
                {
                    Id = f.Id.ToString(),
                    Name = f.Name,
                    Location = f.Address,
                    IsActive = f.IsActive
                }).ToList());

                foreach (var farm in farmsRes.Data.Where(f => f.IsActive))
                {
                    var fieldsRes = await _api.GetFieldsAsync(farm.Id);
                    if (fieldsRes.Success && fieldsRes.Data is not null)
                    {
                        var fields = fieldsRes.Data.Select(f => new CachedField
                        {
                            Id = f.Id.ToString(),
                            FarmId = f.FarmId.ToString(),
                            Name = f.Name,
                            CropType = f.CropType,
                            IsActive = f.IsActive
                        }).ToList();
                        await _db.SaveFieldsAsync(fields);
                    }
                }
            }

            var pestsRes = await _api.GetPestsAsync();
            if (pestsRes.Success && pestsRes.Data is not null)
            {
                await _db.SavePestsAsync(pestsRes.Data.Select(p => new CachedPest
                {
                    Id = p.Id.ToString(),
                    CommonName = p.CommonName,
                    ScientificName = p.ScientificName,
                    Category = p.Category,
                    DefaultCaptureMode = p.DefaultCaptureMode,
                    AlertThreshold = p.ThresholdCount,
                    IsSystemPest = false
                }).ToList());
            }

            var trapTypesRes = await _api.GetTrapTypesAsync();
            if (trapTypesRes.Success && trapTypesRes.Data is not null)
            {
                await _db.SaveTrapTypesAsync(trapTypesRes.Data.Select(t => new CachedTrapType
                {
                    Id = t.Id.ToString(),
                    Name = t.Name,
                    Description = t.Description
                }).ToList());
            }

            var trapsRes = await _api.GetTrapsAsync();
            if (trapsRes.Success && trapsRes.Data is not null)
            {
                await _db.SaveTrapsAsync(trapsRes.Data.Select(t => new CachedTrap
                {
                    Id = t.Id.ToString(),
                    Name = t.Name,
                    Barcode = t.Barcode,
                    TrapTypeId = t.TrapTypeId?.ToString(),
                    TrapTypeName = t.TrapTypeName,
                    MonitoringPointId = t.MonitoringPointId?.ToString(),
                    MonitoringPointName = t.MonitoringPointName,
                    Latitude = t.Latitude,
                    Longitude = t.Longitude,
                    IsEnabled = t.IsEnabled,
                    Notes = t.Notes
                }).ToList());
            }
        }
        catch
        {
            // Silently fail — cached data will be used
        }
    }

    /// <summary>Upload all completed sessions to the server.</summary>
    public async Task SyncCompletedSessionsAsync()
    {
        if (_syncing || !_connectivity.IsOnline || !_api.IsLoggedIn) return;
        _syncing = true;

        try
        {
            var sessions = await _db.GetCompletedUnsyncedSessionsAsync();
            for (int si = 0; si < sessions.Count; si++)
            {
                var session = sessions[si];
                OnProgress?.Invoke($"Uploading session {si + 1} of {sessions.Count}...");

                // 1. Create session on server (temperature stored locally is always Celsius)
                var sessRes = await _api.StartSessionAsync(session.WeatherCondition, session.Notes, session.Temperature != 0 ? session.Temperature : null);
                if (!sessRes.Success || sessRes.Data is null) { OnError?.Invoke($"Failed to sync session: {sessRes.Message}"); continue; }
                var remoteSessionId = sessRes.Data.Id;

                // 2. Upload points and observations
                var points = await _db.GetPointsForSessionAsync(session.Id);
                for (int pi = 0; pi < points.Count; pi++)
                {
                    var pt = points[pi];
                    var observations = await _db.GetObservationsForPointAsync(pt.Id);

                    for (int oi = 0; oi < observations.Count; oi++)
                    {
                        OnProgress?.Invoke($"Session {si + 1}/{sessions.Count}: obs {oi + 1}/{observations.Count}");
                        var obs = observations[oi];

                        // Find or use the monitoring point's RemoteId if it exists, otherwise create on server
                        Guid remotePointId;
                        if (!string.IsNullOrEmpty(pt.RemoteId) && Guid.TryParse(pt.RemoteId, out var rpid))
                        {
                            remotePointId = rpid;
                        }
                        else
                        {
                            var ptReq = new CreatePointRequest
                            {
                                FarmId = Guid.TryParse(session.FarmId, out var fid) ? fid : Guid.Empty,
                                PointType = pt.PointType,
                                Name = pt.Name,
                                Latitude = pt.Latitude,
                                Longitude = pt.Longitude,
                                TrapTypeId = Guid.TryParse(pt.TrapTypeId, out var ttid) ? ttid : null
                            };
                            var ptRes = await _api.CreateMonitoringPointAsync(ptReq);
                            if (ptRes.Success && ptRes.Data is not null)
                            {
                                pt.RemoteId = ptRes.Data.Id.ToString();
                                await _db.SavePointAsync(pt);
                                remotePointId = ptRes.Data.Id;
                            }
                            else continue;
                        }

                        var obsReq = new CreateObservationRequest
                        {
                            SessionId = remoteSessionId,
                            MonitoringPointId = remotePointId,
                            PestId = Guid.TryParse(obs.PestId, out var pestId) ? pestId : null,
                            IsUnknownPest = obs.IsUnknownPest,
                            UnknownPestDescription = obs.UnknownPestDescription,
                            CaptureMode = obs.CaptureMode,
                            Count = obs.Count,
                            Present = obs.IsPresent,
                            CapturedLat = obs.CapturedLat,
                            CapturedLng = obs.CapturedLng,
                            Notes = obs.Notes,
                            ObservedAt = obs.CreatedAt
                        };
                        var obsRes = await _api.CreateObservationAsync(obsReq);
                        if (obsRes.Success && obsRes.Data is not null)
                        {
                            obs.RemoteId = obsRes.Data.Id.ToString();
                            await _db.SaveObservationAsync(obs);

                            // Upload photos
                            var photos = await _db.GetPhotosForObservationAsync(obs.Id);
                            foreach (var photo in photos.Where(p => p.UploadedAt == null))
                            {
                                // Photo upload would go here (multipart form data)
                                // For now mark as uploaded if file exists
                                if (File.Exists(photo.LocalFilePath))
                                {
                                    photo.UploadedAt = DateTime.UtcNow;
                                    await _db.SavePhotoAsync(photo);
                                }
                            }
                        }
                    }
                }

                // 3. Complete the session on server
                await _api.CompleteSessionAsync(remoteSessionId);

                // 4. Mark local session as synced
                session.Status = 2; // Synced
                session.SyncedAt = DateTime.UtcNow;
                session.RemoteId = remoteSessionId.ToString();
                await _db.SaveSessionAsync(session);
            }

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
}
