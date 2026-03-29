# Pestlook Vanilla JS Frontend — Build Plan

## Overview
Build a production-quality vanilla JavaScript Single Page Application (SPA) that replicates the `pestlook-app.html` mockup design, properly organized into modules, with real API integration against the Pestlook WebAPI.

---

## 1. File Structure

```
Pestlook.UI.Web/
├── index.html                      # Entry point — loads app shell
├── plan.md                         # This plan
├── pestlook-app.html               # Original mockup (kept for reference)
├── css/
│   └── styles.css                  # All CSS (extracted from mockup)
├── js/
│   ├── app.js                      # App bootstrap, router, global state
│   ├── api/
│   │   ├── client.js               # Base HTTP client (fetch wrapper, auth headers, token refresh)
│   │   ├── auth.js                 # POST sign-up, login, refresh, revoke, GET me
│   │   ├── farms.js                # GET/POST/PUT/DELETE /farms
│   │   ├── fields.js               # GET/POST/PUT/DELETE /fields
│   │   ├── monitoring-points.js    # GET/POST/PUT/DELETE /monitoring-points, pest assignment
│   │   ├── pests.js                # GET/POST/PUT/DELETE /pests
│   │   ├── sessions.js             # GET/POST/PATCH/DELETE /scouting-sessions
│   │   ├── observations.js         # GET/POST/DELETE /pest-observations
│   │   ├── trap-types.js           # GET/POST/PUT/DELETE /trap-types
│   │   ├── billing.js              # GET/POST /billing-snapshots
│   │   └── roles.js                # GET roles, GET users, assign role
│   ├── pages/
│   │   ├── landing.js              # Public landing / marketing page
│   │   ├── login.js                # Login form
│   │   ├── signup.js               # Sign-up form (tenant + user)
│   │   ├── dashboard.js            # Dashboard with stats, active sessions, activity feed, map, top pests
│   │   ├── farms.js                # Farm cards grid + create modal
│   │   ├── farm-detail.js          # Single farm detail with fields list
│   │   ├── monitoring-points.js    # Monitoring points table with tabs
│   │   ├── sessions.js             # Scouting sessions table + start modal
│   │   ├── observations.js         # Observations list with alert summary
│   │   ├── pests.js                # Pest catalogue grid + create modal
│   │   └── settings.js             # Org settings, trap types, team members
│   ├── components/
│   │   ├── sidebar.js              # Sidebar nav + user chip + quota
│   │   ├── topbar.js               # Top bar with search, notifications, CTA
│   │   ├── modal.js                # Reusable modal component
│   │   ├── toast.js                # Toast notification system
│   │   ├── tag.js                  # Colored tag/pill helper
│   │   └── table.js                # Data table renderer helper
│   └── utils/
│       ├── storage.js              # Token storage (localStorage)
│       ├── router.js               # Hash-based SPA router
│       └── helpers.js              # Date formatting, initials, enums
```

---

## 2. WebAPI Endpoints (v1)

All endpoints are prefixed with `/api/v1/`. All authenticated endpoints require `Authorization: Bearer <token>`.

| Module              | Method   | Path                                     | Auth     |
|---------------------|----------|------------------------------------------|----------|
| **Auth**            | POST     | `/auth/sign-up`                          | Public   |
|                     | POST     | `/auth/login`                            | Public   |
|                     | POST     | `/auth/refresh`                          | Public   |
|                     | POST     | `/auth/revoke`                           | Public   |
|                     | GET      | `/auth/me`                               | Bearer   |
|                     | POST     | `/auth/register`                         | Admin    |
| **Farms**           | GET      | `/farms`                                 | Bearer   |
|                     | GET      | `/farms/{id}`                            | Bearer   |
|                     | POST     | `/farms`                                 | Bearer   |
|                     | PUT      | `/farms/{id}`                            | Bearer   |
|                     | DELETE   | `/farms/{id}`                            | Bearer   |
| **Fields**          | GET      | `/fields?farmId=`                        | Bearer   |
|                     | GET      | `/fields/{id}`                           | Bearer   |
|                     | POST     | `/fields`                                | Bearer   |
|                     | PUT      | `/fields/{id}`                           | Bearer   |
|                     | DELETE   | `/fields/{id}`                           | Bearer   |
| **Monitoring Pts**  | GET      | `/monitoring-points?farmId=&fieldId=`    | Bearer   |
|                     | GET      | `/monitoring-points/{id}`                | Bearer   |
|                     | POST     | `/monitoring-points`                     | Bearer   |
|                     | PUT      | `/monitoring-points/{id}`                | Bearer   |
|                     | DELETE   | `/monitoring-points/{id}`                | Bearer   |
|                     | POST     | `/monitoring-points/{id}/pests`          | Bearer   |
|                     | DELETE   | `/monitoring-points/{id}/pests/{pestId}` | Bearer   |
| **Pests**           | GET      | `/pests`                                 | Bearer   |
|                     | GET      | `/pests/{id}`                            | Bearer   |
|                     | POST     | `/pests`                                 | Bearer   |
|                     | PUT      | `/pests/{id}`                            | Bearer   |
|                     | DELETE   | `/pests/{id}`                            | Bearer   |
| **Sessions**        | GET      | `/scouting-sessions`                     | Bearer   |
|                     | GET      | `/scouting-sessions/{id}`                | Bearer   |
|                     | POST     | `/scouting-sessions`                     | Bearer   |
|                     | PATCH    | `/scouting-sessions/{id}/complete`       | Bearer   |
|                     | DELETE   | `/scouting-sessions/{id}`                | Bearer   |
| **Observations**    | GET      | `/pest-observations?sessionId=&from=&to=`| Bearer   |
|                     | GET      | `/pest-observations/{id}`                | Bearer   |
|                     | POST     | `/pest-observations`                     | Bearer   |
|                     | DELETE   | `/pest-observations/{id}`                | Bearer   |
| **Trap Types**      | GET      | `/trap-types`                            | Bearer   |
|                     | GET      | `/trap-types/{id}`                       | Bearer   |
|                     | POST     | `/trap-types`                            | Admin    |
|                     | PUT      | `/trap-types/{id}`                       | Admin    |
|                     | DELETE   | `/trap-types/{id}`                       | Admin    |
| **Billing**         | GET      | `/billing-snapshots`                     | Admin    |
|                     | GET      | `/billing-snapshots/{id}`                | Admin    |
|                     | POST     | `/billing-snapshots/generate?year=&month=`| Admin   |
| **Roles**           | GET      | `/roles`                                 | Admin    |
|                     | GET      | `/roles/users`                           | Admin    |
|                     | GET      | `/roles/users/{userId}`                  | Admin    |
|                     | POST     | `/roles/users/{userId}/assign`           | Admin    |

