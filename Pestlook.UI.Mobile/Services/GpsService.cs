namespace Pestlook.UI.Mobile.Services;

public class GpsService
{
    public double? Latitude { get; private set; }
    public double? Longitude { get; private set; }
    public double? AccuracyMetres { get; private set; }
    public bool HasFix => Latitude.HasValue && Longitude.HasValue;
    public bool IsAccuracyPoor => AccuracyMetres.HasValue && AccuracyMetres.Value > 20;

    public event Action? OnLocationChanged;

    /// <summary>Why the last fix attempt failed, or null if it succeeded. For display in the UI.</summary>
    public string? LastError { get; private set; }

    public async Task StartListeningAsync()
    {
        try
        {
            var status = await Permissions.CheckStatusAsync<Permissions.LocationWhenInUse>();
            if (status != PermissionStatus.Granted)
                status = await Permissions.RequestAsync<Permissions.LocationWhenInUse>();

            if (status != PermissionStatus.Granted)
            {
                LastError = "Location permission denied. Enable it for PestLook in your device settings.";
                return;
            }

            var location = await Geolocation.GetLocationAsync(new GeolocationRequest
            {
                DesiredAccuracy = GeolocationAccuracy.Best,
                Timeout = TimeSpan.FromSeconds(15)
            });

            if (location is not null)
            {
                Latitude = location.Latitude;
                Longitude = location.Longitude;
                AccuracyMetres = location.Accuracy;
                LastError = null;
                OnLocationChanged?.Invoke();
            }
            else
            {
                LastError = "Could not get a GPS fix. Make sure location is turned on.";
            }
        }
        catch (FeatureNotSupportedException)
        {
            LastError = "GPS is not supported on this device.";
        }
        catch (FeatureNotEnabledException)
        {
            LastError = "Location is turned off. Enable it in your device settings.";
        }
        catch (PermissionException)
        {
            LastError = "Location permission denied. Enable it for PestLook in your device settings.";
        }
        catch (Exception ex)
        {
            LastError = $"GPS error: {ex.Message}";
        }
    }

    public async Task<(double lat, double lng, double? accuracy)> GetCurrentLocationAsync()
    {
        await StartListeningAsync();
        return (Latitude ?? 0, Longitude ?? 0, AccuracyMetres);
    }

    public static double DistanceMetres(double lat1, double lng1, double lat2, double lng2)
    {
        var loc1 = new Location(lat1, lng1);
        var loc2 = new Location(lat2, lng2);
        return loc1.CalculateDistance(loc2, DistanceUnits.Kilometers) * 1000;
    }
}
