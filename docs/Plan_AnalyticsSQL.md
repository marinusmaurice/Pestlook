# Plan: AnalyticsSQL

**Goal:** Replace the current single `GET /analytics/sessions` endpoint (which streams all sessions +
observations into browser memory) with **11 focused, server-side aggregate endpoints** — one per
analytics tab. The browser keeps small lookup tables (farms, fields, traps, pests) but never loads
raw observation rows.

---

## Motivation

| Now | After |
|-----|-------|
| Browser downloads every `ScoutingSession` + every `SessionObservation` (200 k+ rows) | Browser receives pre-aggregated JSON (< 2 KB per tab) |
| All filtering in JS (`applyFilters`) | SQL `WHERE` clause respects date range, farm, field, scout |
| Single page load fetches everything | Each tab triggers one lightweight request on first open |
| Pagination required to get full dataset | Single request, no pagination |

---

## Shared filter parameters (all new endpoints accept these query params)

| Param | Type | Example | Notes |
|-------|------|---------|-------|
| `from` | ISO date | `2024-10-01` | Defaults to 90 days ago |
| `to` | ISO date | `2025-01-01` | Defaults to today |
| `farmId` | GUID | | Optional |
| `fieldId` | GUID | | Optional |
| `scoutId` | string (userId) | | Optional |

---

## Tab-by-tab endpoint plan

---

### R0 — Overview `GET /analytics/overview`

**What the current renderer computes:**
- KPIs: total sessions, completed, active traps count, threshold breaches
- 8-week observation trend (bar)
- Completion rate %
- Top 6 pests (name + count)

**SQL design:**

```sql
-- KPIs
SELECT
  COUNT(DISTINCT ss.Id)                                           AS TotalSessions,
  COUNT(DISTINCT CASE WHEN ss.CompletedAt IS NOT NULL THEN ss.Id END) AS CompletedSessions,
  SUM(ISNULL(o.Count, 0))                                        AS TotalObservations,
  SUM(CASE WHEN o.ThresholdCount IS NOT NULL
            AND ISNULL(o.Count,0) > o.ThresholdCount THEN 1 ELSE 0 END) AS ThresholdBreaches
FROM ScoutingSessions ss
LEFT JOIN SessionObservations o ON o.ScoutingSessionId = ss.Id
WHERE ss.TenantId = @TenantId
  AND ss.CompletedAt BETWEEN @From AND @To
  /* + optional farm/field/scout filters */

-- Weekly observation trend (last 8 weeks)
SELECT
  DATEPART(ISO_WEEK, ss.CompletedAt) AS WeekNum,
  MIN(CAST(ss.CompletedAt AS date))  AS WeekStart,
  SUM(ISNULL(o.Count, 0))           AS TotalObs
FROM ScoutingSessions ss
JOIN SessionObservations o ON o.ScoutingSessionId = ss.Id
WHERE ss.TenantId = @TenantId
  AND ss.CompletedAt >= DATEADD(WEEK, -8, GETUTCDATE())
GROUP BY DATEPART(ISO_WEEK, ss.CompletedAt)
ORDER BY WeekNum

-- Top 6 pests
SELECT TOP 6
  p.CommonName AS PestName,
  SUM(ISNULL(o.Count, 0)) AS TotalCount
FROM SessionObservations o
JOIN ScoutingSessions ss ON ss.Id = o.ScoutingSessionId
JOIN Pests p ON p.Id = o.PestId
WHERE ss.TenantId = @TenantId
  AND o.IsUnknownPest = 0
  AND ss.CompletedAt BETWEEN @From AND @To
GROUP BY p.CommonName
ORDER BY TotalCount DESC
```

**Response shape:**
```json
{
  "kpis": { "totalSessions": 0, "completedSessions": 0, "totalObservations": 0, "thresholdBreaches": 0 },
  "weeklyTrend": [{ "weekStart": "2025-01-06", "totalObs": 0 }],
  "topPests": [{ "pestName": "", "totalCount": 0 }]
}
```

---

### R1 — Threshold Alerts `GET /analytics/alerts`

**What the current renderer computes:**
- KPIs: total breaches, species above threshold, fields affected, repeat offenders
- Breach list: pest name, field, farm, count, threshold, scout, date
- Repeat offenders (pest × field breached ≥ 2×)
- 8-week breach-count trend

**SQL design:**

