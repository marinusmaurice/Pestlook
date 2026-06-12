using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Maui.Storage;

namespace Pestlook.UI.Mobile.Services;

public class ApiClient
{
    private readonly HttpClient _http;
    private string? _accessToken;
    private string? _refreshToken;
    private string? _tenantSlug;
    private DateTime _tokenExpiry;
    private UserInfo? _user;

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        // All DateTime values cross the wire as UTC ISO 8601 with a trailing Z
        Converters = { new UtcDateTimeJsonConverter() }
    };

    // IMPORTANT: trailing slash is required for HttpClient relative URI resolution
#if DEBUG
    public const string BaseUrl = "https://localhost:7290/api/v1/";
#else
    public const string BaseUrl = "https://pestlook.com/api/v1/";
#endif

    public ApiClient()
    {
#if DEBUG
#if ANDROID
        // Android emulator maps 10.0.2.2 to the host machine's localhost
        const string debugBaseUrl = "https://10.0.2.2:7290/api/v1/";
#else
        const string debugBaseUrl = BaseUrl;
#endif
        // Dev certificates are self-signed — skip validation in debug builds only
        var handler = new HttpClientHandler
        {
            ServerCertificateCustomValidationCallback = (_, _, _, _) => true
        };
        _http = new HttpClient(handler) { BaseAddress = new Uri(debugBaseUrl) };
#else
        _http = new HttpClient { BaseAddress = new Uri(BaseUrl) };
#endif
    }

    public bool IsLoggedIn => !string.IsNullOrEmpty(_accessToken);
    public UserInfo? CurrentUser => _user;

    // ── Auth ──────────────────────────────────────────────────
    public async Task<ApiResult<TokenResponse>> LoginAsync(string email, string password)
    {
        var res = await PostAsync<TokenResponse>("auth/login",
            new { email, password }, auth: false);

        if (res.Success && res.Data is not null)
        {
            _accessToken = res.Data.AccessToken;
            _refreshToken = res.Data.RefreshToken;
            _tokenExpiry = res.Data.AccessTokenExpiry;

            var me = await GetAsync<UserInfo>("auth/me");
            if (me.Success && me.Data is not null)
            {
                _user = me.Data;
                _tenantSlug = me.Data.TenantSlug;
            }
            SaveAuthState();
        }
        return res;
    }

    public void Logout()
    {
        _accessToken = null;
        _refreshToken = null;
        _user = null;
        _tenantSlug = null;
        ClearAuthState();
    }

    /// <summary>Restores a previously saved login session from local storage. Returns true if a saved session was found.</summary>
    public bool TryRestoreAuth()
    {
        var token = Preferences.Default.Get("auth.access_token", "");
        if (string.IsNullOrEmpty(token)) return false;

        var userId = Preferences.Default.Get("auth.user_id", "");
        if (string.IsNullOrEmpty(userId)) return false;

        _accessToken  = token;
        _refreshToken = Preferences.Default.Get("auth.refresh_token", "");
        var expiryStr = Preferences.Default.Get("auth.token_expiry", "");
        _tokenExpiry  = DateTime.TryParse(expiryStr, null,
            System.Globalization.DateTimeStyles.RoundtripKind, out var exp) ? exp : DateTime.MinValue;
        _tenantSlug   = Preferences.Default.Get("auth.user_tenant_slug", "");
        _user = new UserInfo
        {
            Id              = userId,
            Email           = Preferences.Default.Get("auth.user_email", ""),
            FirstName       = Preferences.Default.Get("auth.user_first_name", ""),
            LastName        = Preferences.Default.Get("auth.user_last_name", ""),
            TenantId        = Guid.TryParse(Preferences.Default.Get("auth.user_tenant_id", ""), out var tid) ? tid : Guid.Empty,
            TenantSlug      = _tenantSlug ?? "",
            TemperatureUnit = Preferences.Default.Get("auth.user_temp_unit", "C"),
            Roles           = Preferences.Default.Get("auth.user_roles", "")
                                  .Split(',', StringSplitOptions.RemoveEmptyEntries)
        };
        return true;
    }

    private void SaveAuthState()
    {
        Preferences.Default.Set("auth.access_token",  _accessToken  ?? "");
        Preferences.Default.Set("auth.refresh_token", _refreshToken ?? "");
        Preferences.Default.Set("auth.token_expiry",  _tokenExpiry.ToString("O"));
        if (_user is not null)
        {
            Preferences.Default.Set("auth.user_id",          _user.Id);
            Preferences.Default.Set("auth.user_email",        _user.Email);
            Preferences.Default.Set("auth.user_first_name",   _user.FirstName);
            Preferences.Default.Set("auth.user_last_name",    _user.LastName);
            Preferences.Default.Set("auth.user_tenant_id",    _user.TenantId.ToString());
            Preferences.Default.Set("auth.user_tenant_slug",  _user.TenantSlug);
            Preferences.Default.Set("auth.user_temp_unit",    _user.TemperatureUnit);
            Preferences.Default.Set("auth.user_roles",        string.Join(",", _user.Roles));
        }
    }

    private static void ClearAuthState()
    {
        Preferences.Default.Remove("auth.access_token");
        Preferences.Default.Remove("auth.refresh_token");
        Preferences.Default.Remove("auth.token_expiry");
        Preferences.Default.Remove("auth.user_id");
        Preferences.Default.Remove("auth.user_email");
        Preferences.Default.Remove("auth.user_first_name");
        Preferences.Default.Remove("auth.user_last_name");
        Preferences.Default.Remove("auth.user_tenant_slug");
        Preferences.Default.Remove("auth.user_temp_unit");
        Preferences.Default.Remove("auth.user_roles");
    }

    // ── Farms ─────────────────────────────────────────────────
    public Task<ApiResult<List<FarmResponse>>> GetFarmsAsync()
        => GetAsync<List<FarmResponse>>("farms");

    // ── Fields ──────────────────────────────────────────────────
    public Task<ApiResult<List<FieldResponse>>> GetFieldsAsync(Guid? farmId = null)
    {
        var q = farmId.HasValue ? $"?farmId={farmId}" : "";
        return GetAsync<List<FieldResponse>>($"fields{q}");
    }

    // ── Sessions ──────────────────────────────────────────────
    public Task<ApiResult<List<SessionResponse>>> GetSessionsAsync()
        => GetAsync<List<SessionResponse>>("scouting-sessions");

    public Task<ApiResult<List<SessionResponse>>> GetPlannedSessionsAsync(bool includeCompleted = false)
        => GetAsync<List<SessionResponse>>($"scouting-sessions/planned?includeCompleted={includeCompleted.ToString().ToLowerInvariant()}");

    public Task<ApiResult<SessionResponse>> StartSessionAsync(Guid? fieldId = null, Guid? farmId = null, string? weather = null, string? notes = null, double? temperatureCelsius = null)
        => PostAsync<SessionResponse>("scouting-sessions", new { fieldId, farmId, weatherConditions = weather, temperatureCelsius, notes });

    public Task<ApiResult<SessionResponse>> GetSessionAsync(Guid id)
        => GetAsync<SessionResponse>($"scouting-sessions/{id}");

    public Task<ApiResult<SessionResponse>> CompleteSessionAsync(Guid id,
        string? weatherConditions = null, double? temperatureCelsius = null,
        string? notes = null, DateTime? startedAt = null)
        => PatchAsync<SessionResponse>($"scouting-sessions/{id}/complete",
            new { weatherConditions, temperatureCelsius, notes, startedAt });

    // ── Trap Types ────────────────────────────────────────────
    public Task<ApiResult<List<TrapTypeResponse>>> GetTrapTypesAsync()
        => GetAsync<List<TrapTypeResponse>>("trap-types");

    // ── Traps ─────────────────────────────────────────────────
    public Task<ApiResult<List<TrapApiResponse>>> GetTrapsAsync(bool? enabled = null)
    {
        var q = enabled.HasValue ? $"?enabled={enabled.Value.ToString().ToLowerInvariant()}" : "";
        return GetAsync<List<TrapApiResponse>>($"traps{q}");
    }

    public Task<ApiResult<TrapApiResponse>> GetTrapAsync(Guid id)
        => GetAsync<TrapApiResponse>($"traps/{id}");

    public Task<ApiResult<TrapApiResponse>> GetTrapByBarcodeAsync(string barcode)
        => GetAsync<TrapApiResponse>($"traps/barcode/{Uri.EscapeDataString(barcode)}");

    public Task<ApiResult<TrapApiResponse>> CreateTrapAsync(CreateTrapApiRequest req)
        => PostAsync<TrapApiResponse>("traps", req);

    public Task<ApiResult<TrapApiResponse>> UpdateTrapAsync(Guid id, UpdateTrapApiRequest req)
        => PutAsync<TrapApiResponse>($"traps/{id}", req);

    public Task<ApiResult<TrapApiResponse>> ToggleTrapAsync(Guid id)
        => PatchAsync<TrapApiResponse>($"traps/{id}/toggle", new { });

    // ── Pests ─────────────────────────────────────────────────
    public Task<ApiResult<List<PestResponse>>> GetPestsAsync()
        => GetAsync<List<PestResponse>>("pests");

    // ── Observations ──────────────────────────────────────────
    public Task<ApiResult<SessionObservationResponse>> AddObservationAsync(Guid sessionId, SessionObservationRequest req)
        => PostAsync<SessionObservationResponse>($"scouting-sessions/{sessionId}/observations", req);

    public Task<ApiResult<SessionObservationResponse>> UpdateObservationAsync(Guid sessionId, Guid obsId, SessionObservationRequest req)
        => PutAsync<SessionObservationResponse>($"scouting-sessions/{sessionId}/observations/{obsId}", req);

    public async Task DeleteObservationAsync(Guid sessionId, Guid obsId)
        => await SendAsync(HttpMethod.Delete, $"scouting-sessions/{sessionId}/observations/{obsId}");

    // ── Observation Photos ─────────────────────────────────────
    /// <summary>Uploads one or more local photo files as multipart/form-data.</summary>
    public async Task<ApiResult<List<string>>> UploadObservationPhotosAsync(
        Guid sessionId, Guid observationId, IEnumerable<string> localFilePaths)
    {
        await EnsureTokenAsync();
        using var content = new MultipartFormDataContent();
        var added = 0;
        foreach (var path in localFilePaths)
        {
            if (!File.Exists(path)) continue;
            var stream    = File.OpenRead(path);
            var fileName  = Path.GetFileName(path);
            var fileContent = new StreamContent(stream);
            fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(
                Path.GetExtension(path).ToLowerInvariant() switch
                {
                    ".png"  => "image/png",
                    ".webp" => "image/webp",
                    ".heic" => "image/heic",
                    _       => "image/jpeg"
                });
            content.Add(fileContent, "files", fileName);
            added++;
        }
        if (added == 0)
            return new ApiResult<List<string>> { Success = true, Data = [] };

        var req = new HttpRequestMessage(
            HttpMethod.Post,
            $"scouting-sessions/{sessionId}/observations/{observationId}/photos")
        {
            Content = content
        };
        AddHeaders(req, auth: true);
        return await SendAndParse<List<string>>(req);
    }

    /// <summary>Tells the server to delete a previously uploaded photo.</summary>
    public Task<ApiResult<List<string>>> DeleteObservationPhotoAsync(
        Guid sessionId, Guid observationId, string remoteUrl)
    {
        var encoded = Uri.EscapeDataString(remoteUrl);
        return SendAsync<List<string>>(
            HttpMethod.Delete,
            $"scouting-sessions/{sessionId}/observations/{observationId}/photos?url={encoded}");
    }

    // ── HTTP helpers ──────────────────────────────────────────
    private async Task<ApiResult<T>> GetAsync<T>(string path, bool auth = true)
    {
        if (auth) await EnsureTokenAsync();
        var req = new HttpRequestMessage(HttpMethod.Get, path);
        AddHeaders(req, auth);
        return await SendAndParse<T>(req);
    }

    private async Task<ApiResult<T>> PostAsync<T>(string path, object body, bool auth = true)
    {
        if (auth) await EnsureTokenAsync();
        var req = new HttpRequestMessage(HttpMethod.Post, path)
        {
            Content = JsonContent.Create(body, options: JsonOpts)
        };
        AddHeaders(req, auth);
        return await SendAndParse<T>(req);
    }

    private async Task<ApiResult<T>> PutAsync<T>(string path, object body, bool auth = true)
    {
        if (auth) await EnsureTokenAsync();
        var req = new HttpRequestMessage(HttpMethod.Put, path)
        {
            Content = JsonContent.Create(body, options: JsonOpts)
        };
        AddHeaders(req, auth);
        return await SendAndParse<T>(req);
    }

    private async Task<ApiResult<T>> PatchAsync<T>(string path, object body, bool auth = true)
    {
        if (auth) await EnsureTokenAsync();
        var req = new HttpRequestMessage(HttpMethod.Patch, path)
        {
            Content = JsonContent.Create(body, options: JsonOpts)
        };
        AddHeaders(req, auth);
        return await SendAndParse<T>(req);
    }

    private async Task SendAsync(HttpMethod method, string path, bool auth = true)
    {
        if (auth) await EnsureTokenAsync();
        var req = new HttpRequestMessage(method, path);
        AddHeaders(req, auth);
        await _http.SendAsync(req);
    }

    private async Task<ApiResult<T>> SendAsync<T>(HttpMethod method, string path, bool auth = true)
    {
        if (auth) await EnsureTokenAsync();
        var req = new HttpRequestMessage(method, path);
        AddHeaders(req, auth);
        return await SendAndParse<T>(req);
    }

    private void AddHeaders(HttpRequestMessage req, bool auth)
    {
        if (auth && !string.IsNullOrEmpty(_accessToken))
            req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _accessToken);
        if (!string.IsNullOrEmpty(_tenantSlug))
            req.Headers.TryAddWithoutValidation("X-Tenant-ID", _tenantSlug);
    }

    private async Task<ApiResult<T>> SendAndParse<T>(HttpRequestMessage req)
    {
        try
        {
            var res = await _http.SendAsync(req);
            if (res.StatusCode == System.Net.HttpStatusCode.NoContent)
                return new ApiResult<T> { Success = true };
            var json = await res.Content.ReadAsStringAsync();
            var parsed = JsonSerializer.Deserialize<ApiResult<T>>(json, JsonOpts);
            return parsed ?? new ApiResult<T> { Message = "Empty response" };
        }
        catch (Exception ex)
        {
            return new ApiResult<T> { Message = ex.Message };
        }
    }

    private async Task EnsureTokenAsync()
    {
        if (_tokenExpiry > DateTime.UtcNow.AddMinutes(1) || string.IsNullOrEmpty(_refreshToken))
            return;
        try
        {
            var req = new HttpRequestMessage(HttpMethod.Post, "auth/refresh")
            {
                Content = JsonContent.Create(new { accessToken = _accessToken, refreshToken = _refreshToken }, options: JsonOpts)
            };
            var res = await _http.SendAsync(req);

            if (res.StatusCode == System.Net.HttpStatusCode.Unauthorized)
            {
                // Refresh token is invalid or the user no longer exists (e.g. DB was reset).
                // Clear stale credentials so the app forces a fresh login.
                Logout();
                return;
            }

            var json = await res.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<ApiResult<TokenResponse>>(json, JsonOpts);
            if (result?.Success == true && result.Data is not null)
            {
                _accessToken = result.Data.AccessToken;
                _refreshToken = result.Data.RefreshToken;
                _tokenExpiry = result.Data.AccessTokenExpiry;
                SaveAuthState();
            }
            else
            {
                // Server rejected the refresh for any other reason — force re-login.
                Logout();
            }
        }
        catch { /* network error – will retry on next request */ }
    }
}

