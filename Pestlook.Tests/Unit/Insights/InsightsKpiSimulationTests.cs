using System;
using System.Collections.Generic;
using System.Linq;
using FluentAssertions;
using Xunit;

namespace Pestlook.Tests.Unit.Insights;

public sealed class InsightsKpiSimulationTests
{
    private const int ObservationDays = 14;
    private static readonly double[] TemperatureOffsets = [0, 1, -1, 2, -2, 4, -4, 0, 3, -3, 5, -5, 2, -2];

    private static readonly FieldDefinition Field1A = new(
        "De Doorns Estate",
        "North Vineyard Block",
        "Grape",
        18,
        [
            new GeoPoint(-33.4800, 19.6210),
            new GeoPoint(-33.4800, 19.6260),
            new GeoPoint(-33.4842, 19.6260),
            new GeoPoint(-33.4842, 19.6210),
            new GeoPoint(-33.4800, 19.6210)
        ]);

    private static readonly FieldDefinition Field1B = new(
        "De Doorns Estate",
        "South Wheat Block",
        "Wheat",
        22,
        [
            new GeoPoint(-33.4856, 19.6180),
            new GeoPoint(-33.4856, 19.6230),
            new GeoPoint(-33.4890, 19.6230),
            new GeoPoint(-33.4890, 19.6180),
            new GeoPoint(-33.4856, 19.6180)
        ]);

    private static readonly FieldDefinition Field2A = new(
        "Boland Plaas",
        "Cabernet Block",
        "Grape",
        15,
        [
            new GeoPoint(-33.7210, 18.9560),
            new GeoPoint(-33.7210, 18.9610),
            new GeoPoint(-33.7255, 18.9610),
            new GeoPoint(-33.7255, 18.9560),
            new GeoPoint(-33.7210, 18.9560)
        ]);

    private static readonly FieldDefinition Field2B = new(
        "Boland Plaas",
        "Canola Block",
        "Canola",
        20,
        [
            new GeoPoint(-33.7265, 18.9520),
            new GeoPoint(-33.7265, 18.9575),
            new GeoPoint(-33.7305, 18.9575),
            new GeoPoint(-33.7305, 18.9520),
            new GeoPoint(-33.7265, 18.9520)
        ]);

    private static readonly SpeciesDefinition Bollworm = new(
        "Helicoverpa armigera",
        8,
        20,
        15,
        30,
        315,
        28,
        0.30,
        500,
        SpreadPattern.EllipticalRows);

    private static readonly SpeciesDefinition FalseCodlingMoth = new(
        "Thaumatotibia leucotreta",
        3,
        10,
        30,
        50,
        270,
        26,
        0.25,
        200,
        SpreadPattern.EdgeBiased);

    private static readonly SpeciesDefinition RussianWheatAphid = new(
        "Diuraphis noxia",
        50,
        200,
        5,
        15,
        180,
        22,
        0.45,
        2000,
        SpreadPattern.RadialBell);

    private static readonly SpeciesDefinition Whitefly = new(
        "Bemisia tabaci",
        30,
        100,
        8,
        20,
        225,
        32,
        0.35,
        1500,
        SpreadPattern.Radial);

    private static readonly ScenarioDefinition[] Scenarios =
    [
        new ScenarioDefinition(
            "Scenario A",
            Bollworm,
            Field1A,
            new GeoPoint(-33.4821, 19.6234),
            0,
            12,
            315,
            28,
            ObservationDays,
            20),
        new ScenarioDefinition(
            "Scenario B",
            RussianWheatAphid,
            Field1B,
            new GeoPoint(-33.4870, 19.6205),
            0,
            8,
            180,
            22,
            ObservationDays,
            200),
        new ScenarioDefinition(
            "Scenario C",
            FalseCodlingMoth,
            Field2A,
            new GeoPoint(-33.7230, 18.9582),
            0,
            18,
            270,
            26,
            ObservationDays,
            10),
        new ScenarioDefinition(
            "Scenario D",
            Whitefly,
            Field2B,
            new GeoPoint(-33.7285, 18.9548),
            0,
            10,
            225,
            30,
            ObservationDays,
            100)
    ];

    private static readonly IReadOnlyDictionary<string, ScenarioSimulation> BaselineSimulation = BuildSimulationSet();
    private static readonly ScenarioSimulation TreatedScenarioA = BuildTreatedScenario();