```sql
-- Breach rows
SELECT
  p.CommonName            AS PestName,
  fi.Name                 AS FieldName,
  fa.Name                 AS FarmName,
  o.Count                 AS ObservedCount,
  o.ThresholdCount,
  ss.CompletedAt,
  ss.ScouterId,
  u.FirstName + ' ' + u.LastName AS ScouterName
FROM SessionObservations o
JOIN ScoutingSessions ss ON ss.Id = o.ScoutingSessionId
JOIN Pests p              ON p.Id  = o.PestId
LEFT JOIN Fields fi       ON fi.Id = ss.FieldId
LEFT JOIN Farms fa        ON fa.Id = ss.FarmId
LEFT JOIN AspNetUsers u   ON u.Id  = ss.ScouterId
WHERE ss.TenantId = @TenantId
  AND o.IsUnknownPest = 0
  AND o.ThresholdCount IS NOT NULL
  AND ISNULL(o.Count, 0) > o.ThresholdCount
  AND ss.CompletedAt BETWEEN @From AND @To
ORDER BY ss.CompletedAt DESC

-- Repeat offenders (pest × field >= 2 breaches)
SELECT
  p.CommonName AS PestName,
  fi.Name      AS FieldName,
  COUNT(*)     AS BreachCount
FROM SessionObservations o
JOIN ScoutingSessions ss ON ss.Id = o.ScoutingSessionId
JOIN Pests p              ON p.Id  = o.PestId
LEFT JOIN Fields fi       ON fi.Id = ss.FieldId
WHERE ss.TenantId = @TenantId
  AND o.ThresholdCount IS NOT NULL
  AND ISNULL(o.Count,0) > o.ThresholdCount
  AND ss.CompletedAt BETWEEN @From AND @To
GROUP BY p.CommonName, fi.Name
HAVING COUNT(*) >= 2
ORDER BY BreachCount DESC

-- 8-week breach trend
SELECT
  DATEPART(ISO_WEEK, ss.CompletedAt) AS WeekNum,
  MIN(CAST(ss.CompletedAt AS date))  AS WeekStart,
  COUNT(*)                           AS Breaches
FROM SessionObservations o
JOIN ScoutingSessions ss ON ss.Id = o.ScoutingSessionId
WHERE ss.TenantId = @TenantId
  AND o.ThresholdCount IS NOT NULL
  AND ISNULL(o.Count,0) > o.ThresholdCount
  AND ss.CompletedAt >= DATEADD(WEEK, -8, GETUTCDATE())
GROUP BY DATEPART(ISO_WEEK, ss.CompletedAt)
ORDER BY WeekNum
```

**Response shape:**
```json
{
  "breaches": [{ "pestName":"", "fieldName":"", "farmName":"", "observedCount":0, "thresholdCount":0, "completedAt":"", "scouterName":"" }],
  "repeatOffenders": [{ "pestName":"", "fieldName":"", "breachCount":0 }],
  "weeklyTrend": [{ "weekStart":"", "breaches":0 }]
}
```

---

### R2 — Pest Pressure `GET /analytics/pest-pressure`

**What the current renderer computes:**
- KPIs: fields scouted, avg obs/session, highest-pressure field, total observations
- Per-field: total obs, sessions, avg obs/session, breach count, top 3 pests
- Bar chart: obs per field

**SQL design:**

```sql
SELECT
  fi.Id                                   AS FieldId,
  fi.Name                                 AS FieldName,
  fa.Name                                 AS FarmName,
  COUNT(DISTINCT ss.Id)                   AS SessionCount,
  SUM(ISNULL(o.Count, 0))                AS TotalObs,
  AVG(CAST(ISNULL(o.Count,0) AS float))  AS AvgObsPerSession,
  SUM(CASE WHEN o.ThresholdCount IS NOT NULL
            AND ISNULL(o.Count,0) > o.ThresholdCount THEN 1 ELSE 0 END) AS BreachCount
FROM ScoutingSessions ss
JOIN SessionObservations o ON o.ScoutingSessionId = ss.Id
LEFT JOIN Fields fi         ON fi.Id = ss.FieldId
LEFT JOIN Farms  fa         ON fa.Id = ss.FarmId
WHERE ss.TenantId = @TenantId
  AND ss.CompletedAt BETWEEN @From AND @To
GROUP BY fi.Id, fi.Name, fa.Name
ORDER BY TotalObs DESC

-- Top 3 pests per field (separate query or JSON agg)
SELECT
  ss.FieldId,
  p.CommonName AS PestName,
  SUM(ISNULL(o.Count,0)) AS PestCount,
  ROW_NUMBER() OVER (PARTITION BY ss.FieldId ORDER BY SUM(ISNULL(o.Count,0)) DESC) AS Rank
FROM SessionObservations o
JOIN ScoutingSessions ss ON ss.Id = o.ScoutingSessionId
JOIN Pests p              ON p.Id  = o.PestId
WHERE ss.TenantId = @TenantId
  AND o.IsUnknownPest = 0
  AND ss.CompletedAt BETWEEN @From AND @To
GROUP BY ss.FieldId, p.CommonName
```