// ── DTOs ──────────────────────────────────────────────────────
public class ApiResult<T>
{
    [JsonPropertyName("success")] public bool Success { get; set; }
    [JsonPropertyName("data")] public T? Data { get; set; }
    [JsonPropertyName("message")] public string? Message { get; set; }
    [JsonPropertyName("errors")] public List<string>? Errors { get; set; }
}

public class TokenResponse
{
    [JsonPropertyName("accessToken")] public string AccessToken { get; set; } = "";
    [JsonPropertyName("refreshToken")] public string RefreshToken { get; set; } = "";
    [JsonPropertyName("accessTokenExpiry")] public DateTime AccessTokenExpiry { get; set; }
}

public class UserInfo
{
    [JsonPropertyName("id")] public string Id { get; set; } = "";
    [JsonPropertyName("email")] public string Email { get; set; } = "";
    [JsonPropertyName("firstName")] public string FirstName { get; set; } = "";
    [JsonPropertyName("lastName")] public string LastName { get; set; } = "";
    [JsonPropertyName("tenantId")] public Guid TenantId { get; set; }
    [JsonPropertyName("tenantSlug")] public string TenantSlug { get; set; } = "";
    [JsonPropertyName("temperatureUnit")] public string TemperatureUnit { get; set; } = "C";
    [JsonPropertyName("roles")] public IList<string> Roles { get; set; } = [];
}

