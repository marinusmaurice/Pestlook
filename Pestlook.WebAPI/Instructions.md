🚀 1. MASTER PROMPT (use for building system/UI/API)

Use this when generating code, UI, or system design:

🧠 Prompt
Build a web-based pest monitoring and scouting platform where the core entity is a "Monitoring Point".

A Monitoring Point represents any location where pest data is collected. It can be:
- A fixed trap (e.g., pheromone trap, sticky trap, camera trap)
- A manual scouting location (GPS-based observation point)

SYSTEM ROLES:
- Admin (platform owner)
- Agronomist / Farmer (account owner)
- Scout (field worker using mobile)

CORE REQUIREMENTS:

1. ORGANIZATION STRUCTURE
- Users belong to an Organization
- Organizations can create:
  - Farms
  - Fields (with optional geo boundaries / polygons)
- Monitoring Points can optionally be assigned to a Farm and/or Field

2. MONITORING POINTS
- Each monitoring point has:
  - Name
  - Type (Trap | Scouting)
  - GPS location (lat/lng)
  - Optional farm/field association
  - Active/inactive status
- A monitoring point represents a single billing unit
- If a trap and scouting occur at the same location, it is still ONE monitoring point

3. PEST MANAGEMENT
- Users can define custom pests:
  - Name
  - Category (insect, disease, weed, etc.)
- Pests can be assigned to monitoring points (expected pests)
- Allow "Unknown pest" entries

4. DATA CAPTURE

A. Trap Data (Fixed Points)
- Captured periodically
- Data includes:
  - Pest
  - Count (integer)
  - Timestamp
  - Optional image

B. Scouting Data (Mobile)
- Scouts create observations:
  - Linked to a monitoring point OR standalone GPS point
  - Pest (searchable list + unknown option)
  - Either:
    - Count (numeric), OR
    - Presence (boolean: present/not present)
  - Optional notes & images

5. FLEXIBLE ASSOCIATION
- Monitoring points can exist:
  - Independently
  - Assigned to farms
  - Assigned to fields
- Scouts can capture data:
  - At existing monitoring points
  - Or create ad-hoc scouting points (auto-create monitoring point if needed)

6. ANALYTICS (future-ready)
- Pest trends over time per monitoring point / field / farm
- Heatmaps based on GPS data
- Alerts based on thresholds

7. BILLING MODEL
- Billing is based on number of active monitoring points
- Monitoring points are counted regardless of type
- Add/remove dynamically adjusts billing

NON-FUNCTIONAL:
- Mobile-first for scouting
- Offline capture (sync later)
- API-first design
- Scalable multi-tenant architecture

OUTPUT:
- Database schema
- REST API structure
- Suggested UI flows for:
  - Creating farms/fields
  - Adding monitoring points
  - Capturing scouting data
🧱 2. DATABASE DESIGN (clean + scalable)

This is production-grade but not overengineered.

🏢 Core Multi-Tenant
Organizations
Id (PK)
Name
CreatedAt
Users
Id (PK)
OrganizationId (FK)
Name
Email
Role (Admin, Agronomist, Scout)
PasswordHash
🌍 Geography
Farms
Id (PK)
OrganizationId (FK)
Name
Fields
Id (PK)
FarmId (FK)
Name
BoundaryGeoJson (nullable)  <-- polygon
🎯 CORE: Monitoring Points
MonitoringPoints
Id (PK)
OrganizationId (FK)

Name
Type (Trap | Scouting)

Latitude
Longitude

FarmId (FK nullable)
FieldId (FK nullable)

IsActive

CreatedAt

👉 THIS is your billing table.

🐛 Pests
Pests
Id (PK)
OrganizationId (FK)

Name
Category
IsSystem (bool)   <-- optional default pests
MonitoringPointPests (Expected pests per point)
Id (PK)
MonitoringPointId (FK)
PestId (FK)
📊 Observations (THE MONEY TABLE)

Unify trap + scouting into ONE table.

Observations
Id (PK)
OrganizationId (FK)

MonitoringPointId (FK nullable)  <-- null = ad-hoc scouting

Latitude (nullable)
Longitude (nullable)

ObservedAt (datetime)

CreatedByUserId (FK)

Notes (nullable)
ImageUrl (nullable)
ObservationPests
Id (PK)
ObservationId (FK)

PestId (FK nullable)   <-- null if unknown
PestName (nullable)    <-- for unknown pests

Count (int nullable)
IsPresent (bool nullable)

👉 Rules:

Either Count OR IsPresent
Not both required
💳 Billing
Subscriptions
Id (PK)
OrganizationId (FK)

Plan (Starter/Pro/Business)
MonitoringPointLimit
PricePerMonth

StartDate
EndDate
🔥 Optional (for scaling later)
ObservationImages

(multiple images per observation)

Alerts

(threshold triggers)

Devices

(for IoT traps later)

⚡ Key Design Decisions (this is where you win)
1. Single Observation Model

Instead of:

TrapData table ❌
ScoutingData table ❌

You use:

Observations ✅

👉 This keeps everything:

Queryable
Graphable
API simple
2. Monitoring Point = Billing + Data Anchor
Everything ties to it
Even ad-hoc scouting can become one later
3. Flexible Pest Recording
Known pest → FK
Unknown pest → free text

👉 This avoids blocking scouts in the field

4. Geo-first design
Every observation can exist without a predefined point
This is HUGE for real-world usage
🚀 What you should build FIRST (fastest path to money)
Monitoring Points CRUD
Pest CRUD
Observation capture (mobile-friendly)
Simple dashboard (counts over time)
Billing based on monitoring points

If you want next step:
I can generate:

Full .NET Web API project structure
OR Blazor/Maui UI for scouts
OR sync/offline-first mobile architecture

That’s where this turns into a real product fast.