---

## 3. API Response Envelope

All responses use:
```json
{
  "success": true|false,
  "data": <T>,
  "message": "string|null",
  "errors": ["string"] | null
}
```

---

## 4. Enum Mappings (int → label)

| Enum                | Values                                              |
|---------------------|-----------------------------------------------------|
| SubscriptionPlan    | 0=Basic, 1=Professional, 2=Enterprise               |
| PestCategory        | 0=Insect, 1=Disease, 2=Weed, 3=Rodent, 4=Other     |
| CaptureMode         | 0=Count, 1=Presence                                 |
| MonitoringPointType | 0=FixedTrap, 1=FixedScouting, 2=ScoutingVisit       |

---

## 5. Pages & Features

### 5a. Landing Page (`#/`)
- Marketing hero with CTA buttons to Sign Up / Login
- Feature highlights

### 5b. Sign-Up Page (`#/signup`)
- Form: Tenant Name, Tenant Slug, Subscription Plan, Email, Password, First Name, Last Name
- Calls `POST /auth/sign-up`
- On success → stores tokens → redirects to `#/dashboard`

### 5c. Login Page (`#/login`)
- Form: Email, Password
- Calls `POST /auth/login`
- On success → stores tokens → calls `GET /auth/me` → redirects to `#/dashboard`

### 5d. Dashboard (`#/dashboard`)
- Stats: farm count, monitoring point count, session count, observation count
- Active Sessions table (sessions without `completedAt`)
- Recent Activity feed (latest observations)
- Field Map placeholder with monitoring point pins
- Top Observed Pests bar chart

### 5e. Farms & Fields (`#/farms`, `#/farms/:id`)
- Card grid of all farms
- "Add Farm" modal
- Farm detail page with fields list & "Add Field" modal

### 5f. Monitoring Points (`#/monitoring-points`)
- Table with tabs: All, Active, Alerts, Inactive
- "Add Point" modal

### 5g. Scouting Sessions (`#/sessions`)
- Table of all sessions
- "Start Session" modal

### 5h. Pest Observations (`#/observations`)
- Alert summary cards
- Observation rows with pest name, count, status tags

### 5i. Pest Catalogue (`#/pests`)
- Card grid of all pests
- "Add Pest" modal

### 5j. Settings (`#/settings`)
- Organisation info (read-only display from user context)
- Trap Types list with CRUD
- Team Members list (from roles/users endpoint)

---

## 6. Execution Order

1. Create `css/styles.css` — extract all CSS from the mockup
2. Create `js/utils/storage.js` — token management
3. Create `js/utils/helpers.js` — date formatting, enum maps, initials
4. Create `js/utils/router.js` — hash-based SPA router
5. Create `js/api/client.js` — fetch wrapper with auth + refresh
6. Create all `js/api/*.js` service modules
7. Create `js/components/toast.js` — toast notifications
8. Create `js/components/modal.js` — reusable modal
9. Create `js/components/tag.js` — tag/pill renderer
10. Create `js/components/table.js` — data table renderer
11. Create `js/components/sidebar.js` — sidebar with nav
12. Create `js/components/topbar.js` — top bar
13. Create all `js/pages/*.js` page modules
14. Create `js/app.js` — bootstrap and wire everything together
15. Create `index.html` — entry point
