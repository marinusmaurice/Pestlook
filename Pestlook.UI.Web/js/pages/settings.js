import { getTrapTypes, createTrapType, updateTrapType, deleteTrapType } from '../api/trap-types.js';
import { getUsers, updateUser } from '../api/roles.js';
import { registerUser } from '../api/auth.js';
import { getUser } from '../utils/storage.js';
import { setPageTitle, setTopbarCta } from '../components/topbar.js';
import { openModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { tag } from '../components/tag.js';
import { escapeHtml, initials } from '../utils/helpers.js';

export async function renderSettings(container) {
  setPageTitle('Settings');
  setTopbarCta('', null);

  container.innerHTML = `
    <div style="margin-bottom:24px;">
      <div style="font-family:'Fraunces',serif;font-size:1.4rem;font-weight:700;color:#fff;letter-spacing:-0.02em;">Settings</div>
      <div style="font-size:0.82rem;color:var(--text-dim);">Manage your organisation and preferences</div>
    </div>
    <div class="two-col">
      <div>
        <div class="card card-p" style="margin-bottom:16px;" id="settings-org"></div>
        <div class="card card-p" id="settings-traps">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
            <div class="section-title">Trap Types</div>
            <button class="btn-outline" id="add-trap-btn" style="padding:5px 12px;font-size:0.78rem;">＋ Add</button>
          </div>
          <div id="trap-list" style="display:flex;flex-direction:column;gap:8px;">
            <div class="skeleton-block" style="height:44px;border-radius:8px;"></div>
            <div class="skeleton-block" style="height:44px;border-radius:8px;"></div>
          </div>
        </div>
      </div>
      <div class="card card-p" id="settings-team">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
          <div class="section-title">Team Members</div>
        </div>
        <div id="team-list" style="display:flex;flex-direction:column;gap:10px;">
          <div class="skeleton-block" style="height:48px;border-radius:8px;"></div>
          <div class="skeleton-block" style="height:48px;border-radius:8px;"></div>
        </div>
        <div style="border-top:1px solid var(--border);padding-top:10px;margin-top:14px;">
          <button class="btn-outline" id="invite-btn" style="width:100%;">＋ Add Team Member</button>
        </div>
      </div>
    </div>
  `;

  renderOrgInfo(container);
  loadTrapTypes(container);
  loadTeamMembers(container);

  container.querySelector('#add-trap-btn').addEventListener('click', () => openAddTrapModal(container));
  container.querySelector('#invite-btn').addEventListener('click', () => openInviteModal(container));
}

function renderOrgInfo(container) {
  const user = getUser();
  const orgBox = container.querySelector('#settings-org');
  orgBox.innerHTML = `
    <div class="section-title" style="margin-bottom:16px;">Organisation</div>
    <div style="margin-bottom:14px;">
      <div class="input-label">Tenant</div>
      <div class="input-field" style="background:var(--surface3);cursor:default;">${escapeHtml(user?.tenantName || user?.email || '—')}</div>
    </div>
    <div style="margin-bottom:14px;">
      <div class="input-label">Email</div>
      <div class="input-field" style="background:var(--surface3);cursor:default;">${escapeHtml(user?.email || '—')}</div>
    </div>
    <div>
      <div class="input-label">Roles</div>
      <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap;">
        ${(user?.roles || []).map(r => tag(r, 'green')).join('')}
      </div>
    </div>
  `;
}

async function loadTrapTypes(container) {
  const list = container.querySelector('#trap-list');
  try {
    const res = await getTrapTypes();
    const types = res.data || [];

    if (types.length === 0) {
      list.innerHTML = `<div style="font-size:0.82rem;color:var(--text-dim);padding:8px;">No trap types configured.</div>`;
      return;
    }

    list.innerHTML = types.map(t => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:var(--surface2);border-radius:8px;" data-trap-id="${t.id}">
        <div>
          <span style="font-size:0.85rem;color:var(--text);">${escapeHtml(t.name)}</span>
          ${t.description ? `<div style="font-size:0.68rem;color:var(--text-dim);">${escapeHtml(t.description)}</div>` : ''}
        </div>
        <div style="display:flex;gap:6px;">
          <button class="btn-outline trap-edit-btn" style="padding:4px 10px;font-size:0.72rem;" data-id="${t.id}" data-name="${escapeHtml(t.name)}" data-desc="${escapeHtml(t.description || '')}">Edit</button>
          <button class="btn-outline trap-del-btn" style="padding:4px 10px;font-size:0.72rem;border-color:rgba(224,96,96,0.3);color:var(--red);" data-id="${t.id}">✕</button>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('.trap-edit-btn').forEach(btn => {
      btn.addEventListener('click', () => openEditTrapModal(container, btn.dataset.id, btn.dataset.name, btn.dataset.desc));
    });

    list.querySelectorAll('.trap-del-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this trap type?')) return;
        try {
          await deleteTrapType(btn.dataset.id);
          showToast('Trap type deleted');
          loadTrapTypes(container);
        } catch (err) {
          showToast(err.message || 'Failed to delete', 'error');
        }
      });
    });
  } catch (err) {
    list.innerHTML = `<div style="color:var(--red);font-size:0.82rem;">Failed to load trap types</div>`;
  }
}