    [Fact]
    public void InfestationHotspot()
    {
        foreach (var simulation in BaselineSimulation.Values)
        {
            foreach (var day in simulation.Days)
            {
                var computedHotspot = CalculateHotspot(day.Observations);
                HaversineMeters(computedHotspot, day.Hotspot).Should().BeLessThan(8);
            }
        }
    }

    [Fact]
    public void SpreadVelocity()
    {
        foreach (var simulation in BaselineSimulation.Values)
        {
            var distances = simulation.Days
                .Select(day => HaversineMeters(simulation.Scenario.Epicentre, day.Centroid))
                .ToList();

            for (var i = 1; i < distances.Count; i++)
            {
                var delta = distances[i] - distances[i - 1];
                delta.Should().BeInRange(simulation.Scenario.Species.MinMoveMetersPerDay - 5, simulation.Scenario.Species.MaxMoveMetersPerDay + 5);
            }
        }
    }

    [Fact]
    public void SpreadDirection()
    {
        foreach (var simulation in BaselineSimulation.Values)
        {
            var daySeven = simulation.Days[7];
            var bearing = BearingDegrees(simulation.Scenario.Epicentre, daySeven.Centroid);
            AngleDifferenceDegrees(bearing, simulation.Scenario.WindBearingDeg).Should().BeLessThanOrEqualTo(45);
        }
    }

    [Fact]
    public void PopulationGrowthRate()
    {
        foreach (var simulation in BaselineSimulation.Values)
        {
            var actual = simulation.Days.Select(day => day.ModeledPopulation).ToList();
            var predicted = Enumerable.Range(0, simulation.Scenario.ObservedDays)
                .Select(day => LogisticPopulation(simulation.Scenario.Species.K, simulation.Scenario.InitialPopulation, simulation.Scenario.Species.GrowthRate, day))
                .ToList();

            CalculateRSquared(actual, predicted).Should().BeGreaterThanOrEqualTo(0.85);
        }
    }

    [Fact]
    public void PeakInfestationDay()
    {
        foreach (var simulation in BaselineSimulation.Values)
        {
            var populations = simulation.Days.Select(day => day.ModeledPopulation).ToList();
            var peakDay = populations.IndexOf(populations.Max());
            var earlySlope = populations[3] - populations[0];
            var lateSlope = populations[^1] - populations[^4];
            var lastRatioToK = populations[^1] / simulation.Scenario.Species.K;

            peakDay.Should().BeGreaterThanOrEqualTo(10);
            lastRatioToK.Should().BeGreaterThan(0.55);
            lateSlope.Should().BeLessThan(earlySlope);
        }
    }

    [Fact]
    public void FieldInfestationCoverage()
    {
        foreach (var simulation in BaselineSimulation.Values)
        {
            var coverage = simulation.Days
                .Select(day => CalculateFieldCoveragePercentage(simulation.Scenario.Field, day.Observations, 30))
                .ToList();

            coverage.Should().BeInAscendingOrder();
            coverage.Should().OnlyContain(value => value >= 0 && value <= 100);
        }
    }

    [Fact]
    public void CrossFieldSpreadRisk()
    {
        var adjacentSentinelStrip = new FieldDefinition(
            "De Doorns Estate",
            "Adjacent Sentinel Strip",
            "Grape",
            6,
            [
                new GeoPoint(-33.48438, 19.6210),
                new GeoPoint(-33.48438, 19.6260),
                new GeoPoint(-33.4880, 19.6260),
                new GeoPoint(-33.4880, 19.6210),
                new GeoPoint(-33.48438, 19.6210)
            ]);

        var minDistance = MinimumVertexDistanceMeters(Field1A.Polygon, adjacentSentinelStrip.Polygon);
        var riskScore = CalculateCrossFieldSpreadRisk(BaselineSimulation["Scenario A"].Days[^1].ObservedPopulation, Bollworm.K, minDistance);

        minDistance.Should().BeLessThan(50);
        riskScore.Should().BeGreaterThan(0);
    }

    [Fact]
    public void EpicentreDecayGradient()
    {
        var aphidDay = BaselineSimulation["Scenario B"].Days[4];
        var distances = aphidDay.Observations.Select(obs => HaversineMeters(BaselineSimulation["Scenario B"].Scenario.Epicentre, obs.Point)).ToList();
        var expected = distances.Select(distance => Math.Exp(-(distance * distance) / (2 * 30 * 30))).ToList();
        var actual = aphidDay.Observations.Select(obs => (double)obs.Count).ToList();

        CalculatePearsonCorrelation(actual, expected).Should().BeGreaterThanOrEqualTo(0.80);
    }