public class FarmResponse
{
    [JsonPropertyName("id")] public Guid Id { get; set; }
    [JsonPropertyName("name")] public string Name { get; set; } = "";
    [JsonPropertyName("address")] public string? Address { get; set; }
    [JsonPropertyName("isActive")] public bool IsActive { get; set; }
}

public class FieldResponse
{
    [JsonPropertyName("id")] public Guid Id { get; set; }
    [JsonPropertyName("farmId")] public Guid FarmId { get; set; }
    [JsonPropertyName("name")] public string Name { get; set; } = "";
    [JsonPropertyName("cropType")] public string? CropType { get; set; }
    [JsonPropertyName("areaHectares")] public double? AreaHectares { get; set; }
    [JsonPropertyName("isActive")] public bool IsActive { get; set; }
}

public class SessionResponse
{
    [JsonPropertyName("id")] public Guid Id { get; set; }
    [JsonPropertyName("tenantId")] public Guid TenantId { get; set; }
    [JsonPropertyName("farmId")] public Guid? FarmId { get; set; }
    [JsonPropertyName("farmName")] public string? FarmName { get; set; }
    [JsonPropertyName("fieldId")] public Guid? FieldId { get; set; }
    [JsonPropertyName("fieldName")] public string? FieldName { get; set; }
    [JsonPropertyName("scouterId")] public string? ScouterId { get; set; }
    [JsonPropertyName("startedAt")] public DateTime? StartedAt { get; set; }
    [JsonPropertyName("completedAt")] public DateTime? CompletedAt { get; set; }
    [JsonPropertyName("weatherConditions")] public string? WeatherConditions { get; set; }
    [JsonPropertyName("temperatureCelsius")] public double? TemperatureCelsius { get; set; }
    [JsonPropertyName("notes")] public string? Notes { get; set; }
    [JsonPropertyName("observationCount")] public int ObservationCount { get; set; }
    [JsonPropertyName("isPlanned")] public bool IsPlanned { get; set; }
    [JsonPropertyName("scheduledDate")] public DateTime? ScheduledDate { get; set; }
    [JsonPropertyName("observations")] public List<SessionObservationResponse>? Observations { get; set; }
    public bool IsCompleted => CompletedAt.HasValue;
}

    public class SessionObservationResponse
    {
        [JsonPropertyName("id")] public Guid Id { get; set; }
        [JsonPropertyName("sessionId")] public Guid SessionId { get; set; }
        [JsonPropertyName("pestId")] public Guid? PestId { get; set; }
        [JsonPropertyName("pestName")] public string? PestName { get; set; }
        [JsonPropertyName("isUnknownPest")] public bool IsUnknownPest { get; set; }
        [JsonPropertyName("captureMode")] public string? CaptureMode { get; set; }
        [JsonPropertyName("count")] public int? Count { get; set; }
        [JsonPropertyName("isPresent")] public bool? IsPresent { get; set; }
        [JsonPropertyName("notes")] public string? Notes { get; set; }
        [JsonPropertyName("trapId")] public Guid? TrapId { get; set; }
        [JsonPropertyName("trapName")] public string? TrapName { get; set; }
        [JsonPropertyName("capturedLat")] public double? CapturedLat { get; set; }
        [JsonPropertyName("capturedLng")] public double? CapturedLng { get; set; }
        [JsonPropertyName("lifeStage")] public string? LifeStage { get; set; }
        [JsonPropertyName("thresholdCount")] public int? ThresholdCount { get; set; }
        [JsonPropertyName("isPlanned")] public bool IsPlanned { get; set; }
        [JsonPropertyName("observationGroupId")] public Guid? ObservationGroupId { get; set; }
        [JsonPropertyName("sortOrder")] public int SortOrder { get; set; }
        [JsonPropertyName("photoUrls")] public List<string>? PhotoUrls { get; set; }
        [JsonPropertyName("createdAt")] public DateTime CreatedAt { get; set; }
        [JsonPropertyName("observedAt")] public DateTime? ObservedAt { get; set; }
        public string DisplayName => IsUnknownPest ? "Unknown pest" : (PestName ?? "\u2014");
    }

    public class SessionObservationRequest
    {
        [JsonPropertyName("observationType")] public string ObservationType { get; set; } = "AdHoc";
        [JsonPropertyName("pestId")] public Guid? PestId { get; set; }
        [JsonPropertyName("isUnknownPest")] public bool IsUnknownPest { get; set; }
        [JsonPropertyName("captureMode")] public string CaptureMode { get; set; } = "Count";
        [JsonPropertyName("count")] public int? Count { get; set; }
        [JsonPropertyName("isPresent")] public bool? IsPresent { get; set; }
        [JsonPropertyName("notes")] public string? Notes { get; set; }
        [JsonPropertyName("trapId")] public Guid? TrapId { get; set; }
        [JsonPropertyName("latitude")] public double? CapturedLat { get; set; }
        [JsonPropertyName("longitude")] public double? CapturedLng { get; set; }
        [JsonPropertyName("lifeStage")] public string? LifeStage { get; set; }
        [JsonPropertyName("isPlanned")] public bool IsPlanned { get; set; }
        [JsonPropertyName("observedAt")] public DateTime? ObservedAt { get; set; }
    }

    public class PestResponse
{
    [JsonPropertyName("id")] public Guid Id { get; set; }
    [JsonPropertyName("commonName")] public string CommonName { get; set; } = "";
    [JsonPropertyName("scientificName")] public string? ScientificName { get; set; }
    [JsonPropertyName("category")] public string Category { get; set; } = "";
    [JsonPropertyName("defaultCaptureMode")] public string DefaultCaptureMode { get; set; } = "";
    [JsonPropertyName("thresholdCount")] public int? ThresholdCount { get; set; }
    public string Emoji => Category switch { "Insect" => "🦟", "Disease" => "🦠", "Weed" => "🌿", "Rodent" => "🐀", _ => "❓" };
}