function openAddTrapModal(container) {
  const body = openModal({
    title: 'Add Trap Type',
    subtitle: 'Define a new trap type for monitoring points',
    content: `
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div>
          <div class="input-label">Name *</div>
          <input class="input-field" id="trap-name" placeholder="e.g. Pheromone Trap" type="text">
        </div>
        <div>
          <div class="input-label">Description</div>
          <input class="input-field" id="trap-desc" placeholder="Optional description" type="text">
        </div>
        <div style="display:flex;gap:10px;margin-top:6px;">
          <button class="btn-outline" id="trap-cancel" style="flex:1;">Cancel</button>
          <button class="btn-primary" id="trap-submit" style="flex:2;justify-content:center;">Add Trap Type</button>
        </div>
      </div>
    `,
  });

  body.querySelector('#trap-cancel').addEventListener('click', closeModal);
  body.querySelector('#trap-submit').addEventListener('click', async () => {
    const name = body.querySelector('#trap-name').value.trim();
    if (!name) { showToast('Name is required', 'error'); return; }
    const btn = body.querySelector('#trap-submit');
    btn.disabled = true; btn.textContent = 'Adding…';
    try {
      await createTrapType({ name, description: body.querySelector('#trap-desc').value.trim() || null });
      closeModal();
      showToast('Trap type added');
      loadTrapTypes(container);
    } catch (err) {
      showToast(err.message || 'Failed to add', 'error');
      btn.disabled = false; btn.textContent = 'Add Trap Type';
    }
  });
}

function openEditTrapModal(container, id, currentName, currentDesc) {
  const body = openModal({
    title: 'Edit Trap Type',
    content: `
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div>
          <div class="input-label">Name *</div>
          <input class="input-field" id="trap-name" value="${escapeHtml(currentName)}" type="text">
        </div>
        <div>
          <div class="input-label">Description</div>
          <input class="input-field" id="trap-desc" value="${escapeHtml(currentDesc)}" type="text">
        </div>
        <div style="display:flex;gap:10px;margin-top:6px;">
          <button class="btn-outline" id="trap-cancel" style="flex:1;">Cancel</button>
          <button class="btn-primary" id="trap-submit" style="flex:2;justify-content:center;">Save Changes</button>
        </div>
      </div>
    `,
  });

  body.querySelector('#trap-cancel').addEventListener('click', closeModal);
  body.querySelector('#trap-submit').addEventListener('click', async () => {
    const name = body.querySelector('#trap-name').value.trim();
    if (!name) { showToast('Name is required', 'error'); return; }
    const btn = body.querySelector('#trap-submit');
    btn.disabled = true; btn.textContent = 'Saving…';
    try {
      await updateTrapType(id, { name, description: body.querySelector('#trap-desc').value.trim() || null });
      closeModal();
      showToast('Trap type updated');
      loadTrapTypes(container);
    } catch (err) {
      showToast(err.message || 'Failed to update', 'error');
      btn.disabled = false; btn.textContent = 'Save Changes';
    }
  });
}

async function loadTeamMembers(container) {
  const list = container.querySelector('#team-list');
  try {
    const res = await getUsers();
    const users = res.data || [];

    if (users.length === 0) {
      list.innerHTML = `<div style="font-size:0.82rem;color:var(--text-dim);padding:8px;">No team members found.</div>`;
      return;
    }

    const avatarGradients = [
      'linear-gradient(135deg,#4a9e60,#2a5e38)',
      'linear-gradient(135deg,#4a6e9e,#2a4e7e)',
      'linear-gradient(135deg,#8e4a9e,#5a2a7e)',
      'linear-gradient(135deg,#9e7a4a,#7e5a2a)',
      'linear-gradient(135deg,#9e4a4a,#7e2a2a)',
    ];

    list.innerHTML = users.map((u, i) => {
      const userInitials = initials(u.firstName || u.email?.charAt(0) || '?', u.lastName || '');
      const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email;
      const role = u.roles?.[0] || 'User';
      const roleColor = role === 'Admin' ? 'green' : role === 'Manager' ? 'green' : 'blue';

      return `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
          <div class="user-avatar" style="width:36px;height:36px;font-size:0.8rem;background:${avatarGradients[i % avatarGradients.length]};">${userInitials}</div>
          <div style="flex:1;">
            <div style="font-size:0.85rem;font-weight:600;color:var(--text);">${escapeHtml(fullName)}</div>
            <div style="font-size:0.72rem;color:var(--text-dim);">${escapeHtml(u.email || '')}</div>
          </div>
          ${tag(role, roleColor)}
          <button class="btn-outline user-edit-btn" style="padding:4px 10px;font-size:0.72rem;" data-id="${u.id}" data-first="${escapeHtml(u.firstName || '')}" data-last="${escapeHtml(u.lastName || '')}" data-email="${escapeHtml(u.email || '')}" data-active="${u.isActive}" data-role="${escapeHtml(role)}">Edit</button>
        </div>
      `;
    }).join('');

    list.querySelectorAll('.user-edit-btn').forEach(btn => {
      btn.addEventListener('click', () => openEditUserModal(container, btn.dataset));
    });
  } catch (err) {
    list.innerHTML = `<div style="color:var(--red);font-size:0.82rem;">Failed to load team members</div>`;
  }
}

