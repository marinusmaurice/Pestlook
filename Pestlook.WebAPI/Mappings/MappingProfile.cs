using AutoMapper;
using Pestlook.WebAPI.Domain.Entities;
using Pestlook.WebAPI.DTOs.Auth;

namespace Pestlook.WebAPI.Mappings;

public sealed class MappingProfile : Profile
{
    public MappingProfile()
    {
        CreateMap<ApplicationUser, UserInfoResponse>()
            .ForMember(dest => dest.Roles, opt => opt.Ignore());
    }
}
