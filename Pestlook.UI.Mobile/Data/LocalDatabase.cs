using SQLite;

namespace Pestlook.UI.Mobile.Data;

public class LocalDatabase
{
    private readonly SQLiteAsyncConnection _db;

    public LocalDatabase()
    {
        var dbPath = Path.Combine(FileSystem.AppDataDirectory, "pestlook.db3");
        _db = new SQLiteAsyncConnection(dbPath);
    }

    public async Task InitAsync()
    {
        await _db.CreateTableAsync<LocalSession>();
        await _db.CreateTableAsync<LocalMonitoringPoint>();
        await _db.CreateTableAsync<LocalObservation>();
        await _db.CreateTableAsync<LocalObservationPhoto>();
        await _db.CreateTableAsync<CachedPest>();
        await _db.CreateTableAsync<CachedTrapType>();
        await _db.CreateTableAsync<CachedFarm>();
        await _db.CreateTableAsync<CachedField>();
        await _db.CreateTableAsync<CachedTrap>();
        await _db.CreateTableAsync<LocalAppSetting>();
    }

    // ── Sessions ──────────────────────────────────────────────
    public Task<List<LocalSession>> GetSessionsAsync()
        => _db.Table<LocalSession>().OrderByDescending(s => s.StartedAt).ToListAsync();

    public Task<List<LocalSession>> GetSessionsAsync(string? scouterId)
    {
        var q = _db.Table<LocalSession>();
        if (!string.IsNullOrEmpty(scouterId))
            q = q.Where(s => s.ScouterId == scouterId);
        return q.OrderByDescending(s => s.StartedAt).ToListAsync();
    }

    public Task<LocalSession?> GetSessionAsync(string id)
        => _db.Table<LocalSession>().FirstOrDefaultAsync(s => s.Id == id);

    public Task<LocalSession?> GetSessionByRemoteIdAsync(string remoteId)
        => _db.Table<LocalSession>().FirstOrDefaultAsync(s => s.RemoteId == remoteId);

    public Task<List<LocalSession>> GetSessionsByStatusAsync(int status)
        => _db.Table<LocalSession>().Where(s => s.Status == status).OrderByDescending(s => s.StartedAt).ToListAsync();

    public Task<List<LocalSession>> GetCompletedUnsyncedSessionsAsync()
        => _db.Table<LocalSession>().Where(s => s.Status == 1).OrderBy(s => s.CompletedAt).ToListAsync();

    public Task SaveSessionAsync(LocalSession session)
        => _db.InsertOrReplaceAsync(session);

    public Task DeleteSessionAsync(string id)
        => _db.DeleteAsync<LocalSession>(id);

    // ── Observations ──────────────────────────────────────────
    public Task<List<LocalObservation>> GetObservationsForSessionAsync(string sessionId)
        => _db.Table<LocalObservation>().Where(o => o.SessionId == sessionId).OrderBy(o => o.CreatedAt).ToListAsync();

    public async Task<Dictionary<string, int>> GetAllObservationCountsAsync()
    {
        var rows = await _db.QueryAsync<SessionObsCount>(
            "SELECT SessionId, COUNT(*) AS Count FROM LocalObservation GROUP BY SessionId");
        return rows.ToDictionary(r => r.SessionId, r => r.Count);
    }

    public Task<LocalObservation?> GetObservationAsync(string id)
        => _db.Table<LocalObservation>().FirstOrDefaultAsync(o => o.Id == id);

    public Task SaveObservationAsync(LocalObservation obs)
        => _db.InsertOrReplaceAsync(obs);

    public Task DeleteObservationAsync(string id)
        => _db.DeleteAsync<LocalObservation>(id);

    public Task<List<LocalObservation>> GetDirtyObservationsForSessionAsync(string sessionId)
        => _db.Table<LocalObservation>().Where(o => o.SessionId == sessionId && o.IsDirty).OrderBy(o => o.SortOrder).ToListAsync();

    public Task<List<LocalSession>> GetPlannedSessionsAsync()
        => _db.Table<LocalSession>().Where(s => s.IsPlanned).OrderBy(s => s.ScheduledDate).ToListAsync();

    public Task<List<LocalSession>> GetPendingAdHocSessionsAsync()
        => _db.Table<LocalSession>().Where(s => !s.IsPlanned && s.Status == 1 && s.SyncedAt == null).OrderBy(s => s.CompletedAt).ToListAsync();

    public Task<List<LocalSession>> GetPendingAdHocSessionsAsync(string? scouterId)
    {
        var q = _db.Table<LocalSession>().Where(s => !s.IsPlanned && s.Status == 1 && s.SyncedAt == null);
        if (!string.IsNullOrEmpty(scouterId))
            q = q.Where(s => s.ScouterId == scouterId);
        return q.OrderBy(s => s.CompletedAt).ToListAsync();
    }

