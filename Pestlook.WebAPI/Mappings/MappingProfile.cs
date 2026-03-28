using AutoMapper;
using Pestlook.WebAPI.Domain.Entities;
using Pestlook.WebAPI.DTOs.Auth;

namespace Pestlook.WebAPI.Mappings;

public sealed class MappingProfile : Profile
{
    public MappingProfile()
    {
        CreateMap<ApplicationUser, UserInfoResponse>()
            .ConstructUsing((src, _) => new UserInfoResponse(
                src.Id,
                src.Email!,
                src.FirstName,
                src.LastName,
                src.TenantId,
                []));
    }
}
