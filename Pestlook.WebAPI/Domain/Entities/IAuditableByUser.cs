namespace Pestlook.WebAPI.Domain.Entities;

public interface IAuditableByUser
{
    string? CreatedByUserId { get; set; }
    string? UpdatedByUserId { get; set; }
    string? DeletedByUserId { get; set; }
}
