import { escapeHtml } from '../../utils/helpers.js';
import { tag } from '../../components/tag.js';
import {
  C, mkChart, trendArrow,
  kpiGrid, kpiCard, chartCard, tableCard, filterBadge,
} from './utils.js';

// data = { activeTraps, snapshots: [{ billingMonth, activePointCount, amountCents, status }] }
export function renderBilling(el, data, lookups) {
  const activeTraps = data.activeTraps ?? 0;
  const sorted      = (data.snapshots ?? []).slice().sort((a, b) => new Date(b.billingMonth) - new Date(a.billingMonth));
  const latest      = sorted[0];
  const prev        = sorted[1];

  const unlimitedBeta = true;
  const quota      = latest ? Math.ceil(latest.activePointCount * 1.5) : 200;
  const quotaPct   = quota > 0 ? Math.min(100, Math.round((activeTraps / quota) * 100)) : 0;
  const quotaColor = quotaPct >= 90 ? C.red : quotaPct >= 70 ? C.amber : C.green;

  const fmtMonth  = iso => iso ? new Date(iso).toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' }) : '—';
  const fmtAmount = cents => cents != null ? 'R ' + (cents / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2 }) : '—';

  const thisYear = new Date().getFullYear();
  const billingYear = iso => Number(new Date(iso).toLocaleDateString('en-CA', { year: 'numeric', timeZone: 'UTC' }));
  const ytd      = sorted.filter(b => b.billingMonth && billingYear(b.billingMonth) === thisYear);
  const ytdAmt   = ytd.reduce((s, b) => s + (b.amountCents ?? 0), 0);

  const lastYr    = sorted.filter(b => b.billingMonth && billingYear(b.billingMonth) === thisYear - 1);
  const yoyHtml   = lastYr.length > 0 ? trendArrow(ytdAmt, lastYr.reduce((s, b) => s + (b.amountCents ?? 0), 0)) : '<span style="color:var(--text-dim);">No prior year data</span>';
  const momHtml   = prev ? trendArrow(latest?.amountCents ?? 0, prev.amountCents ?? 0) : '<span style="color:var(--text-dim);">First invoice</span>';

  // Last 12 months chart
  const last12 = sorted.slice(0, 12).reverse();

  const tableRows = sorted.length
    ? sorted.map((b, i) => {
        const prevRow   = sorted[i + 1];
        const pending   = /pending|generated/i.test(b.status ?? '');
        const changeHtml = prevRow ? trendArrow(b.amountCents ?? 0, prevRow.amountCents ?? 0) : '<span style="color:var(--text-dim);">—</span>';
        return `<tr>
          <td>${fmtMonth(b.billingMonth)}</td>
          <td style="font-family:'JetBrains Mono',monospace;">${b.activePointCount ?? '—'}</td>
          <td style="font-family:'JetBrains Mono',monospace;font-weight:600;">${fmtAmount(b.amountCents)}</td>
          <td style="font-size:0.82rem;">${changeHtml}</td>
          <td>${tag(pending ? 'Pending' : 'Paid', pending ? 'blue' : 'green')}</td>
        </tr>`;
      }).join('')
    : `<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:20px;">No billing history yet</td></tr>`;

  el.innerHTML = `
    ${filterBadge(lookups)}
    ${kpiGrid([
      kpiCard('YTD Spend (' + thisYear + ')', fmtAmount(ytdAmt), `${ytd.length} invoices · YoY: ${yoyHtml}`, '',
        `Total amount billed for all invoices in ${thisYear} so far. YoY compares against the same invoices from ${thisYear - 1}.`),
      kpiCard('Latest Invoice', latest ? fmtAmount(latest.amountCents) : '—', `${fmtMonth(latest?.billingMonth)} · vs prev: ${momHtml}`, '',
        'The most recent billing snapshot amount. MoM compares it against the previous month\'s invoice.'),
      kpiCard('Monitoring Quota', unlimitedBeta ? 'Unlimited' : quota, unlimitedBeta ? 'While in beta' : 'Max active monitoring points', '',
        unlimitedBeta ? 'No quota limit applies during the beta period.' : 'The maximum number of active trap/monitoring points permitted under your current plan. Estimated as 1.5× last month\'s active point count.'),
      kpiCard('Active Points', `${activeTraps}`, unlimitedBeta ? 'No quota limit while in beta' : `${quotaPct}% of ${quota} utilised`, unlimitedBeta ? C.green : quotaColor,
        unlimitedBeta ? `You currently have ${activeTraps} enabled traps. No quota limit applies during the beta period.` : `You currently have ${activeTraps} enabled traps out of a quota of ${quota}. At 90%+ you are approaching the plan limit.`),
    ])}
    ${!unlimitedBeta ? `<div class="card card-p card-static" style="margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div class="section-title">Monitoring point utilisation</div>
        <span style="font-size:0.8rem;color:var(--text-dim);">${activeTraps} of ${quota} points</span>
      </div>
      <div class="progress-bar" style="height:12px;border-radius:6px;">
        <div class="progress-fill" style="width:${quotaPct}%;background:${quotaColor};border-radius:6px;transition:width .4s;"></div>
      </div>
      <div style="font-size:0.75rem;color:var(--text-dim);margin-top:6px;">
        ${quotaPct >= 90 ? '⚠ Approaching quota limit'
          : quotaPct >= 70 ? 'Quota at moderate utilisation'
          : 'Quota well within limits'}
      </div>
    </div>` : ''}
    ${chartCard('Monthly billing amounts (last 12 months)', 'c-billing', 200, 'Green = paid · Blue = pending')}
    ${tableCard(
      ['Month', 'Active Points', 'Amount', 'vs Prev Month', 'Status'],
      tableRows,
      'Billing history',
      'Most recent first'
    )}
  `;

  setTimeout(() => {
    mkChart('c-billing', 'bar', {
      labels: last12.map(b => fmtMonth(b.billingMonth)),
      datasets: [{
        data: last12.map(b => (b.amountCents ?? 0) / 100),
        backgroundColor: last12.map(b => /pending/i.test(b.status ?? '') ? C.blue : C.green),
        borderRadius: 4,
      }],
    }, {
      scales: {
        y: { beginAtZero: true, ticks: { callback: v => 'R ' + v, font: { size: 11 } } },
        x: { ticks: { font: { size: 11 } } },
      },
    });
  }, 0);
}
