namespace Pestlook.WebAPI.Domain.Entities;

public sealed class Farm : IHasTenant, IAuditableByUser
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;
    public string Name { get; set; } = string.Empty;
    public string? Address { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    /// <summary>GeoJSON polygon representing the farm boundary.</summary>
    public string? BoundaryGeoJson { get; set; }
    /// <summary>Geodesic area of the farm boundary in hectares.</summary>
    public double? AreaHectares { get; set; }
    /// <summary>Hex colour used to render the farm boundary on maps (e.g. "#3aad5a").</summary>
    public string? BoundaryColor { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.Now;
    public DateTime UpdatedAt { get; set; } = DateTime.Now;
    public DateTime? DeletedAt { get; set; }

    public string? CreatedByUserId { get; set; }
    public string? UpdatedByUserId { get; set; }
    public string? DeletedByUserId { get; set; }

    public ICollection<Field> Fields { get; set; } = [];
}
