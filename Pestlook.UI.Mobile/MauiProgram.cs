using Microsoft.Extensions.Logging;
using Pestlook.UI.Mobile.Data;
using Pestlook.UI.Mobile.Services;

namespace Pestlook.UI.Mobile
{
    public static class MauiProgram
    {
        public static MauiApp CreateMauiApp()
        {
            var builder = MauiApp.CreateBuilder();
            builder
                .UseMauiApp<App>()
                .ConfigureFonts(fonts =>
                {
                    fonts.AddFont("OpenSans-Regular.ttf", "OpenSansRegular");
                });

            builder.Services.AddMauiBlazorWebView();
            builder.Services.AddSingleton<ApiClient>();
            builder.Services.AddSingleton<LocalDatabase>();
            builder.Services.AddSingleton<GpsService>();
            builder.Services.AddSingleton<ConnectivityService>();
            builder.Services.AddSingleton<SyncService>();
            builder.Services.AddSingleton<ToastService>();

#if DEBUG
            builder.Services.AddBlazorWebViewDeveloperTools();
            builder.Logging.AddDebug();
#endif

            return builder.Build();
        }
    }
}