    [Fact]
    public void ClusterIntegrity()
    {
        foreach (var simulation in BaselineSimulation.Values)
        {
            foreach (var day in simulation.Days)
            {
                var maxDistance = 0.0;
                for (var i = 0; i < day.Observations.Count; i++)
                {
                    for (var j = i + 1; j < day.Observations.Count; j++)
                    {
                        maxDistance = Math.Max(maxDistance, HaversineMeters(day.Observations[i].Point, day.Observations[j].Point));
                    }
                }

                maxDistance.Should().BeLessThan(200);
            }
        }
    }

    [Fact]
    public void BoundaryContainment()
    {
        foreach (var simulation in BaselineSimulation.Values)
        {
            foreach (var observation in simulation.Days.SelectMany(day => day.Observations))
            {
                IsPointInPolygon(observation.Point, simulation.Scenario.Field.Polygon).Should().BeTrue();
            }
        }
    }

    [Fact]
    public void TemperatureActivityCorrelation()
    {
        foreach (var simulation in BaselineSimulation.Values)
        {
            var withinThreeDegrees = simulation.Days
                .Where(day => Math.Abs(day.TemperatureC - simulation.Scenario.Species.TempPeakC) <= 3)
                .Select(day => day.ObservedPopulation / day.ModeledPopulation)
                .Average();

            var outsideThreeDegrees = simulation.Days
                .Where(day => Math.Abs(day.TemperatureC - simulation.Scenario.Species.TempPeakC) > 3)
                .Select(day => day.ObservedPopulation / day.ModeledPopulation)
                .Average();

            withinThreeDegrees.Should().BeGreaterThan(outsideThreeDegrees);
        }
    }

    [Fact]
    public void WindBearingInfluence()
    {
        foreach (var simulation in BaselineSimulation.Values)
        {
            var axisBearing = CalculatePrimaryAxisBearing(simulation.Days[^1].Observations);
            AngleDifferenceDegrees(axisBearing, simulation.Scenario.WindBearingDeg).Should().BeLessThanOrEqualTo(45);
        }
    }

    [Fact]
    public void EarlyWarningThreshold()
    {
        foreach (var simulation in BaselineSimulation.Values)
        {
            var threshold = simulation.Scenario.Species.K * 0.10;
            var alertDay = GetFirstThresholdCrossingDay(simulation, threshold);

            alertDay.Should().NotBeNull();
            simulation.Days[alertDay!.Value].ModeledPopulation.Should().BeGreaterThanOrEqualTo(threshold);
        }
    }

    [Fact]
    public void InterventionEffectiveness()
    {
        var preTreatmentGrowth = AverageDailyGrowth(TreatedScenarioA, 4, 6);
        var postTreatmentGrowth = AverageDailyGrowth(TreatedScenarioA, 8, 10);

        postTreatmentGrowth.Should().BeLessThan(preTreatmentGrowth * 0.75);
        TreatedScenarioA.Days[7].ObservedPopulation.Should().BeLessThan(TreatedScenarioA.Days[6].ObservedPopulation * 0.5);
    }

    [Fact]
    public void SeasonalPressureIndex()
    {
        foreach (var simulation in BaselineSimulation.Values)
        {
            var expected = simulation.Days.Sum(day => day.ObservedPopulation);
            CalculateSeasonalPressureIndex(simulation).Should().BeApproximately(expected, 0.001);
        }
    }

    [Fact]
    public void ScoutingCoverageGap()
    {
        var scoutingLog = new Dictionary<string, IReadOnlyCollection<int>>
        {
            [Field1A.FieldName] = Enumerable.Range(0, ObservationDays).ToArray(),
            [Field1B.FieldName] = new[] { 0, 1, 2, 6, 7, 8, 12, 13 },
            [Field2A.FieldName] = new[] { 0, 2, 4, 6, 8, 10, 12 },
            [Field2B.FieldName] = new[] { 0, 1, 5, 9, 13 }
        };

        DetectCoverageGap(scoutingLog[Field1A.FieldName], ObservationDays, 3).Should().BeFalse();
        DetectCoverageGap(scoutingLog[Field1B.FieldName], ObservationDays, 3).Should().BeTrue();
        DetectCoverageGap(scoutingLog[Field2B.FieldName], ObservationDays, 3).Should().BeTrue();
    }