function openInviteModal(container) {
  const body = openModal({
    title: 'Add Team Member',
    subtitle: 'Register a new user for your tenant',
    content: `
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div>
            <div class="input-label">First Name *</div>
            <input class="input-field" id="inv-first" placeholder="First name" type="text">
          </div>
          <div>
            <div class="input-label">Last Name *</div>
            <input class="input-field" id="inv-last" placeholder="Last name" type="text">
          </div>
        </div>
        <div>
          <div class="input-label">Email *</div>
          <input class="input-field" id="inv-email" placeholder="user@example.com" type="email">
        </div>
        <div>
          <div class="input-label">Temporary Password *</div>
          <input class="input-field" id="inv-pass" placeholder="Min 8 characters" type="password">
        </div>
        <div>
          <div class="input-label">Role</div>
          <select class="input-field" id="inv-role">
            <option value="Scout">Scout</option>
            <option value="Admin">Admin</option>
          </select>
        </div>
        <div style="display:flex;gap:10px;margin-top:6px;">
          <button class="btn-outline" id="inv-cancel" style="flex:1;">Cancel</button>
          <button class="btn-primary" id="inv-submit" style="flex:2;justify-content:center;">＋ Add Member</button>
        </div>
      </div>
    `,
  });

  body.querySelector('#inv-cancel').addEventListener('click', closeModal);
  body.querySelector('#inv-submit').addEventListener('click', async () => {
    const email = body.querySelector('#inv-email').value.trim();
    const password = body.querySelector('#inv-pass').value;
    const firstName = body.querySelector('#inv-first').value.trim();
    const lastName = body.querySelector('#inv-last').value.trim();
    const role = body.querySelector('#inv-role').value;

    if (!email || !password || !firstName || !lastName) {
      showToast('All fields are required', 'error');
      return;
    }

    const btn = body.querySelector('#inv-submit');
    btn.disabled = true; btn.textContent = 'Adding…';

    try {
      await registerUser({ email, password, firstName, lastName, role });
      closeModal();
      showToast('Team member added');
      loadTeamMembers(container);
    } catch (err) {
      showToast(err.message || 'Failed to add member', 'error');
      btn.disabled = false; btn.textContent = '＋ Add Member';
    }
  });
}

function openEditUserModal(container, data) {
  const body = openModal({
    title: "Edit Team Member",
    subtitle: "Update user details and role",
    content: `
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div>
            <div class="input-label">First Name *</div>
            <input class="input-field" id="edit-first" placeholder="First name" type="text" value="${escapeHtml(data.first||'')}">
          </div>
          <div>
            <div class="input-label">Last Name *</div>
            <input class="input-field" id="edit-last" placeholder="Last name" type="text" value="${escapeHtml(data.last||'')}">
          </div>
        </div>
        <div>
          <div class="input-label">Email</div>
          <input class="input-field" id="edit-email" type="email" value="${escapeHtml(data.email||'')}" disabled style="background:var(--surface3);cursor:default;">
        </div>
        <div>
          <div class="input-label">Role</div>
          <select class="input-field" id="edit-role">
            <option value="Scout" ${data.role==='Scout'?'selected':''}>Scout</option>
            <option value="Admin" ${data.role==='Admin'?'selected':''}>Admin</option>
          </select>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <input type="checkbox" id="edit-active" ${data.active==='true'?'checked':''}>
          <label for="edit-active" class="input-label" style="margin:0;">Active</label>
        </div>
        <div style="display:flex;gap:10px;margin-top:6px;">
          <button class="btn-outline" id="edit-cancel" style="flex:1;">Cancel</button>
          <button class="btn-primary" id="edit-submit" style="flex:2;justify-content:center;">Save Changes</button>
        </div>
      </div>
    `,
  });

  body.querySelector("#edit-cancel").addEventListener("click", closeModal);
  body.querySelector("#edit-submit").addEventListener("click", async () => {
    const firstName = body.querySelector("#edit-first").value.trim();
    const lastName = body.querySelector("#edit-last").value.trim();
    const role = body.querySelector("#edit-role").value;
    const isActive = body.querySelector("#edit-active").checked;

    if (!firstName || !lastName) {
      showToast("First and last name are required", "error");
      return;
    }

    const btn = body.querySelector("#edit-submit");
    btn.disabled = true; btn.textContent = "Saving…";

    try {
      await updateUser(data.id, { firstName, lastName, isActive, role });
      closeModal();
      showToast("User updated");
      loadTeamMembers(container);
    } catch (err) {
      showToast(err.message || "Failed to update user", "error");
      btn.disabled = false; btn.textContent = "Save Changes";
    }
  });
}

