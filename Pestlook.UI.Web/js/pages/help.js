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
    intro: 'The Analytics section has eleven report tabs. Use the date range and farm/field filters at the top-right to narrow results. All tabs refresh when you change the filters.',
    items: [
      // ── Overview ──
      { heading: '📊 Overview — Threshold Breaches (KPI card)', body: 'Shows the total number of observations in the selected period where the pest count exceeded the configured action threshold. A value of 0 is shown in green — anything above 0 turns red, signalling that intervention is required somewhere on your farms. Drill into the Threshold Alerts tab for the full list.' },
      { heading: '📊 Overview — Session Compliance (KPI card)', body: 'The percentage of planned sessions that were actually completed in the period. Calculated as <em>completed sessions ÷ total sessions × 100</em>. A value below 80% turns amber — indicating scouts are falling behind their scouting schedule. Use the Sessions tab to identify which sessions are outstanding or overdue.' },
      { heading: '📊 Overview — Active Traps (KPI card)', body: 'The count of traps that are currently enabled (active). The subtitle shows how many are disabled. A high number of disabled traps means you have gaps in your monitoring network — check the Traps page or Trap Performance tab to investigate.' },
      { heading: '📊 Overview — Total Observations (KPI card)', body: 'The total number of individual pest observation records logged in the selected period. The subtitle shows a trend arrow comparing the last 4 weeks of the period to the first 4 weeks. An upward arrow (↑) means pest activity is increasing; downward (↓) means it is decreasing.' },
      { heading: '📊 Overview — Weekly Pest Count Trend (bar chart)', body: 'A bar chart showing total observations per week across the selected period. Each bar is one week. Taller bars = more pest activity that week. Use this to see whether pressure is building, stable, or declining. Empty bars (no observations) appear faded.' },
      { heading: '📊 Overview — Top 6 Pests by Count (bar chart)', body: 'A horizontal bar chart ranking the 6 most-observed pest species in the period by total observation count. The longest bar is the most prevalent species. Use this to prioritise which pests to focus control efforts on.' },

      // ── Threshold Alerts ──
      { heading: '🚨 Threshold Alerts — Total Breaches (KPI card)', body: 'The count of all observations where the recorded pest count exceeded the pest\'s configured action threshold. Shown in red when > 0. Each breach represents a field visit where a scout found more pests than the safe limit — action should be taken for each one.' },
      { heading: '🚨 Threshold Alerts — Critical (KPI card)', body: 'Breaches where the observed count was <strong>2× or more</strong> the action threshold. These are the most severe events and require immediate intervention. If this number is non-zero it will be highlighted red.' },
      { heading: '🚨 Threshold Alerts — Warning (KPI card)', body: 'Breaches that exceeded the threshold but were below 2×. These are serious but not critical — they should be monitored closely and treatment prepared. Shown in amber.' },
      { heading: '🚨 Threshold Alerts — Fields Affected (KPI card)', body: 'The number of distinct fields that recorded at least one threshold breach in the period. A high number means the problem is widespread across your farm(s) rather than isolated to a single area.' },
      { heading: '🚨 Threshold Alerts — Breaches per Week (bar chart)', body: 'Counts how many threshold-breaching observations occurred in each calendar week. A rising trend week-on-week suggests an escalating infestation. A sharp single spike may indicate a localised event. Use alongside the Seasonal Trends tab to understand whether this is a seasonal pattern.' },
      { heading: '🚨 Threshold Alerts — Repeat Offenders (table)', body: 'A compact scrollable list of pest + field combinations that have breached their threshold in <em>multiple</em> sessions. Sorted by breach count (highest first). A field/pest pair appearing here repeatedly is a chronic hot-spot — standard monitoring is not enough and targeted treatment should be considered.' },
      { heading: '🚨 Threshold Alerts — All Threshold Breaches (grid)', body: 'A searchable, sortable, paginated table of every individual breach event. Columns: <strong>Pest</strong> (which species), <strong>Field &amp; Farm</strong> (where it was found), <strong>Count</strong> (how many were observed), <strong>Threshold</strong> (the action limit), <strong>Over by</strong> (% above threshold), <strong>Scout</strong> (who found it), <strong>Date</strong> (when the session occurred), <strong>Status</strong> (Critical or Warning). Use the severity dropdown to filter to Critical events only and the search box to find a specific pest or field.' },

      // ── Pest Pressure ──
      { heading: '🌿 Pest Pressure — High / Medium / Low (KPI cards)', body: 'Classifies every field into one of three pressure bands based on how its current average observations per session compares to the highest-performing (peak) field in the period. <strong>High ≥ 66%</strong> of peak: near-peak pest activity, act now. <strong>Medium 33–65%</strong>: monitor closely. <strong>Low &lt; 33%</strong>: routine monitoring sufficient. Example: if the busiest field averages 20 obs/session, a field averaging 14 obs/session is at 70% = High pressure.' },
      { heading: '🌿 Pest Pressure — Total Breaches (KPI card)', body: 'The sum of threshold breach events across all fields in the period. Identical to the Threshold Alerts count — shown here for quick context alongside the pressure scores.' },
      { heading: '🌿 Pest Pressure — Avg Observations per Session by Field, top 10 (bar chart)', body: 'Ranks the 10 most active fields by their <em>average pest observations per scouting visit</em>. A field at the top of this chart consistently yields high pest counts every time it is scouted. <strong>Higher = more pest activity per visit</strong>. This differs from total observations — a field scouted once with 50 obs would rank higher than one scouted 10 times with 8 obs each (8 avg).' },
      { heading: '🌿 Pest Pressure — Field Pressure Overview (progress bars)', body: 'One row per field showing a colour-coded progress bar (bar width = pressure score as % of peak), the pressure level tag, average obs/session, and the session count. The top 3 pest species found in that field are shown as chips. Red border = High, Amber = Medium, Green = Low.' },
      { heading: '🌿 Pest Pressure — Detailed Field Breakdown (grid)', body: 'Paginated, searchable, sortable table with one row per field. Columns: <strong>Field &amp; Farm</strong>, <strong>Sessions</strong> (how many completed sessions in the period), <strong>Total Obs</strong>, <strong>Avg Obs/Session</strong> (the key pressure indicator), <strong>Breaches</strong> (threshold events), <strong>Pressure Level</strong>. Use the Level filter dropdown to isolate High-pressure fields. Sort by Avg Obs/Session descending to rank worst fields.' },

      // ── Sessions Summary ──
      { heading: '📋 Sessions — Total Sessions (KPI card)', body: 'Count of all scouting sessions (Planned + Active + Completed) in the selected period.' },
      { heading: '📋 Sessions — Completion Rate (KPI card)', body: 'Percentage of sessions that were completed vs total. Also shows completed count and overdue count. Overdue = planned date has passed but session was never started. A non-zero overdue count turns the card amber.' },
      { heading: '📋 Sessions — Avg Duration (KPI card)', body: 'Average time from session start to completion in minutes. Also shows the minimum and maximum durations. Very short durations may indicate incomplete sessions; very long ones may indicate the session was left open accidentally.' },
      { heading: '📋 Sessions — Active Now (KPI card)', body: 'Sessions currently In Progress (started but not yet completed). Useful for supervisors monitoring live field activity.' },
      { heading: '📋 Sessions — Weekly Session Activity (stacked bar chart)', body: 'A stacked bar chart with one bar per week. Each bar is split into Completed (green), Planned (blue), and Overdue (red) sessions. Use this to spot weeks with high overdue counts — that may indicate staffing problems or scheduling issues.' },
      { heading: '📋 Sessions — Scout Compliance (table)', body: 'One row per scout. Columns: <strong>Scout name</strong>, <strong>Total sessions assigned</strong>, <strong>Completed</strong>, and a <strong>Compliance %</strong> progress bar (green ≥ 80%, amber ≥ 50%, red below 50%). Identifies which team members are meeting their scouting targets.' },
      { heading: '📋 Sessions — Session List (grid)', body: 'Every session in the period with Date (and a pill showing whether it is a Scheduled, Started, or Completed date), Field, Farm, Scout, Status, Duration, and Observation count. Click the Date pill colour legend: 🟡 Scheduled, 🟢 Started, 🟣 Completed.' },

      // ── Top Pests ──
      { heading: '🐛 Top Pests — Unique Species (KPI card)', body: 'The number of distinct pest species recorded in the selected period. A growing count over time indicates your scouts are encountering new or previously unreported species — update the Pest Catalogue with thresholds for any new ones.' },
      { heading: '🐛 Top Pests — Total Observations (KPI card)', body: 'The total count of all pest observation records across all fields and sessions. This is the raw volume of pest sightings — compare period-over-period to track whether overall pest pressure is increasing.' },
      { heading: '🐛 Top Pests — Above Threshold (KPI card)', body: 'The number of <em>species</em> (not individual observations) that triggered at least one threshold breach in the period. Shown in red when > 0. Knowing which species are problematic helps focus pesticide or biological control decisions.' },
      { heading: '🐛 Top Pests — Most Widespread (KPI card)', body: 'The pest species found across the greatest number of distinct fields. A widespread species is harder to manage than a localised one — it may indicate a regional or seasonal pressure wave.' },
      { heading: '🐛 Top Pests — Top 10 Pests by Count (bar chart)', body: 'Horizontal bars ranking the 10 most-observed species by raw observation count. The longest bar is the dominant pest in the period.' },
      { heading: '🐛 Top Pests — Observations by Pest Category (doughnut chart)', body: 'Groups all observations by pest category (Insect, Rodent, Fungal, Weed, etc.) to show the proportion of each type. A large Insect slice vs small Rodent slice tells you where to focus control resources.' },
      { heading: '🐛 Top Pests — All Observed Pests (grid)', body: 'Full searchable, sortable, paginated table. Columns: <strong>Pest</strong>, <strong>Category</strong>, <strong>Total Obs</strong> (raw count), <strong>Sessions</strong> (how many sessions recorded this pest), <strong>Fields</strong> (spread), <strong>Threshold</strong> (configured action limit), <strong>Breaches</strong> (how many times limit was exceeded), <strong>Top Life Stage</strong>. Filter by category or use the breach filter to see only problem species.' },

      // ── Trap Performance ──
      { heading: '🕸️ Trap Performance — Active Traps (KPI card)', body: 'Count of enabled (active) traps. The subtitle shows how many are disabled. A disabled trap is not being checked and is not contributing to monitoring data — review the Traps page to re-enable or replace it.' },
      { heading: '🕸️ Trap Performance — Total Catches (KPI card)', body: 'The sum of all pest catches recorded across all traps in the selected period. Each trap check where a pest count is recorded adds to this total. A very high number may indicate a severe infestation; a very low number may indicate traps are not being serviced or are in the wrong locations.' },
      { heading: '🕸️ Trap Performance — Avg Catch Rate (KPI card)', body: 'Calculated as <em>Total Catches ÷ Total Checks</em>. This tells you on average how many pests are found each time a trap is inspected. A rising catch rate over consecutive periods means traps are becoming more effective at detecting pests — or that the infestation is growing. Example: 157.88 catches per check means every trap visit, on average, 158 pests were recorded.' },
      { heading: '🕸️ Trap Performance — Overdue Checks (KPI card)', body: 'Active traps that have not been checked in more than 7 days. Shown in red when > 0. Overdue traps produce gaps in your monitoring data and may miss population spikes. The value is 3 in the example — meaning 3 traps are overdue and need a visit.' },
      { heading: '🕸️ Trap Performance — Top 10 Traps by Catches (bar chart)', body: 'The 10 traps with the highest total catch counts. Identifying your best-performing traps helps validate trap placement — and conversely, traps at the bottom of the chart may be in suboptimal locations.' },
      { heading: '🕸️ Trap Performance — Catches by Trap Type (bar chart)', body: 'Groups total catches by trap type (e.g. Pheromone, Sticky, Pitfall). Shows which trap technology is catching the most pests. Useful for justifying investment in a particular trap type or reviewing effectiveness of recent changes.' },
      { heading: '🕸️ Trap Performance — All Traps (grid)', body: 'Sortable, searchable, paginated table sorted by Total Catches (highest first) by default. Columns: <strong>Trap</strong> (name), <strong>Type</strong>, <strong>Field &amp; Farm</strong>, <strong>Catches</strong> (total in period), <strong>Checks</strong> (number of visits), <strong>Catch Rate</strong> (catches ÷ checks), <strong>Last Checked</strong> (date), <strong>Top Pest</strong> (most caught species), <strong>Status</strong> (Active / Overdue / Disabled). Use the Type or Status filters to focus on specific groups.' },

      // ── Scout Productivity ──
      { heading: '👤 Scout Productivity — Active Scouts (KPI card)', body: 'The number of team members who completed at least one session in the selected period. A scout with zero sessions in a long period may be inactive or may need reassigning.' },
      { heading: '👤 Scout Productivity — Total Sessions (KPI card)', body: 'Combined session count across all scouts. Together with Avg/Scout it shows whether workload is balanced.' },
      { heading: '👤 Scout Productivity — Avg / Scout (KPI card)', body: 'Average number of sessions per scout. If the top scout has far more than average it may indicate uneven workload distribution.' },
      { heading: '👤 Scout Productivity — Top Scout (KPI card)', body: 'The scout with the most sessions in the period. The subtitle shows their session count.' },
      { heading: '👤 Scout Productivity — Weekly Completed Sessions — top 5 scouts (stacked bar)', body: 'Shows weekly session completion for the top 5 most active scouts. Each colour is a different scout. Useful for seeing whether all scouts are active throughout the period or whether some have long inactive stretches.' },
      { heading: '👤 Scout Productivity — Scout Breakdown (table)', body: 'One row per scout. Columns: <strong>Sessions</strong>, <strong>Completed</strong>, <strong>Compliance %</strong> (progress bar; green ≥ 80%, amber ≥ 50%, red below 50%), <strong>Avg Duration</strong> (min), <strong>Total Obs</strong> (pest records logged), <strong>Obs/Session</strong> (how thorough each visit is — a consistently low value may mean the scout is rushing), <strong>Fields</strong> (how many distinct fields visited), <strong>Alerts</strong> (threshold breaches found).' },

      // ── Seasonal Trends ──
      { heading: '📅 Seasonal Trends — Peak Month (KPI card)', body: 'The calendar month with the highest total pest observations in the tracked history. Shows the observation count for that month in the subtitle. Knowing your peak month lets you plan additional resources and interventions in advance.' },
      { heading: '📅 Seasonal Trends — Avg / Month (KPI card)', body: 'Average pest observations per month across the full tracked period. Comparing the current month to this average tells you whether you are in a high- or low-pressure period right now.' },
      { heading: '📅 Seasonal Trends — Months Tracked (KPI card)', body: 'How many months of completed-session data are available, up to a maximum of 18. More months = more reliable seasonal patterns.' },
      { heading: '📅 Seasonal Trends — Top Pest (Period) (KPI card)', body: 'The single pest species with the highest cumulative observation count across the entire tracked history. This is your most persistent long-term pest.' },
      { heading: '📅 Seasonal Trends — Monthly Pest Counts vs Avg Temperature (dual-axis line chart)', body: 'The red line shows total pest observations per month (left Y axis). The amber dashed line shows average scouting temperature °C (right Y axis). Overlaying temperature lets you see whether pest pressure is correlated with warmer months — a common pattern. Peaks aligning with temperature rises confirm a temperature-driven species.' },
      { heading: '📅 Seasonal Trends — Scouting Sessions per Month (bar chart)', body: 'Shows whether scouting frequency itself is consistent throughout the year. A dip in sessions in certain months could mean low pest counts are an artefact of low effort rather than genuinely low pressure.' },
      { heading: '📅 Seasonal Trends — Monthly Breakdown (table)', body: 'One row per month (most recent first). Columns: <strong>Month</strong>, <strong>Total Obs</strong>, <strong>Sessions</strong>, <strong>Avg Temp °C</strong>, <strong>Top Pests</strong> (the 3 most observed species that month). Useful for building a seasonal calendar of pest threats.' },

      // ── Unknown Pests ──
      { heading: '❓ Unknown Pests — Total Sightings (KPI card)', body: 'The count of observations where the pest was not identified (recorded as Unknown or left blank). Shown in amber when > 0. High numbers indicate scouts need training, or that new species are appearing that aren\'t in the Pest Catalogue yet.' },
      { heading: '❓ Unknown Pests — With Photos (KPI card)', body: 'Of the unknown sightings, how many have at least one photo attached. Photos are critical for retrospective identification — an unknown with photos can be sent to an agronomist or taxonomist for ID.' },
      { heading: '❓ Unknown Pests — With Notes (KPI card)', body: 'Unknown sightings where the scout added a text note describing what they saw. Notes paired with photos give the best chance of identification.' },
      { heading: '❓ Unknown Pests — Fields Affected (KPI card)', body: 'How many distinct fields recorded an unknown pest. A single field with many unknowns may have a novel pest introduction that needs investigation.' },
      { heading: '❓ Unknown Pests — Priority — Requires Identification (panel)', body: 'Highlights unknown sightings that have either a count of 5 or more, or have photos attached. These are the most actionable records. Each row shows the field, farm, scout name, date, count, and whether photos exist. Submit these to your agronomist for identification as a priority.' },
      { heading: '❓ Unknown Pests — Unknown Pest Sightings per Week (bar chart)', body: 'Weekly trend of unidentified observations. A rising trend may indicate a new pest entering the area or scouts becoming less rigorous about identification. Use with the sessions volume chart to distinguish real increases from increased scouting effort.' },
      { heading: '❓ Unknown Pests — All Unknown Pest Sightings (table)', body: 'Full list of every unidentified observation. Columns: <strong>Date</strong>, <strong>Farm &amp; Field</strong>, <strong>Scout</strong>, <strong>Count</strong>, <strong>Life Stage</strong> (if noted), <strong>Photos</strong> (count badge), <strong>Notes</strong> (scout\'s description). Sort by Count descending to prioritise the largest sightings for identification.' },

      // ── Field Coverage ──
      { heading: '🗺 Field Coverage — Fully Covered (KPI card)', body: 'Fields that have reached or exceeded the target number of scouting sessions this month (default: 4 sessions per field per month). Green when > 0. These fields are well monitored.' },
      { heading: '🗺 Field Coverage — Partially Covered (KPI card)', body: 'Fields with 1–3 sessions this month — scouting has started but the target hasn\'t been met yet. Amber. These fields need at least one more visit before month end.' },
      { heading: '🗺 Field Coverage — Not Scouted (KPI card)', body: 'Fields with zero sessions recorded this month. Red when > 0. These are monitoring blind spots — anything could be happening in them without your knowledge.' },
      { heading: '🗺 Field Coverage — Never Scouted (KPI card)', body: 'Fields that have never had a single scouting session in the entire system history. Red when > 0. These fields have no baseline data at all — schedule a visit as soon as possible.' },
      { heading: '🗺 Field Coverage — Coverage % per Field (bar chart)', body: 'Shows the top 12 fields by coverage percentage (sessions this month ÷ target × 100). Bars are colour-coded: green = fully covered, blue = on track, amber = behind, red = not started. The target sessions per month is shown in the chart subtitle.' },
      { heading: '🗺 Field Coverage — Field Scouting Status (progress bars)', body: 'One card per field showing a coloured progress bar (width = coverage %), status tag (Complete / On track / Behind / Not this month / Never scouted), days since last visit, and session count vs target. A red border means the field is at risk. Also shows the top pest found in that field if data is available.' },

      // ── Billing ──
      { heading: '💳 Billing — YTD Spend (KPI card)', body: 'Your total invoiced amount for the current calendar year across all billing months. The subtitle shows the invoice count and a year-over-year trend arrow. An upward arrow (↑) means you are spending more this year than the same period last year.' },
      { heading: '💳 Billing — Latest Invoice (KPI card)', body: 'The amount of the most recent monthly invoice and the month it covers. The subtitle shows a month-over-month trend arrow — useful for spotting sudden cost increases caused by adding traps mid-month.' },
      { heading: '💳 Billing — Monitoring Quota (KPI card)', body: 'The maximum number of active monitoring points (traps) allowed on your current subscription plan. Exceeding this limit may incur additional charges or require a plan upgrade.' },
      { heading: '💳 Billing — Active / Quota (KPI card)', body: 'Your current active trap count against your quota limit, shown as a percentage bar. Green below 70%, amber 70–89%, red 90%+. When this approaches 100% you should review unused traps or upgrade your plan to avoid disruption.' },
      { heading: '💳 Billing — Monitoring Point Utilisation (progress bar)', body: 'A full-width progress bar showing active traps as a percentage of your quota. Turns amber at ≥ 70% and red at ≥ 90% with a warning message. This is your at-a-glance subscription health indicator.' },
      { heading: '💳 Billing — Monthly Billing Amounts (bar chart)', body: 'Last 12 months of invoices as a bar chart. Green bars = paid, blue bars = pending. Use this to spot months where costs spiked (e.g. after deploying new traps) and to forecast future spend.' },
      { heading: '💳 Billing — Billing History (table)', body: 'Complete invoice history. Columns: <strong>Month</strong>, <strong>Active Points</strong> (trap count billed that month), <strong>Amount</strong>, <strong>vs Prev Month</strong> (trend arrow), <strong>Status</strong> (Paid / Pending). Use to reconcile invoices or identify months where trap counts were unexpectedly high.' },
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