public class TrapTypeResponse
{
    [JsonPropertyName("id")] public Guid Id { get; set; }
    [JsonPropertyName("name")] public string Name { get; set; } = "";
    [JsonPropertyName("description")] public string? Description { get; set; }
    [JsonPropertyName("isSystemType")] public bool IsSystemType { get; set; }
}

public class TrapApiResponse
{
    [JsonPropertyName("id")] public Guid Id { get; set; }
    [JsonPropertyName("tenantId")] public Guid TenantId { get; set; }
    [JsonPropertyName("name")] public string Name { get; set; } = "";
    [JsonPropertyName("barcode")] public string? Barcode { get; set; }
    [JsonPropertyName("trapTypeId")] public Guid? TrapTypeId { get; set; }
    [JsonPropertyName("trapTypeName")] public string? TrapTypeName { get; set; }
    [JsonPropertyName("monitoringPointId")] public Guid? MonitoringPointId { get; set; }
    [JsonPropertyName("monitoringPointName")] public string? MonitoringPointName { get; set; }
    [JsonPropertyName("latitude")] public double? Latitude { get; set; }
    [JsonPropertyName("longitude")] public double? Longitude { get; set; }
    [JsonPropertyName("isEnabled")] public bool IsEnabled { get; set; }
    [JsonPropertyName("notes")] public string? Notes { get; set; }
    [JsonPropertyName("createdAt")] public DateTime CreatedAt { get; set; }
    [JsonPropertyName("updatedAt")] public DateTime UpdatedAt { get; set; }
}

