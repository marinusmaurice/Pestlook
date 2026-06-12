using System.ComponentModel.DataAnnotations;

namespace Pestlook.WebAPI.DTOs.Auth;

public sealed record UpdateTimezoneRequest(
    [Required, MaxLength(100)]
    string Timezone);
