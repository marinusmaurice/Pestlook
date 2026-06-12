using Asp.Versioning;
using AutoMapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pestlook.WebAPI.Data;
using Pestlook.WebAPI.Domain.Entities;
using Pestlook.WebAPI.DTOs.Common;
using Pestlook.WebAPI.DTOs.Farms;
using Pestlook.WebAPI.Infrastructure;
using System.Text.Json;

namespace Pestlook.WebAPI.Controllers.v1;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/farms")]
[Authorize]
public sealed class FarmsController(
    ApplicationDbContext db,
    ITenantContext tenantContext,
    IMapper mapper) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<List<FarmResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var farms = await db.Farms.OrderBy(f => f.Name).ToListAsync(ct);
        return Ok(ApiResponse<List<FarmResponse>>.Ok(mapper.Map<List<FarmResponse>>(farms)));
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<FarmResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var farm = await db.Farms.FirstOrDefaultAsync(f => f.Id == id, ct);
        if (farm is null) return NotFound(ApiResponse<object>.Fail("Farm not found."));
        return Ok(ApiResponse<FarmResponse>.Ok(mapper.Map<FarmResponse>(farm)));
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(ApiResponse<FarmResponse>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] CreateFarmRequest request, CancellationToken ct)
    {
        if (tenantContext.TenantId is null)
            return BadRequest(ApiResponse<object>.Fail("Tenant context is required."));

        var farm = new Farm
        {
            TenantId = tenantContext.TenantId.Value,
            Name = request.Name,
            Address = request.Address,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            BoundaryGeoJson = request.BoundaryGeoJson,
            AreaHectares = GeoJsonUtils.ComputeAreaHectares(request.BoundaryGeoJson),
            BoundaryColor = request.BoundaryColor
        };

        // Auto-derive centre-point from boundary when explicit lat/lng not provided
        if (farm.Latitude is null && farm.Longitude is null && request.BoundaryGeoJson is not null)
        {
            var centroid = GeoJsonUtils.ComputeCentroid(request.BoundaryGeoJson);
            if (centroid.HasValue) { farm.Longitude = centroid.Value.Lon; farm.Latitude = centroid.Value.Lat; }
        }
        db.Farms.Add(farm);
        await db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(GetById), new { id = farm.Id },
            ApiResponse<FarmResponse>.Ok(mapper.Map<FarmResponse>(farm), "Farm created."));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(ApiResponse<FarmResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateFarmRequest request, CancellationToken ct)
    {
        var farm = await db.Farms.FirstOrDefaultAsync(f => f.Id == id, ct);
        if (farm is null) return NotFound(ApiResponse<object>.Fail("Farm not found."));

        farm.Name = request.Name;
        farm.Address = request.Address;
        farm.Latitude = request.Latitude;
        farm.Longitude = request.Longitude;
        farm.BoundaryGeoJson = request.BoundaryGeoJson;
        farm.AreaHectares = GeoJsonUtils.ComputeAreaHectares(request.BoundaryGeoJson);
        farm.BoundaryColor = request.BoundaryColor;
        farm.IsActive = request.IsActive;

        // Keep centre-point in sync with boundary centroid when lat/lng cleared
        if (farm.Latitude is null && farm.Longitude is null && request.BoundaryGeoJson is not null)
        {
            var centroid = GeoJsonUtils.ComputeCentroid(request.BoundaryGeoJson);
            if (centroid.HasValue) { farm.Longitude = centroid.Value.Lon; farm.Latitude = centroid.Value.Lat; }
        }

        farm.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        return Ok(ApiResponse<FarmResponse>.Ok(mapper.Map<FarmResponse>(farm)));
    }

    /// <summary>
    /// Returns a GeoJSON FeatureCollection containing the farm boundary and all its field boundaries.
    /// Suitable for rendering directly in Leaflet / MapLibre / any GIS client.
    /// </summary>
    [HttpGet("{id:guid}/geojson")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetGeoJson(Guid id, CancellationToken ct)
    {
        var farm = await db.Farms
            .Include(f => f.Fields.Where(fi => fi.DeletedAt == null))
            .FirstOrDefaultAsync(f => f.Id == id, ct);

        if (farm is null) return NotFound(ApiResponse<object>.Fail("Farm not found."));

        var features = new List<object>();

        // Farm boundary feature
        if (!string.IsNullOrWhiteSpace(farm.BoundaryGeoJson))
        {
            try
            {
                var geom = JsonSerializer.Deserialize<JsonElement>(farm.BoundaryGeoJson);
                features.Add(new
                {
                    type       = "Feature",
                    properties = new { type = "farm", id = farm.Id, name = farm.Name },
                    geometry   = geom
                });
            }
            catch { /* ignore malformed geometry */ }
        }

        // Field boundary features
        foreach (var field in farm.Fields)
        {
            if (string.IsNullOrWhiteSpace(field.GeoBoundary)) continue;
            try
            {
                var geom = JsonSerializer.Deserialize<JsonElement>(field.GeoBoundary);
                features.Add(new
                {
                    type       = "Feature",
                    properties = new
                    {
                        type         = "field",
                        id           = field.Id,
                        name         = field.Name,
                        cropType     = field.CropType,
                        areaHectares = field.AreaHectares
                    },
                    geometry = geom
                });
            }
            catch { /* ignore malformed geometry */ }
        }

        var featureCollection = new
        {
            type     = "FeatureCollection",
            features
        };

        return Ok(featureCollection);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var farm = await db.Farms
            .Include(f => f.Fields)
            .FirstOrDefaultAsync(f => f.Id == id, ct);

        if (farm is null) return NotFound(ApiResponse<object>.Fail("Farm not found."));

        var now = DateTime.UtcNow;
        var fieldIds = farm.Fields.Select(f => f.Id).ToList();

        foreach (var field in farm.Fields)
            field.DeletedAt = now;

        farm.DeletedAt = now;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
