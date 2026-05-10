import { escapeHtml } from '../utils/helpers.js';

const GROUPS = [
  {
    id: 'web',
    icon: '🌐',
    title: 'Web App',
    intro: 'The Pestlook web application runs in your browser and is the primary management interface for administrators, agronomists, and supervisors.',
    sections: [
  {
    id: 'dashboard',
    icon: '📊',
    title: 'Dashboard',
    intro: 'The Dashboard is your home screen — an at-a-glance view of everything happening across your farms right now.',
    items: [
      { heading: 'Stat Cards', body: 'Four summary tiles at the top show: <strong>Active Farms</strong> (total farms in your organisation), <strong>Traps</strong> (deployed traps, with enabled count), <strong>Scouting Sessions</strong> (total ever recorded), and <strong>Observations</strong> (total pest observations logged across all sessions).' },
      { heading: 'Active Sessions Panel', body: 'Lists sessions currently <em>In Progress</em>. Each row shows the farm, scout name, and start time. Click a row to open the full Session Detail page.' },
      { heading: 'Recent Activity Feed', body: 'A chronological feed of the most recent pest observations. Each entry shows the pest name, session, field, farm, count, and time logged. Useful for spotting emerging problems in near-real time.' },
      { heading: 'Map Panel', body: 'Plots all traps on an interactive map using GPS coordinates. Markers are colour-coded: <span style="color:#4ade80;">●</span> Green = Active, <span style="color:#f87171;">●</span> Red = Inactive, <span style="color:#fbbf24;">●</span> Yellow = Maintenance. Click a marker to see trap details.' },
      { heading: 'Top Pests Panel', body: 'Bar chart of the top 5 most frequently observed pest species in the current period. Use this to quickly identify which species to prioritise.' },
    ],
  },
  {
    id: 'farms',
    icon: '🌾',
    title: 'Farms & Fields',
    intro: 'Farms are the top-level organisational unit. Each farm has one or more fields where scouting and trapping takes place.',
    items: [
      { heading: 'Adding a Farm', body: 'Click <strong>＋ Add Farm</strong>, enter a Farm Name and optional Location, then click <strong>Save</strong>.' },
      { heading: 'Editing a Farm', body: 'Click the farm row (or the ✏️ edit icon), update the details, then click <strong>Save</strong>.' },
      { heading: 'Deleting a Farm', body: 'Click the 🗑️ delete icon and confirm. <strong>Warning:</strong> this also removes all fields, sessions, and associated data — it cannot be undone.' },
      { heading: 'Adding a Field', body: 'Select the parent farm first, then click <strong>＋ Add Field</strong>. Enter the Field Name and optional notes, then click <strong>Save</strong>.' },
      { heading: 'Editing / Deleting a Field', body: 'Click the ✏️ or 🗑️ icons on the field row. Deleting a field affects any traps and sessions attached to it.' },
    ],
  },
  {
    id: 'traps',
    icon: '🕸️',
    title: 'Traps',
    intro: 'Manage all physical monitoring traps deployed across your fields. You can search, filter by status, and sort the table by clicking column headers.',
    items: [
      { heading: 'Adding a Trap', body: 'Click <strong>＋ Add Trap</strong>. Select the Farm and Field, enter a Trap Name, choose a Trap Type (managed in Settings), set the Status, and optionally enter GPS coordinates for the map. Click <strong>Save</strong>.' },
      { heading: 'Editing a Trap', body: 'Click the ✏️ edit icon on the trap row, update the fields, then click <strong>Save</strong>.' },
      { heading: 'Activating / Deactivating', body: 'Change the Status dropdown in the edit modal between <strong>Active</strong> and <strong>Inactive</strong>. Inactive traps are excluded from performance analytics by default.' },
      { heading: 'Deleting a Trap', body: 'Click the 🗑️ icon and confirm. Historical catch data is retained in observations.' },
    ],
  },
  {
    id: 'sessions',
    icon: '🥾',
    title: 'Scouting Sessions',
    intro: 'Scouting Sessions are the core operational records. Each session is a structured field visit where a scout records pest observations. The grid is server-side paginated, sortable, searchable, and filterable.',
    items: [
      { heading: 'Searching & Filtering', body: 'Use the <strong>search box</strong> to filter by farm or scout name. Use the <strong>status dropdown</strong> to show only Planned, In Progress, or Completed sessions. Click any column header to sort; click again to reverse. Use the pagination controls at the bottom to navigate pages.' },
      { heading: 'Planning a Session', body: 'Click <strong>＋ Plan Session</strong>. Select the Farm and Fields, set a Scheduled Date, optionally assign a Scout and add Notes, then click <strong>Save</strong>. The session appears with status <em>Planned</em>.' },
      { heading: 'Editing a Planned Session', body: 'Click the ✏️ edit icon on a <em>Planned</em> row. Update any details and click <strong>Save</strong>.' },
      { heading: 'Starting a Session', body: 'Click <strong>▶ Start</strong> on a Planned session row. The status changes to <em>In Progress</em> and the start time is recorded.' },
      { heading: 'Session Detail Page', body: 'Click any session row to open the full detail page where you can view field maps with observation markers, add/edit/delete individual observations, and complete the session.' },
      { heading: 'Completing a Session', body: 'From the Session Detail page, review all observations then click <strong>Complete Session</strong> and confirm. The status changes to <em>Completed</em> and the end time is recorded.' },
      { heading: 'Date Pills', body: 'The date column shows a small coloured pill: <span style="background:rgba(245,158,11,0.15);color:#f59e0b;border:1px solid rgba(245,158,11,0.4);border-radius:20px;padding:1px 7px;font-size:0.72rem;">Scheduled</span> <span style="background:rgba(74,222,128,0.15);color:#4ade80;border:1px solid rgba(74,222,128,0.4);border-radius:20px;padding:1px 7px;font-size:0.72rem;">Started</span> <span style="background:rgba(129,140,248,0.15);color:#818cf8;border:1px solid rgba(129,140,248,0.4);border-radius:20px;padding:1px 7px;font-size:0.72rem;">Completed</span> — showing which date field is being displayed.' },
    ],
  },
  {
    id: 'analytics',
    icon: '📈',
    title: 'Analytics',
    intro: 'The Analytics section has eleven report tabs. Every tab (except Field Coverage and Billing) shares the same date range, farm, field, and scout filters at the top-right. All tabs refresh when you change the filters. The default date range is the last 90 days.',
    items: [
      // ── Overview ──
      { heading: '📊 Overview — Threshold Breaches', body: 'The number of individual pest observations in the selected period where the count recorded by the scout exceeded the safe action threshold set for that pest. One session can contribute many breaches if multiple pests were over their limits. A value above 0 turns red — drill into the Threshold Alerts tab to see the full list.' },
      { heading: '📊 Overview — Session Compliance', body: 'The percentage of scouting sessions in the period that were completed, calculated as <em>completed sessions ÷ total sessions × 100</em>. Because the Overview filters by completion date, all sessions counted here are already completed, so this will normally read 100% — the more detailed per-scout breakdown is on the Sessions Summary tab.' },
      { heading: '📊 Overview — Active Traps', body: 'How many traps are currently switched on across the selected farm or field. This figure is <strong>not</strong> affected by the date range — it always shows the current state of your traps. The subtitle shows how many are disabled.' },
      { heading: '📊 Overview — Total Observations', body: 'The grand total of pests counted across all sessions in the period. Every observation record stores a <em>Count</em> (e.g. "12 aphids seen here") and this KPI adds all those counts together. It is <strong>not</strong> the number of observation records — it is the sum of the actual pest quantities. Three records of 50, 30, and 20 would give a Total Observations of 100, not 3. The trend arrow in the subtitle compares the last 4 weeks of the period to the first 4 weeks.' },
      { heading: '📊 Overview — Observation trend chart', body: 'A bar chart of total pest observations over time. The bucket size adjusts automatically: one bar per <strong>day</strong> when 14 days or fewer are selected, one bar per <strong>week</strong> for 15–180 days, and one bar per <strong>calendar month</strong> for longer periods. Taller bars mean more pest activity. Empty periods appear faded.' },
      { heading: '📊 Overview — Top 6 Pests chart', body: 'A horizontal bar chart ranking the 6 pest species with the highest total observation counts in the period. Unknown or unidentified pests are excluded. Use this to prioritise which species to focus control efforts on.' },

      // ── Threshold Alerts ──
      { heading: '🚨 Threshold Alerts — Breach list', body: 'Every observation in the selected period where <em>Count > Threshold</em>, ordered newest first. Each row shows the pest name, field and farm, how many pests were observed, the configured threshold, the scout who recorded it, and the session date. Unknown pests are excluded because they have no threshold defined.' },
      { heading: '🚨 Threshold Alerts — Repeat Offenders', body: 'A pest + field combination that appears <strong>2 or more times</strong> in the breach list. This flags situations where the same pest keeps exceeding its threshold on the same field — a sign that treatment is overdue or that the current control measures are not working.' },
      { heading: '🚨 Threshold Alerts — Weekly Breach Trend chart', body: 'Always shows the <strong>last 8 weeks</strong> regardless of your date filter. One bar per week counting all threshold breaches that week. A rising trend means the situation is getting worse; a falling trend means control measures are having an effect.' },

      // ── Pest Pressure ──
      { heading: '🌿 Pest Pressure — Sessions (per field)', body: 'The number of distinct scouting sessions that visited this field in the selected period.' },
      { heading: '🌿 Pest Pressure — Total Obs (per field)', body: 'The sum of all pest counts recorded on this field in the period. Fields are listed highest Total Obs first so the most pressured fields appear at the top.' },
      { heading: '🌿 Pest Pressure — Avg Obs / Session (per field)', body: 'Total observations divided by the number of sessions. A rising average means more pests are being found per visit — the field is getting worse even if the session count stays the same.' },
      { heading: '🌿 Pest Pressure — Breach Count (per field)', body: 'How many individual observations exceeded their configured threshold on this field in the period.' },
      { heading: '🌿 Pest Pressure — Top 3 Pests (per field)', body: 'The three pest species with the highest total counts on this field in the period, ranked by sum of observation counts.' },

      // ── Sessions Summary ──
      { heading: '📋 Sessions — Total', body: 'All sessions falling in the date range. Matched on whichever date is available: completion date, then start date, then scheduled date.' },
      { heading: '📋 Sessions — Completed', body: 'Sessions that have a completion date recorded.' },
      { heading: '📋 Sessions — Planned', body: 'Sessions that are scheduled for a future date and have not yet been started.' },
      { heading: '📋 Sessions — Overdue', body: 'Planned sessions whose scheduled date has already passed but were never started.' },
      { heading: '📋 Sessions — Active', body: 'Sessions that have been started but not yet completed.' },
      { heading: '📋 Sessions — Completion Rate', body: 'Completed ÷ Total × 100, rounded to one decimal place.' },
      { heading: '📋 Sessions — Avg / Min / Max Duration', body: 'Average, shortest, and longest session durations in minutes, calculated from start time to completion time. Only sessions where both timestamps were recorded are included. Very short durations may mean the session was closed early; very long ones may mean it was accidentally left open.' },
      { heading: '📋 Sessions — Scout Compliance table', body: 'One row per scout showing total sessions assigned, how many they completed, and a colour-coded percentage bar (green ≥ 80%, amber ≥ 50%, red below 50%). Use this to identify which team members are not meeting their scouting targets.' },
      { heading: '📋 Sessions — 8-week stacked chart', body: 'Always the last 8 weeks regardless of your date filter. Each bar is split into Completed (green), Planned (amber), and Overdue (red) sessions for that calendar week. Useful for spotting whether planned sessions are being carried out or falling overdue.' },

      // ── Top Pests ──
      { heading: '🐛 Top Pests — Total Count', body: 'The sum of all observation counts for this pest species across all sessions in the period. This is a sum of pest quantities, not a count of records.' },
      { heading: '🐛 Top Pests — Fields Affected', body: 'How many distinct fields this pest was recorded on in the period.' },
      { heading: '🐛 Top Pests — Sessions', body: 'How many distinct scouting sessions recorded this pest.' },
      { heading: '🐛 Top Pests — Breaches', body: 'How many times an observation of this pest exceeded its configured action threshold.' },
      { heading: '🐛 Top Pests — Threshold', body: 'The highest threshold value recorded for this pest across any observation in the period.' },
      { heading: '🐛 Top Pests — Top Life Stage', body: 'The life stage (e.g. Adult, Larva, Egg) recorded most frequently for this pest in the period, based on the number of observation records that noted a life stage.' },

      // ── Trap Performance ──
      { heading: '🕸️ Trap Performance — Active Traps', body: 'The number of traps that are currently enabled. Not affected by the date range. A disabled trap is not being checked and contributes no monitoring data — review the Traps page to re-enable or replace it.' },
      { heading: '🕸️ Trap Performance — Total Catches', body: 'The sum of all pest counts recorded on trap-type observations in the selected period.' },
      { heading: '🕸️ Trap Performance — Avg Catch Rate', body: 'Total Catches ÷ Total Checks across all traps, where one "check" equals one scouting session that included this trap. A rising catch rate means traps are catching more per visit — the infestation may be growing.' },
      { heading: '🕸️ Trap Performance — Overdue Checks', body: 'Active traps that have not been checked in more than 7 days, based on the date of their last recorded session. Shown in red when greater than 0. Overdue traps create gaps in your monitoring data.' },
      { heading: '🕸️ Trap Performance — Check Count (per trap)', body: 'How many distinct scouting sessions visited this trap in the selected period.' },
      { heading: '🕸️ Trap Performance — Catch Rate (per trap)', body: 'Total Catches ÷ Check Count for this individual trap, rounded to 2 decimal places.' },
      { heading: '🕸️ Trap Performance — Top Pest (per trap)', body: 'The pest species with the highest total catch count on this trap in the period.' },

      // ── Scout Productivity ──
      { heading: '👤 Scout Productivity — Total Sessions', body: 'All sessions assigned to this scout in the period, including planned, active, and completed.' },
      { heading: '👤 Scout Productivity — Completion Rate', body: 'Completed ÷ Total sessions × 100.' },
      { heading: '👤 Scout Productivity — Avg Duration', body: 'Average session length in minutes for completed sessions where both a start time and end time were recorded.' },
      { heading: '👤 Scout Productivity — Total Obs', body: 'The sum of all pest counts across this scout\'s sessions in the period.' },
      { heading: '👤 Scout Productivity — Obs / Session', body: 'Total Obs ÷ Completed Sessions. Measures how thorough each completed session was on average. A consistently low value may mean the scout is rushing or missing observations.' },
      { heading: '👤 Scout Productivity — Fields Visited', body: 'The number of distinct fields this scout visited in the period.' },
      { heading: '👤 Scout Productivity — Alerts', body: 'The total number of threshold breach observations recorded in this scout\'s sessions.' },
      { heading: '👤 Scout Productivity — Overdue', body: 'This scout\'s planned sessions that are past their scheduled date without being started.' },
      { heading: '👤 Scout Productivity — 8-week activity chart', body: 'Shows completed session counts per week for the <strong>top 5 scouts by total sessions</strong> over the last 8 weeks. Each colour represents a different scout. Useful for identifying who has had gaps in activity.' },

      // ── Seasonal Trends ──
      { heading: '📅 Seasonal Trends', body: 'This tab always covers the <strong>last 18 months</strong> and has no date range filter. It shows how pest pressure and session activity change across the seasons.' },
      { heading: '📅 Seasonal Trends — Session Count (per month)', body: 'How many scouting sessions were completed in that calendar month.' },
      { heading: '📅 Seasonal Trends — Total Obs (per month)', body: 'Sum of all pest observation counts in that month. Unknown/unidentified pests are excluded.' },
      { heading: '📅 Seasonal Trends — Avg Temp °C (per month)', body: 'Average temperature recorded during sessions in that month. Only sessions where a temperature was logged are included. Months with no temperature data show a blank.' },
      { heading: '📅 Seasonal Trends — Top 3 Pests (per month)', body: 'The three pest species with the highest total counts in that calendar month, calculated from the session data after it is loaded.' },

      // ── Unknown Pests ──
      { heading: '❓ Unknown Pests — Total', body: 'The number of observation records where the pest was flagged as unidentified and the session\'s completion date (or start date if not yet complete) falls in the selected period.' },
      { heading: '❓ Unknown Pests — With Photos', body: 'Of the unknown sightings, how many have at least one photo attached. An observation is counted as having photos when its stored photo list is not empty. Photos are the most useful tool for retrospective identification — send them to an agronomist or taxonomist.' },
      { heading: '❓ Unknown Pests — With Notes', body: 'Unknown sightings where the scout wrote a descriptive note. Notes combined with photos give the best chance of identification.' },
      { heading: '❓ Unknown Pests — Fields Affected', body: 'How many distinct fields recorded at least one unknown-pest sighting in the period.' },
      { heading: '❓ Unknown Pests — Priority flag', body: 'An observation is marked Priority when the count is 5 or more, or when a photo is attached. These are the records most in need of expert identification and should be submitted to your agronomist first.' },
      { heading: '❓ Unknown Pests — Weekly trend chart', body: 'Always the last 8 weeks. One bar per week showing how many unknown-pest observations were recorded. A rising trend may indicate scouts are encountering new or unfamiliar species, or that identification training is needed.' },

      // ── Field Coverage ──
      { heading: '🗺 Field Coverage', body: 'This tab has <strong>no date range filter</strong>. Sessions This Month counts from the 1st of the current calendar month. Total Sessions covers all time. The coverage target is 4 completed sessions per field per month.' },
      { heading: '🗺 Field Coverage — Sessions This Month', body: 'Completed scouting sessions on this field since the 1st of the current month.' },
      { heading: '🗺 Field Coverage — Total Sessions', body: 'All completed sessions ever recorded on this field, across all time.' },
      { heading: '🗺 Field Coverage — Coverage %', body: 'Sessions This Month ÷ 4 × 100, capped at 100%. Reaching 4 sessions gives 100% coverage. Fields are listed lowest coverage first so the most under-monitored fields always appear at the top.' },
      { heading: '🗺 Field Coverage — Days Since Last Session', body: 'How many days have passed since the most recent completed session on this field.' },
      { heading: '🗺 Field Coverage — Top Pest', body: 'The pest with the highest all-time sum of observation counts on this field, across all recorded history (not limited to the current month).' },

      // ── Billing ──
      { heading: '💳 Billing — Active Traps', body: 'The current number of enabled traps in your account. This is typically the basis for subscription pricing. Not filtered by date range.' },
      { heading: '💳 Billing — Billing Month', body: 'The month the snapshot applies to.' },
      { heading: '💳 Billing — Active Points', body: 'The count of active monitoring points recorded at the time of that billing snapshot. May differ from the current active trap count if traps were added or removed during the month.' },
      { heading: '💳 Billing — Amount', body: 'The charge for that month.' },
      { heading: '💳 Billing — Status', body: 'Whether that month\'s invoice is paid, pending, or overdue.' },
    ],
  },
  {
    id: 'pests',
    icon: '🦗',
    title: 'Pest Catalogue',
    intro: 'A reference library of all pest species configured in your organisation.',
    items: [
      { heading: 'Adding a Pest', body: 'Click <strong>＋ Add Pest</strong>. Enter the Common Name, optional Scientific Name, Category, and the <strong>Action Threshold</strong> (the count that triggers a breach alert). Add any notes and click <strong>Save</strong>.' },
      { heading: 'Editing a Pest', body: 'Click the ✏️ icon next to the pest. Update the fields and click <strong>Save</strong>. Changes apply immediately to future observations.' },
      { heading: 'Deleting a Pest', body: 'Click the 🗑️ icon and confirm. Existing observations retain the name but the pest no longer appears in the selection list for new observations.' },
    ],
  },
  {
    id: 'settings',
    icon: '⚙️',
    title: 'Settings',
    intro: 'Manage your organisation preferences, trap types, and team members.',
    items: [
      { heading: 'Organisation Info', body: 'Displays your organisation name, plan tier, and contact details. Contact your administrator or Pestlook support to update these.' },
      { heading: 'Preferences', body: 'Set a Default Date Range for Analytics (7, 30, 90 days etc.) and toggle email / in-app notifications for threshold breaches. Click <strong>Save Preferences</strong> after making changes.' },
      { heading: 'Trap Types — Adding', body: 'Click <strong>＋ Add</strong> next to "Trap Types", enter the type name (e.g. "Delta Sticky"), and click <strong>Save</strong>. The new type appears in the Trap type dropdown when adding or editing traps.' },
      { heading: 'Trap Types — Editing / Deleting', body: 'Click the edit or delete icon next to any trap type. Deleting a type keeps the label on existing traps but removes it from future selections.' },
      { heading: 'Team Members — Roles', body: '<strong>Admin</strong> — full access including settings and team management. <strong>Scout</strong> — can start sessions and log observations, cannot manage settings or users. <strong>Viewer</strong> — read-only access to dashboard and analytics.' },
      { heading: 'Adding a Team Member', body: 'Click <strong>＋ Add Team Member</strong>, enter First Name, Last Name, Email, and select a Role, then click <strong>Save</strong>.' },
      { heading: 'Editing a Team Member', body: 'Click the edit icon on the team member row, change the role or name, and click <strong>Save</strong>.' },
    ],
  },
  ], // end Web App sections
  },
  {
    id: 'mobile',
    icon: '📱',
    title: 'Mobile App',
    intro: 'The Pestlook mobile app is designed for scouts in the field. It works on Android and connects to the same data as the web app. It is optimised for outdoor use — large touch targets, offline capability, and GPS integration.',
    sections: [
      {
        id: 'mob-overview',
        icon: '📱',
        title: 'Getting Started',
        intro: 'The mobile app is used by scouts to conduct scouting sessions, record pest observations, and check traps while in the field.',
        items: [
          { heading: 'Logging In', body: 'Open the app and enter your email and password. These are the same credentials used for the web app. Your session stays active until you sign out. If you see a "Tenant not found" error, contact your administrator to ensure your account has been assigned to an organisation.' },
          { heading: 'Online vs Offline Mode', body: 'The app detects your internet connection automatically. When <strong>online</strong>, all data syncs to the server in real time. When <strong>offline</strong> (e.g. in remote paddocks with no signal), observations are saved locally to the device. When connectivity is restored, the app automatically syncs the queued data to the server. A sync indicator in the header shows pending records.' },
          { heading: 'GPS & Location', body: 'The app uses your device\'s GPS to tag observations and trap checks with coordinates. When you start a session or add an observation, the app records your location automatically. Ensure you grant the app <strong>Location Permission</strong> during first launch. For best accuracy, enable High Accuracy (GPS + network) in your device settings.' },
        ],
      },
      {
        id: 'mob-sessions',
        icon: '🥾',
        title: 'Conducting a Scouting Session',
        intro: 'Scouting sessions on mobile work the same way as on the web, but are designed for one-handed field use.',
        items: [
          { heading: 'Viewing Planned Sessions', body: 'The home screen shows sessions assigned to you for today, sorted by scheduled time. Planned sessions from the web app appear here automatically — no manual entry needed. Tap a session to open it.' },
          { heading: 'Starting a Session', body: 'Tap a <em>Planned</em> session and press <strong>Start Session</strong>. The status changes to In Progress and the start time is recorded. If you need to start an unplanned (ad-hoc) session, tap <strong>New Session</strong> on the home screen, select the farm and field, and press Start.' },
          { heading: 'Adding Observations', body: 'Inside an active session, tap <strong>＋ Add Observation</strong>. Select the pest from the catalogue (or mark as Unknown if unidentified), enter the count, optionally select a life stage (adult, larva, egg, etc.), add notes, and tap <strong>Save</strong>. The observation is saved immediately — even offline.' },
          { heading: 'Taking Photos', body: 'When adding or editing an observation, tap the <strong>📷 Camera</strong> button to take a photo directly or choose from your gallery. Photos are attached to the observation and synced to the server when online. Photos of unknown pests are particularly valuable for identification.' },
          { heading: 'Checking Traps', body: 'During a session, tap <strong>Check Trap</strong> to record a trap inspection. Select the trap from the list (filtered to the current field), enter the catch count and pest species, and save. The app records the date, time, and your GPS location for the check.' },
          { heading: 'Completing a Session', body: 'When all observations have been recorded, tap <strong>Complete Session</strong> and confirm. The session is marked as Completed with the current time. If offline, the completion is queued and synced when connectivity returns.' },
          { heading: 'Editing / Deleting Observations', body: 'Swipe left on an observation row to reveal Edit and Delete options. You can edit observations in a completed session as long as you are the scout who recorded it, or you have Admin role.' },
        ],
      },
      {
        id: 'mob-sync',
        icon: '🔄',
        title: 'Sync & Data',
        intro: 'Understanding how data flows between the mobile app and the server.',
        items: [
          { heading: 'Automatic Sync', body: 'Whenever the app detects an internet connection, it automatically pushes any locally saved observations, session updates, and trap checks to the server. You do not need to do anything manually — the sync happens in the background.' },
          { heading: 'Manual Sync', body: 'To force an immediate sync, pull down on the home screen (pull-to-refresh) or tap the sync icon in the top-right corner. The icon spins while syncing and shows a ✓ tick when complete.' },
          { heading: 'Sync Conflicts', body: 'If the same record was edited on both the web and mobile while offline, the most recently modified version wins. You will see a notification banner if any conflicts were resolved. Review the affected session on the web app to verify the data is correct.' },
          { heading: 'Storage Usage', body: 'The app stores a local copy of your farm, field, trap, and pest reference data so it works offline. This cache is refreshed on every successful sync. If your reference data seems out of date (e.g. a new field is missing), force a sync or restart the app.' },
        ],
      },
      {
        id: 'mob-settings',
        icon: '⚙️',
        title: 'Mobile Settings',
        intro: 'App-level settings accessible from the profile icon or the Settings menu in the app.',
        items: [
          { heading: 'Account & Profile', body: 'View your name, email, role, and organisation. Tap <strong>Change Password</strong> to update your password (requires current password). Password changes apply to both the web and mobile app.' },
          { heading: 'Notification Preferences', body: 'Enable or disable push notifications for: new sessions assigned to you, threshold breach alerts for your fields, and sync error alerts. Notifications require the app to have notification permission granted in your device settings.' },
          { heading: 'GPS Accuracy Mode', body: 'Switch between <strong>High Accuracy</strong> (GPS + Wi-Fi + mobile data — best precision, uses more battery) and <strong>Battery Saving</strong> (network-based only — less accurate but longer battery life). Recommended: High Accuracy for trap checks and observation pinning; Battery Saving for general navigation.' },
          { heading: 'Temperature Units', body: 'Choose Celsius (°C) or Fahrenheit (°F) for temperature display. This setting is synced to your profile and also applies to the web app.' },
          { heading: 'Sign Out', body: 'Tap <strong>Sign Out</strong> at the bottom of settings. Any unsynced data will be synced before signing out if a connection is available. If offline, you will be warned that unsynced records may be lost.' },
        ],
      },
    ],
  },
  {
    id: 'intelligence',
    icon: '🧭',
    title: 'Spread & Movement Intelligence',
    intro: 'The Spread & Movement section uses GPS-tagged observation history to show how pest populations are physically moving across your farms — where outbreaks originate, which fields are at risk from a nearby breach, and when a simultaneous multi-farm spike signals a regional event.',
    sections: [
      {
        id:    'intel-spread',
        icon:  '🧭',
        title: 'Pest Spread Direction Mapping',
        intro: 'This page shows a live map and analysis of how each pest species is physically moving across your fields over time. All data is derived from GPS-tagged scouting observations.',
        items: [
          {
            heading: 'KPI Cards',
            body: '<strong>Pests Tracked</strong> — the number of pest species that have enough GPS observation history to compute a spread direction. <strong>Fields Affected</strong> — the total number of distinct fields where at least one observation was recorded in the selected period. <strong>Neighbour Risk</strong> — fields that are within 5 km of an active spread front but have not yet reported that pest; shown in amber when greater than 0. <strong>Fastest Spreading</strong> — the pest species gaining ground most rapidly, shown with its compass direction arrow and speed in new fields per week.',
          },
          {
            heading: 'Map — Blue circle markers',
            body: 'Each semi-transparent blue circle represents a field with GPS data. Click any circle to see the field name and farm. Fields without GPS coordinates (neither GPS-tagged observations nor a farm location set) will not appear on the map.',
          },
          {
            heading: 'Map — Coloured dashed lines',
            body: 'Each dashed line is a <em>spread vector</em> — it runs from the field where a pest was <strong>first observed</strong> to the centre-point (centroid) of all fields where it was <strong>most recently observed</strong>. The line colour shows how fast the pest is spreading: <span style="color:#4ade80;font-weight:600;">● Green</span> = contained or not spreading (0 or fewer new fields per week), <span style="color:#f59e0b;font-weight:600;">● Amber</span> = slow spread (less than 0.5 new fields per week), <span style="color:#f87171;font-weight:600;">● Red</span> = fast spread (0.5 or more new fields per week). Click a line to see the pest name, compass direction, and speed.',
          },
          {
            heading: 'Map — Filled circle at the tip of each line',
            body: 'This circle marks the current front of the spread — where the pest has reached most recently. It is the same colour as its dashed line (green / amber / red) so you can immediately see severity at a glance.',
          },
          {
            heading: '▶ Animate button',
            body: 'Pressing <strong>▶ Animate</strong> steps through each week of data in sequence, one week every 0.9 seconds, replaying how the infestation grew over time. During playback the map markers change to show only the fields active in that particular week. Press <strong>⏹ Stop</strong> at any moment to freeze the map on that week and inspect it in detail.',
          },
          {
            heading: 'Animation — Red field markers',
            body: 'During playback, a <span style="color:#c75146;font-weight:600;">red</span> circle on a field means at least one observation in that week recorded a count <strong>above the configured action threshold</strong> for that pest. These are your highest-priority fields — intervention is likely needed.',
          },
          {
            heading: 'Animation — Blue field markers',
            body: 'During playback, a <span style="color:#3b7db8;font-weight:600;">blue</span> circle means the pest was observed in that field that week but the count was still within the safe threshold. Monitor closely.',
          },
          {
            heading: 'Animation — Grey field markers',
            body: 'During playback, small grey circles indicate fields that had no observations recorded for the selected pest in that week. They remain visible so you can see the full farm layout at a glance.',
          },
          {
            heading: 'Spread Summary by Pest — compass arrow',
            body: 'Each pest card shows a large compass arrow (↑ ↗ → ↘ ↓ ↙ ← ↖) in the top-right corner. This is the overall bearing from the pest\'s origin field to its current spread front, snapped to the nearest of 8 compass directions. The full bearing in degrees and the text label (N / NE / E / SE etc.) are shown in the card body.',
          },
          {
            heading: 'Spread Summary by Pest — Velocity colour',
            body: 'The <em>Velocity</em> figure on each card is coloured the same way as the map lines: <span style="color:#4ade80;font-weight:600;">green</span> = contained, <span style="color:#f59e0b;font-weight:600;">amber</span> = slow, <span style="color:#f87171;font-weight:600;">red</span> = fast. Use the ‹ › buttons to page through all pest cards two at a time.',
          },
          {
            heading: '⚠ Neighbour Risk panel',
            body: 'This panel appears only when at least one field is at risk. It lists every field that is within <strong>5 km</strong> of an active pest spread front but has not yet had that pest recorded in any scouting session. These fields should be prioritised for an unplanned inspection — early detection at this stage can prevent the spread from taking hold.',
          },
          {
            heading: 'Weekly Field Exposure Timeline',
            body: 'A grid showing pest activity week by week. Rows are pest species; columns are the week start dates. The view shows 8 weeks at a time — use <strong>‹ Earlier</strong> and <strong>Later ›</strong> to navigate. A <span style="background:rgba(59,125,184,0.12);color:#3b7db8;font-weight:600;padding:1px 5px;border-radius:3px;">blue cell</span> means the pest was observed across one or more fields that week and counts were within threshold. A <span style="background:rgba(199,81,70,0.15);color:#c75146;font-weight:600;padding:1px 5px;border-radius:3px;">red-tinted cell</span> means at least one field exceeded its threshold that week. The large number is the total pest count (sum of all observation counts) and the small subtitle shows how many distinct fields reported that pest.',
          },
          {
            heading: 'Show Pest filter',
            body: 'The <em>Show Pest</em> dropdown at the top of the page re-fetches data filtered to a single pest species, making the map, vectors, and timeline easier to read when many pests are tracked. Selecting "All pests" returns the combined view.',
          },
          {
            heading: 'Data requirements',
            body: 'Spread direction mapping requires at least <strong>two weeks</strong> of observations with GPS coordinates for a meaningful vector to be calculated. If GPS coordinates are missing from observations, the system falls back to the farm\'s own latitude and longitude (set on the Farms page) and applies a small position offset per field so they appear as distinct dots rather than a single stacked point.',
          },
        ],
      },
      {
        id:    'intel-origin',
        icon:  '🔍',
        title: 'Infestation Origin Detection',
        intro: 'Works backwards through your scouting history to identify the most likely origin field for each pest outbreak — the field that first reported the species — then builds a chronological spread chain showing every subsequent field in the order it was reached.',
        items: [
          {
            heading: 'KPI Cards',
            body: '<strong>Pests Traced</strong> — the number of distinct pest species for which an origin field could be identified in the selected period. <strong>Multi-field Outbreaks</strong> — the count of pests that were detected on two or more fields, indicating genuine spread rather than an isolated sighting; shown in amber when greater than 0. <strong>Fastest Spread</strong> — the pest that reached a second field in the fewest days from the origin, shown in red as the highest-risk spreading species. <strong>Farthest Spread</strong> — the pest whose spread chain covers the greatest geographic distance from origin to furthest affected field (requires GPS data).',
          },
          {
            heading: 'Show Pest selector',
            body: 'Switches the map and spread chain panel to show a different pest species. The summary table at the bottom still shows all pests regardless of this selector. Clicking a row in the summary table also switches the active pest.',
          },
          {
            heading: 'Confidence badge',
            body: 'Shows how certain the system is that the identified origin field is the true outbreak source. <span style="color:#c75146;font-weight:600;">High</span> (≥ 70%) means the origin count was already above threshold and spread to a second field within 21 days — a strong outbreak signature. <span style="color:#e5a52f;font-weight:600;">Moderate</span> (40–69%) means one of those conditions is met. <span style="color:#2b6e4f;font-weight:600;">Low</span> (below 40%) means only one field reported the pest or counts were within threshold — possibly an isolated sighting rather than an outbreak.',
          },
          {
            heading: 'Map — numbered markers',
            body: 'Each circle is numbered in the order the pest was first detected: <span style="background:#c75146;color:#fff;border-radius:50%;padding:1px 7px;font-size:0.8rem;">1</span> is always the origin field (red). Subsequent fields are blue, and the most recently affected field is amber. Click any marker to see the field name, farm, first count, and how many days after the origin it was reached.',
          },
          {
            heading: 'Map — connecting dashed line',
            body: 'The grey dashed polyline connects each field in the spread chain in chronological order. It is not a route — it is a straight-line sequence showing the approximate path of spread. Fields without GPS coordinates are omitted from the map but still appear in the chain list on the right.',
          },
          {
            heading: 'Spread Chain list',
            body: 'The numbered list to the right of the map shows every field in the outbreak chain in order of first detection. Each entry shows the field and farm name, the date the pest was first recorded, the total count in that first week, whether it was above or below the configured threshold, and the distance from the origin field (when GPS is available). The <strong>ORIGIN</strong> badge marks step 1; subsequent steps show how many days after the origin they were reached.',
          },
          {
            heading: '⚠ Above threshold indicator',
            body: 'A red <strong>⚠ above threshold</strong> label means the first-week count on that field already exceeded the pest\'s configured action threshold at the time of initial detection. This is a strong signal that the infestation was already established by the time it was found — earlier detection or more frequent scouting of that field may have allowed earlier intervention.',
          },
          {
            heading: 'Summary table — Days to 2nd Field',
            body: 'The number of days between the origin field\'s first detection and the date the pest was first found on the next field. A short lag (3–7 days) suggests rapid active spread; a long lag (30+ days) may indicate independent introduction rather than spread from the origin.',
          },
          {
            heading: 'How the origin is determined',
            body: 'The system groups all observations for each pest by field and finds the earliest observation date per field. The field with the overall earliest date is designated the origin. If that field\'s first-week count was already above the action threshold, the confidence score rises because an established, above-threshold population is a stronger indicator of a true origin than a single incidental sighting.',
          },
          {
            heading: 'Data requirements and limitations',
            body: 'Origin detection assumes that the pest entered your farms within the selected date range. If the date range starts after the outbreak began, the system will identify the earliest sighting <em>within the range</em>, which may not be the true origin. Widening the date range improves accuracy. GPS coordinates on the Farms page are used as a fallback when individual observations do not include GPS tags.',
          },
        ],
      },
      {
        id:    'intel-neighbour',
        icon:  '🏘',
        title: 'Neighbour Risk Alert',
        intro: 'When a threshold breach is recorded on a field, every other field whose farm centroid lies within the configured search radius is automatically flagged as elevated-risk. The tab shows a map of the breach source and its at-risk neighbours, highlights fields that have not been scouted recently, and lists all neighbours in a sortable table.',
        items: [
          {
            heading: 'KPI Cards',
            body: '<strong>Breached Fields</strong> — the number of distinct fields that recorded at least one observation above their action threshold in the selected period; shown in red. <strong>At-Risk Neighbours</strong> — the total count of neighbouring fields flagged as elevated-risk across all breaches; shown in amber when greater than 0. <strong>Unscouted Risk</strong> — the subset of at-risk neighbours that have not had a completed scouting session in the last 7 days (or have never been scouted); shown in red as the most urgent group. <strong>Search Radius</strong> — the current radius setting in kilometres.',
          },
          {
            heading: 'Radius selector',
            body: 'The <strong>Radius</strong> dropdown (3 / 5 / 10 / 20 km) changes the search radius used to find neighbour fields. Selecting a new value re-fetches the data immediately — no need to click a refresh button. A smaller radius focuses on immediate neighbours; a larger radius is appropriate for widely spaced farms or fast-spreading pests.',
          },
          {
            heading: 'Pest selector',
            body: 'When breaches involve more than one pest species, the <strong>Pest</strong> dropdown appears and lets you switch the map and alert cards to a different pest. The summary table at the bottom always shows all pests.',
          },
          {
            heading: 'Map — red source marker',
            body: 'The large red filled circle marks the breach source field — the field that exceeded its action threshold. Hovering or clicking the marker shows the field name, farm, peak count, action threshold, and the date of the most recent breach.',
          },
          {
            heading: 'Map — radius ring',
            body: 'A dashed red circle around the source field shows the exact search radius. Any field whose farm centroid falls inside this ring is considered an at-risk neighbour.',
          },
          {
            heading: 'Map — neighbour markers',
            body: '<span style="color:#f59e0b;font-weight:600;">Amber</span> markers are at-risk neighbours that have not been scouted in the past 7 days (or never scouted) — these are the highest priority. <span style="color:#4ade80;font-weight:600;">Green</span> markers are at-risk neighbours that were visited within the last 7 days and are considered monitored. Click any marker to see the field name, farm, distance from the breach source, and days since last scouting session.',
          },
          {
            heading: 'Map — dashed connector lines',
            body: 'Grey dashed lines connect the source field to each of its neighbours. They indicate proximity relationships, not roads or paths. Fields without GPS coordinates are omitted from the map but still appear in the neighbour list and summary table.',
          },
          {
            heading: 'Neighbour list panel',
            body: 'The scrollable panel to the right of the map lists every at-risk neighbour in order of distance from the breach source. Each card shows the field and farm name, the distance in kilometres, the number of days since the last completed session, and a colour-coded status: <span style="color:#f87171;font-weight:600;">red = critical / never scouted</span>, <span style="color:#f59e0b;font-weight:600;">amber = overdue (&gt; 7 days)</span>, <span style="color:#4ade80;font-weight:600;">green = recently visited</span>.',
          },
          {
            heading: 'All At-Risk Neighbours table',
            body: 'The table at the bottom of the page lists every flagged neighbour across all source fields for the selected pest, showing field, farm, which breach source triggered the alert, distance, last session date, and urgency status. Use this table to get a quick written overview when the map is not needed.',
          },
          {
            heading: 'How fields are matched',
            body: 'The system uses the GPS coordinates set on the <strong>Farm</strong> record as the centre point for each field. If a farm has no GPS coordinates set (latitude and longitude both 0), its fields will not appear on the map or in the neighbour list. Set farm GPS coordinates on the Farms page to ensure complete coverage.',
          },
          {
            heading: 'What "unscouted" means',
            body: 'A neighbour field is classified as <em>unscouted</em> if it has no completed scouting session in the last 7 days, or if it has never had a completed session at all. The 7-day window is a fixed threshold — a field scouted 8 days ago is considered overdue even if the breach only occurred yesterday. This errs on the side of caution to ensure neighbours are visited promptly after a breach is detected.',
          },
        ],
      },
      {
        id:    'intel-crossfarm',
        icon:  '🌍',
        title: 'Cross-Farm Outbreak Correlation',
        intro: 'Scans your observation history to identify weeks where the same pest species spiked simultaneously across two or more farms. A simultaneous multi-farm spike is flagged as a regional outbreak event — distinct from an isolated incident on a single farm. The tab shows outbreak summary cards per pest, a multi-line weekly chart, and a table of the specific spike weeks and which farms were affected.',
        items: [
          {
            heading: 'KPI Cards',
            body: '<strong>Outbreak Pests</strong> — the number of distinct pest species that spiked on two or more farms in the same week within the selected period. <strong>Regional Outbreaks</strong> — the count of pests that satisfied the minimum-farms threshold, confirming a genuinely regional event rather than a coincidence across two nearby farms. <strong>Peak Farm Count</strong> — the single highest number of farms that simultaneously spiked for any one pest in any one week; the pest responsible is shown in the subtitle. <strong>Min Farms Threshold</strong> — indicates the current sensitivity setting, which can be changed using the selector below.',
          },
          {
            heading: 'Min Farms selector',
            body: 'The <strong>Min Farms</strong> dropdown sets how many farms must spike in the same week for the event to be counted as an outbreak. The default is 2 — any week where 2 or more farms spike qualifies. Raising it to 3 or 4 filters out coincidental two-farm spikes and shows only the most severe regional events. Changing this value re-fetches the data immediately.',
          },
          {
            heading: 'Pest selector',
            body: 'When multiple pests qualify as outbreak pests, the <strong>Pest</strong> dropdown (and the outbreak summary cards) let you switch the chart and spike-week table to a different species. Clicking an outbreak card also switches the active pest.',
          },
          {
            heading: 'Outbreak summary cards',
            body: 'One card per qualifying pest, ordered by severity (highest farm count first). Each card shows the pest name, a <span style="color:#f87171;font-weight:600;">🌍 Regional</span> or <span style="color:#f59e0b;font-weight:600;">🏠 Local</span> badge, the peak outbreak week, the number of outbreak weeks, and the combined observation count across all spiking farms. The active pest\'s card is highlighted with a blue border.',
          },
          {
            heading: 'Regional vs Local badge',
            body: '<span style="color:#f87171;font-weight:600;">🌍 Regional</span> means the peak-week farm count met or exceeded the Min Farms threshold — this is a genuine multi-farm simultaneous event worth treating as a regional alert. <span style="color:#f59e0b;font-weight:600;">🏠 Local</span> means the outbreak is isolated to fewer farms than the threshold and is likely a farm-specific pressure event rather than a regional introduction.',
          },
          {
            heading: 'Weekly Farm Counts chart',
            body: 'A multi-line chart where each line represents one farm. The x-axis is the week (Monday of each week), the y-axis is the total observation count for that pest on that farm in that week. <strong>Red shaded columns</strong> highlight weeks where the spike criterion was met on 2 or more farms simultaneously — these are the regional outbreak weeks. Hover over the chart to see all farm counts for a given week in a single tooltip, with a total and a "⚠ Regional spike week" flag when applicable.',
          },
          {
            heading: 'How a spike is defined',
            body: 'A spike is recorded for a farm in a given week when the total observation count for that week exceeds the <em>higher</em> of two thresholds: (1) the configured action threshold for the pest, or (2) 1.5× the farm\'s own median weekly count for that pest over the full selected period. Using the farm\'s own median prevents a naturally high-pressure farm from always appearing to spike relative to a low-pressure farm on the other side of the region.',
          },
          {
            heading: 'Simultaneous Spike Weeks table',
            body: 'Lists every week in the selected period where the spike criterion was met on two or more farms. Each row shows the week date, the number of farms that spiked (highlighted in red if 3 or more, amber if 2), the combined observation count, and the names of the farms involved. A <span style="color:#f87171;">⚠</span> icon next to a farm name means that farm\'s count was also above its configured action threshold that week — the most severe cases.',
          },
          {
            heading: 'How to use this view',
            body: 'A regional outbreak week is a signal to increase scouting frequency across <em>all</em> farms in your organisation — not just the farms already reporting counts. It may also warrant communication with neighbouring operations outside your tenancy. Use the date-range filter to narrow in on a specific season or to compare year-over-year outbreak patterns for the same pest.',
          },
          {
            heading: 'Data requirements',
            body: 'Cross-farm correlation requires completed scouting sessions with pest observations recorded across at least two farms. If all observations come from a single farm, no outbreaks will be detected regardless of count levels. The analysis uses a 12-month default date range — widening this to 18–24 months will capture seasonal patterns across multiple years.',
          },
        ],
      },
    ],
  },
  {
    id: 'predictive',
    icon: '📈',
    title: 'Predictive Intelligence',
    intro: 'The Predictive Intelligence section forecasts where pest populations are heading based on your historical observation data, so scouts and agronomists can act before a threshold breach occurs rather than reacting after.',
    sections: [
      {
        id:    'intel-forecast',
        icon:  '📈',
        title: 'Population Forecast',
        intro: 'Uses a linear regression model fitted to your weekly observation history to project pest counts for the next four weeks per pest per field. Each projection comes with a confidence interval and a breach probability score.',
        items: [
          {
            heading: 'KPI Cards',
            body: '<strong>Pests Tracked</strong> — the number of distinct pest species included in the forecast. <strong>Fields Covered</strong> — the number of distinct fields with enough observation history to produce a forecast. <strong>High Risk</strong> — the count of pest × field combinations where the breach probability is 60% or higher; shown in red when greater than 0. <strong>Fastest Rising</strong> — the pest and field combination currently showing the steepest upward trend with the highest breach probability.',
          },
          {
            heading: 'Risk table — Trend column',
            body: '<span style="color:#c75146;font-weight:700;">↑ Rising</span> means the weekly count is trending upward (regression slope > 0.5 per week). <span style="color:#e5a52f;font-weight:700;">→ Stable</span> means counts are broadly flat (slope between −0.5 and +0.5). <span style="color:#2b6e4f;font-weight:700;">↓ Falling</span> means counts are declining (slope below −0.5). Click the Trend column header to sort.',
          },
          {
            heading: 'Risk table — Historical peak',
            body: 'The highest single-week total observation count recorded for this pest on this field within the selected date range. This is the worst week seen so far, not an average.',
          },
          {
            heading: 'Risk table — Projected (4 wk)',
            body: 'The highest projected count in any of the next four weekly forecast points. If the projected value exceeds the historical peak it is shown in red — the model is predicting a new record high.',
          },
          {
            heading: 'Risk table — Breach risk bar',
            body: 'The percentage of the next four forecast weeks where the upper end of the confidence interval crosses the configured action threshold for this pest. <span style="color:#2b6e4f;font-weight:600;">Green</span> = below 30%, <span style="color:#e5a52f;font-weight:600;">Amber</span> = 30–59%, <span style="color:#c75146;font-weight:600;">Red</span> = 60% or higher. A red bar means a threshold breach is likely in the near term and the field should be prioritised for an inspection.',
          },
          {
            heading: 'Risk table — sorting and filtering',
            body: 'Click any column header to sort the table by that column; click again to reverse the direction. The default sort is highest breach risk first. Use the <strong>Pest</strong> dropdown to narrow the table to a single species, and the <strong>Show</strong> dropdown to show only Rising, Stable, or Falling trends.',
          },
          {
            heading: 'Detail chart — blue bars',
            body: 'The blue bars show the actual observed total pest count for each historical week. Each bar represents all observations of this pest on this field summed across any scouting sessions that were completed in that calendar week.',
          },
          {
            heading: 'Detail chart — grey trend line',
            body: 'The grey line is the ordinary least-squares (OLS) regression fit through the historical data. It shows the underlying linear trend, smoothing out week-to-week noise. Where the line is rising, the average direction of counts is upward even if individual weeks dip.',
          },
          {
            heading: 'Detail chart — dashed amber line',
            body: 'The dashed amber line is the forecast — the regression line extended into the future for the next four weeks. The amber dots mark each weekly projection point. Hover over a point to see the exact projected count for that week.',
          },
          {
            heading: 'Detail chart — shaded confidence band',
            body: 'The light amber band around the forecast line is the 90% confidence interval. It shows the plausible range of outcomes — the pest count is expected to fall inside this band nine times out of ten. A narrow band means the model is confident; a wide band means the history is noisy and the forecast is less certain.',
          },
          {
            heading: 'Detail chart — red dashed threshold line',
            body: 'The horizontal red dashed line marks the configured action threshold for this pest. When the confidence band crosses above this line, a threshold breach is considered likely. If no threshold is set for this pest, the line does not appear.',
          },
          {
            heading: 'Detail chart — vertical divider',
            body: 'The faint dashed vertical line separates the historical period (left) from the forecast period (right). Data to the left of this line comes from real scouting records; data to the right is model-generated.',
          },
          {
            heading: 'How the forecast is calculated',
            body: 'The system groups all observations for a pest × field combination into weekly totals (one value per Monday-to-Sunday window), then fits a straight-line trend through those values using ordinary least-squares regression. The line is extrapolated forward by the chosen number of weeks. The confidence interval width is derived from the residual standard error of the fit — how much the historical data scattered around the regression line. At least one week of observations is required; more weeks produce a more reliable forecast.',
          },
          {
            heading: 'Limitations',
            body: 'The forecast is a linear model — it assumes the trend continues in a straight line. It does not account for seasonal cycles, treatment events, weather changes, or data gaps. Use it as a leading indicator, not a guarantee. Always confirm rising forecasts with a physical field inspection before making treatment decisions.',
          },
        ],
      },
    ],
  },
];

