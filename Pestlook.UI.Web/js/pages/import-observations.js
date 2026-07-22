import { getFarms } from '../api/farms.js';
import { getFields } from '../api/fields.js';
import { downloadObservationTemplate, validateImportFile, commitImportFile } from '../api/import.js';
import { saveBlob } from '../api/client.js';
import { openModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { escapeHtml } from '../utils/helpers.js';

export async function openImportModal(onImported) {
  const [farms, fields] = await Promise.all([
    getFarms().then(r => r.data || []),
    getFields().then(r => r.data || []),
  ]);

  const form = document.createElement('div');
  form.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:16px;">
      <div class="card-p" style="border:1px solid var(--border);border-radius:10px;padding:16px;">
        <div class="section-title" style="margin-bottom:10px;">1. Download a template</div>
        <div style="display:flex;flex-direction:column;gap:10px;">
          <div>
            <label class="input-label">Farm</label>
            <select class="input-field" id="impFarm">
              <option value="">— Select farm —</option>
              ${farms.map(f => `<option value="${f.id}">${escapeHtml(f.name)}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="input-label">Field</label>
            <select class="input-field" id="impField" disabled>
              <option value="">— Select farm first —</option>
            </select>
          </div>
          <button class="btn-outline" id="impDownloadBtn" style="justify-content:center;" disabled>⬇ Download Template</button>
        </div>
      </div>

      <div class="card-p" style="border:1px solid var(--border);border-radius:10px;padding:16px;">
        <div class="section-title" style="margin-bottom:10px;">2. Upload the completed sheet</div>
        <input type="file" id="impFile" accept=".xlsx" class="input-field" />
        <button class="btn-primary" id="impValidateBtn" style="width:100%;justify-content:center;margin-top:10px;" disabled>Check Sheet</button>
      </div>

      <div id="impReport"></div>
    </div>
  `;

  openModal({
    title: 'Import from Paper Sheets',
    subtitle: 'Download a template, fill it in offline, then upload it here',
    content: form,
  });

  function populateFieldSelect(farmId) {
    const sel = document.getElementById('impField');
    const filtered = fields.filter(f => f.farmId === farmId);
    sel.disabled = filtered.length === 0;
    sel.innerHTML = filtered.length
      ? '<option value="">— Select field —</option>' + filtered.map(f => `<option value="${f.id}">${escapeHtml(f.name)}</option>`).join('')
      : '<option value="">— Select farm first —</option>';
  }

  document.getElementById('impFarm').addEventListener('change', e => {
    populateFieldSelect(e.target.value);
    document.getElementById('impDownloadBtn').disabled = true;
  });

  document.getElementById('impField').addEventListener('change', e => {
    document.getElementById('impDownloadBtn').disabled = !e.target.value;
  });

  document.getElementById('impDownloadBtn').addEventListener('click', async () => {
    const fieldId = document.getElementById('impField').value;
    if (!fieldId) return;
    const btn = document.getElementById('impDownloadBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>';
    try {
      const { blob, filename } = await downloadObservationTemplate(fieldId);
      saveBlob(blob, filename);
      showToast('Template downloaded');
    } catch (err) {
      showToast(err.message || 'Failed to download template', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '⬇ Download Template';
    }
  });

  const fileInput = document.getElementById('impFile');
  fileInput.addEventListener('change', () => {
    document.getElementById('impValidateBtn').disabled = !fileInput.files.length;
    document.getElementById('impReport').innerHTML = '';
  });

  document.getElementById('impValidateBtn').addEventListener('click', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    const btn = document.getElementById('impValidateBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Checking…';
    try {
      const res = await validateImportFile(file);
      renderReport(res.data, file);
    } catch (err) {
      showToast(err.message || 'Failed to validate sheet', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Check Sheet';
    }
  });

  function renderReport(report, file) {
    const reportEl = document.getElementById('impReport');
    const allErrors = [...report.sessionErrors, ...report.rowErrors];

    const summaryColor = report.canCommit ? 'var(--green)' : 'var(--red)';
    const summaryText = report.canCommit
      ? `✓ Ready to import — ${report.validRowCount} observation(s)`
      : `${report.invalidRowCount} of ${report.totalRows} row(s) have problems`;

    reportEl.innerHTML = `
      <div class="card-p" style="border:1px solid var(--border);border-radius:10px;padding:16px;">
        <div style="font-weight:600;color:${summaryColor};margin-bottom:10px;">${summaryText}</div>
        <div style="font-size:0.8rem;color:var(--text-dim);margin-bottom:10px;">
          ${escapeHtml(report.farmName || '—')} / ${escapeHtml(report.fieldName || '—')} · ${escapeHtml(report.scoutName || '—')} · ${escapeHtml(report.sessionDate || '—')}
        </div>
        ${allErrors.length ? `
          <div style="max-height:200px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;">
            <table class="data-table">
              <thead><tr><th>Row</th><th>Problem</th></tr></thead>
              <tbody>
                ${allErrors.map(e => `<tr><td>${e.rowNumber}</td><td>${escapeHtml(e.message)}</td></tr>`).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}
        <div style="display:flex;gap:10px;margin-top:14px;">
          <button class="btn-outline" style="flex:1;" id="impCancelBtn">Cancel</button>
          <button class="btn-primary" style="flex:2;justify-content:center;" id="impCommitBtn" ${report.canCommit ? '' : 'disabled'}>✓ Confirm Import</button>
        </div>
      </div>
    `;

    document.getElementById('impCancelBtn').addEventListener('click', closeModal);
    const commitBtn = document.getElementById('impCommitBtn');
    if (report.canCommit) {
      commitBtn.addEventListener('click', async () => {
        commitBtn.disabled = true;
        commitBtn.innerHTML = '<span class="spinner"></span>';
        try {
          const res = await commitImportFile(file);
          showToast(res.message || 'Session imported', 'success');
          closeModal();
          onImported?.();
        } catch (err) {
          showToast(err.message || 'Failed to commit import', 'error');
          commitBtn.disabled = false;
          commitBtn.textContent = '✓ Confirm Import';
        }
      });
    }
  }
}
