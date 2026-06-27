function qs(selector, root = document) { return root.querySelector(selector); }
function qsa(selector, root = document) { return Array.from(root.querySelectorAll(selector)); }

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('show');
}
function closeModal(modal) {
  if (modal) modal.classList.remove('show');
}

qsa('[data-open-modal]').forEach(btn => {
  btn.addEventListener('click', () => openModal(btn.dataset.openModal));
});
qsa('[data-close-modal]').forEach(btn => {
  btn.addEventListener('click', () => closeModal(btn.closest('.modal')));
});
qsa('.modal').forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal(modal);
  });
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') qsa('.modal.show').forEach(closeModal);
});

// Theme switcher
const savedTheme = localStorage.getItem('hf-theme');
if (savedTheme === 'light') document.body.classList.add('light-mode');
const themeToggle = qs('#themeToggle');
if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('light-mode');
    localStorage.setItem('hf-theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
  });
}

function normalize(text) { return (text || '').toString().toLowerCase().trim(); }

function applyTableFilters(tableId) {
  const table = document.getElementById(tableId);
  if (!table) return;
  const search = normalize(qs(`.table-search[data-table="${tableId}"]`)?.value || '');
  const filters = qsa(`.table-filter[data-table="${tableId}"]`).map(filter => ({
    col: Number(filter.dataset.col),
    value: normalize(filter.value)
  })).filter(f => f.value);

  qsa('tbody tr', table).forEach(row => {
    const cells = qsa('td', row);
    const rowText = normalize(row.innerText);
    const searchOk = !search || rowText.includes(search);
    const filtersOk = filters.every(f => normalize(cells[f.col]?.innerText || '').includes(f.value));
    row.style.display = searchOk && filtersOk ? '' : 'none';
  });
}

qsa('.table-search').forEach(input => input.addEventListener('input', () => applyTableFilters(input.dataset.table)));
qsa('.table-filter').forEach(select => select.addEventListener('change', () => applyTableFilters(select.dataset.table)));

qsa('th[data-sort]').forEach(th => {
  th.addEventListener('click', () => {
    const table = th.closest('table');
    const tbody = qs('tbody', table);
    const index = qsa('th', th.parentElement).indexOf(th);
    const current = th.dataset.direction === 'asc' ? 'desc' : 'asc';
    qsa('th[data-sort]', table).forEach(x => delete x.dataset.direction);
    th.dataset.direction = current;

    const rows = qsa('tr', tbody);
    rows.sort((a, b) => {
      const av = qsa('td', a)[index]?.innerText.trim() || '';
      const bv = qsa('td', b)[index]?.innerText.trim() || '';
      const an = Number(av.replace(',', '.'));
      const bn = Number(bv.replace(',', '.'));
      let result;
      if (!Number.isNaN(an) && !Number.isNaN(bn)) result = an - bn;
      else result = av.localeCompare(bv, 'ru', { numeric: true });
      return current === 'asc' ? result : -result;
    });
    rows.forEach(row => tbody.appendChild(row));
  });
});

// Employee edit modal
qsa('[data-edit-employee]').forEach(btn => {
  btn.addEventListener('click', async () => {
    const id = btn.dataset.editEmployee;
    const response = await fetch(`/api/employees/${id}`);
    if (!response.ok) return alert('Не удалось загрузить сотрудника');
    const data = await response.json();
    const form = qs('#employeeEditForm');
    form.action = `/employees/${id}/edit`;
    Object.entries(data).forEach(([key, value]) => {
      const field = qs(`[name="${key}"]`, form);
      if (field) field.value = value || '';
    });
    openModal('employeeEditModal');
    if (typeof runChskpCheck === 'function') runChskpCheck(form);
  });
});

// Employee archive modal
qsa('[data-archive-employee]').forEach(btn => {
  btn.addEventListener('click', () => {
    const form = qs('#employeeArchiveForm');
    form.action = `/employees/${btn.dataset.archiveEmployee}/archive`;
    const notice = qs('.notice', form);
    if (notice) notice.textContent = `Сотрудник ${btn.dataset.nick} уйдет в архив, вся история сохранится.`;
    openModal('employeeArchiveModal');
  });
});

// Vacation end preview
function updateVacationPreview() {
  const start = qs('#vacationStart')?.value;
  const days = Number(qs('#vacationDays')?.value || 0);
  const preview = qs('#vacationEndPreview');
  if (!start || !days || !preview) return;
  const date = new Date(start + 'T00:00:00');
  date.setDate(date.getDate() + Math.max(days, 1));
  preview.textContent = `Дата окончания: ${date.toLocaleDateString('ru-RU')}`;
}
qs('#vacationStart')?.addEventListener('change', updateVacationPreview);
qs('#vacationDays')?.addEventListener('input', updateVacationPreview);
updateVacationPreview();

