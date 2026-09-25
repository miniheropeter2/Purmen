(() => {
  'use strict';

  const STORAGE_KEY = 'moneyflow-v3';

  const readState = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
      return {};
    }
  };

  const saveState = (state) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore write errors for static front-end
    }
  };

  const getSyncUrl = () => String(readState()?.settings?.syncUrl || '').trim();
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char] || char));

  const number = (value) => Number(String(value ?? '0').replace(/,/g, '')) || 0;
  const money = (value) => `${Math.round(number(value)).toLocaleString('en-US')} MMK`;

  const setStatus = (message, tone = 'idle') => {
    const node = document.getElementById('syncStatus');
    if (node) {
      node.textContent = message;
      node.dataset.status = tone;
    }
  };

  const showToast = (message, tone = 'success') => {
    const node = document.getElementById('toast');
    if (node) {
      node.textContent = message;
      node.dataset.tone = tone;
      node.classList.add('on');
      clearTimeout(showToast.timer);
      showToast.timer = setTimeout(() => node.classList.remove('on'), 2600);
    }
  };

  const ensureSyncUrlInput = () => {
    const existing = document.getElementById('syncUrl');
    if (existing) return existing;

    const list = document.querySelector('#settings .settings-list');
    if (!list) return null;

    const row = document.createElement('label');
    row.className = 'sync-url-row';
    row.innerHTML = '<span>Google Apps Script URL</span><input id="syncUrl" type="url" inputmode="url" placeholder="https://script.google.com/macros/s/AK.../exec" autocomplete="url">';
    list.appendChild(row);
    return row.querySelector('input');
  };

  const wireSyncUrl = () => {
    const input = ensureSyncUrlInput();
    if (!input || input.dataset.bound === 'true') return;

    input.dataset.bound = 'true';
    input.value = getSyncUrl();

    input.addEventListener('input', (event) => {
      const state = readState();
      state.settings = state.settings || {};
      state.settings.syncUrl = String(event.target.value || '').trim();
      saveState(state);
      setStatus(state.settings.syncUrl ? 'Ready to sync' : 'Sync URL required', state.settings.syncUrl ? 'idle' : 'warning');
    });
  };

  const requestJson = async (url, options = {}) => {
    let response;
    try {
      response = await fetch(url, options);
    } catch (error) {
      throw new Error(`Network/CORS error: ${error.message || 'request blocked'}`);
    }

    const text = await response.text();
    let result;
    try {
      result = text ? JSON.parse(text) : {};
    } catch {
      throw new Error('Apps Script returned a non-JSON response. Use the deployed /exec URL.');
    }

    if (!response.ok || result.ok === false) {
      throw new Error(result.error || result.message || `Sync failed (${response.status})`);
    }

    return result.data || result;
  };

  const mergeById = (local, remote) => {
    const merged = new Map();
    const add = (row, source, index) => {
      if (!row || typeof row !== 'object') return;
      const key = row.id != null && String(row.id) ? String(row.id) : `${source}-${index}-${JSON.stringify(row)}`;
      merged.set(key, { ...row, id: row.id || `${source}-${Date.now()}-${index}` });
    };

    (Array.isArray(remote) ? remote : []).forEach((row, index) => add(row, 'remote', index));
    (Array.isArray(local) ? local : []).forEach((row, index) => add(row, 'local', index));
    return [...merged.values()];
  };

  const mergeCategories = (local, remote) => {
    const merged = new Map();
    [...(Array.isArray(remote) ? remote : []), ...(Array.isArray(local) ? local : [])].forEach((row) => {
      if (!row?.name) return;
      const key = `${String(row.name).trim().toLowerCase()}|${String(row.type || 'expense').toLowerCase()}`;
      merged.set(key, { ...merged.get(key), ...row });
    });
    return [...merged.values()];
  };

  const mergeData = (local, remote) => {
    const incoming = remote || {};
    return {
      ...local,
      transactions: mergeById(local.transactions, incoming.transactions),
      loans: mergeById(local.loans, incoming.loans),
      budgets: mergeById(local.budgets, incoming.budgets),
      categories: mergeCategories(local.categories, incoming.categories)
    };
  };

  const applyState = (state) => {
    const current = readState();
    saveState({ ...current, ...state, settings: { ...(current.settings || {}), ...(state.settings || {}) } });
    window.dispatchEvent(new CustomEvent('moneyflow:state-updated'));
  };

  const pull = async (url, reason = 'silent') => {
    setStatus('Loading from Google Sheets…', 'loading');
    const remote = await requestJson(`${url}${url.includes('?') ? '&' : '?'}action=getAll`, { method: 'GET', cache: 'no-store' });
    if (reason === 'manual') showToast('Loaded data from Google Sheets.');
    return remote;
  };

  const push = async (url, state) => requestJson(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      action: 'appendDelta',
      transactions: Array.isArray(state.transactions) ? state.transactions : [],
      loans: Array.isArray(state.loans) ? state.loans : [],
      budgets: Array.isArray(state.budgets) ? state.budgets : [],
      categories: Array.isArray(state.categories) ? state.categories : [],
      syncedAt: new Date().toISOString()
    })
  });

  const syncToGoogleSheets = async (reason = 'manual') => {
    if (syncInFlight) {
      syncInFlight = true;
    }

    const url = getSyncUrl();
    if (!url) {
      setStatus('Sync URL required', 'warning');
      if (reason === 'manual') showToast('Add your Google Apps Script URL in Settings.', 'error');
      return false;
    }

    try {
      const merged = mergeData(readState(), await pull(url, reason === 'manual' ? 'manual' : 'silent'));
      applyState(merged);
      await push(url, merged);
      setStatus('Synced and loaded just now', 'success');
      if (reason === 'manual') showToast('Google Sheets sync completed.');
      return true;
    } catch (error) {
      setStatus('Sync failed', 'error');
      showToast(error.message || 'Sync failed. Check the Apps Script deployment.', 'error');
      return false;
    }
  };

  const renderAllTransactions = () => {
    const tbody = document.getElementById('transactionTable');
    if (!tbody) return;

    const transactions = Array.isArray(readState().transactions) ? readState().transactions : [];
    if (!transactions.length) {
      tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state">No transactions yet.</div></td></tr>';
      return;
    }

    tbody.innerHTML = transactions.map((tx, index) => {
      const type = String(tx.type || 'expense').toLowerCase() === 'income' ? 'income' : 'expense';
      const id = tx.id != null ? String(tx.id) : `legacy-${index}`;

      return `
        <tr data-transaction-id="${esc(id)}">
          <td>${new Date(`${String(tx.date || '').slice(0, 10)}T12:00:00`).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
          <td><span class="pill ${type}">${esc(type)}</span></td>
          <td>${esc(tx.category || 'General')}</td>
          <td>${esc(money(tx.amount))}</td>
          <td>${esc(tx.note || '—')}</td>
          <td><button type="button" class="remove-btn" data-remove-tx="${esc(id)}">Delete</button></td>
        </tr>
      `;
    }).join('');
  };

  const bind = () => {
    wireSyncUrl();

    document.getElementById('syncButton')?.addEventListener('click', () => {
      syncToGoogleSheets('manual');
    });

    document.addEventListener('submit', (event) => {
      if (event.target.closest('form') && getSyncUrl()) {
        setTimeout(() => syncToGoogleSheets('save'), 250);
      }
    }, true);

    document.addEventListener('click', (event) => {
      const remove = event.target.closest('[data-remove-tx]');
      if (!remove) return;

      const state = readState();
      state.transactions = (state.transactions || []).filter((tx) => String(tx.id) !== String(remove.dataset.removeTx));
      saveState(state);
      window.dispatchEvent(new CustomEvent('moneyflow:state-updated'));
    }, true);

    window.addEventListener('moneyflow:state-updated', renderAllTransactions);

    window.syncToGoogleSheets = syncToGoogleSheets;
    window.pullFromGoogleSheets = () => {
      const url = getSyncUrl();
      return url ? pull(url, 'manual') : false;
    };

    setStatus(getSyncUrl() ? 'Ready to sync' : 'Sync URL required', getSyncUrl() ? 'idle' : 'warning');
    renderAllTransactions();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once: true });
  } else {
    bind();
  }
})();
