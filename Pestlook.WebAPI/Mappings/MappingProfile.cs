using AutoMapper;
using System.Text.Json;
using Pestlook.WebAPI.Domain.Entities;
using Pestlook.WebAPI.DTOs.Auth;
using Pestlook.WebAPI.DTOs.BillingSnapshots;
using Pestlook.WebAPI.DTOs.Farms;
using Pestlook.WebAPI.DTOs.Fields;
using Pestlook.WebAPI.DTOs.MonitoringPoints;
using Pestlook.WebAPI.DTOs.PestObservations;
using Pestlook.WebAPI.DTOs.Pests;
using Pestlook.WebAPI.DTOs.ScoutingSessions;
using Pestlook.WebAPI.DTOs.TrapTypes;

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
                src.IsActive,
                src.TenantId,
                src.Tenant != null ? src.Tenant.Slug : string.Empty,
                []));

        CreateMap<Farm, FarmResponse>()
            .ConstructUsing(_ => new FarmResponse());

        CreateMap<Field, FieldResponse>()
            .ConstructUsing(_ => new FieldResponse());

        CreateMap<TrapType, TrapTypeResponse>()
            .ConstructUsing(_ => new TrapTypeResponse());

        CreateMap<MonitoringPoint, MonitoringPointResponse>()
            .ForMember(d => d.TrapTypeName, o => o.MapFrom(s => s.TrapType != null ? s.TrapType.Name : null))
            .ForMember(d => d.AssignedPests, o => o.MapFrom(s => s.MonitoringPointPests));

        CreateMap<MonitoringPointPest, AssignedPestSummary>()
            .ConstructUsing(_ => new AssignedPestSummary())
            .ForMember(d => d.MonitoringPointPestId, o => o.MapFrom(s => s.Id))
            .ForMember(d => d.PestName, o => o.MapFrom(s => s.Pest != null ? s.Pest.CommonName : string.Empty));

        CreateMap<Pest, PestResponse>()
            .ConstructUsing(_ => new PestResponse());

        CreateMap<ScoutingSession, ScoutingSessionResponse>()
            .ConstructUsing(_ => new ScoutingSessionResponse())
            .ForMember(d => d.ObservationCount, o => o.MapFrom(s => s.PestObservations.Count))
            .ForMember(d => d.ScouterName, o => o.MapFrom(s => s.Scouter != null ? s.Scouter.FirstName + " " + s.Scouter.LastName : null));

        CreateMap<PestObservation, PestObservationResponse>()
            .ConstructUsing(_ => new PestObservationResponse())
            .ForMember(d => d.PestName, o => o.MapFrom(s => s.Pest != null ? s.Pest.CommonName : null))
            .ForMember(d => d.PhotoUrls, o => o.MapFrom(s =>
                s.PhotoUrlsJson != null
                    ? JsonSerializer.Deserialize<List<string>>(s.PhotoUrlsJson, (JsonSerializerOptions?)null) ?? new List<string>()
                    : new List<string>()));

        CreateMap<BillingSnapshot, BillingSnapshotResponse>()
            .ConstructUsing(_ => new BillingSnapshotResponse());
    }
}
