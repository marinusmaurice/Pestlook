using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;

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
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    // WebAPI URLs from launchSettings.json: https://localhost:7290 | http://localhost:5210
    // IMPORTANT: trailing slash is required for HttpClient relative URI resolution
    public const string BaseUrl = "https://localhost:7290/api/v1/";

    public ApiClient()
    {
#if ANDROID
        // Android emulator maps 10.0.2.2 to the host machine's localhost
        const string AndroidBaseUrl = "https://10.0.2.2:7290/api/v1/";
        var handler = new HttpClientHandler
        {
            ServerCertificateCustomValidationCallback = (_, _, _, _) => true
        };
        _http = new HttpClient(handler) { BaseAddress = new Uri(AndroidBaseUrl) };
#else
        var handler = new HttpClientHandler
        {
            ServerCertificateCustomValidationCallback = (_, _, _, _) => true
        };
        _http = new HttpClient(handler) { BaseAddress = new Uri(BaseUrl) };
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
        }
        return res;
    }

    public void Logout()
    {
        _accessToken = null;
        _refreshToken = null;
        _user = null;
        _tenantSlug = null;
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

    public Task<ApiResult<SessionResponse>> StartSessionAsync(string? weather = null, string? notes = null)
        => PostAsync<SessionResponse>("scouting-sessions", new { weatherConditions = weather, notes });

    public Task<ApiResult<SessionResponse>> GetSessionAsync(Guid id)
        => GetAsync<SessionResponse>($"scouting-sessions/{id}");

    public Task<ApiResult<SessionResponse>> CompleteSessionAsync(Guid id)
        => PatchAsync<SessionResponse>($"scouting-sessions/{id}/complete", new { });

    // ── Monitoring Points ─────────────────────────────────────
    public Task<ApiResult<List<MonitoringPointResponse>>> GetMonitoringPointsAsync(Guid? farmId = null)
    {
        var q = farmId.HasValue ? $"?farmId={farmId}" : "";
        return GetAsync<List<MonitoringPointResponse>>($"monitoring-points{q}");
    }

    public Task<ApiResult<MonitoringPointResponse>> GetMonitoringPointAsync(Guid id)
        => GetAsync<MonitoringPointResponse>($"monitoring-points/{id}");

    public Task<ApiResult<MonitoringPointResponse>> CreateMonitoringPointAsync(CreatePointRequest req)
        => PostAsync<MonitoringPointResponse>("monitoring-points", req);

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

    public Task<ApiResult<TrapApiResponse>> ToggleTrapAsync(Guid id)
        => PatchAsync<TrapApiResponse>($"traps/{id}/toggle", new { });

    // ── Pests ─────────────────────────────────────────────────
    public Task<ApiResult<List<PestResponse>>> GetPestsAsync()
        => GetAsync<List<PestResponse>>("pests");

    // ── Observations ──────────────────────────────────────────
    public Task<ApiResult<List<ObservationResponse>>> GetObservationsAsync(Guid? sessionId = null, Guid? pointId = null)
    {
        var parts = new List<string>();
        if (sessionId.HasValue) parts.Add($"sessionId={sessionId}");
        if (pointId.HasValue) parts.Add($"monitoringPointId={pointId}");
        var q = parts.Count > 0 ? "?" + string.Join("&", parts) : "";
        return GetAsync<List<ObservationResponse>>($"pest-observations{q}");
    }

    public Task<ApiResult<ObservationResponse>> GetObservationAsync(Guid id)
        => GetAsync<ObservationResponse>($"pest-observations/{id}");

    public Task<ApiResult<ObservationResponse>> CreateObservationAsync(CreateObservationRequest req)
        => PostAsync<ObservationResponse>("pest-observations", req);

    public async Task DeleteObservationAsync(Guid id)
        => await SendAsync(HttpMethod.Delete, $"pest-observations/{id}");

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
            var json = await res.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<ApiResult<TokenResponse>>(json, JsonOpts);
            if (result?.Success == true && result.Data is not null)
            {
                _accessToken = result.Data.AccessToken;
                _refreshToken = result.Data.RefreshToken;
                _tokenExpiry = result.Data.AccessTokenExpiry;
            }
        }
        catch { /* will re-login */ }
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
    [JsonPropertyName("tenantSlug")] public string TenantSlug { get; set; } = "";
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
    [JsonPropertyName("startedAt")] public DateTime StartedAt { get; set; }
    [JsonPropertyName("completedAt")] public DateTime? CompletedAt { get; set; }
    [JsonPropertyName("weatherConditions")] public string? WeatherConditions { get; set; }
    [JsonPropertyName("notes")] public string? Notes { get; set; }
    [JsonPropertyName("observationCount")] public int ObservationCount { get; set; }
    public bool IsCompleted => CompletedAt.HasValue;
}

