import { escapeHtml } from '../../utils/helpers.js';
import { emptyState }  from '../reports/utils.js';

/* ─────────────────────────────────────────────────────────────────────────────
   I8 — Seasonal Pressure Forecast
   data = { calendar: [{ month, monthName, pests: [{ pestId, pestName,
              avgCount, peakYear, trend }] }],
            peakPests: [{ pestId, pestName, peakMonth, peakMonthName,
              avgPeakCount, yearsOfData }] }
───────────────────────────────────────────────────────────────────────────── */

const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function heatColour(value, max) {
  if (!max || value === 0) return 'transparent';
  const ratio = Math.min(value / max, 1);
  const r = Math.round(192 + (220 - 192) * (1 - ratio)); // 220→192
  const g = Math.round(57  + (220 - 57)  * (1 - ratio)); // 220→57
  const b = Math.round(43  + (220 - 43)  * (1 - ratio)); // 220→43
  return `rgba(${r},${g},${b},${0.15 + ratio * 0.75})`;
}

export async function renderSeasonalPressure(el, data) {
  const { calendar = [], peakPests = [] } = data;

  if (!calendar.length && !peakPests.length) {
    el.innerHTML = emptyState('🗓', 'No data', 'Not enough historical data for a seasonal forecast. At least 12 months of observations are needed.');
    return;
  }

  // ── Top peak species cards ────────────────────────────────────────────────
  const topCards = peakPests.slice(0, 6).map(p => `
    <div class="card card-p" style="min-width:160px;">
      <div style="font-weight:700;font-size:0.9rem;margin-bottom:4px;">${escapeHtml(p.pestName)}</div>
      <div style="font-size:0.78rem;color:var(--text-dim);">Peak month</div>
      <div style="font-size:1.1rem;font-weight:700;color:var(--accent);">${escapeHtml(p.peakMonthName ?? '—')}</div>
      <div style="font-size:0.75rem;color:var(--text-dim);margin-top:4px;">
        Avg peak count: <strong>${p.avgPeakCount ?? '—'}</strong>
      </div>
      <div style="font-size:0.72rem;color:var(--text-dim);">${p.yearsOfData} yr${p.yearsOfData !== 1 ? 's' : ''} of data</div>
    </div>
  `).join('');

  // ── Heat-map calendar ─────────────────────────────────────────────────────
  // Flatten all counts to find global max for colour scaling
  const allCounts = calendar.flatMap(m => (m.pests ?? []).map(p => p.avgCount ?? 0));
  const globalMax = allCounts.length ? Math.max(...allCounts) : 1;

  // Collect unique pest names across all months
  const pestNames = [...new Set(calendar.flatMap(m => (m.pests ?? []).map(p => p.pestName)))].sort();

  const calendarHtml = pestNames.length ? `
    <div class="card card-p" style="overflow-x:auto;margin-top:20px;">
      <div style="font-weight:700;margin-bottom:12px;font-size:0.9rem;">Seasonal Pressure Heat Map</div>
      <table style="width:100%;border-collapse:collapse;font-size:0.78rem;">
        <thead>
          <tr>
            <th style="padding:6px 10px;text-align:left;color:var(--text-dim);font-weight:600;">Pest</th>
            ${MONTH_ABBR.map(m => `<th style="padding:6px 6px;text-align:center;color:var(--text-dim);font-weight:600;">${m}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${pestNames.map(name => {
            const cells = MONTH_ABBR.map((_, idx) => {
              const monthData = calendar.find(m => m.month === idx + 1);
              const pestData  = monthData?.pests?.find(p => p.pestName === name);
              const count     = pestData?.avgCount ?? 0;
              const bg        = heatColour(count, globalMax);
              return `<td style="padding:6px;text-align:center;background:${bg};border-radius:4px;">
                ${count > 0 ? `<span title="${count}">${count}</span>` : '<span style="color:var(--text-dim);">·</span>'}
              </td>`;
            }).join('');
            return `
              <tr style="border-bottom:1px solid var(--border);">
                <td style="padding:6px 10px;font-weight:600;white-space:nowrap;">${escapeHtml(name)}</td>
                ${cells}
              </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  ` : '';

  el.innerHTML = `
    <div style="font-size:0.72rem;color:var(--text-dim);margin-bottom:14px;line-height:1.6;">Analyses up to 18 months of historical observation data to identify each pest's <strong>peak calendar months</strong>. The heat-map calendar shows the next 6 months with expected pressure for the top 3 pests per month, based on how many observations were recorded in the same calendar month in prior years. Use this to plan treatments and increase scouting frequency before seasonal pressure arrives.</div>
    <div style="font-weight:700;font-size:0.88rem;color:var(--text-dim);text-transform:uppercase;
      letter-spacing:.06em;margin-bottom:10px;">Peak Pressure Species</div>
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:4px;">
      ${topCards || '<div style="color:var(--text-dim);font-size:0.85rem;">No peak data available.</div>'}
    </div>
    ${calendarHtml}
  `;
}
