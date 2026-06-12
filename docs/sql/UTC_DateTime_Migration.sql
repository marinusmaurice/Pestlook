/* ============================================================================
   PESTLOOK — UTC DATE/TIME MIGRATION                                2026-06-12
   ============================================================================

   CONTEXT
   -------
   Until this migration the application wrote LOCAL times into datetime2
   columns with no timezone information:

     • WebAPI (hosted in US Eastern)  → wrote US Eastern local time
     • MAUI mobile app (South Africa) → wrote SAST (UTC+2) local time

   The database therefore contains a MIX of US-Eastern and SAST wall-clock
   values that differ from UTC by -4/-5h and +2h respectively. From the
   application release accompanying this script, ONLY UTC is ever written.

   This script:
     1. Adds Users.Timezone (also covered by EF migration "AddUserTimezone").
     2. One-time corrects existing data to UTC, column by column.

   ⚠ RUN ONCE, on a maintenance window, AFTER deploying the new application
     build and BACKING UP the database. Set @CutoverUtc to the moment the new
     (UTC-writing) build went live so already-UTC rows are not double-shifted.

   COLUMN TYPES: datetime2 is retained. The application layer now guarantees
   UTC-only input (EF value converter + JSON converters), which makes
   datetime2 acceptable per the migration rules. If you later want offsets
   physically stored, convert columns to datetimeoffset — with all values
   already UTC that becomes a lossless metadata change.

   ============================================================================
   1. USERS.TIMEZONE  (matches EF migration 20260612_AddUserTimezone)
   ============================================================================ */

IF NOT EXISTS (SELECT 1 FROM sys.columns
               WHERE object_id = OBJECT_ID('dbo.Users') AND name = 'Timezone')
BEGIN
    ALTER TABLE dbo.Users ADD [Timezone] nvarchar(100) NULL;
    -- IANA id, e.g. 'Africa/Johannesburg'. NULL until the web app detects and
    -- saves the browser timezone on the user's first login.
END
GO

/* ============================================================================
   2. ONE-TIME DATA CORRECTION
   ============================================================================

   Writer inventory — which app wrote each column:

   ┌───────────────────────────────┬──────────────────────┬──────────────────┐
   │ Table.Column                  │ Writer               │ Stored as        │
   ├───────────────────────────────┼──────────────────────┼──────────────────┤
   │ Tenants.CreatedAt             │ WebAPI               │ US Eastern       │
   │ RefreshTokens.CreatedAt       │ WebAPI               │ US Eastern       │
   │ RefreshTokens.ExpiresAt       │ WebAPI               │ US Eastern       │
   │ RefreshTokens.RevokedAt       │ WebAPI               │ US Eastern       │
   │ AuditLogs.Timestamp           │ WebAPI               │ US Eastern       │
   │ ExceptionLogs.Timestamp       │ WebAPI               │ US Eastern       │
   │ Farms.CreatedAt/UpdatedAt/    │ WebAPI               │ US Eastern       │
   │      DeletedAt                │                      │                  │
   │ Fields.CreatedAt/UpdatedAt/   │ WebAPI               │ US Eastern       │
   │      DeletedAt                │                      │                  │
   │ TrapTypes.CreatedAt/UpdatedAt/│ WebAPI               │ US Eastern       │
   │      DeletedAt                │ (system seed rows are│ (skip seed rows) │
   │                               │  fixed 2025-01-01)   │                  │
   │ Pests.CreatedAt/DeletedAt     │ WebAPI               │ US Eastern       │
   │ Traps.CreatedAt/UpdatedAt/    │ WebAPI               │ US Eastern       │
   │      DeletedAt                │                      │                  │
   │ BillingSnapshots.CreatedAt    │ WebAPI               │ US Eastern       │
   │ BillingSnapshots.BillingMonth │ month KEY (yyyy-MM-01│ DO NOT SHIFT     │
   │                               │ marker, not instant) │                  │
   │ Feedbacks.CreatedAt/UpdatedAt/│ WebAPI               │ US Eastern       │
   │      DeletedAt                │                      │                  │
   │ ScoutingSessions.CreatedAt/   │ WebAPI               │ US Eastern       │
   │      DeletedAt                │                      │                  │
   │ Users.LockedUntil             │ WebAPI               │ US Eastern       │
   ├───────────────────────────────┼──────────────────────┼──────────────────┤
   │ ScoutingSessions.StartedAt    │ ⚠ MIXED: MAUI device │ SAST (UTC+2) or  │
   │ ScoutingSessions.CompletedAt  │   OR WebAPI          │ US Eastern       │
   │ ScoutingSessions.ScheduledDate│ ⚠ JS datetime-local  │ Browser local    │
   │                               │   (no conversion)    │ (SAST for SA     │
   │                               │                      │  users)          │
   │ SessionObservations.ObservedAt│ MAUI device          │ SAST (UTC+2)     │
   │ SessionObservations.CreatedAt │ WebAPI (at sync)     │ US Eastern       │
   └───────────────────────────────┴──────────────────────┴──────────────────┘

   ⚠ THE MIXED-DATA PROBLEM, explicitly:
   ScoutingSessions.StartedAt / CompletedAt were written by BOTH apps with no
   record of which. Web-created sessions ("start now" in the browser →
   server-side DateTime.Now) hold US Eastern; mobile-captured sessions hold
   SAST. The same column can be wrong by -4/-5h in one row and +2h in the
   next, and NO QUERY can distinguish them with certainty. The script below
   uses a heuristic (sessions whose StartedAt is within ±10 min of CreatedAt
   in Eastern terms were server-generated; the rest are mobile). REVIEW the
   verification SELECTs before committing, and adjust per your knowledge of
   which tenants used which client.

   DST NOTE: the request asked for DATEADD; for the US Eastern shift a fixed
   DATEADD(HOUR, 5, …) is WRONG for half the year (EDT = UTC-4). The script
   uses AT TIME ZONE, which applies the correct historical offset per row.
   The SAST shift has no DST, so a fixed DATEADD(HOUR, -2, …) is exact.
   ============================================================================ */