public class MonitoringPointResponse
{
    [JsonPropertyName("id")] public Guid Id { get; set; }
    [JsonPropertyName("farmId")] public Guid FarmId { get; set; }
    [JsonPropertyName("pointType")] public int PointType { get; set; }
    [JsonPropertyName("name")] public string? Name { get; set; }
    [JsonPropertyName("latitude")] public double Latitude { get; set; }
    [JsonPropertyName("longitude")] public double Longitude { get; set; }
    [JsonPropertyName("trapTypeName")] public string? TrapTypeName { get; set; }
    [JsonPropertyName("isActive")] public bool IsActive { get; set; }
    [JsonPropertyName("notes")] public string? Notes { get; set; }
    [JsonPropertyName("assignedPests")] public List<AssignedPestSummary>? AssignedPests { get; set; }
    public string TypeIcon => PointType switch { 0 => "🪤", 1 => "👁", _ => "👁" };
    public string TypeLabel => PointType switch { 0 => "Fixed Trap", 1 => "Fixed Scouting", _ => "Scouting Visit" };
}

public class AssignedPestSummary
{
    [JsonPropertyName("pestId")] public Guid PestId { get; set; }
    [JsonPropertyName("pestName")] public string PestName { get; set; } = "";
    [JsonPropertyName("isActive")] public bool IsActive { get; set; }
}

public class PestResponse
{
    [JsonPropertyName("id")] public Guid Id { get; set; }
    [JsonPropertyName("commonName")] public string CommonName { get; set; } = "";
    [JsonPropertyName("scientificName")] public string? ScientificName { get; set; }
    [JsonPropertyName("category")] public int Category { get; set; }
    [JsonPropertyName("defaultCaptureMode")] public int DefaultCaptureMode { get; set; }
    [JsonPropertyName("thresholdCount")] public int? ThresholdCount { get; set; }
    public string Emoji => Category switch { 0 => "🦟", 1 => "🦠", 2 => "🌿", 3 => "🐀", _ => "❓" };
}

public class ObservationResponse
{
    [JsonPropertyName("id")] public Guid Id { get; set; }
    [JsonPropertyName("sessionId")] public Guid SessionId { get; set; }
    [JsonPropertyName("monitoringPointId")] public Guid MonitoringPointId { get; set; }
    [JsonPropertyName("pestId")] public Guid? PestId { get; set; }
    [JsonPropertyName("pestName")] public string? PestName { get; set; }
    [JsonPropertyName("isUnknownPest")] public bool IsUnknownPest { get; set; }
    [JsonPropertyName("unknownPestDescription")] public string? UnknownPestDescription { get; set; }
    [JsonPropertyName("captureMode")] public int CaptureMode { get; set; }
    [JsonPropertyName("count")] public int? Count { get; set; }
    [JsonPropertyName("present")] public bool? Present { get; set; }
    [JsonPropertyName("notes")] public string? Notes { get; set; }
    [JsonPropertyName("capturedLat")] public double? CapturedLat { get; set; }
    [JsonPropertyName("capturedLng")] public double? CapturedLng { get; set; }
    [JsonPropertyName("lifeStage")] public string? LifeStage { get; set; }
    [JsonPropertyName("photoUrls")] public List<string>? PhotoUrls { get; set; }
    [JsonPropertyName("observedAt")] public DateTime ObservedAt { get; set; }
    public string DisplayName => IsUnknownPest ? "Unknown pest" : (PestName ?? "—");
}

public class TrapTypeResponse
{
    [JsonPropertyName("id")] public Guid Id { get; set; }
    [JsonPropertyName("name")] public string Name { get; set; } = "";
    [JsonPropertyName("description")] public string? Description { get; set; }
}

public class CreatePointRequest
{
    [JsonPropertyName("farmId")] public Guid FarmId { get; set; }
    [JsonPropertyName("fieldId")] public Guid? FieldId { get; set; }
    [JsonPropertyName("pointType")] public int PointType { get; set; }
    [JsonPropertyName("name")] public string? Name { get; set; }
    [JsonPropertyName("latitude")] public double Latitude { get; set; }
    [JsonPropertyName("longitude")] public double Longitude { get; set; }
    [JsonPropertyName("trapTypeId")] public Guid? TrapTypeId { get; set; }
    [JsonPropertyName("notes")] public string? Notes { get; set; }
}

public class CreateObservationRequest
{
    [JsonPropertyName("sessionId")] public Guid SessionId { get; set; }
    [JsonPropertyName("monitoringPointId")] public Guid MonitoringPointId { get; set; }
    [JsonPropertyName("pestId")] public Guid? PestId { get; set; }
    [JsonPropertyName("isUnknownPest")] public bool IsUnknownPest { get; set; }
    [JsonPropertyName("unknownPestDescription")] public string? UnknownPestDescription { get; set; }
    [JsonPropertyName("captureMode")] public int CaptureMode { get; set; }
    [JsonPropertyName("count")] public int? Count { get; set; }
    [JsonPropertyName("present")] public bool? Present { get; set; }
    [JsonPropertyName("capturedLat")] public double? CapturedLat { get; set; }
    [JsonPropertyName("capturedLng")] public double? CapturedLng { get; set; }
    [JsonPropertyName("notes")] public string? Notes { get; set; }
    [JsonPropertyName("observedAt")] public DateTime? ObservedAt { get; set; }
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
    [JsonPropertyName("monitoringPointId")] public Guid? MonitoringPointId { get; set; }
    [JsonPropertyName("latitude")] public double? Latitude { get; set; }
    [JsonPropertyName("longitude")] public double? Longitude { get; set; }
    [JsonPropertyName("notes")] public string? Notes { get; set; }
}