    [Fact]
    public void MultiSpeciesCoexistence()
    {
        var whiteflyInField1A = new ScenarioDefinition(
            "Scenario E",
            Whitefly,
            Field1A,
            new GeoPoint(-33.4828, 19.6242),
            0,
            10,
            225,
            30,
            ObservationDays,
            100);

        var bollworm = BaselineSimulation["Scenario A"];
        var whitefly = SimulateScenario(whiteflyInField1A, 142);

        var bollwormBearing = BearingDegrees(bollworm.Days[0].Centroid, bollworm.Days[^1].Centroid);
        var whiteflyBearing = BearingDegrees(whitefly.Days[0].Centroid, whitefly.Days[^1].Centroid);

        AngleDifferenceDegrees(bollwormBearing, bollworm.Scenario.WindBearingDeg).Should().BeLessThanOrEqualTo(45);
        AngleDifferenceDegrees(whiteflyBearing, whitefly.Scenario.WindBearingDeg).Should().BeLessThanOrEqualTo(45);
        AngleDifferenceDegrees(bollwormBearing, whiteflyBearing).Should().BeGreaterThan(30);
    }

    [Fact]
    public void ObservationFrequencyScore()
    {
        var dailyScore = CalculateObservationFrequencyScore(Enumerable.Range(0, ObservationDays).ToArray(), ObservationDays);
        var everyThreeDaysScore = CalculateObservationFrequencyScore(new[] { 0, 3, 6, 9, 12 }, ObservationDays);

        dailyScore.Should().BeGreaterThan(everyThreeDaysScore);
        dailyScore.Should().Be(100);
    }

    [Fact]
    public void SpeciesRiskRanking()
    {
        var ranking = BaselineSimulation.Values
            .Select(simulation => new
            {
                simulation.Scenario.Species.Name,
                Risk = simulation.Days[^1].ModeledPopulation / simulation.Scenario.Species.K
            })
            .OrderByDescending(item => item.Risk)
            .Select(item => item.Name)
            .ToList();

        ranking.Should().Equal(
            "Diuraphis noxia",
            "Bemisia tabaci",
            "Helicoverpa armigera",
            "Thaumatotibia leucotreta");
    }

    [Fact]
    public void ReinfestationDetection()
    {
        DetectReinfestation(TreatedScenarioA, 10).Should().BeTrue();
        TreatedScenarioA.Days[10].ObservedPopulation.Should().BeGreaterThan(TreatedScenarioA.Days[9].ObservedPopulation);
        TreatedScenarioA.Days[11].ObservedPopulation.Should().BeGreaterThan(TreatedScenarioA.Days[10].ObservedPopulation);
    }

    private static IReadOnlyDictionary<string, ScenarioSimulation> BuildSimulationSet()
    {
        var result = new Dictionary<string, ScenarioSimulation>();
        for (var i = 0; i < Scenarios.Length; i++)
        {
            var simulation = SimulateScenario(Scenarios[i], 42 + (i * 100));
            result[simulation.Scenario.Name] = simulation;
        }

        return result;
    }

    private static ScenarioSimulation BuildTreatedScenario()
    {
        return SimulateScenario(Scenarios[0], 942, applyTreatment: true, enableReinfestation: true);
    }

    private static ScenarioSimulation SimulateScenario(ScenarioDefinition scenario, int seed, bool applyTreatment = false, bool enableReinfestation = false)
    {
        var random = new Random(seed);
        var days = new List<DailySnapshot>();
        var dailyMoveMeters = (scenario.Species.MinMoveMetersPerDay + scenario.Species.MaxMoveMetersPerDay) / 2.0;

        for (var day = 0; day < scenario.ObservedDays; day++)
        {
            var modeledPopulation = LogisticPopulation(
                scenario.Species.K,
                scenario.InitialPopulation,
                scenario.Species.GrowthRate,
                day);

            var temperature = scenario.BaseTempC + TemperatureOffsets[day % TemperatureOffsets.Length];
            var activityFactor = Math.Abs(temperature - scenario.Species.TempPeakC) <= 3 ? 1.08 : 0.90;
            var observedPopulation = modeledPopulation * activityFactor;

            if (applyTreatment && day >= 7)
            {
                var treatedBase = LogisticPopulation(
                    scenario.Species.K,
                    scenario.InitialPopulation,
                    scenario.Species.GrowthRate,
                    7) * 0.40;

                observedPopulation = day == 7
                    ? treatedBase
                    : LogisticPopulation(scenario.Species.K, treatedBase, scenario.Species.GrowthRate * 0.12, day - 7);

                if (enableReinfestation && day >= 10)
                {
                    observedPopulation *= 1 + ((day - 9) * 0.18);
                }
            }

            var driftDistance = dailyMoveMeters * day;
            var driftCenter = OffsetPointByBearing(scenario.Epicentre, driftDistance, scenario.WindBearingDeg);
            var observations = BuildObservationsForDay(scenario, random, day, driftCenter, observedPopulation);
            var hotspot = CalculateHotspot(observations);
            var centroid = CalculateWeightedCentroid(observations);

            days.Add(new DailySnapshot(day, temperature, modeledPopulation, observations.Sum(o => o.Count), hotspot, centroid, observations));
        }

        return new ScenarioSimulation(scenario, days);
    }