BEGIN TRANSACTION;

-- The moment the UTC-writing build went live. Rows at/after this are already
-- UTC and must NOT be shifted. SET THIS BEFORE RUNNING.
DECLARE @CutoverUtc datetime2 = '2026-06-12T00:00:00';

/* ── Helper pattern ──────────────────────────────────────────────────────────
   Eastern → UTC (DST-aware):
     CONVERT(datetime2, (col AT TIME ZONE 'Eastern Standard Time') AT TIME ZONE 'UTC')
   SAST → UTC (fixed, no DST):
     DATEADD(HOUR, -2, col)
─────────────────────────────────────────────────────────────────────────── */

/* ── 2a. Server-generated columns: US Eastern → UTC ───────────────────────── */

UPDATE dbo.Tenants SET CreatedAt =
    CONVERT(datetime2, (CreatedAt AT TIME ZONE 'Eastern Standard Time') AT TIME ZONE 'UTC')
WHERE CreatedAt < @CutoverUtc;

UPDATE dbo.RefreshTokens SET
    CreatedAt = CONVERT(datetime2, (CreatedAt AT TIME ZONE 'Eastern Standard Time') AT TIME ZONE 'UTC'),
    ExpiresAt = CONVERT(datetime2, (ExpiresAt AT TIME ZONE 'Eastern Standard Time') AT TIME ZONE 'UTC'),
    RevokedAt = CONVERT(datetime2, (RevokedAt AT TIME ZONE 'Eastern Standard Time') AT TIME ZONE 'UTC')
WHERE CreatedAt < @CutoverUtc;

UPDATE dbo.AuditLogs SET [Timestamp] =
    CONVERT(datetime2, ([Timestamp] AT TIME ZONE 'Eastern Standard Time') AT TIME ZONE 'UTC')
WHERE [Timestamp] < @CutoverUtc;

UPDATE dbo.ExceptionLogs SET [Timestamp] =
    CONVERT(datetime2, ([Timestamp] AT TIME ZONE 'Eastern Standard Time') AT TIME ZONE 'UTC')
WHERE [Timestamp] < @CutoverUtc;

