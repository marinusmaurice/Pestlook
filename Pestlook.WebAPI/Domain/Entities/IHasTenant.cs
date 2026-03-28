namespace Pestlook.WebAPI.Domain.Entities;

public interface IHasTenant
{
    Guid TenantId { get; set; }
}