    private static IReadOnlyList<ObservationPoint> BuildObservationsForDay(
        ScenarioDefinition scenario,
        Random random,
        int day,
        GeoPoint driftCenter,
        double observedPopulation)
    {
        const int pointCount = 12;
        var positions = new List<GeoPoint>(pointCount);
        var majorAxis = 12 + (day * ((scenario.Species.MinMoveMetersPerDay + scenario.Species.MaxMoveMetersPerDay) / 4.0));
        var minorAxis = scenario.Species.Pattern switch
        {
            SpreadPattern.EllipticalRows => majorAxis * 0.35,
            SpreadPattern.EdgeBiased => majorAxis * 0.30,
            SpreadPattern.RadialBell => majorAxis * 0.55,
            _ => majorAxis * 0.60
        };

        positions.Add(EnsureInsideField(ApplyNoise(driftCenter, random, 1), scenario.Field));

        for (var i = 1; i < pointCount; i++)
        {
            var angle = (2 * Math.PI * i / (pointCount - 1)) + ((random.NextDouble() - 0.5) * 0.35);
            var majorOffset = Math.Cos(angle) * majorAxis * (0.60 + (random.NextDouble() * 0.25));
            var minorOffset = Math.Sin(angle) * minorAxis * (0.60 + (random.NextDouble() * 0.25));
            var local = RotateMeters(majorOffset, minorOffset, scenario.WindBearingDeg);
            var point = OffsetPointByMeters(driftCenter, local.NorthMeters, local.EastMeters);

            if (scenario.Species.Pattern == SpreadPattern.EdgeBiased)
            {
                var westLon = scenario.Field.Polygon.Min(p => p.Lon) + LongitudeDegreesFromMeters(18, point.Lat);
                point = new GeoPoint(point.Lat, Math.Min(point.Lon, westLon));
            }

            if (scenario.Species.Pattern == SpreadPattern.RadialBell)
            {
                point = OffsetPointByMeters(driftCenter, local.NorthMeters * 0.65, local.EastMeters * 0.65);
            }

            positions.Add(EnsureInsideField(ApplyNoise(point, random, 3), scenario.Field));
        }

        var sigma = Math.Max(18, majorAxis * 0.75);
        var weights = positions
            .Select((point, index) =>
            {
                var distance = HaversineMeters(scenario.Epicentre, point);
                var gaussian = Math.Exp(-(distance * distance) / (2 * sigma * sigma));
                return index == 0 ? gaussian * 1.35 : gaussian;
            })
            .ToList();

        var integerCounts = AllocateCounts(observedPopulation, weights);
        return positions.Select((point, index) => new ObservationPoint(point, integerCounts[index])).ToList();
    }

    private static List<int> AllocateCounts(double totalPopulation, IReadOnlyList<double> weights)
    {
        var total = Math.Max(1, (int)Math.Round(totalPopulation));
        var weightSum = weights.Sum();
        var counts = weights
            .Select(weight => Math.Max(1, (int)Math.Round(total * (weight / weightSum))))
            .ToList();

        var diff = total - counts.Sum();
        counts[0] += diff;

        if (counts[0] < 1)
        {
            var deficit = 1 - counts[0];
            counts[0] = 1;
            for (var i = counts.Count - 1; i > 0 && deficit > 0; i--)
            {
                var take = Math.Min(deficit, Math.Max(0, counts[i] - 1));
                counts[i] -= take;
                deficit -= take;
            }
        }

        return counts;
    }

    private static GeoPoint CalculateHotspot(IReadOnlyList<ObservationPoint> observations)
    {
        return observations
            .OrderByDescending(observation => observations.Sum(other => other.Count / (1 + HaversineMeters(observation.Point, other.Point))))
            .Select(observation => observation.Point)
            .First();
    }

