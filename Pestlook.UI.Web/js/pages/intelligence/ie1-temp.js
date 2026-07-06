import { escapeHtml, celsiusToFahrenheit } from '../../utils/helpers.js';
import { emptyState }  from '../reports/utils.js';
import { getUser }     from '../../utils/storage.js';

function convTemp(c, unit) {
  if (c == null) return '—';
  return Number(unit === 'F' ? celsiusToFahrenheit(c) : c).toFixed(1);
}
function convRange(rangeStr, unit) {
  if (!rangeStr) return '—';
  const m = rangeStr.match(/([-\d.]+)[–-]([-\d.]+)/);
  if (!m) return rangeStr;
  return `${convTemp(parseFloat(m[1]), unit)}–${convTemp(parseFloat(m[2]), unit)}`;
}
function convSlope(slopePerC, unit) {
  const v = unit === 'F' ? slopePerC * 5 / 9 : slopePerC;
  return (v > 0 ? '+' : '') + Number(v).toFixed(3);
}

/* ─────────────────────────────────────────────────────────────────────────────
   E1 — Temperature × Pest Activity Index
   data = {
     pests: [{ pestId, pestName, dataPoints, correlation, slopePerDegC,
               optimalTempRange, influence, sensitivity, avgCount, avgTemp,
               buckets: [{ bucket, tempRange, avgCount, observations }] }],
     heatMap: [{ bucket, tempRange, avgCount, observations, pestCount }],
     summary: { totalPests, tempSensitive, coldFavoring, dataPoints, overallAvgTemp }
   }
───────────────────────────────────────────────────────────────────────────── */

const INFLUENCE_COL  = { 'Warm-Favoring': '#c0392b', 'Cold-Favoring': '#2980b9', 'None': '#7f8c8d' };
const INFLUENCE_ICON = { 'Warm-Favoring': '🌡↑', 'Cold-Favoring': '🌡↓', 'None': '—' };
const SENSITIVITY_COL = { Strong: '#c0392b', Moderate: '#e67e22', Weak: '#7f8c8d' };

const tip = (text) => `title="${text}"`;

