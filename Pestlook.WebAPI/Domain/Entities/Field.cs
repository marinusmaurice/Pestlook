namespace Pestlook.WebAPI.Domain.Entities;

public sealed class Field : IHasTenant, IAuditableByUser
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid FarmId { get; set; }
    public Farm Farm { get; set; } = null!;
    public Guid TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? GeoBoundary { get; set; }
    public double? AreaHectares { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? CropType { get; set; }
    public string? Season { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.Now;
    public DateTime UpdatedAt { get; set; } = DateTime.Now;
    public DateTime? DeletedAt { get; set; }

    public string? CreatedByUserId { get; set; }
    public string? UpdatedByUserId { get; set; }
    public string? DeletedByUserId { get; set; }
}