UPDATE dbo.Farms SET
    CreatedAt = CONVERT(datetime2, (CreatedAt AT TIME ZONE 'Eastern Standard Time') AT TIME ZONE 'UTC'),
    UpdatedAt = CONVERT(datetime2, (UpdatedAt AT TIME ZONE 'Eastern Standard Time') AT TIME ZONE 'UTC'),
    DeletedAt = CONVERT(datetime2, (DeletedAt AT TIME ZONE 'Eastern Standard Time') AT TIME ZONE 'UTC')
WHERE CreatedAt < @CutoverUtc;

UPDATE dbo.Fields SET
    CreatedAt = CONVERT(datetime2, (CreatedAt AT TIME ZONE 'Eastern Standard Time') AT TIME ZONE 'UTC'),
    UpdatedAt = CONVERT(datetime2, (UpdatedAt AT TIME ZONE 'Eastern Standard Time') AT TIME ZONE 'UTC'),
    DeletedAt = CONVERT(datetime2, (DeletedAt AT TIME ZONE 'Eastern Standard Time') AT TIME ZONE 'UTC')
WHERE CreatedAt < @CutoverUtc;

-- Skip the 11 system seed rows (fixed marker date 2025-01-01, TenantId NULL)
UPDATE dbo.TrapTypes SET
    CreatedAt = CONVERT(datetime2, (CreatedAt AT TIME ZONE 'Eastern Standard Time') AT TIME ZONE 'UTC'),
    UpdatedAt = CONVERT(datetime2, (UpdatedAt AT TIME ZONE 'Eastern Standard Time') AT TIME ZONE 'UTC'),
    DeletedAt = CONVERT(datetime2, (DeletedAt AT TIME ZONE 'Eastern Standard Time') AT TIME ZONE 'UTC')
WHERE CreatedAt < @CutoverUtc
  AND NOT (TenantId IS NULL AND CreatedAt = '2025-01-01T00:00:00');

UPDATE dbo.Pests SET
    CreatedAt = CONVERT(datetime2, (CreatedAt AT TIME ZONE 'Eastern Standard Time') AT TIME ZONE 'UTC'),
    DeletedAt = CONVERT(datetime2, (DeletedAt AT TIME ZONE 'Eastern Standard Time') AT TIME ZONE 'UTC')
WHERE CreatedAt < @CutoverUtc;

UPDATE dbo.Traps SET
    CreatedAt = CONVERT(datetime2, (CreatedAt AT TIME ZONE 'Eastern Standard Time') AT TIME ZONE 'UTC'),
    UpdatedAt = CONVERT(datetime2, (UpdatedAt AT TIME ZONE 'Eastern Standard Time') AT TIME ZONE 'UTC'),
    DeletedAt = CONVERT(datetime2, (DeletedAt AT TIME ZONE 'Eastern Standard Time') AT TIME ZONE 'UTC')
WHERE CreatedAt < @CutoverUtc;

-- BillingMonth is a calendar-month KEY (yyyy-MM-01) — intentionally untouched.
UPDATE dbo.BillingSnapshots SET
    CreatedAt = CONVERT(datetime2, (CreatedAt AT TIME ZONE 'Eastern Standard Time') AT TIME ZONE 'UTC')
WHERE CreatedAt < @CutoverUtc;

UPDATE dbo.Feedbacks SET
    CreatedAt = CONVERT(datetime2, (CreatedAt AT TIME ZONE 'Eastern Standard Time') AT TIME ZONE 'UTC'),
    UpdatedAt = CONVERT(datetime2, (UpdatedAt AT TIME ZONE 'Eastern Standard Time') AT TIME ZONE 'UTC'),
    DeletedAt = CONVERT(datetime2, (DeletedAt AT TIME ZONE 'Eastern Standard Time') AT TIME ZONE 'UTC')
WHERE CreatedAt < @CutoverUtc;

-- ScoutingSessions.CreatedAt/DeletedAt are corrected in section 2c, AFTER the
-- StartedAt/CompletedAt heuristic that depends on the uncorrected CreatedAt.

UPDATE dbo.SessionObservations SET
    CreatedAt = CONVERT(datetime2, (CreatedAt AT TIME ZONE 'Eastern Standard Time') AT TIME ZONE 'UTC')
WHERE CreatedAt < @CutoverUtc;

-- Active lockouts only; expired ones are inert
UPDATE dbo.Users SET
    LockedUntil = CONVERT(datetime2, (LockedUntil AT TIME ZONE 'Eastern Standard Time') AT TIME ZONE 'UTC')