    private static GeoPoint CalculateWeightedCentroid(IReadOnlyList<ObservationPoint> observations)
    {
        var reference = observations[0].Point;
        var totalWeight = observations.Sum(o => o.Count);
        var north = observations.Sum(o => LatitudeMeters(reference, o.Point) * o.Count) / totalWeight;
        var east = observations.Sum(o => LongitudeMeters(reference, o.Point) * o.Count) / totalWeight;
        return OffsetPointByMeters(reference, north, east);
    }

    private static double CalculateFieldCoveragePercentage(FieldDefinition field, IReadOnlyList<ObservationPoint> observations, double influenceRadiusMeters)
    {
        var minLat = field.Polygon.Min(p => p.Lat);
        var maxLat = field.Polygon.Max(p => p.Lat);
        var minLon = field.Polygon.Min(p => p.Lon);
        var maxLon = field.Polygon.Max(p => p.Lon);
        const int steps = 16;
        var insideCount = 0;
        var coveredCount = 0;

        for (var latStep = 0; latStep <= steps; latStep++)
        {
            for (var lonStep = 0; lonStep <= steps; lonStep++)
            {
                var point = new GeoPoint(
                    minLat + ((maxLat - minLat) * latStep / steps),
                    minLon + ((maxLon - minLon) * lonStep / steps));

                if (!IsPointInPolygon(point, field.Polygon))
                {
                    continue;
                }

                insideCount++;
                if (observations.Any(observation => HaversineMeters(observation.Point, point) <= influenceRadiusMeters))
                {
                    coveredCount++;
                }
            }
        }

        return insideCount == 0 ? 0 : (coveredCount * 100.0) / insideCount;
    }

    private static double CalculateCrossFieldSpreadRisk(double observedPopulation, double carryingCapacity, double distanceMeters)
    {
        if (distanceMeters > 50)
        {
            return 0;
        }

        var proximity = 1 - (distanceMeters / 50.0);
        var pressure = observedPopulation / carryingCapacity;
        return proximity * pressure;
    }

    private static double MinimumVertexDistanceMeters(IReadOnlyList<GeoPoint> firstPolygon, IReadOnlyList<GeoPoint> secondPolygon)
    {
        var min = double.MaxValue;
        foreach (var first in firstPolygon)
        {
            foreach (var second in secondPolygon)
            {
                min = Math.Min(min, HaversineMeters(first, second));
            }
        }

        return min;
    }

    private static double CalculatePrimaryAxisBearing(IReadOnlyList<ObservationPoint> observations)
    {
        var centroid = CalculateWeightedCentroid(observations);
        var weighted = observations.Select(observation => new
        {
            East = LongitudeMeters(centroid, observation.Point),
            North = LatitudeMeters(centroid, observation.Point),
            Weight = (double)observation.Count
        }).ToList();

        var totalWeight = weighted.Sum(item => item.Weight);
        var sxx = weighted.Sum(item => item.Weight * item.East * item.East) / totalWeight;
        var syy = weighted.Sum(item => item.Weight * item.North * item.North) / totalWeight;
        var sxy = weighted.Sum(item => item.Weight * item.East * item.North) / totalWeight;
        var theta = 0.5 * Math.Atan2(2 * sxy, sxx - syy);
        var east = Math.Cos(theta);
        var north = Math.Sin(theta);
        var bearing = (Math.Atan2(east, north) * 180.0 / Math.PI + 360.0) % 360.0;
        return bearing;
    }

    private static int? GetFirstThresholdCrossingDay(ScenarioSimulation simulation, double threshold)
    {
        for (var day = 0; day < simulation.Days.Count; day++)
        {
            if (simulation.Days[day].ModeledPopulation >= threshold)
            {
                return day;
            }
        }

        return null;
    }

    private static double AverageDailyGrowth(ScenarioSimulation simulation, int startDay, int endDay)
    {
        var deltas = new List<double>();
        for (var day = startDay; day < endDay; day++)
        {
            deltas.Add(simulation.Days[day + 1].ObservedPopulation - simulation.Days[day].ObservedPopulation);
        }

        return deltas.Average();
    }

    private static double CalculateSeasonalPressureIndex(ScenarioSimulation simulation)
    {
        return simulation.Days.Sum(day => day.ObservedPopulation);
    }

    private static bool DetectCoverageGap(IReadOnlyCollection<int> observedDays, int totalDays, int consecutiveGapDays)
    {
        var gap = 0;
        for (var day = 0; day < totalDays; day++)
        {
            if (observedDays.Contains(day))
            {
                gap = 0;
                continue;
            }

            gap++;
            if (gap >= consecutiveGapDays)
            {
                return true;
            }
        }

        return false;
    }

