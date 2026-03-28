namespace Pestlook.WebAPI.Domain.Entities;

public sealed class Tenant
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<ApplicationUser> Users { get; set; } = [];
    public ICollection<Farm> Farms { get; set; } = [];
    public ICollection<BillingSnapshot> BillingSnapshots { get; set; } = [];
}