export async function renderTemperatureActivity(el, data) {
  const { pests = [], heatMap = [], summary = {} } = data;
  const unit = getUser()?.temperatureUnit || 'C';
  const deg  = unit === 'F' ? '°F' : '°C';

  if (!pests.length) {
    el.innerHTML = emptyState('🌡', 'No temperature data',
      'No scouting sessions with temperature recorded were found in the selected period. Ensure scouts record temperature during sessions.');
    return;
  }

  const infoIcon = (tooltip) =>
    `<span style="font-size:0.7rem;color:var(--text-dim);cursor:help;margin-left:3px;opacity:0.7;" title="${tooltip}">&#9432;</span>`;

  const kpi = (label, value, colour, sub = '', tooltip = '') => `
    <div class="card card-p${tooltip ? ' has-kpi-tip' : ''}" style="flex:1;min-width:130px;"${tooltip ? ` data-kpi-tip="${tooltip}"` : ''}>
      <div style="font-size:0.72rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px;">${label}</div>
      <div style="font-size:1.7rem;font-weight:700;color:${colour};">${value}</div>
      ${sub ? `<div style="font-size:0.75rem;color:var(--text-dim);margin-top:3px;">${sub}</div>` : ''}
    </div>`;

  const kpis = `
    <div style="font-size:0.75rem;color:var(--text-dim);margin-bottom:14px;line-height:1.6;">
      Groups observation counts into 5${deg} temperature bands to reveal each pest's <strong>optimal temperature range</strong>.
      <strong>Pearson r</strong> measures how strongly pest counts rise or fall with temperature (range −1 to +1).
      <strong>OLS slope</strong> shows by how much the count changes per degree.
      <strong>Warm-Favoring</strong> pests increase in warmer conditions; <strong>Cold-Favoring</strong> pests peak in cooler weather.
      The global heat map at the bottom shows combined activity across all pests and temperature bands.
    </div>
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px;">
      ${kpi('Pests Analysed',    summary.totalPests    ?? 0, 'var(--text)',  'with temperature data',
        'Number of pest species with at least 3 temperature-linked observations — the minimum needed to calculate a meaningful correlation.')}
      ${kpi('Warm-Favoring',     summary.tempSensitive ?? 0, '#c0392b',     'higher counts in warm temps',
        'Pests with a positive Pearson r — activity and counts tend to increase as temperatures rise. Monitor these species closely during warm spells.')}
      ${kpi('Cold-Favoring',     summary.coldFavoring  ?? 0, '#2980b9',     'higher counts in cool temps',
        'Pests with a negative Pearson r — they are more active in cooler conditions. Watch these during cool spells and early spring or autumn periods.')}
      ${kpi('Avg Temp (Period)', convTemp(summary.overallAvgTemp, unit) + deg, 'var(--accent)', `${summary.dataPoints ?? 0} observations`,
        'Average session temperature recorded across all scouting sessions in the selected date range. Based on the temperature field that scouts fill in per session.')}
    </div>`;

  const rows = pests.map(p => {
    const infCol = INFLUENCE_COL[p.influence]  ?? '#888';
    const senCol = SENSITIVITY_COL[p.sensitivity] ?? '#888';
    const slope  = convSlope(p.slopePerDegC, unit);
    const corr   = p.correlation > 0 ? `+${p.correlation}` : `${p.correlation}`;

    const bucketBars = (p.buckets ?? []).map(b => {
      const max = Math.max(...(p.buckets ?? []).map(x => x.avgCount), 1);
      const pct = Math.round((b.avgCount / max) * 100);
      return `
        <div style="margin-bottom:6px;">
          <div style="display:flex;justify-content:space-between;font-size:0.68rem;color:var(--text-dim);margin-bottom:2px;">
            <span style="font-weight:600;">${convRange(b.tempRange, unit)}${deg}</span>
            <span
              style="cursor:help;"
              title="Avg count: ${b.avgCount} pests per observation in this temperature band. Based on ${b.observations} individual observation records.">
              ${b.avgCount} avg count &nbsp;·&nbsp; ${b.observations} obs
            </span>
          </div>
          <div style="height:7px;background:var(--border);border-radius:3px;overflow:hidden;"
               title="Bar width = this band's avg count relative to the highest avg count band (${max} avg). ${pct}% of peak.">
            <div style="height:100%;width:${pct}%;background:${infCol};border-radius:3px;transition:width .3s;"></div>
          </div>
        </div>`;
    }).join('');

    // Metric rows with inline label + value + info icon
    const metric = (label, value, tooltip, note = '') => `
      <div style="min-width:160px;flex:1;">
        <div style="font-size:0.68rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px;">
          ${label}${infoIcon(tooltip)}
        </div>
        <div style="font-size:0.88rem;font-weight:700;">${value}</div>
        ${note ? `<div style="font-size:0.67rem;color:var(--text-dim);margin-top:1px;">${note}</div>` : ''}
      </div>`;

    const corrNote = Math.abs(p.correlation) < 0.2  ? 'No meaningful relationship'
                   : Math.abs(p.correlation) < 0.35 ? 'Weak relationship'
                   : Math.abs(p.correlation) < 0.6  ? 'Moderate relationship'
                   : 'Strong relationship';

    const slopeNote = p.slopePerDegC > 0
      ? `+${Math.abs(p.slopePerDegC).toFixed(2)} more pests per degree warmer`
      : `${Math.abs(p.slopePerDegC).toFixed(2)} fewer pests per degree warmer`;

    return `
      <div class="card card-p" style="margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
          <div>
            <div style="font-weight:700;font-size:0.95rem;">${escapeHtml(p.pestName)}</div>
            <div style="font-size:0.78rem;color:var(--text-dim);margin-top:2px;"
                 title="Total individual observations used in the analysis for this pest, filtered to sessions with a recorded temperature.">
              ${p.dataPoints} observations
              &nbsp;·&nbsp;
              <span title="Average pest count per observation across all temperature bands in the selected period.">avg count ${p.avgCount}</span>
              &nbsp;·&nbsp;
              <span title="Average session temperature recorded during observations of this pest in the selected period.">avg temp ${convTemp(p.avgTemp, unit)}${deg}</span>
            </div>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
            <span style="padding:3px 10px;border-radius:20px;font-size:0.72rem;font-weight:700;background:${infCol}22;color:${infCol};"
                  title="Temperature preference derived from the sign of Pearson r. Warm-Favoring = positive r (counts rise with temperature). Cold-Favoring = negative r (counts fall with temperature). None = r is too weak to classify.">
              ${INFLUENCE_ICON[p.influence] ?? ''} ${escapeHtml(p.influence)}
            </span>
            <span style="padding:3px 10px;border-radius:20px;font-size:0.72rem;font-weight:700;background:${senCol}22;color:${senCol};"
                  title="Strength of the temperature–count relationship. Strong: |r| ≥ 0.6. Moderate: |r| ≥ 0.35. Weak: |r| ≥ 0.2. None: |r| &lt; 0.2.">
              ${escapeHtml(p.sensitivity)} correlation
            </span>
          </div>
        </div>

        <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:14px;padding:10px 12px;background:var(--surface-alt, var(--border));border-radius:8px;">
          ${metric('Pearson r', corr,
            'Pearson correlation coefficient — measures how strongly pest counts move with temperature. Range: −1 to +1. A positive value means counts tend to rise as temperature rises; negative means they fall. Values below ±0.2 indicate no meaningful temperature relationship.',
            corrNote)}
          ${metric('OLS Slope', `${slope} per ${deg}`,
            `OLS (Ordinary Least Squares) regression slope — how much the average pest count is expected to change for each 1${deg} increase in temperature. A slope of +0.4 means each extra degree is associated with 0.4 more pests on average. This is a statistical association, not a proven cause.`,
            slopeNote)}
          ${metric('Optimal Range', `${convRange(p.optimalTempRange, unit)}${deg}`,
            `The 5${deg} temperature band in which this pest's average count was highest during the selected period. This is not a strict biological optimum — it simply reflects the temperature range most associated with high scouting counts in your data. Widen the date range for a more representative result.`,
            'Band with highest avg count')}
        </div>

        <div style="font-size:0.72rem;color:var(--text-dim);margin-bottom:8px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;"
             title="Each row is a 5${deg} temperature band. The bar shows this band's average pest count relative to the band with the highest average count (= 100%). The numbers show average count per observation and total observation records in that band.">
          Count by temperature band
          ${infoIcon(`Each bar shows a 5${deg} temperature band. Width = average pest count relative to the highest band. "Avg count" is the mean number of pests recorded per observation in that band; "obs" is the number of individual observation records that fell in that band.`)}
        </div>
        ${bucketBars}
      </div>`;
  }).join('');

  // Global heat map
  const heatMapMax = Math.max(...heatMap.map(b => b.avgCount), 1);
  const heatMapRows = heatMap.map(b => {
    const pct = Math.round((b.avgCount / heatMapMax) * 100);
    return `
      <tr style="border-bottom:1px solid var(--border);">
        <td style="padding:8px 10px;font-weight:600;">${convRange(b.tempRange, unit)}${deg}</td>
        <td style="padding:8px 10px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="flex:1;height:10px;background:var(--border);border-radius:4px;overflow:hidden;"
                 title="Bar width = avg count relative to the highest-avg-count band (${heatMapMax} avg). ${pct}% of peak.">
              <div style="height:100%;width:${pct}%;background:var(--accent);border-radius:4px;"></div>
            </div>
            <span style="font-size:0.8rem;font-weight:700;min-width:36px;text-align:right;">${b.avgCount}</span>
          </div>
        </td>
        <td style="padding:8px 10px;text-align:right;font-size:0.8rem;">${b.observations}</td>
        <td style="padding:8px 10px;text-align:right;font-size:0.8rem;">${b.pestCount}</td>
      </tr>`;
  }).join('');

  el.innerHTML = `
    ${kpis}
    <div style="margin-bottom:20px;">
      ${rows}
    </div>
    <div class="card card-p">
      <div style="font-weight:700;font-size:0.88rem;margin-bottom:4px;">🌡 Global Temperature Heat Map — All Pests Combined</div>
      <div style="font-size:0.72rem;color:var(--text-dim);margin-bottom:14px;line-height:1.5;">
        Aggregates activity across every pest species in the selected period.
        Shows which temperature bands are associated with the highest overall pest pressure — useful for deciding when to intensify scouting.
      </div>
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:0.82rem;">
          <thead>
            <tr style="border-bottom:2px solid var(--border);">
              <th style="padding:8px 10px;text-align:left;color:var(--text-dim);"
                  title="5${deg} temperature band. Sessions are placed into the band matching the temperature recorded by the scout.">
                Temp Band
              </th>
              <th style="padding:8px 10px;text-align:left;color:var(--text-dim);"
                  title="Average pest count per observation record across all pest species in this temperature band. The bar shows this value relative to the highest-avg band.">
                Avg Count &#9432;
              </th>
              <th style="padding:8px 10px;text-align:right;color:var(--text-dim);"
                  title="Number of individual observation records (pest sightings) that were made during sessions with a temperature in this band.">
                Observations &#9432;
              </th>
              <th style="padding:8px 10px;text-align:right;color:var(--text-dim);"
                  title="Number of distinct pest species that were observed at least once in sessions within this temperature band.">
                Pest Species &#9432;
              </th>
            </tr>
          </thead>
          <tbody>${heatMapRows}</tbody>
        </table>
      </div>
    </div>`;
}