    private static double CalculateObservationFrequencyScore(IReadOnlyCollection<int> observedDays, int totalDays)
    {
        return Math.Round(observedDays.Count * 100.0 / totalDays, 1);
    }

    private static bool DetectReinfestation(ScenarioSimulation simulation, int startDay)
    {
        if (startDay + 2 >= simulation.Days.Count)
        {
            return false;
        }

        var first = simulation.Days[startDay].ObservedPopulation;
        var second = simulation.Days[startDay + 1].ObservedPopulation;
        var third = simulation.Days[startDay + 2].ObservedPopulation;
        return second > first && third > second;
    }

    private static double LogisticPopulation(double carryingCapacity, double initialPopulation, double growthRate, int day)
    {
        return carryingCapacity / (1 + (((carryingCapacity - initialPopulation) / initialPopulation) * Math.Exp(-growthRate * day)));
    }

    private static double CalculateRSquared(IReadOnlyList<double> actual, IReadOnlyList<double> predicted)
    {
        var mean = actual.Average();
        var ssTot = actual.Sum(value => Math.Pow(value - mean, 2));
        var ssRes = actual.Zip(predicted, (a, p) => Math.Pow(a - p, 2)).Sum();
        return ssTot == 0 ? 1 : 1 - (ssRes / ssTot);
    }

    private static double CalculatePearsonCorrelation(IReadOnlyList<double> first, IReadOnlyList<double> second)
    {
        var firstMean = first.Average();
        var secondMean = second.Average();
        var numerator = first.Zip(second, (a, b) => (a - firstMean) * (b - secondMean)).Sum();
        var denominatorLeft = Math.Sqrt(first.Sum(value => Math.Pow(value - firstMean, 2)));
        var denominatorRight = Math.Sqrt(second.Sum(value => Math.Pow(value - secondMean, 2)));
        var denominator = denominatorLeft * denominatorRight;
        return denominator == 0 ? 0 : numerator / denominator;
    }

    private static GeoPoint ApplyNoise(GeoPoint point, Random random, double stdDevMeters)
    {
        var northNoise = NextGaussian(random) * stdDevMeters;
        var eastNoise = NextGaussian(random) * stdDevMeters;
        return OffsetPointByMeters(point, northNoise, eastNoise);
    }

    private static double NextGaussian(Random random)
    {
        var u1 = 1.0 - random.NextDouble();
        var u2 = 1.0 - random.NextDouble();
        return Math.Sqrt(-2.0 * Math.Log(u1)) * Math.Cos(2.0 * Math.PI * u2);
    }

    private static GeoPoint EnsureInsideField(GeoPoint point, FieldDefinition field)
    {
        if (IsPointInPolygon(point, field.Polygon))
        {
            return point;
        }

        var center = PolygonCentroid(field.Polygon);
        var candidate = point;
        for (var i = 0; i < 12; i++)
        {
            candidate = new GeoPoint(
                (candidate.Lat + center.Lat) / 2.0,
                (candidate.Lon + center.Lon) / 2.0);

            if (IsPointInPolygon(candidate, field.Polygon))
            {
                return candidate;
            }
        }

        return center;
    }

    private static GeoPoint PolygonCentroid(IReadOnlyList<GeoPoint> polygon)
    {
        return new GeoPoint(polygon.Average(point => point.Lat), polygon.Average(point => point.Lon));
    }

    private static bool IsPointInPolygon(GeoPoint point, IReadOnlyList<GeoPoint> polygon)
    {
        var inside = false;
        for (int i = 0, j = polygon.Count - 1; i < polygon.Count; j = i++)
        {
            var xi = polygon[i].Lon;
            var yi = polygon[i].Lat;
            var xj = polygon[j].Lon;
            var yj = polygon[j].Lat;

            var intersects = ((yi > point.Lat) != (yj > point.Lat))
                && (point.Lon < ((xj - xi) * (point.Lat - yi) / ((yj - yi) + double.Epsilon)) + xi);

            if (intersects)
            {
                inside = !inside;
            }
        }

        return inside;
    }

    private static GeoPoint OffsetPointByBearing(GeoPoint start, double distanceMeters, double bearingDegrees)
    {
        var bearingRadians = DegreesToRadians(bearingDegrees);
        var newLat = start.Lat + ((distanceMeters * Math.Cos(bearingRadians)) / 111320.0);
        var newLon = start.Lon + ((distanceMeters * Math.Sin(bearingRadians)) / (111320.0 * Math.Cos(DegreesToRadians(start.Lat))));
        return new GeoPoint(newLat, newLon);
    }

