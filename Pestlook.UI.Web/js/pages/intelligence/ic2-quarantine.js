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

export async function renderQuarantineFlags(el, data) {
  const { flags = [], summary = {} } = data;

  if (!flags.length) {
    el.innerHTML = emptyState('🔬', 'No new introductions detected',
      summary.dataNote ?? 'No pest species were recorded for the first time on any field within the selected date range.');
    return;
  }

  const kpi = (label, value, colour, sub = '') => `
    <div class="card card-p" style="flex:1;min-width:130px;">
      <div style="font-size:0.72rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px;">${label}</div>
      <div style="font-size:1.7rem;font-weight:700;color:${colour};">${value}</div>
      ${sub ? `<div style="font-size:0.75rem;color:var(--text-dim);margin-top:3px;">${sub}</div>` : ''}
    </div>`;

  const kpis = `
    <div style="font-size:0.72rem;color:var(--text-dim);margin-bottom:14px;line-height:1.6;">Flags pest species recorded on a field <strong>for the first time</strong> within the selected date range. A <strong>New to Tenant</strong> flag means the species has never been seen anywhere in your organisation before — these carry the highest risk and may warrant reporting to local agricultural authorities. A <strong>New to Field</strong> flag means the pest is established elsewhere but has now appeared on a new field.</div>
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:14px;">
      ${kpi('New Introductions',   summary.totalFlags         ?? 0, 'var(--text)',  'flags in period')}
      ${kpi('New to Tenant',       summary.genuineNewSpecies  ?? 0, '#c0392b',     'never seen before — highest risk')}
      ${kpi('New to Field',        summary.newToField         ?? 0, '#e67e22',     'new on this field only')}
      ${kpi('Non-catalogued',      summary.nonSystemPests     ?? 0, '#f1c40f',     'tenant-defined pests')}
    </div>
    <div style="padding:10px 14px;background:var(--surface);border:1px solid var(--border);border-radius:8px;font-size:0.75rem;color:var(--text-dim);margin-bottom:18px;">
      ℹ️ ${escapeHtml(summary.dataNote ?? '')}
    </div>`;

  const rows = flags.map(f => {
    const col = RISK_COL[f.riskLevel] ?? '#888';
    const bg  = RISK_BG[f.riskLevel]  ?? 'transparent';
    const icon = RISK_ICON[f.riskLevel] ?? '📍';

    return `
      <div class="card card-p" style="border-left:4px solid ${col};margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;margin-bottom:8px;">
          <div>
            <div style="font-weight:700;font-size:0.95rem;">${icon} ${escapeHtml(f.pestName)}</div>
            <div style="font-size:0.8rem;color:var(--text-dim);">${escapeHtml(f.fieldName)} · ${escapeHtml(f.farmName)}</div>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <span style="padding:3px 10px;border-radius:20px;font-size:0.72rem;font-weight:700;background:${bg};color:${col};">
              ${escapeHtml(f.riskLevel)} Risk · ${escapeHtml(f.introductionType)}
            </span>
            ${!f.isSystemPest ? `<span style="padding:3px 10px;border-radius:20px;font-size:0.72rem;font-weight:700;background:rgba(241,196,15,0.12);color:#f1c40f;">Non-catalogued</span>` : ''}
          </div>
        </div>

        <div style="display:flex;gap:20px;flex-wrap:wrap;font-size:0.82rem;margin-bottom:10px;">
          <span style="color:var(--text-dim);">First seen: <strong>${f.firstSeen}</strong></span>
          <span style="color:var(--text-dim);">${f.daysSinceFirst} days ago</span>
          <span style="color:var(--text-dim);">Observations: <strong>${f.totalObsCount}</strong></span>
          <span style="color:var(--text-dim);">Total count: <strong>${f.totalPestCount}</strong></span>
        </div>

        <div style="padding:8px 12px;background:${bg};border-radius:6px;font-size:0.78rem;color:var(--text);">
          💡 ${escapeHtml(f.recommendation)}
        </div>
      </div>`;
  }).join('');

  el.innerHTML = `${kpis}${rows}`;
}
