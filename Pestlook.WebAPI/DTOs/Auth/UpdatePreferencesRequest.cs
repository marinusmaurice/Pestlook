using System.ComponentModel.DataAnnotations;

namespace Pestlook.WebAPI.DTOs.Auth;

public sealed record UpdatePreferencesRequest(
    [Required, RegularExpression("^[CF]$", ErrorMessage = "TemperatureUnit must be 'C' or 'F'.")]
    string TemperatureUnit);