export function renderHelp(container) {

  // ── Build TOC ──────────────────────────────────────────────────────────────
  let tocHtml = '';
  for (const group of GROUPS) {
    tocHtml += `
      <div style="margin-bottom:4px;">
        <button data-scroll="help-${group.id}" style="display:flex;align-items:center;gap:8px;padding:7px 12px;border-radius:8px;color:var(--text);font-size:0.85rem;font-weight:700;transition:background 0.15s;background:none;border:none;cursor:pointer;width:100%;text-align:left;" onmouseover="this.style.background='var(--hover)'" onmouseout="this.style.background=''">
          <span style="font-size:1rem;">${group.icon}</span> ${escapeHtml(group.title)}
        </button>
        <div style="padding-left:10px;display:flex;flex-direction:column;gap:1px;">
          ${group.sections.map(s => `
            <button data-scroll="help-${s.id}" style="display:flex;align-items:center;gap:8px;padding:5px 12px;border-radius:8px;color:var(--text-dim);font-size:0.8rem;transition:background 0.15s;background:none;border:none;cursor:pointer;width:100%;text-align:left;" onmouseover="this.style.background='var(--hover)'" onmouseout="this.style.background=''">
              <span style="font-size:0.9rem;">${s.icon}</span> ${escapeHtml(s.title)}
            </button>`).join('')}
        </div>
      </div>`;
  }

  // ── Build content ──────────────────────────────────────────────────────────
  let contentHtml = '';
  for (const group of GROUPS) {
    // Group heading
    contentHtml += `
      <div id="help-${group.id}" style="margin-bottom:32px;scroll-margin-top:16px;">
        <div style="display:flex;align-items:center;gap:12px;padding:14px 18px;background:var(--surface2,#f4f7f4);border-radius:10px;margin-bottom:20px;">
          <span style="font-size:2rem;">${group.icon}</span>
          <div>
            <div style="font-family:'Fraunces',serif;font-size:1.35rem;font-weight:700;color:var(--text);letter-spacing:-0.01em;">${escapeHtml(group.title)}</div>
            <div style="font-size:0.83rem;color:var(--text-dim);margin-top:2px;">${group.intro}</div>
          </div>
        </div>`;

    // Sections within the group
    for (const s of group.sections) {
      const items = s.items.map(it => `
        <div style="border-left:3px solid var(--border);padding:10px 0 10px 18px;margin-bottom:2px;">
          <div style="font-weight:600;color:var(--text);font-size:0.9rem;margin-bottom:4px;">${escapeHtml(it.heading)}</div>
          <div style="color:var(--text-dim);font-size:0.85rem;line-height:1.65;">${it.body}</div>
        </div>`).join('');

      contentHtml += `
        <div id="help-${s.id}" style="margin-bottom:32px;scroll-margin-top:16px;padding-left:4px;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid var(--border);">
            <span style="font-size:1.3rem;">${s.icon}</span>
            <div style="font-family:'Fraunces',serif;font-size:1.1rem;font-weight:700;color:var(--text);letter-spacing:-0.01em;">${escapeHtml(s.title)}</div>
          </div>
          <p style="color:var(--text-dim);font-size:0.88rem;line-height:1.65;margin:0 0 14px;">${s.intro}</p>
          <div style="display:flex;flex-direction:column;gap:6px;">${items}</div>
        </div>`;
    }

    contentHtml += `</div>`; // close group div
  }

  container.innerHTML = `
    <div style="margin-bottom:24px;display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;">
      <div style="font-family:'Fraunces',serif;font-size:1.6rem;font-weight:600;color:var(--text);letter-spacing:-0.02em;">Help & User Guide 📖</div>
      <div style="font-size:0.85rem;color:var(--text-dim);">Everything you need to know about Pestlook</div>
    </div>

    <div style="display:grid;grid-template-columns:210px 1fr;gap:24px;align-items:start;">

      <!-- Sticky TOC -->
      <div class="card card-p" style="position:sticky;top:16px;max-height:calc(100vh - 48px);overflow-y:auto;">
        <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-dim);margin-bottom:8px;">Contents</div>
        <nav style="display:flex;flex-direction:column;gap:2px;">
          ${tocHtml}
        </nav>
      </div>

      <!-- Content -->
      <div class="card card-p" style="min-width:0;">
        ${contentHtml}

        <div style="border-top:1px solid var(--border);padding-top:20px;margin-top:8px;">
          <div style="font-size:0.78rem;color:var(--text-dim);line-height:1.8;">
            <strong style="color:var(--text);">Q: Why do I see "No data for selected period" on Analytics?</strong><br>
            Change the date range filter at the top of the Analytics page. If the range is too narrow there may be no sessions or observations recorded in that window.<br><br>
            <strong style="color:var(--text);">Q: How do I change the action threshold for a pest?</strong><br>
            Go to <strong>Pest Catalogue</strong>, find the pest, click ✏️, and update the Action Threshold value.<br><br>
            <strong style="color:var(--text);">Q: A trap is on the map in the wrong location.</strong><br>
            Go to <strong>Traps</strong>, edit the trap, and correct the GPS Latitude / Longitude values. The map updates immediately.<br><br>
            <strong style="color:var(--text);">Q: The dashboard activity feed is empty.</strong><br>
            Observations are only shown once a session has been started and observations logged. Plan and start a session first.<br><br>
            <strong style="color:var(--text);">Q: My mobile observations are not appearing on the web.</strong><br>
            Check that the mobile app has synced — pull to refresh on the home screen. Ensure you have an active internet connection. If the issue persists, sign out and back in to force a full sync.
          </div>
        </div>
      </div>

    </div>
  `;

  // Wire up all scroll buttons — no hash changes, no router interference
  container.querySelectorAll('[data-scroll]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.scroll);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}
