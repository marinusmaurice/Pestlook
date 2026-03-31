namespace Pestlook.UI.Mobile.Services;

public class ConnectivityService : IDisposable
{
    public bool IsOnline => Connectivity.Current.NetworkAccess == NetworkAccess.Internet;
    public bool IsWifi => Connectivity.Current.ConnectionProfiles.Contains(ConnectionProfile.WiFi);

    public event Action? OnConnectivityChanged;

    public ConnectivityService()
    {
        Connectivity.Current.ConnectivityChanged += HandleChanged;
    }

    private void HandleChanged(object? sender, ConnectivityChangedEventArgs e)
    {
        OnConnectivityChanged?.Invoke();
    }

    public void Dispose()
    {
        Connectivity.Current.ConnectivityChanged -= HandleChanged;
    }
}
