using System.ComponentModel.DataAnnotations;

namespace Pestlook.WebAPI.DTOs.Auth;

public sealed record UpdatePreferencesRequest(
    [Required, RegularExpression("^[CF]$", ErrorMessage = "TemperatureUnit must be 'C' or 'F'.")]
    string TemperatureUnit,
    [Required, RegularExpression("^(km|mi)$", ErrorMessage = "DistanceUnit must be 'km' or 'mi'.")]
    string DistanceUnit,
    [RegularExpression("^(light|dark-a|dark-b|dark-cd|light-e|dark-f|chaos)$", ErrorMessage = "Theme must be one of: light, dark-a, dark-b, dark-cd, light-e, dark-f, chaos.")]
    string? Theme = null);