**Response shape:**
```json
{
  "fields": [{
    "fieldId":"", "fieldName":"", "farmName":"",
    "sessionCount":0, "totalObs":0, "avgObsPerSession":0.0, "breachCount":0,
    "topPests":[{ "pestName":"", "pestCount":0 }]
  }]
}
```

---

### R3 — Sessions `GET /analytics/sessions-summary`

**What the current renderer computes:**
- KPIs: total, completed, planned, overdue, active; completion rate %; avg/min/max duration
- Per-scout compliance (completed / total)
- 8-week stacked bar (completed / planned / overdue)
- Session table (150 rows)

**SQL design:**

```sql
-- Status counts + duration stats
SELECT
  COUNT(*)                                                              AS Total,
  SUM(CASE WHEN ss.CompletedAt IS NOT NULL THEN 1 ELSE 0 END)         AS Completed,
  SUM(CASE WHEN ss.IsPlanned = 1 AND ss.StartedAt IS NULL
            AND ss.CompletedAt IS NULL
            AND ss.ScheduledDate > GETUTCDATE() THEN 1 ELSE 0 END)    AS Planned,
  SUM(CASE WHEN ss.IsPlanned = 1 AND ss.StartedAt IS NULL
            AND ss.CompletedAt IS NULL
            AND ss.ScheduledDate <= GETUTCDATE() THEN 1 ELSE 0 END)   AS Overdue,
  SUM(CASE WHEN ss.StartedAt IS NOT NULL
            AND ss.CompletedAt IS NULL THEN 1 ELSE 0 END)             AS Active,
  AVG(CASE WHEN ss.CompletedAt IS NOT NULL AND ss.StartedAt IS NOT NULL
            THEN DATEDIFF(MINUTE, ss.StartedAt, ss.CompletedAt) END)  AS AvgDurationMin,
  MIN(CASE WHEN ss.CompletedAt IS NOT NULL AND ss.StartedAt IS NOT NULL
            THEN DATEDIFF(MINUTE, ss.StartedAt, ss.CompletedAt) END)  AS MinDurationMin,
  MAX(CASE WHEN ss.CompletedAt IS NOT NULL AND ss.StartedAt IS NOT NULL
            THEN DATEDIFF(MINUTE, ss.StartedAt, ss.CompletedAt) END)  AS MaxDurationMin
FROM ScoutingSessions ss
WHERE ss.TenantId = @TenantId
  AND COALESCE(ss.CompletedAt, ss.StartedAt, ss.ScheduledDate) BETWEEN @From AND @To

-- Per-scout compliance
SELECT
  u.FirstName + ' ' + u.LastName  AS ScouterName,
  COUNT(*)                         AS Total,
  SUM(CASE WHEN ss.CompletedAt IS NOT NULL THEN 1 ELSE 0 END) AS Completed
FROM ScoutingSessions ss
JOIN AspNetUsers u ON u.Id = ss.ScouterId
WHERE ss.TenantId = @TenantId
  AND COALESCE(ss.CompletedAt, ss.StartedAt, ss.ScheduledDate) BETWEEN @From AND @To
GROUP BY ss.ScouterId, u.FirstName, u.LastName
ORDER BY Total DESC

-- 8-week stacked counts
SELECT
  DATEPART(ISO_WEEK, COALESCE(ss.CompletedAt, ss.StartedAt, ss.ScheduledDate)) AS WeekNum,
  MIN(CAST(COALESCE(ss.CompletedAt, ss.StartedAt, ss.ScheduledDate) AS date))  AS WeekStart,
  SUM(CASE WHEN ss.CompletedAt IS NOT NULL THEN 1 ELSE 0 END)  AS Completed,
  SUM(CASE WHEN ss.IsPlanned=1 AND ss.StartedAt IS NULL
            AND ss.CompletedAt IS NULL
            AND ss.ScheduledDate > GETUTCDATE() THEN 1 ELSE 0 END) AS Planned,
  SUM(CASE WHEN ss.IsPlanned=1 AND ss.StartedAt IS NULL
            AND ss.CompletedAt IS NULL
            AND ss.ScheduledDate <= GETUTCDATE() THEN 1 ELSE 0 END) AS Overdue
FROM ScoutingSessions ss
WHERE ss.TenantId = @TenantId
  AND COALESCE(ss.CompletedAt, ss.StartedAt, ss.ScheduledDate) >= DATEADD(WEEK,-8,GETUTCDATE())
GROUP BY DATEPART(ISO_WEEK, COALESCE(ss.CompletedAt, ss.StartedAt, ss.ScheduledDate))
ORDER BY WeekNum

-- Session table (150 rows, most recent first)
SELECT TOP 150
  ss.Id, ss.ScheduledDate, ss.StartedAt, ss.CompletedAt, ss.IsPlanned,
  fi.Name AS FieldName, fa.Name AS FarmName,
  u.FirstName + ' ' + u.LastName AS ScouterName,
  ss.WeatherConditions, ss.TemperatureCelsius,
  DATEDIFF(MINUTE, ss.StartedAt, ss.CompletedAt) AS DurationMin,
  COUNT(o.Id) AS ObsCount
FROM ScoutingSessions ss
LEFT JOIN Fields fi ON fi.Id = ss.FieldId
LEFT JOIN Farms  fa ON fa.Id = ss.FarmId
LEFT JOIN AspNetUsers u ON u.Id = ss.ScouterId
LEFT JOIN SessionObservations o ON o.ScoutingSessionId = ss.Id
WHERE ss.TenantId = @TenantId
  AND COALESCE(ss.CompletedAt, ss.StartedAt, ss.ScheduledDate) BETWEEN @From AND @To
GROUP BY ss.Id, ss.ScheduledDate, ss.StartedAt, ss.CompletedAt, ss.IsPlanned,
         fi.Name, fa.Name, u.FirstName, u.LastName,
         ss.WeatherConditions, ss.TemperatureCelsius
ORDER BY COALESCE(ss.CompletedAt, ss.StartedAt, ss.ScheduledDate) DESC
```

