# Pestlook — AI-Powered Integrated Pest Management Platform

## One-Line Pitch

Pestlook gives farmers and agronomists a mobile-first, data-driven scouting platform that tells them **exactly where pests are, where they're going, and when to act** — so they spray less, waste nothing, and protect more.

---

## The Problem

Modern agriculture is caught in a chemical dependency loop:

- Farmers spray on schedules, not on evidence. Entire fields get treated because nobody knows which 10% actually has a problem.
- Scouting is manual, paper-based, and inconsistent. A clipboard walk through a field produces data that lives in nobody's system.
- Pest populations move. Without visibility across farms and fields over time, outbreaks spread undetected until it's too late.
- Economic thresholds exist in textbooks but are never applied in the field. Scouts observe. They don't decide.
- Residue, resistance, and regulatory pressure are tightening simultaneously. The old playbook is expiring.

The result: farmers spend more on chemicals than they need to, still lose crops they shouldn't, and have no historical intelligence to get better next season.

---

## The Solution

**Pestlook** is an integrated pest management (IPM) platform with three tightly connected layers:

### 1. Mobile Scouting App (iOS / Android — .NET MAUI)
Scouts carry the app into the field. It works fully offline and syncs when connectivity returns.

- **Planned sessions**: Agronomists pre-configure what to check (which traps, which pests, which fields) before scouts go out. Scouts follow a structured checklist.
- **Unplanned sessions**: Scouts can log ad-hoc observations instantly — unknown pests, unexpected outbreaks, anything that doesn't fit the plan.
- **GPS-stamped observations**: Every count, every life stage, every presence/absence record is attached to a precise location and timestamp (`ObservedAt`).
- **Trap monitoring**: Physical trap types (delta, sticky card, pheromone, pitfall, light, smart/automated) are registered to GPS locations. Scouts record counts per trap per visit.
- **Photo capture**: Observation photos sync to cloud storage for remote review and future AI training.
- **Offline-first sync**: Local SQLite database ensures no data is lost in areas with no signal. Background sync pushes all dirty records to the server the moment connectivity returns.

### 2. Web Management Platform (ASP.NET Core + Tailwind)
Agronomists and farm managers get a full web dashboard for planning, reviewing, and acting.

- **Farm & field management**: Geo-boundary mapping with GeoJSON, area in hectares, crop type, and seasonal metadata. Fields are nested under farms with multi-tenant isolation.
- **Trap management**: Full lifecycle management of physical traps — location, type, enable/disable, GPS coordinates visualised on an interactive Leaflet map.
- **Pest catalogue**: System-wide pest library (with economic action thresholds, life stages, capture modes) plus tenant-specific custom pests.
- **Session management**: Plan, assign, track, and complete scouting sessions. Filter by status, farm, field, or scout. Full observation history per session.
- **Dashboard**: Live KPIs — active farms, trap counts, session completion rates, top observed pests from the last 3 months, and a real-time activity feed of the most recent completed-session observations.
- **Analytics**: Observation trends, pest frequency, trap efficacy, and session throughput over configurable date ranges.

### 3. Intelligence Engine (AI/Analytics API)
This is where Pestlook moves beyond record-keeping into decision support:

| Endpoint | What it tells you |
|---|---|
| `spread-direction` | Which direction a pest population is moving across your fields, week by week, with compass bearing |
| `origin-detection` | Where an infestation most likely started — the probable source field |
| `population-forecast` | Projected pest counts based on historical trajectory |
| `neighbour-risk` | Which adjacent fields are most at risk of receiving a spreading outbreak |
| `cross-farm-correlation` | Whether the same pest is moving across multiple farms simultaneously — regional outbreak detection |
| `spread-velocity` | How fast a pest is spreading (fields per week), whether it's accelerating or retreating |
| `breach-probability` | Which pest × field combinations are most likely to breach their economic action threshold |
| `next-scouting-date` | AI-recommended next scouting date per field, based on population trajectory and threshold proximity |
| `seasonal-pressure` | Historical seasonal pest pressure curves to anticipate what's coming |
| `weather-risk` | Correlation between recorded weather conditions and observation spikes |

Every one of these endpoints feeds back into the web UI. Scouts in the field and agronomists at a desk are both looking at the same ground truth.

---

## Business Model

