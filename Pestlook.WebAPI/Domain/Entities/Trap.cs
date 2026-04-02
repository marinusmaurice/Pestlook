namespace Pestlook.WebAPI.Domain.Entities;

/// <summary>A physical trap instance deployed in the field.</summary>
public sealed class Trap : IHasTenant
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }

    public string Name { get; set; } = string.Empty;

    /// <summary>Optional barcode / QR code printed on the trap.</summary>
    public string? Barcode { get; set; }

    public Guid? TrapTypeId { get; set; }
    public TrapType? TrapType { get; set; }

    public double? Latitude { get; set; }
    public double? Longitude { get; set; }

    public bool IsEnabled { get; set; } = true;
    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DeletedAt { get; set; }
}