**Response shape:**
```json
{
  "kpis": { "total":0,"completed":0,"planned":0,"overdue":0,"active":0,"completionRate":0.0,"avgDurationMin":0,"minDurationMin":0,"maxDurationMin":0 },
  "scoutCompliance": [{ "scouterName":"","total":0,"completed":0 }],
  "weeklyStacked": [{ "weekStart":"","completed":0,"planned":0,"overdue":0 }],
  "sessions": [{ "id":"","scheduledDate":"","fieldName":"","farmName":"","scouterName":"","durationMin":0,"obsCount":0 }]
}
```

---

### R4 — Top Pests `GET /analytics/top-pests`

**What the current renderer computes:**
- KPIs: unique species, total observations, species above threshold, most widespread
- Per-pest: count, field count, session count, breach count, top life stage, category
- Category doughnut, top 10 bar chart

**SQL design:**

```sql
SELECT
  p.Id                                                                    AS PestId,
  p.CommonName                                                            AS PestName,
  p.Category,
  SUM(ISNULL(o.Count,0))                                                AS TotalCount,
  COUNT(DISTINCT ss.FieldId)                                             AS FieldCount,
  COUNT(DISTINCT ss.Id)                                                  AS SessionCount,
  SUM(CASE WHEN o.ThresholdCount IS NOT NULL
            AND ISNULL(o.Count,0) > o.ThresholdCount THEN 1 ELSE 0 END) AS BreachCount,
  MAX(o.ThresholdCount)                                                  AS ThresholdCount
FROM SessionObservations o
JOIN ScoutingSessions ss ON ss.Id = o.ScoutingSessionId
JOIN Pests p              ON p.Id = o.PestId
WHERE ss.TenantId = @TenantId
  AND o.IsUnknownPest = 0
  AND ss.CompletedAt BETWEEN @From AND @To
GROUP BY p.Id, p.CommonName, p.Category
ORDER BY TotalCount DESC

-- Top life stage per pest
SELECT
  o.PestId,
  o.LifeStage,
  COUNT(*) AS StageCount,
  ROW_NUMBER() OVER (PARTITION BY o.PestId ORDER BY COUNT(*) DESC) AS Rank
FROM SessionObservations o
JOIN ScoutingSessions ss ON ss.Id = o.ScoutingSessionId
WHERE ss.TenantId = @TenantId
  AND o.IsUnknownPest = 0
  AND o.LifeStage IS NOT NULL
  AND ss.CompletedAt BETWEEN @From AND @To
GROUP BY o.PestId, o.LifeStage
```

