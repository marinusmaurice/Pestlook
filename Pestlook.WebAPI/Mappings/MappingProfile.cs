using AutoMapper;
using System.Text.Json;
using Pestlook.WebAPI.Domain.Entities;
using Pestlook.WebAPI.DTOs.Auth;
using Pestlook.WebAPI.DTOs.BillingSnapshots;
using Pestlook.WebAPI.DTOs.Farms;
using Pestlook.WebAPI.DTOs.Fields;
using Pestlook.WebAPI.DTOs.MonitoringPoints;
using Pestlook.WebAPI.DTOs.Observations;
using Pestlook.WebAPI.DTOs.Pests;

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

        CreateMap<Farm, FarmResponse>();

        CreateMap<Field, FieldResponse>();

        CreateMap<MonitoringPoint, MonitoringPointResponse>()
            .ForMember(d => d.AssignedPests, o => o.MapFrom(s => s.MonitoringPointPests));

        CreateMap<MonitoringPointPest, AssignedPestResponse>()
            .ForMember(d => d.MonitoringPointPestId, o => o.MapFrom(s => s.Id))
            .ForMember(d => d.PestName, o => o.MapFrom(s => s.Pest != null ? s.Pest.Name : string.Empty));

        CreateMap<Pest, PestResponse>();

        CreateMap<Observation, ObservationResponse>()
            .ForMember(d => d.PestName, o => o.MapFrom(s => s.Pest != null ? s.Pest.Name : null))
            .ForMember(d => d.PhotoUrls, o => o.MapFrom(s =>
                s.PhotoUrlsJson != null
                    ? JsonSerializer.Deserialize<List<string>>(s.PhotoUrlsJson, (JsonSerializerOptions?)null) ?? new List<string>()
                    : new List<string>()));

        CreateMap<BillingSnapshot, BillingSnapshotResponse>();
    }
}
