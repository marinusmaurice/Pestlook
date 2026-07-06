import { escapeHtml } from '../../utils/helpers.js';
import { emptyState }  from '../reports/utils.js';

/* ─────────────────────────────────────────────────────────────────────────────
   C2 — Quarantine Field Flag
   data = {
     flags: [{ pestId, pestName, isSystemPest, fieldId, fieldName, farmName,
               firstSeen, daysSinceFirst, totalObsCount, totalPestCount,
               introductionType, riskLevel, isNewToTenant, recommendation }],
     summary: { totalFlags, genuineNewSpecies, newToField, nonSystemPests, dataNote }
   }
───────────────────────────────────────────────────────────────────────────── */

const RISK_COL = { High: '#c0392b', Elevated: '#e67e22', Standard: '#7f8c8d' };
const RISK_BG  = { High: 'rgba(192,57,43,0.1)', Elevated: 'rgba(230,126,34,0.08)', Standard: 'rgba(127,140,141,0.07)' };
const RISK_ICON = { High: '🚨', Elevated: '⚠️', Standard: '📍' };

const infoIcon = (tooltip) =>
  `<span style="font-size:0.7rem;color:var(--text-dim);cursor:help;margin-left:3px;opacity:0.7;" title="${tooltip}">&#9432;</span>`;

export async function renderQuarantineFlags(el, data) {
  const { flags = [], summary = {} } = data;

  if (!flags.length) {
    el.innerHTML = emptyState('🔬', 'No new introductions detected',
      summary.dataNote ?? 'No pest species were recorded for the first time on any field within the selected date range.');
    return;
  }

  const kpi = (label, value, colour, sub = '', tooltip = '') => `
    <div class="card card-p${tooltip ? ' has-kpi-tip' : ''}" style="flex:1;min-width:130px;"${tooltip ? ` data-kpi-tip="${tooltip}"` : ''}>
      <div style="font-size:0.72rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px;">${label}</div>
      <div style="font-size:1.7rem;font-weight:700;color:${colour};">${value}</div>
      ${sub ? `<div style="font-size:0.75rem;color:var(--text-dim);margin-top:3px;">${sub}</div>` : ''}
    </div>`;

  const kpis = `
    <div style="font-size:0.75rem;color:var(--text-dim);margin-bottom:14px;line-height:1.6;">Flags pest species recorded on a field <strong>for the first time</strong> within the selected date range. A <strong>New to Tenant</strong> flag means the species has never been seen anywhere in your organisation before — these carry the highest risk and may warrant reporting to local agricultural authorities. A <strong>New to Field</strong> flag means the pest is established elsewhere but has now appeared on a new field.</div>
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:14px;">
      ${kpi('New Introductions',   summary.totalFlags         ?? 0, 'var(--text)',  'flags in period',                   'Total number of pest × field combinations where a pest was recorded on a field for the first time within the selected date range.')}
      ${kpi('New to Tenant',       summary.genuineNewSpecies  ?? 0, '#c0392b',     'never seen before — highest risk', 'Pest species that have never been recorded anywhere in your organisation before — the highest-risk category; consider notifying local agricultural authorities.')}
      ${kpi('New to Field',        summary.newToField         ?? 0, '#e67e22',     'new on this field only',            'Pests that exist elsewhere in your tenant but have now appeared on a new field for the first time — indicating local spread rather than external introduction.')}
      ${kpi('Non-catalogued',      summary.nonSystemPests     ?? 0, '#f1c40f',     'tenant-defined pests',              'Pest species defined at the tenant level rather than the system catalogue — may have limited reference data available.')}
    </div>
    <div style="padding:10px 14px;background:var(--surface);border:1px solid var(--border);border-radius:8px;font-size:0.75rem;color:var(--text-dim);margin-bottom:18px;">
      ℹ️ ${escapeHtml(summary.dataNote ?? '')}
    </div>`;

  const rows = flags.map(f => {
    const col = RISK_COL[f.riskLevel] ?? '#888';
    const bg  = RISK_BG[f.riskLevel]  ?? 'transparent';
    const icon = RISK_ICON[f.riskLevel] ?? '📍';

    return `
      <div class="card card-p" style="margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;margin-bottom:8px;">
          <div>
            <div style="font-weight:700;font-size:0.95rem;">${icon} ${escapeHtml(f.pestName)}</div>
            <div style="font-size:0.8rem;color:var(--text-dim);">${escapeHtml(f.fieldName)} · ${escapeHtml(f.farmName)}</div>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <span style="padding:3px 10px;border-radius:20px;font-size:0.72rem;font-weight:700;background:${bg};color:${col};"
                  title="${f.riskLevel === 'High'
                    ? 'High Risk: this pest species has never been recorded anywhere in your organisation before — a genuine new introduction. Consider reporting to local agricultural authorities.'
                    : f.riskLevel === 'Elevated'
                    ? 'Elevated Risk: this pest is known in the system catalogue but is tenant-defined (not in the standard catalogue), making reference data limited.'
                    : 'Standard Risk: the pest is in the system catalogue and has been seen elsewhere in your organisation — this is its first appearance on this specific field.'}">
              ${escapeHtml(f.riskLevel)} Risk · ${escapeHtml(f.introductionType)}
            </span>
            ${!f.isSystemPest ? `<span style="padding:3px 10px;border-radius:20px;font-size:0.72rem;font-weight:700;background:rgba(241,196,15,0.12);color:#f1c40f;"
              title="This pest was defined at the tenant level rather than the system catalogue — reference data and recommended thresholds may be limited.">Non-catalogued</span>` : ''}
          </div>
        </div>

        <div style="display:flex;gap:20px;flex-wrap:wrap;font-size:0.82rem;margin-bottom:10px;">
          <span style="color:var(--text-dim);">
            First seen: <strong>${new Date(f.firstSeen + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
            ${infoIcon('The earliest observation date for this pest on this field within the selected date range, converted to your account timezone. This is the first confirmed detection on this field — not necessarily the first time this pest exists; if the filter start date is too recent, earlier detections may be excluded.')}
          </span>
          <span style="color:var(--text-dim);"
                title="Approximate number of days since the first recorded observation on this field. Calculated as the difference between the detection timestamp (UTC) and the current time, so may differ by ±1 day near day boundaries.">${f.daysSinceFirst} days ago</span>
          <span style="color:var(--text-dim);">
            Observations: <strong>${f.totalObsCount}</strong>
            ${infoIcon('Number of individual scouting observation records where this pest was counted on this field within the selected date range. One observation = one scouting session entry.')}
          </span>
          <span style="color:var(--text-dim);">
            Total count: <strong>${f.totalPestCount}</strong>
            ${infoIcon('Sum of all pest counts across every observation on this field in the selected period — the cumulative number of individual pests recorded, not the number of sessions.')}
          </span>
        </div>

        <div style="padding:8px 12px;background:${bg};border-radius:6px;font-size:0.78rem;color:var(--text);">
          💡 ${escapeHtml(f.recommendation)}
        </div>
      </div>`;
  }).join('');

  el.innerHTML = `${kpis}${rows}`;
}
