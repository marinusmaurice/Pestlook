# Pestlook – Help & User Guide

> **Pestlook** is a field intelligence platform for monitoring pests, managing traps, running scouting sessions, and analysing pressure trends across your farms and fields.

---

## Table of Contents

1. [Dashboard](#1-dashboard)
2. [Farms & Fields](#2-farms--fields)
3. [Traps](#3-traps)
4. [Scouting Sessions](#4-scouting-sessions)
5. [Analytics (Reports)](#5-analytics-reports)
   - 5.1 [Overview](#51-overview)
   - 5.2 [Threshold Alerts](#52-threshold-alerts)
   - 5.3 [Pest Pressure](#53-pest-pressure)
   - 5.4 [Sessions Summary](#54-sessions-summary)
   - 5.5 [Top Pests](#55-top-pests)
   - 5.6 [Trap Performance](#56-trap-performance)
   - 5.7 [Scout Productivity](#57-scout-productivity)
   - 5.8 [Seasonal Trends](#58-seasonal-trends)
   - 5.9 [Unknown Pests](#59-unknown-pests)
   - 5.10 [Field Coverage](#510-field-coverage)
   - 5.11 [Billing & Quota](#511-billing--quota)
6. [Pest Catalogue](#6-pest-catalogue)
7. [Settings](#7-settings)

---

## 1. Dashboard

The **Dashboard** is the home screen. It gives you an at-a-glance view of everything happening across your farms right now.

### Stat Cards (top row)

| Card | What it shows |
|------|--------------|
| **Active Farms** | Total number of farm records in your organisation |
| **Traps** | Total traps deployed (enabled traps shown separately) |
| **Scouting Sessions** | Total sessions ever recorded |
| **Observations** | Total pest observations logged across all sessions |

### Active Sessions Panel

Lists scouting sessions that are currently **in progress** (started but not yet completed). Each row shows the farm, the scout's name, and when the session started. Click a session row to open the full session detail.

### Recent Activity Feed

A chronological feed of the most recent pest observations recorded. Each entry shows:
- The pest name and session it was recorded in
- The field and farm
- The number of individuals counted
- The time it was logged

This feed helps supervisors spot emerging problems in near-real time.

### Map Panel

Plots all your active **traps** on an interactive map using their GPS coordinates. Markers are colour-coded by trap status:
- 🟢 **Green** – Active / functioning
- 🔴 **Red** – Inactive / disabled
- 🟡 **Yellow** – Maintenance required

Click a marker to see the trap name, type, and field.

### Top Pests Panel

A bar chart of the **top 5 most frequently observed pests** (by observation count) in the current period. Use this to quickly identify which species to prioritise.

---

## 2. Farms & Fields

> **Navigation:** Sidebar → Farms & Fields

Farms are the top-level organisational unit. Each farm has one or more **fields** where scouting and trapping take place.

### Farms List

The left panel lists all farms. Each row shows:
- Farm name and location
- Number of fields within the farm

#### Adding a Farm
1. Click **＋ Add Farm** (top-right of the farms panel).
2. Enter a **Farm Name** and optional **Location/Address**.
3. Click **Save**.

#### Editing a Farm
1. Click the farm row to select it (or click the edit ✏️ icon).
2. Update the fields in the edit form.
3. Click **Save**.

#### Deleting a Farm
1. Click the delete 🗑️ icon next to the farm.
2. Confirm the deletion. **Note:** deleting a farm also removes all its fields, sessions, and associated data — this cannot be undone.

### Fields List

When a farm is selected, its **fields** appear on the right. Each field row shows the field name and any tags/notes.

#### Adding a Field
1. Select the parent farm.
2. Click **＋ Add Field**.
3. Enter a **Field Name** and any optional notes.
4. Click **Save**.

#### Editing a Field
1. Click the edit ✏️ icon on the field row.
2. Update the name or notes.
3. Click **Save**.

#### Deleting a Field
1. Click the delete 🗑️ icon on the field row.
2. Confirm. All traps and sessions attached to the field will be affected.

---

## 3. Traps

> **Navigation:** Sidebar → Traps

The Traps page manages all physical monitoring traps deployed across your fields.

### Trap List

Displays all traps in a table with:
- Trap name and type (e.g. pheromone, sticky, pitfall)
- Farm and field location
- Status badge: **Active**, **Inactive**, or **Maintenance**

You can **search**, **filter by status**, and **sort** the table by clicking column headers.

#### Adding a Trap
1. Click **＋ Add Trap**.
2. Select the **Farm** and **Field** where the trap is deployed.
3. Enter the **Trap Name** and choose a **Trap Type** from the dropdown (types are managed in Settings).
4. Set the **Status** (Active by default).
5. Optionally enter **GPS coordinates** for map display.
6. Click **Save**.

#### Editing a Trap
1. Click the edit ✏️ icon on the trap row.
2. Update any fields.
3. Click **Save**.

#### Activating / Deactivating a Trap
Use the toggle or status dropdown in the edit modal to change between **Active** and **Inactive**. Inactive traps are excluded from performance analytics by default.

#### Deleting a Trap
1. Click the delete 🗑️ icon.
2. Confirm. Historical catch data associated with the trap is retained in observations.

---

## 4. Scouting Sessions

> **Navigation:** Sidebar → Scouting Sessions

Scouting Sessions are the core operational records. Each session is a structured visit to a farm or field where a scout records pest observations.

### Sessions Grid

Displays all sessions in a fixed-height, scrollable, server-side paginated grid. Each row shows:
- Session date/time started and completed
- Farm and scout name
- Status badge: **Planned**, **In Progress**, or **Completed**

#### Searching & Filtering
- Use the **search box** (top-left) to filter by farm name or scout name.
- Use the **status dropdown** to show only Planned, In Progress, or Completed sessions.
- Click any **column header** to sort ascending; click again to sort descending.
- Use the **pagination controls** at the bottom to navigate pages. Page size defaults to 20.

#### Planning a Session
1. Click **＋ Plan Session**.
2. Select the **Farm** and optionally one or more **Fields** to be covered.
3. Set the **Scheduled Date**.
4. Optionally assign the session to a specific **Scout** (team member).
5. Add any **Notes** for the scout.
6. Click **Save**. The session appears with status **Planned**.

#### Editing a Planned Session
1. Click the edit ✏️ icon on a row with status **Planned**.
2. Update the farm, fields, date, or notes.
3. Click **Save**.

#### Starting a Session
A session must be in **Planned** status before it can be started.
1. Click **▶ Start** on the planned session row (or open the session detail).
2. The status changes to **In Progress** and the start time is recorded.

#### Session Detail Page
Click a session row to open the full **Session Detail** page. Here you can:
- See a map of the field with observation markers
- Add **Observations** (pest name, count, severity, notes)
- Edit or delete individual observations
- Complete the session once all fields have been scouted

#### Completing a Session
From the Session Detail page:
1. Review all observations.
2. Click **Complete Session**.
3. Confirm. The status changes to **Completed** and the end time is recorded.

---

## 5. Analytics (Reports)

> **Navigation:** Sidebar → Analytics

The Analytics section provides eleven report tabs. Use the **date range** and **farm/field** filters at the top to narrow results across all tabs.

---

### 5.1 Overview

A summary dashboard of your analytics data for the selected period.

| Panel | Description |
|-------|-------------|
| **Total Sessions** | Count of scouting sessions in the period |
| **Total Observations** | Count of all pest observations |
| **Threshold Breaches** | Observations where pest count exceeded the configured threshold |
| **Active Farms** | Farms with at least one session in the period |
| **Observations Over Time** | Line chart showing observation volume day by day |
| **Top Pests** | Bar chart of the 10 most recorded pest species |
| **Sessions by Status** | Doughnut chart: Planned vs In Progress vs Completed |
| **Pressure by Field** | Horizontal bar chart – which fields have the highest pest load |

---

### 5.2 Threshold Alerts

Shows when pest counts exceeded configured action thresholds.

| Panel | Description |
|-------|-------------|
| **Summary cards** | Counts for Total Breaches, High / Medium / Low severity breaches, and Fields Affected |
| **Threshold breaches per week** | Bar chart showing how many threshold breach events occurred each calendar week. Useful for spotting escalating pressure trends over the season |
| **Repeat Offenders** | Table of fields and pests that have triggered thresholds repeatedly. Sorted by breach count descending. Scroll to see more rows. This identifies chronic hot-spots |
| **All threshold breaches grid** | Searchable, sortable, filterable, paginated table of every individual breach event. Columns: Date, Field, Pest, Observed count, Threshold value, Severity. Use the severity filter dropdown to isolate Critical / High / Medium / Low events |

---

### 5.3 Pest Pressure

Analyses the intensity of pest activity across your fields and over time.

#### What is "Pest Pressure"?

Pest pressure is a **relative score** derived from observation counts compared to historical peak averages for each field. It indicates how active pests are right now vs the worst recorded period.

| Pressure Level | Meaning |
|---------------|---------|
| 🔴 **High** ≥ 66 % of peak avg | Fields experiencing near-peak pest activity — immediate action likely needed |
| 🟡 **Medium** 33–65 % of peak avg | Moderate activity — monitor closely and prepare interventions |
| 🟢 **Low** < 33 % of peak avg | Activity is below the typical danger zone — routine monitoring sufficient |

**Example:** "High Pressure 14 Fields" means 14 of your fields are currently showing ≥ 66 % of their historical peak observation average.

| Panel | Description |
|-------|-------------|
| **Pressure summary cards** | Counts of High / Medium / Low pressure fields at a glance |
| **Pest pressure by field** | Horizontal bar chart. Each bar represents one field; its length = the pressure score (0–100 %). Bars are colour-coded by level. Quickly see which fields need attention |
| **Avg observations per session by field (top 10)** | Bar chart of the 10 fields with the highest average observations per visit. **Higher = more pest activity per visit.** A field with a high score here consistently finds many pests each time it is scouted — it may need more frequent visits or intervention |
| **Detailed field breakdown grid** | Interactive, scrollable, paginated table with one row per field. Columns: Field, Farm, Avg Obs/Session, Peak Avg, Pressure Score, Level. Use the **Pressure Level** filter dropdown to isolate High/Medium/Low fields. Click column headers to sort. Search by field or farm name |

---

### 5.4 Sessions Summary

A breakdown of scouting session activity.

| Panel | Description |
|-------|-------------|
| **Sessions over time** | Line chart – session count per day/week |
| **Sessions by farm** | Bar chart – which farms have the most sessions |
| **Sessions by status** | Doughnut chart showing status distribution |
| **Avg session duration** | Average time from start to completion |
| **Sessions table** | Filterable, sortable list of all sessions in the period with links to detail pages |

---

### 5.5 Top Pests

Ranks pest species by observation frequency and severity.

| Panel | Description |
|-------|-------------|
| **Summary cards** | Total pest species observed, total observation records, records with threshold breaches |
| **Top pests by observations** | Horizontal bar chart – top 10 species by count |
| **Pest category breakdown** | Doughnut chart – observations grouped by pest category (Insect, Rodent, Fungal, etc.) |
| **All observed pests grid** | Searchable, sortable, filterable, paginated table. Columns: Pest name, Category, Observations, Avg Count, Max Count, Sessions, Threshold Breaches. Use the **Category** filter to view one type. Use the **Threshold Breaches** filter to show only pests that exceeded thresholds |

---

### 5.6 Trap Performance

Evaluates how effective each trap is at catching pests.

| Panel | Description |
|-------|-------------|
| **Summary cards** | Total traps, active traps, total catches, avg catches per trap |
| **Catches by trap type** | Bar chart grouping catch counts by trap type (pheromone, sticky, pitfall, etc.) |
| **Trap status distribution** | Doughnut chart – Active / Inactive / Maintenance counts |
| **All traps grid** | Interactive table sorted by **Total Catches (highest first)** by default. Columns: Trap Name, Type, Farm, Field, Status, Total Catches, Avg Catches/Visit, Last Checked. Use the **Trap Type** or **Status** filter dropdowns. Search by name, farm, or field. Pagination and sorting supported |

---

### 5.7 Scout Productivity

Measures each team member's scouting output.

| Panel | Description |
|-------|-------------|
| **Summary cards** | Active scouts, sessions completed, total observations recorded |
| **Sessions per scout** | Bar chart – session count per team member |
| **Observations per scout** | Bar chart – observation records per team member |
| **Avg session duration by scout** | Highlights scouts who take significantly longer or shorter than average |
| **Scout table** | Rows per scout with sessions, observations, avg duration, and last activity date |

---

### 5.8 Seasonal Trends

Tracks how pest pressure and observation volumes change across seasons and months.

| Panel | Description |
|-------|-------------|
| **Observations by month** | Line chart – monthly observation totals for the current and previous year (if data exists) for year-on-year comparison |
| **Threshold breaches by month** | Bar chart – breach events per month, useful for identifying the "danger season" |
| **Top pests by season** | Grouped bar chart showing which pests peak in which season (Spring/Summer/Autumn/Winter) |
| **Seasonal heatmap** | Grid of pest × month cells colour-coded by observation count. Darker = higher activity |

---

### 5.9 Unknown Pests

Tracks observation records where the pest was not identified (recorded as "Unknown" or left blank).

| Panel | Description |
|-------|-------------|
| **Summary cards** | Total unknown records, percentage of all observations, fields affected |
| **Unknown obs over time** | Line chart – trend of unidentified records |
| **Unknown obs by field** | Bar chart – which fields have the most unidentified records |
| **Unknown records table** | Sortable list of all unidentified observations with date, field, scout, count, and session link. Use this to follow up with scouts or to classify observations retrospectively |

---

### 5.10 Field Coverage

Shows how thoroughly each field is being monitored.

| Panel | Description |
|-------|-------------|
| **Summary cards** | Avg days between sessions, fields with no recent visits, fully covered fields |
| **Days since last visit** | Bar chart – one bar per field sorted by time since last scouting visit. Longer bars = fields at risk of going unmonitored |
| **Session frequency by field** | Bar chart – sessions per field in the period |
| **Coverage table** | Rows per field with: Last Visit date, Sessions in Period, Days Since Last Visit, Coverage Score. Sort by "Days Since Last Visit" to find neglected fields |

---

### 5.11 Billing & Quota

Shows your organisation's usage against its subscription plan.

| Panel | Description |
|-------|-------------|
| **Quota cards** | Current usage vs limits for: Sessions, Observations, Farms, Traps, Team Members |
| **Usage progress bars** | Visual bars showing percentage used of each quota. Bars turn amber (≥ 80 %) or red (≥ 95 %) when limits are near |
| **Usage over time** | Line chart of monthly session and observation counts to help forecast when quotas will be reached |

---

## 6. Pest Catalogue

> **Navigation:** Sidebar → Pest Catalogue

A reference library of all pest species configured in your organisation.

### Pest List

Each entry shows:
- Pest name and scientific name
- Category (Insect, Rodent, Fungal, etc.)
- Action threshold (the count that triggers a breach alert)
- Description / notes

#### Adding a Pest
1. Click **＋ Add Pest**.
2. Enter the **Common Name**, **Scientific Name** (optional), and **Category**.
3. Set the **Action Threshold** – the observation count at which the system should flag a threshold breach.
4. Add any descriptive **Notes**.
5. Click **Save**.

#### Editing a Pest
1. Click the edit ✏️ icon next to the pest.
2. Update the fields.
3. Click **Save**. Changes apply immediately to future observations.

#### Deleting a Pest
1. Click the delete 🗑️ icon.
2. Confirm. Existing observations that referenced this pest will retain the name, but the pest will no longer appear in the selection list for new observations.

---

## 7. Settings

> **Navigation:** Sidebar → Settings (gear icon at the bottom)

### Organisation Info

Displays your organisation name, plan tier, and contact details. Contact your administrator or Pestlook support to update these.

### Preferences

| Setting | Description |
|---------|-------------|
| **Default Date Range** | Pre-select how far back Analytics loads data (7 days, 30 days, 90 days, etc.) |
| **Notifications** | Enable/disable email or in-app notifications for threshold breaches |

Click **Save Preferences** after making changes.

### Trap Types

Manage the categories of traps used in your organisation.

#### Adding a Trap Type
1. Click **＋ Add** next to "Trap Types".
2. Enter the type name (e.g. "Delta Sticky", "Pheromone Lure").
3. Click **Save**. The new type appears in the Trap type dropdown when adding/editing traps.

#### Editing a Trap Type
1. Click the edit icon next to the trap type.
2. Update the name.
3. Click **Save**.

#### Deleting a Trap Type
1. Click the delete icon.
2. Confirm. Existing traps that used this type will retain the label.

### Team Members

Lists all users in your organisation with their name, email, and role.

| Role | Permissions |
|------|-------------|
| **Admin** | Full access: manage farms, sessions, settings, team members |
| **Scout** | Can start sessions, log observations; cannot manage settings or users |
| **Viewer** | Read-only access to dashboard and analytics |

#### Adding a Team Member
1. Click **＋ Add Team Member**.
2. Enter the new member's **First Name**, **Last Name**, and **Email address**.
3. Select a **Role**.
4. Click **Send Invite** (or **Save**). The user receives an invitation email.

#### Editing a Team Member
1. Click the edit icon on the team member row.
2. Change the role or name.
3. Click **Save**.

---

## Tips & Common Questions

**Q: Why do I see "No data for selected period" on Analytics?**  
A: Change the date range filter at the top of the Analytics page. If the range is too narrow there may be no sessions or observations.

**Q: How do I change the action threshold for a pest?**  
A: Go to **Pest Catalogue**, find the pest, click edit ✏️, and update the **Action Threshold** value.

**Q: A trap is showing on the map in the wrong location.**  
A: Go to **Traps**, edit the trap, and correct the **GPS Latitude / Longitude** values. The map updates immediately.

**Q: The dashboard activity feed is empty.**  
A: Observations are only shown once a scouting session has been started and observations logged. Plan and start a session first.

**Q: How do I export data?**  
A: Export functionality is available from individual Analytics report tabs where a download icon is shown.

---

*Last updated: 2025 | Pestlook Field Intelligence Platform*