    private static GeoPoint OffsetPointByMeters(GeoPoint start, double northMeters, double eastMeters)
    {
        var newLat = start.Lat + (northMeters / 111320.0);
        var newLon = start.Lon + (eastMeters / (111320.0 * Math.Cos(DegreesToRadians(start.Lat))));
        return new GeoPoint(newLat, newLon);
    }

    private static (double NorthMeters, double EastMeters) RotateMeters(double majorAxisMeters, double minorAxisMeters, double bearingDegrees)
    {
        var theta = DegreesToRadians(bearingDegrees);
        var north = (majorAxisMeters * Math.Cos(theta)) - (minorAxisMeters * Math.Sin(theta));
        var east = (majorAxisMeters * Math.Sin(theta)) + (minorAxisMeters * Math.Cos(theta));
        return (north, east);
    }

    private static double HaversineMeters(GeoPoint first, GeoPoint second)
    {
        const double earthRadiusMeters = 6371000;
        var dLat = DegreesToRadians(second.Lat - first.Lat);
        var dLon = DegreesToRadians(second.Lon - first.Lon);
        var lat1 = DegreesToRadians(first.Lat);
        var lat2 = DegreesToRadians(second.Lat);
        var a = Math.Pow(Math.Sin(dLat / 2), 2)
            + (Math.Cos(lat1) * Math.Cos(lat2) * Math.Pow(Math.Sin(dLon / 2), 2));
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return earthRadiusMeters * c;
    }

    private static double BearingDegrees(GeoPoint first, GeoPoint second)
    {
        var lat1 = DegreesToRadians(first.Lat);
        var lat2 = DegreesToRadians(second.Lat);
        var dLon = DegreesToRadians(second.Lon - first.Lon);
        var y = Math.Sin(dLon) * Math.Cos(lat2);
        var x = (Math.Cos(lat1) * Math.Sin(lat2)) - (Math.Sin(lat1) * Math.Cos(lat2) * Math.Cos(dLon));
        return (RadiansToDegrees(Math.Atan2(y, x)) + 360.0) % 360.0;
    }

    private static double AngleDifferenceDegrees(double first, double second)
    {
        var diff = Math.Abs(first - second) % 360.0;
        return diff > 180 ? 360.0 - diff : diff;
    }

    private static double LatitudeMeters(GeoPoint origin, GeoPoint point)
    {
        return (point.Lat - origin.Lat) * 111320.0;
    }

    private static double LongitudeMeters(GeoPoint origin, GeoPoint point)
    {
        return (point.Lon - origin.Lon) * 111320.0 * Math.Cos(DegreesToRadians(origin.Lat));
    }

    private static double LongitudeDegreesFromMeters(double meters, double latitude)
    {
        return meters / (111320.0 * Math.Cos(DegreesToRadians(latitude)));
    }

    private static double DegreesToRadians(double degrees)
    {
        return degrees * Math.PI / 180.0;
    }

    private static double RadiansToDegrees(double radians)
    {
        return radians * 180.0 / Math.PI;
    }

    private sealed record FieldDefinition(string FarmName, string FieldName, string CropType, double AreaHectares, IReadOnlyList<GeoPoint> Polygon);

    private sealed record SpeciesDefinition(
        string Name,
        int MinClusterSize,
        int MaxClusterSize,
        double MinMoveMetersPerDay,
        double MaxMoveMetersPerDay,
        double WindBearingDeg,
        double TempPeakC,
        double GrowthRate,
        double K,
        SpreadPattern Pattern);

    private sealed record ScenarioDefinition(
        string Name,
        SpeciesDefinition Species,
        FieldDefinition Field,
        GeoPoint Epicentre,
        int StartDay,
        double WindSpeedKmH,
        double WindBearingDeg,
        double BaseTempC,
        int ObservedDays,
        int InitialPopulation);

    private sealed record ScenarioSimulation(ScenarioDefinition Scenario, IReadOnlyList<DailySnapshot> Days);

    private sealed record DailySnapshot(
        int Day,
        double TemperatureC,
        double ModeledPopulation,
        double ObservedPopulation,
        GeoPoint Hotspot,
        GeoPoint Centroid,
        IReadOnlyList<ObservationPoint> Observations);

    private sealed record ObservationPoint(GeoPoint Point, int Count);

    private sealed record GeoPoint(double Lat, double Lon);

    private enum SpreadPattern
    {
        EllipticalRows,
        EdgeBiased,
        RadialBell,
        Radial
    }
}