// Punishment removal preview
function updatePunishmentPreview() {
  const start = qs('#punishmentIssuedDate')?.value;
  const type = qs('#punishmentType')?.value;
  const preview = qs('#autoRemovePreview');
  if (!start || !type || !preview) return;
  const days = type === 'Предупреждение' ? (window.PENALTY_DAYS?.warning || 7) : (window.PENALTY_DAYS?.reprimand || 14);
  const date = new Date(start + 'T00:00:00');
  date.setDate(date.getDate() + days);
  preview.textContent = `${type} будет снято автоматически: ${date.toLocaleDateString('ru-RU')} (${days} дн.)`;
}
qs('#punishmentIssuedDate')?.addEventListener('change', updatePunishmentPreview);
qs('#punishmentType')?.addEventListener('change', updatePunishmentPreview);
updatePunishmentPreview();

// Promotion current position
function updateCurrentPosition() {
  const select = qs('#promotionEmployee');
  const current = qs('#currentPosition');
  if (!select || !current) return;
  current.value = select.selectedOptions[0]?.dataset.position || '';
}
qs('#promotionEmployee')?.addEventListener('change', updateCurrentPosition);
updateCurrentPosition();

// Live blacklist check for employee add/edit forms
async function runChskpCheck(form) {
  const warningBox = form.closest('.modal-card')?.querySelector('.danger-notice');
  if (!warningBox) return;
  const params = new URLSearchParams();
  ['nick', 'discord', 'discord_id', 'telegram', 'telegram_id', 'email'].forEach(name => {
    params.set(name, qs(`[name="${name}"]`, form)?.value || '');
  });
  const hasAny = Array.from(params.values()).some(v => v.trim());
  if (!hasAny) {
    warningBox.classList.add('hidden');
    warningBox.textContent = '';
    return;
  }
  try {
    const response = await fetch(`/api/chskp/check?${params.toString()}`);
    if (!response.ok) return;
    const data = await response.json();
    if (data.has_matches) {
      warningBox.classList.remove('hidden');
      warningBox.innerHTML = `⚠ <b>Найдено совпадение с черным списком!</b><br>${data.matches.map(m => `${m.list_type} #${m.id}: ${m.nick || '-'} · совпали поля: ${m.fields.join(', ')} · причина: ${m.reason} · срок: ${m.term}`).join('<br>')}`;
    } else {
      warningBox.classList.add('hidden');
      warningBox.textContent = '';
    }
  } catch (e) {
    // local panel: silently ignore network errors
  }
}

qsa('.chskp-check-form').forEach(form => {
  ['nick', 'discord', 'discord_id', 'telegram', 'telegram_id', 'email'].forEach(name => {
    const field = qs(`[name="${name}"]`, form);
    if (field) field.addEventListener('input', () => runChskpCheck(form));
  });
});

// CHSKP modal helpers
const chskpTermType = qs('#chskpTermType');
const chskpExpiresWrap = qs('#chskpExpiresWrap');
function updateChskpTerm() {
  if (!chskpTermType || !chskpExpiresWrap) return;
  chskpExpiresWrap.classList.toggle('hidden', chskpTermType.value !== 'До даты');
}
chskpTermType?.addEventListener('change', updateChskpTerm);
updateChskpTerm();

qs('#chskpEmployeeSelect')?.addEventListener('change', async (event) => {
  const id = event.target.value;
  const form = qs('#chskpForm');
  if (!id || !form) return;
  const response = await fetch(`/api/employees/${id}`);
  if (!response.ok) return alert('Не удалось загрузить сотрудника');
  const data = await response.json();
  ['nick', 'position', 'discord', 'discord_id', 'telegram', 'telegram_id', 'email'].forEach(name => {
    const field = qs(`[name="${name}"]`, form);
    if (field) field.value = data[name] || '';
  });
});