- **SaaS subscription** per tenant (farm operation / agronomy firm), tiered by monitoring point quota and feature access (`Basic`, `Pro`, `Enterprise` plans already modelled in the schema).
- **Per-seat pricing** for large operations with multiple scouts and agronomists.
- **Data partnership**: Aggregated, anonymised pest pressure data is a valuable input for insurers, input suppliers, and government biosecurity agencies.
- **Agrochemical replacement wedge**: As AI recommendations reduce spray events, Pestlook becomes the audit trail that justifies reduced chemical use to buyers, retailers, and regulators — a compliance product as much as an agronomic one.

---

## Why Now

1. **Smartphones are now ubiquitous on farms.** The hardware distribution problem is solved.
2. **Offline-first mobile frameworks (.NET MAUI) make field apps viable without connectivity assumptions.**
3. **GPS accuracy on consumer devices is sufficient for per-plant-zone precision.**
4. **Regulatory pressure on pesticide use is accelerating** — EU Farm to Fork targets 50% pesticide reduction by 2030. Carbon markets reward input reduction. Buyers want residue-free produce.
5. **IPM is mandated in many markets but almost universally poorly executed** because the tooling doesn't exist. Pestlook is that tooling.

---

## Traction / What's Built

This is not a prototype. Pestlook is a production-grade system:

- **Full multi-tenant architecture** — tenant-scoped data isolation at the database query filter level, not application logic
- **JWT + refresh token authentication** with role-based access control (`Admin`, `Agronomist`, `Scout`)
- **EF Core migrations** tracking 20+ schema iterations — the data model has been iterated against real-world scouting requirements
- **Versioned REST API** (`/api/v1/...`) with OpenAPI documentation
- **10 AI intelligence endpoints** for pest spread analysis, outbreak forecasting, and scouting scheduling
- **Offline mobile sync** with conflict-free dirty-flag tracking and background push
- **Leaflet-based interactive maps** for farms, fields, traps, and trap monitoring zones
- **Server-side pagination and filtering** on all major list views (traps, sessions, observations)
- **Observation timestamping** (`ObservedAt`) distinct from record creation — enables accurate temporal analysis
- **Economic action threshold alerting** built into the observation model

---

## What It Needs Next

### To win in agriculture at scale, Pestlook needs:

**1. Computer Vision / AI Identification**
- In-app camera flow that identifies pest species from a photo — reducing dependence on scout expertise and enabling faster, more accurate data entry
- Life stage classification from images (egg, larva, adult) to feed population models
- Integration with an open pest image dataset or a proprietary training pipeline

**2. IoT / Smart Trap Integration**
- Direct API ingestion from automated camera traps (e.g., Trapview, Spotta, Semios) — removing humans from routine trap reading
- Real-time count streaming rather than manual session-based recording

**3. Weather Data Integration**
- Automated weather feed per farm (via open APIs or on-farm sensors) to power the `weather-risk` intelligence endpoint with real data rather than manually recorded conditions

**4. Geospatial Expansion**
- True field boundary drawing with satellite imagery underlay (Mapbox/Google Maps Satellite)
- Field-level soil and crop metadata to enrich pest pressure models
- Integration with satellite NDVI to correlate crop stress with pest pressure

**5. Spray Recommendation Engine**
- Closing the loop: when breach probability crosses a threshold, generate a targeted spray recommendation — product, rate, timing, zone — and log it against the observation that triggered it
- Track spray events and measure their effect on subsequent observation counts

**6. Regulatory Compliance Module**
- Generate pesticide use records required by EU, UK, and US regulators automatically from the existing observation + spray log data
- Export in formats accepted by farm assurance schemes (Red Tractor, GlobalG.A.P.)

**7. Marketplace / Data Network Effects**
- Regional pest pressure maps built from aggregated tenant data — visible to all users as a public good, driving acquisition
- Pest pressure alerts pushed to farms in the vicinity of a confirmed outbreak — the network warns itself

---

## Why Pestlook Wins

Most crop protection software is built by agrochemical companies to sell more chemicals. Pestlook is built to use fewer. That alignment matters to every stakeholder in the chain — farmers, retailers, regulators, and consumers.

The data moat is real: every observation, every trap read, every scouting session is a labelled, GPS-stamped, timestamped data point. After two seasons on a farm, Pestlook knows that field's pest history better than any scout ever could. That knowledge compounds. It cannot be replicated by a competitor starting from zero.

The company that owns the observation data owns the decision. The company that owns the decision owns the input spend.

**That's Pestlook.**

---

*Built on .NET 10 · ASP.NET Core WebAPI · .NET MAUI · EF Core · SQL Server · SQLite · Leaflet · Tailwind CSS*
