using System.Text.Json;

namespace Pestlook.WebAPI.Infrastructure;

/// <summary>Utilities for working with GeoJSON geometries.</summary>
public static class GeoJsonUtils
{
    /// <summary>
    /// Parses a GeoJSON Polygon, MultiPolygon, or Feature string and returns the
    /// geodesic area in hectares. Returns <c>null</c> if the input is empty or invalid.
    /// </summary>
    public static double? ComputeAreaHectares(string? geoJson)
    {
        if (string.IsNullOrWhiteSpace(geoJson)) return null;
        try
        {
            using var doc  = JsonDocument.Parse(geoJson);
            var       root = doc.RootElement;
            var       type = root.GetProperty("type").GetString();

            return type switch
            {
                "Polygon"      => RingAreaHa(root.GetProperty("coordinates")[0]),
                "MultiPolygon" => root.GetProperty("coordinates")
                                      .EnumerateArray()
                                      .Sum(poly => RingAreaHa(poly[0]) ?? 0),
                "Feature"      => ComputeAreaHectares(root.GetProperty("geometry").GetRawText()),
                _              => null
            };
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// Computes the centroid [longitude, latitude] of a GeoJSON Polygon's outer ring.
    /// Returns <c>null</c> if parsing fails.
    /// </summary>
    public static (double Lon, double Lat)? ComputeCentroid(string? geoJson)
    {
        if (string.IsNullOrWhiteSpace(geoJson)) return null;
        try
        {
            using var doc  = JsonDocument.Parse(geoJson);
            var       root = doc.RootElement;
            var       type = root.GetProperty("type").GetString();

            var ring = type switch
            {
                "Polygon" => root.GetProperty("coordinates")[0],
                "Feature" => JsonDocument.Parse(root.GetProperty("geometry").GetRawText())
                                         .RootElement.GetProperty("coordinates")[0],
                _         => (JsonElement?)null
            };

            if (ring is null) return null;

            var pts = ring.Value.EnumerateArray()
                          .Select(p => (lon: p[0].GetDouble(), lat: p[1].GetDouble()))
                          .ToArray();
            if (pts.Length == 0) return null;
            return (pts.Average(p => p.lon), pts.Average(p => p.lat));
        }
        catch
        {
            return null;
        }
    }

    // ── private helpers ───────────────────────────────────────────────────────

    // Uses the spherical-trapezoid (Faulkner) formula which is accurate for
    // agricultural-scale polygons (error < 0.1% for fields up to ~100 km²).
    private static double? RingAreaHa(JsonElement ring)
    {
        var pts = ring.EnumerateArray()
                      .Select(p => (lon: p[0].GetDouble(), lat: p[1].GetDouble()))
                      .ToArray();

        if (pts.Length < 3) return null;

        const double EarthRadiusM = 6_371_000.0;
        const double DegToRad     = Math.PI / 180.0;

        double total = 0;
        for (int i = 0; i < pts.Length - 1; i++)
        {
            total += (pts[i + 1].lon - pts[i].lon) * DegToRad
                   * (2 + Math.Sin(pts[i].lat     * DegToRad)
                        + Math.Sin(pts[i + 1].lat * DegToRad));
        }

        double areaSqM = Math.Abs(total) * EarthRadiusM * EarthRadiusM / 2.0;
        return Math.Round(areaSqM / 10_000.0, 4); // m² → ha, 4 decimal places
    }
}
