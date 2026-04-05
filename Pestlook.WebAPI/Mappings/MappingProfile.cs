using AutoMapper;
using System.Text.Json;
using Pestlook.WebAPI.Domain.Entities;
using Pestlook.WebAPI.DTOs.Auth;
using Pestlook.WebAPI.DTOs.BillingSnapshots;
using Pestlook.WebAPI.DTOs.Farms;
using Pestlook.WebAPI.DTOs.Fields;
using Pestlook.WebAPI.DTOs.Pests;
using Pestlook.WebAPI.DTOs.ScoutingSessions;
using Pestlook.WebAPI.DTOs.Traps;
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
                src.TemperatureUnit,
                []));

        CreateMap<Farm, FarmResponse>()
            .ConstructUsing((src, _) => new FarmResponse(
                src.Id, src.TenantId, src.Name, src.Address,
                src.Latitude, src.Longitude, src.BoundaryGeoJson,
                src.IsActive, src.CreatedAt, src.UpdatedAt));

        CreateMap<Field, FieldResponse>()
            .ConstructUsing((src, _) => new FieldResponse(
                src.Id, src.FarmId, src.TenantId, src.Name, src.GeoBoundary,
                src.AreaHectares, src.CropType, src.Season, src.IsActive,
                src.CreatedAt, src.UpdatedAt));

        CreateMap<TrapType, TrapTypeResponse>()
            .ConstructUsing(_ => new TrapTypeResponse());

        CreateMap<Pest, PestResponse>()
            .ConstructUsing(_ => new PestResponse());

        CreateMap<ScoutingSession, ScoutingSessionResponse>()
            .ConstructUsing(_ => new ScoutingSessionResponse())
            .ForMember(d => d.ObservationCount, o => o.MapFrom(s => s.SessionObservations.Count))
            .ForMember(d => d.ScouterName, o => o.MapFrom(s => s.Scouter != null ? s.Scouter.FirstName + " " + s.Scouter.LastName : null))
            .ForMember(d => d.FieldName, o => o.MapFrom(s => s.Field != null ? s.Field.Name : null))
            .ForMember(d => d.FarmId, o => o.MapFrom(s => s.FarmId ?? (s.Field != null ? s.Field.FarmId : (Guid?)null)))
            .ForMember(d => d.FarmName, o => o.MapFrom(s => s.Farm != null ? s.Farm.Name : (s.Field != null && s.Field.Farm != null ? s.Field.Farm.Name : null)))
            .ForMember(d => d.Observations, o => o.MapFrom(s => s.SessionObservations))
            .ForMember(d => d.CreatedByName, o => o.MapFrom(s => s.CreatedBy != null ? s.CreatedBy.FirstName + " " + s.CreatedBy.LastName : null))
            .ForMember(d => d.UpdatedByName, o => o.MapFrom(s => s.UpdatedBy != null ? s.UpdatedBy.FirstName + " " + s.UpdatedBy.LastName : null));

        CreateMap<SessionObservation, SessionObservationResponse>()
            .ConstructUsing(_ => new SessionObservationResponse())
            .ForMember(d => d.TrapName, o => o.MapFrom(s => s.Trap != null ? s.Trap.Name : null))
            .ForMember(d => d.PestName, o => o.MapFrom(s => s.Pest != null ? s.Pest.CommonName : null))
            .ForMember(d => d.PhotoUrls, o => o.MapFrom(s =>
                s.PhotoUrlsJson != null
                    ? JsonSerializer.Deserialize<List<string>>(s.PhotoUrlsJson, (JsonSerializerOptions?)null) ?? new List<string>()
                    : new List<string>()))
            .ForMember(d => d.CreatedByName, o => o.MapFrom(s => s.CreatedBy != null ? s.CreatedBy.FirstName + " " + s.CreatedBy.LastName : null))
            .ForMember(d => d.UpdatedByName, o => o.MapFrom(s => s.UpdatedBy != null ? s.UpdatedBy.FirstName + " " + s.UpdatedBy.LastName : null));

        CreateMap<Trap, TrapResponse>()
            .ConstructUsing((src, _) => new TrapResponse(
                src.Id, src.TenantId, src.Name, src.Barcode,
                src.TrapTypeId, src.TrapType != null ? src.TrapType.Name : null,
                src.FieldId, src.Field != null ? src.Field.Name : null,
                src.Field != null ? src.Field.Farm?.Name : null,
                src.Latitude, src.Longitude, src.IsEnabled, src.Notes,
                src.CreatedAt, src.UpdatedAt));

        CreateMap<BillingSnapshot, BillingSnapshotResponse>()
            .ConstructUsing(_ => new BillingSnapshotResponse());
    }
}