**Response shape:**
```json
{
  "pests": [{
    "pestId":"", "pestName":"", "category":"",
    "totalCount":0, "fieldCount":0, "sessionCount":0, "breachCount":0,
    "thresholdCount":0, "topLifeStage":""
  }]
}
```

---

### R5 — Trap Performance `GET /analytics/trap-performance`

**What the current renderer computes:**
- KPIs: active traps, total catches, avg catch rate, overdue checks (> 7 days)
- Per-trap: catches, checks, catch rate, last checked date, top pest
- Catches by trap type (doughnut)

**SQL design:**

```sql
-- Per-trap aggregates
SELECT
  t.Id                                         AS TrapId,
  t.Name                                       AS TrapName,
  t.TrapType,
  t.IsEnabled,
  fi.Name                                      AS FieldName,
  fa.Name                                      AS FarmName,
  COUNT(DISTINCT ss.Id)                        AS CheckCount,
  SUM(ISNULL(o.Count,0))                      AS TotalCatches,
  MAX(ss.CompletedAt)                          AS LastChecked,
  DATEDIFF(DAY, MAX(ss.CompletedAt), GETUTCDATE()) AS DaysSinceCheck
FROM Traps t
LEFT JOIN Fields fi ON fi.Id = t.FieldId
LEFT JOIN Farms  fa ON fa.Id = fi.FarmId
LEFT JOIN SessionObservations o ON o.TrapId = t.Id
LEFT JOIN ScoutingSessions ss   ON ss.Id = o.ScoutingSessionId
  AND ss.CompletedAt BETWEEN @From AND @To
WHERE t.TenantId = @TenantId
GROUP BY t.Id, t.Name, t.TrapType, t.IsEnabled, fi.Name, fa.Name
ORDER BY TotalCatches DESC

-- Top pest per trap
SELECT
  o.TrapId,
  p.CommonName AS PestName,
  SUM(ISNULL(o.Count,0)) AS CatchCount,
  ROW_NUMBER() OVER (PARTITION BY o.TrapId ORDER BY SUM(ISNULL(o.Count,0)) DESC) AS Rank
FROM SessionObservations o
JOIN ScoutingSessions ss ON ss.Id = o.ScoutingSessionId
JOIN Pests p              ON p.Id = o.PestId
WHERE ss.TenantId = @TenantId
  AND ss.CompletedAt BETWEEN @From AND @To
GROUP BY o.TrapId, p.CommonName
```

**Response shape:**
```json
{
  "traps": [{
    "trapId":"", "trapName":"", "trapType":"", "isEnabled":true,
    "fieldName":"", "farmName":"",
    "checkCount":0, "totalCatches":0, "catchRate":0.0,
    "lastChecked":"", "daysSinceCheck":0, "topPest":""
  }],
  "catchesByType": [{ "trapType":"", "totalCatches":0 }]
}
```

---

### R6 — Scout Productivity `GET /analytics/scout-productivity`

**What the current renderer computes:**
- KPIs: total scouts, total sessions, avg sessions/scout, top scout name
- Per-scout: sessions, completed, completion rate, avg duration, total obs, obs/session, field count, alerts, overdue
- Top 5 scouts 8-week stacked bar

**SQL design:**