WHERE LockedUntil IS NOT NULL;

/* ── 2b. Mobile-generated columns: SAST (UTC+2) → UTC ─────────────────────────
   SessionObservations.ObservedAt is exclusively device-captured.            */

UPDATE dbo.SessionObservations SET
    ObservedAt = DATEADD(HOUR, -2, ObservedAt)
WHERE ObservedAt IS NOT NULL
  AND ObservedAt < @CutoverUtc;

/* ── 2c. ⚠ MIXED columns: ScoutingSessions.StartedAt / CompletedAt /
         ScheduledDate — REVIEW BEFORE RUNNING.

   Heuristic: a session whose StartedAt sits within ±10 minutes of its
   (Eastern-stored) CreatedAt was created server-side ("start now" from the
   web) → shift as Eastern. Everything else came from the mobile sync → shift
   as SAST. Verify the split first:                                          */

SELECT  CASE WHEN ABS(DATEDIFF(MINUTE, StartedAt, CreatedAt)) <= 10
             THEN 'server (Eastern)' ELSE 'mobile (SAST)' END AS InferredWriter,
        COUNT(*) AS Sessions
FROM dbo.ScoutingSessions
WHERE StartedAt IS NOT NULL AND CreatedAt < @CutoverUtc
GROUP BY CASE WHEN ABS(DATEDIFF(MINUTE, StartedAt, CreatedAt)) <= 10
              THEN 'server (Eastern)' ELSE 'mobile (SAST)' END;

-- The heuristic relies on StartedAt and CreatedAt being in the SAME
-- (uncorrected) frame, which is why CreatedAt is shifted only afterwards.

UPDATE s SET
    StartedAt   = CASE WHEN ABS(DATEDIFF(MINUTE, s.StartedAt, s.CreatedAt)) <= 10
                       THEN CONVERT(datetime2, (s.StartedAt AT TIME ZONE 'Eastern Standard Time') AT TIME ZONE 'UTC')
                       ELSE DATEADD(HOUR, -2, s.StartedAt) END,
    CompletedAt = CASE WHEN s.CompletedAt IS NULL THEN NULL
                       WHEN ABS(DATEDIFF(MINUTE, s.StartedAt, s.CreatedAt)) <= 10
                       THEN CONVERT(datetime2, (s.CompletedAt AT TIME ZONE 'Eastern Standard Time') AT TIME ZONE 'UTC')
                       ELSE DATEADD(HOUR, -2, s.CompletedAt) END
FROM dbo.ScoutingSessions s
WHERE s.StartedAt IS NOT NULL AND s.CreatedAt < @CutoverUtc;

-- ScheduledDate was typed in the planner's BROWSER (SA users → SAST):
UPDATE dbo.ScoutingSessions SET
    ScheduledDate = DATEADD(HOUR, -2, ScheduledDate)
WHERE ScheduledDate IS NOT NULL AND CreatedAt < @CutoverUtc;

-- Now (last) correct the server-written session audit columns:
UPDATE dbo.ScoutingSessions SET
    CreatedAt = CONVERT(datetime2, (CreatedAt AT TIME ZONE 'Eastern Standard Time') AT TIME ZONE 'UTC'),
    DeletedAt = CONVERT(datetime2, (DeletedAt AT TIME ZONE 'Eastern Standard Time') AT TIME ZONE 'UTC')
WHERE CreatedAt < @CutoverUtc;

/* ── 3. Verify, then COMMIT ────────────────────────────────────────────────
   Spot-check: recent rows should now read a few hours EARLIER than the
   wall-clock you remember, and StartedAt ≤ CompletedAt must still hold.     */

SELECT TOP 20 Id, StartedAt, CompletedAt, CreatedAt
FROM dbo.ScoutingSessions ORDER BY CreatedAt DESC;

SELECT COUNT(*) AS InvertedSessions
FROM dbo.ScoutingSessions
WHERE CompletedAt IS NOT NULL AND CompletedAt < StartedAt;

-- COMMIT TRANSACTION;   -- run manually after reviewing the SELECTs
-- ROLLBACK TRANSACTION; -- if anything looks wrong
