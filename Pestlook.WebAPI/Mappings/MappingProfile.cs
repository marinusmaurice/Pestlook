using AutoMapper;
using Pestlook.WebAPI.Domain.Entities;
using Pestlook.WebAPI.DTOs.Auth;
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

        CreateMap<Farm, FarmResponse>()
            .ConstructUsing((src, _) => new FarmResponse(src.Id, src.TenantId, src.Name, src.CreatedAt));

        CreateMap<Field, FieldResponse>()
            .ConstructUsing((src, _) => new FieldResponse(src.Id, src.FarmId, src.TenantId, src.Name, src.BoundaryGeoJson));

        CreateMap<MonitoringPoint, MonitoringPointResponse>()
            .ConstructUsing((src, _) => new MonitoringPointResponse(
                src.Id, src.TenantId, src.Name, src.Type,
                src.Latitude, src.Longitude,
                src.FarmId, src.FieldId, src.IsActive, src.CreatedAt,
                src.MonitoringPointPests.Select(mpp => mpp.PestId).ToList()));

        CreateMap<Pest, PestResponse>()
            .ConstructUsing((src, _) => new PestResponse(src.Id, src.TenantId, src.Name, src.Category, src.IsSystem));

        CreateMap<ObservationPest, ObservationPestResponse>()
            .ConstructUsing((src, _) => new ObservationPestResponse(src.Id, src.PestId, src.PestName, src.Count, src.IsPresent));

        CreateMap<Observation, ObservationResponse>()
            .ConstructUsing((src, _) => new ObservationResponse(
                src.Id, src.TenantId, src.MonitoringPointId,
                src.Latitude, src.Longitude,
                src.ObservedAt, src.CreatedByUserId,
                src.Notes, src.ImageUrl,
                src.ObservationPests.Select(op => new ObservationPestResponse(op.Id, op.PestId, op.PestName, op.Count, op.IsPresent)).ToList()));
    }
}