```sql
SELECT
  ss.ScouterId,
  u.FirstName + ' ' + u.LastName                                          AS ScouterName,
  COUNT(DISTINCT ss.Id)                                                   AS TotalSessions,
  SUM(CASE WHEN ss.CompletedAt IS NOT NULL THEN 1 ELSE 0 END)            AS Completed,
  AVG(CASE WHEN ss.CompletedAt IS NOT NULL AND ss.StartedAt IS NOT NULL
            THEN CAST(DATEDIFF(MINUTE, ss.StartedAt, ss.CompletedAt) AS float) END) AS AvgDurationMin,
  SUM(ISNULL(o.Count,0))                                                 AS TotalObs,
  COUNT(DISTINCT ss.FieldId)                                             AS FieldCount,
  SUM(CASE WHEN o.ThresholdCount IS NOT NULL
            AND ISNULL(o.Count,0) > o.ThresholdCount THEN 1 ELSE 0 END) AS AlertCount,
  SUM(CASE WHEN ss.IsPlanned=1 AND ss.StartedAt IS NULL
            AND ss.CompletedAt IS NULL
            AND ss.ScheduledDate <= GETUTCDATE() THEN 1 ELSE 0 END)     AS OverdueCount
FROM ScoutingSessions ss
LEFT JOIN AspNetUsers u ON u.Id = ss.ScouterId
LEFT JOIN SessionObservations o ON o.ScoutingSessionId = ss.Id
WHERE ss.TenantId = @TenantId
  AND COALESCE(ss.CompletedAt, ss.StartedAt, ss.ScheduledDate) BETWEEN @From AND @To
GROUP BY ss.ScouterId, u.FirstName, u.LastName
ORDER BY TotalSessions DESC

-- 8-week per-scout weekly completed (top 5 scouts only)
SELECT
  ss.ScouterId,
  DATEPART(ISO_WEEK, ss.CompletedAt)                   AS WeekNum,
  MIN(CAST(ss.CompletedAt AS date))                    AS WeekStart,
  COUNT(*)                                              AS CompletedCount
FROM ScoutingSessions ss
WHERE ss.TenantId = @TenantId
  AND ss.CompletedAt >= DATEADD(WEEK,-8,GETUTCDATE())
  AND ss.ScouterId IN (/* top 5 scout IDs from first query */)
GROUP BY ss.ScouterId, DATEPART(ISO_WEEK, ss.CompletedAt)
ORDER BY ss.ScouterId, WeekNum
```

**Response shape:**
```json
{
  "scouts": [{
    "scouterName":"", "totalSessions":0, "completed":0, "completionRate":0.0,
    "avgDurationMin":0.0, "totalObs":0, "obsPerSession":0.0,
    "fieldCount":0, "alertCount":0, "overdueCount":0
  }],
  "weeklyActivity": [{ "scouterName":"", "weekStart":"", "completedCount":0 }]
}
```

---

### R7 — Seasonal Trends `GET /analytics/seasonal-trends`

**What the current renderer computes:**
- KPIs: peak month, avg obs/month, months tracked, top pest for period
- Per-month (last 18): total obs, sessions, avg temperature, top 3 pests
- Dual-axis line chart: obs count + avg temp

**SQL design:**

```sql
SELECT
  FORMAT(ss.CompletedAt, 'yyyy-MM')   AS MonthKey,
  FORMAT(ss.CompletedAt, 'MMM yyyy')  AS MonthLabel,
  COUNT(DISTINCT ss.Id)               AS SessionCount,
  SUM(ISNULL(o.Count,0))             AS TotalObs,
  AVG(ss.TemperatureCelsius)          AS AvgTempCelsius
FROM ScoutingSessions ss
LEFT JOIN SessionObservations o ON o.ScoutingSessionId = ss.Id
WHERE ss.TenantId = @TenantId
  AND ss.CompletedAt IS NOT NULL
  AND ss.CompletedAt >= DATEADD(MONTH, -18, GETUTCDATE())
GROUP BY FORMAT(ss.CompletedAt, 'yyyy-MM'), FORMAT(ss.CompletedAt, 'MMM yyyy')
ORDER BY MonthKey

-- Top 3 pests per month
SELECT
  FORMAT(ss.CompletedAt, 'yyyy-MM') AS MonthKey,
  p.CommonName                      AS PestName,
  SUM(ISNULL(o.Count,0))           AS PestCount,
  ROW_NUMBER() OVER (
    PARTITION BY FORMAT(ss.CompletedAt, 'yyyy-MM')
    ORDER BY SUM(ISNULL(o.Count,0)) DESC
  ) AS Rank
FROM SessionObservations o
JOIN ScoutingSessions ss ON ss.Id = o.ScoutingSessionId
JOIN Pests p              ON p.Id = o.PestId
WHERE ss.TenantId = @TenantId
  AND o.IsUnknownPest = 0
  AND ss.CompletedAt >= DATEADD(MONTH, -18, GETUTCDATE())
GROUP BY FORMAT(ss.CompletedAt, 'yyyy-MM'), p.CommonName
```

**Response shape:**
```json
{
  "months": [{
    "monthKey":"2025-01", "monthLabel":"Jan 2025",
    "sessionCount":0, "totalObs":0, "avgTempCelsius":null,
    "topPests":[{ "pestName":"", "pestCount":0 }]
  }]
}
```

---

### R8 — Unknown Pests `GET /analytics/unknown-pests`