    // ── Observation Photos ────────────────────────────────────
    public Task<List<LocalObservationPhoto>> GetPhotosForObservationAsync(string observationId)
        => _db.Table<LocalObservationPhoto>().Where(p => p.ObservationId == observationId).ToListAsync();

    public Task SavePhotoAsync(LocalObservationPhoto photo)
        => _db.InsertOrReplaceAsync(photo);

    public Task DeletePhotoAsync(string id)
        => _db.DeleteAsync<LocalObservationPhoto>(id);

    // ── Cached Pests ──────────────────────────────────────────
    public Task<List<CachedPest>> GetCachedPestsAsync()
        => _db.Table<CachedPest>().OrderBy(p => p.CommonName).ToListAsync();

    public Task SavePestsAsync(List<CachedPest> pests)
        => _db.RunInTransactionAsync(conn =>
        {
            conn.DeleteAll<CachedPest>();
            conn.InsertAll(pests);
        });

    // ── Cached TrapTypes ──────────────────────────────────────
    public Task<List<CachedTrapType>> GetCachedTrapTypesAsync()
        => _db.Table<CachedTrapType>().OrderBy(t => t.Name).ToListAsync();

    public Task SaveTrapTypesAsync(List<CachedTrapType> types)
        => _db.RunInTransactionAsync(conn =>
        {
            conn.DeleteAll<CachedTrapType>();
            conn.InsertAll(types);
        });

    // ── Cached Farms ──────────────────────────────────────────
    public Task<List<CachedFarm>> GetCachedFarmsAsync()
        => _db.Table<CachedFarm>().Where(f => f.IsActive).OrderBy(f => f.Name).ToListAsync();

    public Task SaveFarmsAsync(List<CachedFarm> farms)
        => _db.RunInTransactionAsync(conn =>
        {
            conn.DeleteAll<CachedFarm>();
            conn.InsertAll(farms);
        });

    // ── Cached Fields ─────────────────────────────────────────
    public Task<List<CachedField>> GetCachedFieldsAsync(string farmId)
        => _db.Table<CachedField>().Where(f => f.FarmId == farmId && f.IsActive).OrderBy(f => f.Name).ToListAsync();

    public Task SaveFieldsAsync(List<CachedField> fields)
        => _db.RunInTransactionAsync(conn =>
        {
            conn.DeleteAll<CachedField>();
            conn.InsertAll(fields);
        });

    // ── Cached Traps ──────────────────────────────────────────
    public Task<List<CachedTrap>> GetCachedTrapsAsync()
        => _db.Table<CachedTrap>().OrderBy(t => t.Name).ToListAsync();

    public Task<List<CachedTrap>> GetEnabledTrapsAsync()
        => _db.Table<CachedTrap>().Where(t => t.IsEnabled).OrderBy(t => t.Name).ToListAsync();

    public Task<CachedTrap?> GetCachedTrapAsync(string id)
        => _db.Table<CachedTrap>().FirstOrDefaultAsync(t => t.Id == id);

    public Task<CachedTrap?> GetCachedTrapByBarcodeAsync(string barcode)
        => _db.Table<CachedTrap>().FirstOrDefaultAsync(t => t.Barcode == barcode);

    public Task SaveTrapsAsync(List<CachedTrap> traps)
        => _db.RunInTransactionAsync(conn =>
        {
            conn.DeleteAll<CachedTrap>();
            conn.InsertAll(traps);
        });

    public Task SaveTrapAsync(CachedTrap trap)
        => _db.InsertOrReplaceAsync(trap);

    // ── App Settings ──────────────────────────────────────────
    public async Task<string?> GetSettingAsync(string key)
    {
        var s = await _db.Table<LocalAppSetting>().FirstOrDefaultAsync(x => x.Key == key);
        return s?.Value;
    }

    public Task SetSettingAsync(string key, string? value)
        => _db.InsertOrReplaceAsync(new LocalAppSetting { Key = key, Value = value });

    // ── Counts (for profile stats) ────────────────────────────
    public Task<int> CountSessionsAsync()
        => _db.Table<LocalSession>().CountAsync();

    public Task<int> CountObservationsAsync()
        => _db.Table<LocalObservation>().CountAsync();

    // ── Clear cache ───────────────────────────────────────────
    public async Task ClearCacheAsync()
    {
        await _db.DeleteAllAsync<CachedPest>();
        await _db.DeleteAllAsync<CachedTrapType>();
        await _db.DeleteAllAsync<CachedFarm>();
        await _db.DeleteAllAsync<CachedField>();
        await _db.DeleteAllAsync<CachedTrap>();
    }

    public async Task<long> GetDatabaseSizeAsync()
    {
        var path = Path.Combine(FileSystem.AppDataDirectory, "pestlook.db3");
        if (File.Exists(path))
            return new FileInfo(path).Length;
        return 0;
    }

    private class SessionObsCount
    {
        public string SessionId { get; set; } = "";
        public int Count { get; set; }
    }
}
