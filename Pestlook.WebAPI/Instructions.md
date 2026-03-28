Part 1: The Prompt
Copy and paste this into your AI coding tool (Cursor, Copilot, etc.) to generate the backend logic and schema.

Role: Senior Full Stack Developer (Specializing in Geospatial AgriTech)

Context:
We are building a Pest Monitoring SaaS. The core billing unit is a "Monitoring Point." A Monitoring Point is a geospatial location (lat/lng) where pest data is collected. The system distinguishes between two workflows:

Fixed Points (Setup): Agronomists/Farmers create these on the web (PC). These are permanent traps or fixed scouting locations.

Transient Scouting Points (Capture): Scouts (mobile users) create these on the fly while walking fields. These are "Geo-tagged field scouting points."

Key Requirements:

Hierarchy: User (Owner) $\rightarrow$ Farm $\rightarrow$ Field $\rightarrow$ MonitoringPoint.

Pests: Users must be able to create custom Pest entities (Name, Scientific Name, Thresholds).

Assignments: When creating a Fixed Point, the user selects which specific Pests are monitored there (e.g., Trap A monitors Codling Moth and Aphids). This creates a MonitoringPointPest join.

Data Capture:

Scouts select a MonitoringPoint (Fixed or Scouting point).

They select a Pest (must be on the "allowed" list for that point, or allow "Unknown").

They record Count (integer) or Presence (boolean).

Billing: Bill based on the total number of MonitoringPoint records active during the billing cycle.

Part 2: Database Design (PostgreSQL with PostGIS)
This schema uses UUIDs for public IDs (to avoid exposing counts), Soft Deletes, and PostGIS for geospatial boundaries and point queries.

1. Core Organization & Geography
sql
-- 1. Farms (Top level geo-entity)
CREATE TABLE farms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- The agronomist/farmer
    name TEXT NOT NULL,
    address TEXT,
    geom GEOMETRY(POLYGON, 4326), -- Optional boundary of the farm
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ -- Soft delete
);

-- 2. Fields (Children of farms, specific crop zones)
CREATE TABLE fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    crop_type TEXT,
    geom GEOMETRY(POLYGON, 4326), -- Geo-boundary for the field
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
2. Pests (Customizable by User/Org)
sql
-- 3. Pests (Tenant-aware)
CREATE TABLE pests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Who created this pest
    name TEXT NOT NULL, -- e.g., "Codling Moth"
    scientific_name TEXT,
    threshold_count INTEGER, -- Economic threshold (e.g., >5 requires action)
    is_default BOOLEAN DEFAULT FALSE, -- System defaults
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint to prevent duplicate names per owner
CREATE UNIQUE INDEX idx_pests_owner_name ON pests(owner_id, name) WHERE deleted_at IS NULL;
3. Monitoring Points (The Billing Unit)
sql
-- 4. Monitoring Points (Unified location)
CREATE TABLE monitoring_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    field_id UUID NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
    
    -- Type specific
    point_type TEXT NOT NULL CHECK (point_type IN ('fixed_trap', 'fixed_scouting', 'scouting_visit')),
    
    -- Identification
    name TEXT, -- e.g., "North Orchard Trap A". Optional for transient scouting visits.
    
    -- Geolocation
    location GEOMETRY(POINT, 4326) NOT NULL,
    
    -- Metadata
    trap_type TEXT, -- e.g., 'delta', 'sticky_card', 'pheromone'. Null if manual scouting.
    
    -- Lifecycle
    is_active BOOLEAN DEFAULT TRUE, -- Soft delete/archiving for billing
    
    -- Audit
    created_by UUID REFERENCES users(id), -- Who set it up
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ -- If deactivated, stop billing
);

-- Spatial index for "Find points near scout"
CREATE INDEX idx_monitoring_points_location ON monitoring_points USING GIST (location);
4. Junction & Business Logic
sql
-- 5. Monitoring Point - Pest Assignment (The "What to look for")
-- CRITICAL: This links a trap/fixed point to specific pests.
CREATE TABLE monitoring_point_pests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    monitoring_point_id UUID NOT NULL REFERENCES monitoring_points(id) ON DELETE CASCADE,
    pest_id UUID NOT NULL REFERENCES pests(id) ON DELETE CASCADE,
    
    -- Optional: Trap specific settings
    is_targeted BOOLEAN DEFAULT TRUE, -- Are we actively tracking this here?
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure a point doesn't track the same pest twice
    UNIQUE(monitoring_point_id, pest_id)
);
5. Observations (The Data)
sql
-- 6. Observations (Scout entries)
CREATE TABLE observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Link to the location
    monitoring_point_id UUID NOT NULL REFERENCES monitoring_points(id) ON DELETE RESTRICT,
    
    -- Who did the scouting
    scout_user_id UUID NOT NULL REFERENCES users(id),
    
    -- What was found
    pest_id UUID REFERENCES pests(id) ON DELETE SET NULL, -- NULL allowed for "Unknown" pests
    pest_name_text TEXT, -- Denormalized capture for unknown pests (e.g., "Strange Beetle")
    
    -- Data types
    count INTEGER, -- Null if presence only
    presence BOOLEAN, -- Null if count used
    
    -- Context
    life_stage TEXT, -- e.g., 'adult', 'larvae', 'eggs'
    notes TEXT,
    
    -- Media
    photo_urls TEXT[], -- Array of S3/Cloudinary URLs
    
    -- Timestamp of the actual scouting event (not just when entered)
    observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Validation: Ensure if no pest_id, we have text
    CHECK ((pest_id IS NOT NULL) OR (pest_name_text IS NOT NULL))
);

-- Index for dashboard queries
CREATE INDEX idx_observations_point_date ON observations(monitoring_point_id, observed_at);
6. Billing (Simplified)
sql
-- 7. Billing Context (Snapshot of points for invoice accuracy)
-- Instead of complex logic, track the count snapshot monthly.
CREATE TABLE billing_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users(id),
    billing_month DATE NOT NULL, -- e.g., '2024-05-01'
    active_point_count INTEGER NOT NULL, -- Count of points WHERE is_active=true
    amount_cents INTEGER NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, paid, failed
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(owner_id, billing_month)
);
Part 3: Implementation Logic Notes (for the Prompt)
When generating the code, ensure the AI implements these specific workflows:

Workflow A: Setup (Agronomist/Farmer)

Create Farm $\rightarrow$ Create Field.

Define Pests (e.g., "Corn Borer").

Create MonitoringPoint (type = fixed_trap or fixed_scouting).

Crucially: Run INSERT INTO monitoring_point_pests linking the point to the relevant Pest. This defines the "menu" of pests available for that location.

Workflow B: Capture (Scout)

Scout opens mobile app, views map (filtered by Field).

Scout taps a location.

If they tap an existing fixed_trap/fixed_scouting point: They select from the predefined list of pests associated via monitoring_point_pests. They enter count/presence.

If they tap a blank spot (no point exists):

System creates a new MonitoringPoint with point_type = 'scouting_visit' and name = NULL.

System allows scout to enter pest data (from global list or "unknown").

The Observation links to this newly created point.

Workflow C: Billing

Count all MonitoringPoint records where deleted_at IS NULL AND is_active = true for the owner_id. (Scouting visits that are ephemeral should ideally be archived/deleted after a season to avoid inflating the base cost, or you bill based on active points in the month).

Summary for the AI