**What the current renderer computes:**
- KPIs: total unknown sightings, with photos, with notes, fields affected
- Priority list: count ≥ 5 or has photos
- Full table: date, farm, field, scout, count, life stage, photo count, notes
- 8-week trend (weekly unknown sightings)

**SQL design:**

```sql
SELECT
  o.Id                                            AS ObservationId,
  ss.CompletedAt,
  ss.StartedAt,
  fi.Name                                         AS FieldName,
  fa.Name                                         AS FarmName,
  u.FirstName + ' ' + u.LastName                 AS ScouterName,
  ISNULL(o.Count,0)                              AS Count,
  o.LifeStage,
  o.Notes,
  o.PhotoUrls,
  CASE WHEN o.PhotoUrls IS NOT NULL
        AND LEN(o.PhotoUrls) > 2 THEN 1 ELSE 0 END AS HasPhotos
FROM SessionObservations o
JOIN ScoutingSessions ss ON ss.Id = o.ScoutingSessionId
LEFT JOIN Fields fi       ON fi.Id = ss.FieldId
LEFT JOIN Farms  fa       ON fa.Id = ss.FarmId
LEFT JOIN AspNetUsers u   ON u.Id  = ss.ScouterId
WHERE ss.TenantId = @TenantId
  AND o.IsUnknownPest = 1
  AND COALESCE(ss.CompletedAt, ss.StartedAt) BETWEEN @From AND @To
ORDER BY COALESCE(ss.CompletedAt, ss.StartedAt) DESC

-- 8-week trend
SELECT
  DATEPART(ISO_WEEK, COALESCE(ss.CompletedAt, ss.StartedAt)) AS WeekNum,
  MIN(CAST(COALESCE(ss.CompletedAt, ss.StartedAt) AS date))  AS WeekStart,
  COUNT(*)                                                    AS UnknownCount
FROM SessionObservations o
JOIN ScoutingSessions ss ON ss.Id = o.ScoutingSessionId
WHERE ss.TenantId = @TenantId
  AND o.IsUnknownPest = 1
  AND COALESCE(ss.CompletedAt, ss.StartedAt) >= DATEADD(WEEK,-8,GETUTCDATE())
GROUP BY DATEPART(ISO_WEEK, COALESCE(ss.CompletedAt, ss.StartedAt))
ORDER BY WeekNum
```

**Response shape:**
```json
{
  "kpis": { "total":0, "withPhotos":0, "withNotes":0, "fieldsAffected":0 },
  "items": [{
    "observationId":"", "completedAt":"", "fieldName":"", "farmName":"",
    "scouterName":"", "count":0, "lifeStage":null, "notes":"",
    "photoUrls":[], "isPriority":false
  }],
  "weeklyTrend": [{ "weekStart":"", "unknownCount":0 }]
}
```

---

### R9 — Field Coverage `GET /analytics/field-coverage`

**What the current renderer computes:**
- KPIs: fully covered (≥ 4 sessions this month), partially covered, not scouted this month, never scouted
- Per-field: sessions this month, total sessions, coverage % (target = 4/month), days since last session, top pest
- Bar chart: coverage % per field (top 12)

**SQL design:**

```sql
-- Per-field coverage
SELECT
  fi.Id                                          AS FieldId,
  fi.Name                                        AS FieldName,
  fa.Name                                        AS FarmName,
  COUNT(DISTINCT CASE
    WHEN MONTH(ss.CompletedAt) = MONTH(GETUTCDATE())
     AND YEAR(ss.CompletedAt)  = YEAR(GETUTCDATE())
    THEN ss.Id END)                              AS SessionsThisMonth,
  COUNT(DISTINCT ss.Id)                          AS TotalSessions,
  MAX(ss.CompletedAt)                            AS LastSessionAt,
  DATEDIFF(DAY, MAX(ss.CompletedAt), GETUTCDATE()) AS DaysSinceLastSession
FROM Fields fi
LEFT JOIN Farms fa ON fa.Id = fi.FarmId
LEFT JOIN ScoutingSessions ss ON ss.FieldId = fi.Id
  AND ss.CompletedAt IS NOT NULL
  AND ss.TenantId = @TenantId
WHERE fi.TenantId = @TenantId
GROUP BY fi.Id, fi.Name, fa.Name
ORDER BY SessionsThisMonth ASC

-- Top pest per field
SELECT
  ss.FieldId,
  p.CommonName AS PestName,
  SUM(ISNULL(o.Count,0)) AS PestCount,
  ROW_NUMBER() OVER (PARTITION BY ss.FieldId ORDER BY SUM(ISNULL(o.Count,0)) DESC) AS Rank
FROM SessionObservations o
JOIN ScoutingSessions ss ON ss.Id = o.ScoutingSessionId
JOIN Pests p              ON p.Id = o.PestId
WHERE ss.TenantId = @TenantId
  AND o.IsUnknownPest = 0
  AND ss.CompletedAt BETWEEN @From AND @To
GROUP BY ss.FieldId, p.CommonName
```