// Custom confirm modal for important actions
function ensureConfirmModal() {
  let modal = qs('#customConfirmModal');
  if (modal) return modal;
  modal = document.createElement('div');
  modal.className = 'modal confirm-modal';
  modal.id = 'customConfirmModal';
  modal.innerHTML = `
    <div class="modal-card confirm-card">
      <div class="confirm-icon">!</div>
      <h2>Подтвердите действие</h2>
      <p id="customConfirmText">Вы уверены?</p>
      <div class="confirm-actions">
        <button class="button ghost" type="button" data-confirm-cancel>Отмена</button>
        <button class="button danger" type="button" data-confirm-ok>Подтвердить</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  return modal;
}

function showConfirm(text, onOk) {
  const modal = ensureConfirmModal();
  qs('#customConfirmText', modal).textContent = text || 'Подтвердить действие?';
  modal.classList.add('show');
  const ok = qs('[data-confirm-ok]', modal);
  const cancel = qs('[data-confirm-cancel]', modal);
  const close = () => {
    modal.classList.remove('show');
    ok.replaceWith(ok.cloneNode(true));
    cancel.replaceWith(cancel.cloneNode(true));
  };
  qs('[data-confirm-ok]', modal).addEventListener('click', () => { close(); onOk(); }, { once: true });
  qs('[data-confirm-cancel]', modal).addEventListener('click', close, { once: true });
}

qsa('form[data-confirm]').forEach(form => {
  form.addEventListener('submit', (e) => {
    if (form.dataset.confirmed === '1') return;
    e.preventDefault();
    const text = form.dataset.confirm || 'Подтвердить действие?';
    showConfirm(text, () => { form.dataset.confirmed = '1'; form.submit(); });
  });
});
qsa('[data-confirm-click]').forEach(el => {
  el.addEventListener('click', (e) => {
    if (el.dataset.confirmed === '1') { delete el.dataset.confirmed; return; }
    e.preventDefault();
    showConfirm(el.dataset.confirmClick || 'Подтвердить действие?', () => {
      if (el.tagName === 'A' && el.href) window.location.href = el.href;
      else { el.dataset.confirmed = '1'; el.click(); }
    });
  });
});

// Login loading state
qsa('[data-login-form]').forEach(form => {
  form.addEventListener('submit', () => {
    const btn = qs('button[type="submit"]', form);
    if (!btn) return;
    btn.disabled = true;
    btn.dataset.originalText = btn.textContent;
    btn.textContent = btn.dataset.loadingText || 'Загрузка...';
  });
});

// Employee manual access defaults: trainees usually start without manual access
function updateEmployeeManualDefault(form) {
  const position = qs('[name="position"]', form)?.value;
  const manual = qs('[name="manual_access"]', form);
  if (!manual) return;
  if (manual.dataset.touched === '1') return;
  manual.value = position === 'Стажер' ? '0' : '1';
}
qsa('.employee-form').forEach(form => {
  const position = qs('[name="position"]', form);
  const manual = qs('[name="manual_access"]', form);
  manual?.addEventListener('change', () => { manual.dataset.touched = '1'; });
  position?.addEventListener('change', () => updateEmployeeManualDefault(form));
  updateEmployeeManualDefault(form);
});

// Profile and blacklist term switchers
function bindTermSwitcher(select) {
  const wrapId = select.dataset.expiresWrap;
  const wrap = wrapId ? qs(`#${wrapId}`) : null;
  if (!wrap) return;
  const update = () => wrap.classList.toggle('hidden', select.value !== 'До даты');
  select.addEventListener('change', update);
  update();
}
qsa('.blacklist-term-type').forEach(bindTermSwitcher);
const profileChskpTermType = qs('#profileChskpTermType');
const profileChskpExpiresWrap = qs('#profileChskpExpiresWrap');
function updateProfileChskpTerm() {
  if (!profileChskpTermType || !profileChskpExpiresWrap) return;
  profileChskpExpiresWrap.classList.toggle('hidden', profileChskpTermType.value !== 'До даты');
}
profileChskpTermType?.addEventListener('change', updateProfileChskpTerm);
updateProfileChskpTerm();


// Attestation target dropdown according to hierarchy
function updateAttestationTargets() {
  const employeeSelect = qs('#attestationEmployee');
  const targetSelect = qs('#attestationTarget');
  const submit = qs('#attestationSubmit');
  if (!employeeSelect || !targetSelect) return;
  const position = employeeSelect.selectedOptions[0]?.dataset.position || '';
  const targets = (window.ATTESTATION_TARGETS || {})[position] || [];
  targetSelect.innerHTML = '';
  if (!targets.length) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'Для этой должности нет аттестации на повышение';
    targetSelect.appendChild(option);
    targetSelect.disabled = true;
    if (submit) submit.disabled = true;
    return;
  }
  targets.forEach(target => {
    const option = document.createElement('option');
    option.value = target;
    option.textContent = `${position} → ${target}`;
    targetSelect.appendChild(option);
  });
  targetSelect.disabled = false;
  if (submit) submit.disabled = false;
}
qs('#attestationEmployee')?.addEventListener('change', updateAttestationTargets);
updateAttestationTargets();

// Interview conditional fields
function toggleBySelect(selectId, wrapId, showValue) {
  const select = qs(selectId);
  const wrap = qs(wrapId);
  if (!select || !wrap) return;
  const update = () => wrap.classList.toggle('hidden', select.value !== showValue);
  select.addEventListener('change', update);
  update();
}
toggleBySelect('#punishmentMode', '#punishmentTextWrap', 'Есть');
toggleBySelect('#cheatsMode', '#cheatsTextWrap', 'Есть');
