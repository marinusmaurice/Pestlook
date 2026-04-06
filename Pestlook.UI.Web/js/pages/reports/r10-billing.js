import { escapeHtml } from '../../utils/helpers.js';
import { tag } from '../../components/tag.js';
import {
  C, mkChart, trendArrow,
  kpiGrid, kpiCard, chartCard, tableCard, filterBadge,
} from './utils.js';

export function renderBilling(el, { billing, traps }, rawData) {
  const sorted  = (billing || []).slice().sort((a, b) => new Date(b.billingMonth) - new Date(a.billingMonth));
  const latest  = sorted[0];
  const prev    = sorted[1];
  const active  = traps.filter(t => t.isEnabled).length;
  const quota   = latest ? Math.ceil(latest.activePointCount * 1.5) : 200;
  const quotaPct = quota > 0 ? Math.min(100, Math.round((active / quota) * 100)) : 0;
  const quotaColor = quotaPct >= 90 ? C.red : quotaPct >= 70 ? C.amber : C.green;

  const fmtMonth  = (iso) => iso ? new Date(iso).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '—';
  const fmtAmount = (cents) => cents != null ? 'R ' + (cents / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2 }) : '—';

  // YTD total (current calendar year)
  const thisYear = new Date().getFullYear();
  const ytdAmount = sorted
    .filter(b => b.billingMonth && new Date(b.billingMonth).getFullYear() === thisYear)
    .reduce((sum, b) => sum + (b.amountCents || 0), 0);

  // YoY — compare same months last year vs this year
  const thisYearMonths = sorted.filter(b => b.billingMonth && new Date(b.billingMonth).getFullYear() === thisYear);
  const lastYearMonths = sorted.filter(b => b.billingMonth && new Date(b.billingMonth).getFullYear() === thisYear - 1);
  const thisYearTotal  = thisYearMonths.reduce((sum, b) => sum + (b.amountCents || 0), 0);
  const lastYearTotal  = lastYearMonths.reduce((sum, b) => sum + (b.amountCents || 0), 0);
  const yoyHtml = lastYearTotal > 0 ? trendArrow(thisYearTotal, lastYearTotal) : '<span style="color:var(--text-dim);">No prior year data</span>';

  // Latest vs previous month trend
  const latestAmt = latest?.amountCents ?? 0;
  const prevAmt   = prev?.amountCents   ?? 0;
  const momHtml   = prev ? trendArrow(latestAmt, prevAmt) : '<span style="color:var(--text-dim);">First invoice</span>';

  const tableRows = sorted.length
    ? sorted.map((b, i) => {
        const prevRow    = sorted[i + 1];
        const pending    = /pending|generated/i.test(b.status || '');
        const changeHtml = prevRow ? trendArrow(b.amountCents || 0, prevRow.amountCents || 0) : '<span style="color:var(--text-dim);">—</span>';
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
    ${filterBadge(rawData)}
    ${kpiGrid([
      kpiCard('YTD Spend (' + thisYear + ')', fmtAmount(ytdAmount), `${thisYearMonths.length} invoices · YoY: ${yoyHtml}`),
      kpiCard('Latest Invoice', latest ? fmtAmount(latest.amountCents) : '—', `${fmtMonth(latest?.billingMonth)} · vs prev: ${momHtml}`),
      kpiCard('Monitoring Quota', quota, 'Max active monitoring points'),
      kpiCard('Active / Quota', `${active} / ${quota}`,
        `${quotaPct}% utilised`,
        quotaColor),
    ])}
    <div class="card card-p card-static" style="margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div class="section-title">Monitoring point utilisation</div>
        <span style="font-size:0.8rem;color:var(--text-dim);">${active} of ${quota} points</span>
      </div>
      <div class="progress-bar" style="height:12px;border-radius:6px;">
        <div class="progress-fill" style="width:${quotaPct}%;background:${quotaColor};border-radius:6px;transition:width .4s;"></div>
      </div>
      <div style="font-size:0.75rem;color:var(--text-dim);margin-top:6px;">
        ${quotaPct >= 90 ? '⚠ Approaching quota limit — consider upgrading your plan' :
          quotaPct >= 70 ? 'Quota at moderate utilisation' :
          'Quota well within limits'}
      </div>
    </div>
    ${chartCard('Monthly billing amounts (last 12 months)', 'c-billing', 200, 'Green = paid · Blue = pending')}
    ${tableCard(
      ['Month', 'Active Points', 'Amount', 'vs Prev Month', 'Status'],
      tableRows,
      'Billing history'
    )}
  `;

  setTimeout(() => {
    const chartData = sorted.slice(0, 12).reverse();
    mkChart('c-billing', 'bar', {
      labels: chartData.map(b => fmtMonth(b.billingMonth)),
      datasets: [{
        data: chartData.map(b => (b.amountCents || 0) / 100),
        backgroundColor: chartData.map(b => /pending|generated/i.test(b.status || '') ? C.blue : C.green),
        borderRadius: 4,
      }],
    }, {
      scales: {
        y: { beginAtZero: true, ticks: { callback: v => 'R' + v.toLocaleString(), font: { size: 11 } } },
        x: { ticks: { font: { size: 11 } } },
      },
    });
  }, 0);
}