**Response shape:**
```json
{
  "targetPerMonth": 4,
  "fields": [{
    "fieldId":"", "fieldName":"", "farmName":"",
    "sessionsThisMonth":0, "totalSessions":0,
    "coveragePct":0, "lastSessionAt":null, "daysSinceLastSession":null,
    "topPest":""
  }]
}
```

---

### R10 — Billing & Quota `GET /analytics/billing`

**What the current renderer computes:**
- KPIs: YTD spend, latest invoice amount, quota (max monitoring points), active/quota %
- Quota utilisation progress bar
- Per-month billing table: active points, amount, status, MoM change
- Monthly billing bar chart (last 12 months)

> **Note:** Billing data comes from `BillingSnapshots`, not observations.
> This tab is **already lightweight** — `BillingSnapshots` will never grow to 200k rows.
> It can keep using the existing `GET /billing` endpoint or get a minimal dedicated endpoint.

**SQL design:**

```sql
-- All billing snapshots for tenant (already in API as GET /billing)
SELECT
  bs.BillingMonth,
  bs.ActivePointCount,
  bs.AmountCents,
  bs.Status
FROM BillingSnapshots bs
WHERE bs.TenantId = @TenantId
ORDER BY bs.BillingMonth DESC

-- Active trap count (for quota utilisation)
SELECT COUNT(*) AS ActiveTraps
FROM Traps
WHERE TenantId = @TenantId
  AND IsEnabled = 1
```

**Response shape:**
```json
{
  "activeTraps": 0,
  "snapshots": [{
    "billingMonth":"", "activePointCount":0, "amountCents":0, "status":""
  }]
}
```

---

## Implementation checklist

### Phase 1 — New API endpoints (AnalyticsController.cs)

- [ ] `GET /analytics/overview`
- [ ] `GET /analytics/alerts`
- [ ] `GET /analytics/pest-pressure`
- [ ] `GET /analytics/sessions-summary`
- [ ] `GET /analytics/top-pests`
- [ ] `GET /analytics/trap-performance`
- [ ] `GET /analytics/scout-productivity`
- [ ] `GET /analytics/seasonal-trends`
- [ ] `GET /analytics/unknown-pests`
- [ ] `GET /analytics/field-coverage`
- [ ] `GET /analytics/billing` *(or reuse existing)*

All endpoints: EF Core `FromSqlRaw` / LINQ projections with `AsNoTracking()`.  
Global query filters already handle tenant isolation — no need for manual `TenantId` WHERE clause in EF LINQ (use raw SQL for complex aggregations).

### Phase 2 — JS API layer (js/api/analytics.js)

- [ ] Add one `fetch` function per endpoint (e.g. `getOverview(filters)`, `getAlerts(filters)`)
- [ ] Remove `getAllAnalyticsSessions` call from `reports.js` top-level load
- [ ] Pass `filters` object as query string params on each call

### Phase 3 — Tab renderers (r0–r10)

- [ ] Each renderer receives pre-aggregated data — remove all in-JS aggregation loops
- [ ] `showTab()` in `reports.js` becomes `async` and awaits the per-tab API call on first render
- [ ] Cache last result per tab key so re-render on filter change re-fetches, not tab-switch

### Phase 4 — Remove old endpoint

- [ ] Delete or deprecate `GET /analytics/sessions` once all tabs are migrated
- [ ] Keep `GET /scouting-sessions` (standard CRUD, no observations) untouched

---

## EF Core implementation notes

- Use `db.Database.SqlQueryRaw<TResult>(sql, params)` (.NET 8+) for complex aggregations.
- Use LINQ projections with `GroupBy` for simpler aggregations (R3 status counts, R6 scout totals).
- Always call `.AsNoTracking()`.
- Pass `@TenantId` as `SqlParameter` — do not string-interpolate.
- `applyFilters()` in `utils.js` can be removed once all tabs are server-driven; keep it only as a client-side fallback or delete it entirely.