public class CreateTrapApiRequest
{
    [JsonPropertyName("name")] public string Name { get; set; } = "";
    [JsonPropertyName("barcode")] public string? Barcode { get; set; }
    [JsonPropertyName("trapTypeId")] public Guid? TrapTypeId { get; set; }
    [JsonPropertyName("fieldId")] public Guid? FieldId { get; set; }
    [JsonPropertyName("monitoringPointId")] public Guid? MonitoringPointId { get; set; }
    [JsonPropertyName("latitude")] public double? Latitude { get; set; }
    [JsonPropertyName("longitude")] public double? Longitude { get; set; }
    [JsonPropertyName("notes")] public string? Notes { get; set; }
}

public class UpdateTrapApiRequest
{
    [JsonPropertyName("name")] public string Name { get; set; } = "";
    [JsonPropertyName("barcode")] public string? Barcode { get; set; }
    [JsonPropertyName("trapTypeId")] public Guid? TrapTypeId { get; set; }
    [JsonPropertyName("fieldId")] public Guid? FieldId { get; set; }
    [JsonPropertyName("latitude")] public double? Latitude { get; set; }
    [JsonPropertyName("longitude")] public double? Longitude { get; set; }
    [JsonPropertyName("isEnabled")] public bool IsEnabled { get; set; }
    [JsonPropertyName("notes")] public string? Notes { get; set; }
}
