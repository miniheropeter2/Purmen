(() => {
  'use strict';

  const KEY = 'moneyflow-v3';
  const read = () => {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (_) { return {}; }
  };
  const write = (state) => localStorage.setItem(KEY, JSON.stringify(state));
  const newId = (prefix) => window.crypto?.randomUUID?.() || `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const money = (value) => `${Math.round(Number(value) || 0).toLocaleString('en-US')} MMK`;

  const notify = (message, error = false) => {
    const node = document.getElementById('toast');
    if (!node) return;
    node.textContent = message;
    node.style.borderColor = error ? 'var(--red)' : 'var(--line)';
    node.classList.add('show');
    clearTimeout(notify.timer);
    notify.timer = setTimeout(() => node.classList.remove('show'), 2600);
  };

  const renderTransactions = () => {
    const tbody = document.getElementById('transactionTable');
    if (!tbody) return;
    const rows = (Array.isArray(read().transactions) ? read().transactions : []).filter(Boolean);
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state">No transactions yet.</div></td></tr>';
      return;
    }
    rows.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    tbody.innerHTML = rows.map((tx, index) => `<tr>
      <td>${esc(tx.date || '—')}</td>
      <td><span class="pill ${tx.type === 'expense' ? 'expense' : 'income'}">${esc(tx.type || 'expense')}</span></td>
      <td>${esc(tx.category || 'General')}</td><td>${esc(money(tx.amount))}</td><td>${esc(tx.note || '—')}</td>
      <td><button type="button" class="remove-btn" data-fix-delete="${esc(tx.id || index)}">Delete</button></td>
    </tr>`).join('');
  };

  const addStyles = () => {
    if (document.getElementById('transaction-fix-style')) return;
    const style = document.createElement('style');
    style.id = 'transaction-fix-style';
    style.textContent = `
      .transaction-fix-backdrop { position:fixed; inset:0; z-index:1000; display:grid; place-items:center; padding:18px; background:rgba(2,6,23,.66); backdrop-filter:blur(7px); }
      .transaction-fix-backdrop.hidden { display:none; }
      .transaction-fix-modal { width:min(700px,100%); max-height:min(760px,calc(100vh - 36px)); overflow:auto; color:var(--text); background:var(--surface-solid); border:1px solid var(--line); border-radius:var(--radius-lg); box-shadow:var(--shadow); padding:24px; }
      body.dark .transaction-fix-modal { background:linear-gradient(145deg,rgba(19,30,52,.99),rgba(10,16,30,.99)); }
      .transaction-fix-modal .modal-header { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; }
      .transaction-fix-modal h2 { margin:3px 0 0; font-size:clamp(1.35rem,3vw,1.8rem); }
      .transaction-fix-modal .modal-header small { color:var(--muted); text-transform:uppercase; letter-spacing:.1em; font-weight:700; font-size:.7rem; }
      .transaction-fix-close { border:0; background:transparent; color:var(--muted); font-size:1.8rem; line-height:1; padding:2px 6px; }
      .transaction-fix-tabs { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; margin:22px 0 18px; padding:5px; border:1px solid var(--line); border-radius:14px; background:color-mix(in srgb,var(--surface-solid) 82%,transparent); }
      .transaction-fix-tabs button { min-height:42px; border:0; border-radius:10px; color:var(--muted); background:transparent; font-weight:700; padding:8px 10px; }
      .transaction-fix-tabs button:hover { color:var(--text); background:rgba(79,140,255,.1); }
      .transaction-fix-tabs button.active { color:#fff; background:linear-gradient(135deg,var(--blue),var(--violet)); box-shadow:0 8px 18px rgba(79,140,255,.2); }
      .transaction-fix-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; }
      .transaction-fix-grid label { display:grid; gap:7px; }
      .transaction-fix-grid label.full { grid-column:1/-1; }
      .transaction-fix-grid label > span { color:var(--muted); font-size:.86rem; font-weight:600; }
      .transaction-fix-grid input, .transaction-fix-grid select { width:100%; min-height:44px; padding:0 12px; color:var(--text); background:rgba(255,255,255,.04); border:1px solid var(--line); border-radius:12px; outline:none; }
      .transaction-fix-grid input:focus, .transaction-fix-grid select:focus { border-color:var(--blue); box-shadow:0 0 0 3px rgba(79,140,255,.14); }
      body.dark .transaction-fix-grid input, body.dark .transaction-fix-grid select { background:rgba(7,11,22,.72); }
      .transaction-fix-grid [hidden] { display:none; }
      .transaction-fix-error { display:none; margin:0 0 14px; padding:10px 12px; color:var(--red); border:1px solid color-mix(in srgb,var(--red) 35%,transparent); border-radius:10px; background:color-mix(in srgb,var(--red) 9%,transparent); }
      .transaction-fix-error.visible { display:block; }
      .transaction-fix-actions { display:flex; justify-content:flex-end; gap:10px; margin-top:22px; }
      @media(max-width:560px) { .transaction-fix-modal { padding:18px; } .transaction-fix-tabs,.transaction-fix-grid { grid-template-columns:1fr; } .transaction-fix-grid label.full { grid-column:auto; } }
    `;
    document.head.appendChild(style);
  };

  const open = () => {
    addStyles();
    let modal = document.getElementById('transactionFixModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'transactionFixModal';
      modal.className = 'transaction-fix-backdrop hidden';
      modal.innerHTML = `<div class="transaction-fix-modal" role="dialog" aria-modal="true" aria-labelledby="transactionFixTitle">
        <div class="modal-header"><div><small>Add transaction</small><h2 id="transactionFixTitle">Record a transaction</h2></div><button type="button" class="transaction-fix-close" data-fix-close aria-label="Close">×</button></div>
        <div class="transaction-fix-tabs" role="tablist" aria-label="Transaction type"><button type="button" class="active" data-fix-mode="standard" role="tab">Income / Expense</button><button type="button" data-fix-mode="loan" role="tab">Loan</button><button type="button" data-fix-mode="repayment" role="tab">Loan repayment</button></div>
        <div class="transaction-fix-error" data-fix-error role="alert"></div>
        <form class="transaction-fix-form"><div class="transaction-fix-grid">
          <label><span>Type</span><select name="type"><option value="expense">Expense</option><option value="income">Income</option></select></label>
          <label><span>Category</span><select name="category"></select></label>
          <label data-fix-amount><span>Amount</span><input name="amount" type="number" min="1" step="1" inputmode="decimal" required></label>
          <label data-fix-loan hidden><span>Loan to repay</span><select name="loanId"></select></label>
          <label><span>Date</span><input name="date" type="date" required></label>
          <label class="full"><span>Note</span><input name="note" type="text" maxlength="160" placeholder="Optional note"></label>
        </div><div class="transaction-fix-actions"><button type="button" class="ghost-btn" data-fix-close>Close</button><button type="submit" class="primary-btn">Save transaction</button></div></form>
      </div>`;
      document.body.appendChild(modal);
      const form = modal.querySelector('form');
      const error = (message) => { const box = modal.querySelector('[data-fix-error]'); box.textContent = message; box.classList.add('visible'); };
      const categories = (type) => (read().categories || []).filter((c) => c.type === type).map((c) => `<option value="${esc(c.name)}">${esc(c.name)}</option>`).join('');
      const setMode = (mode) => {
        modal.querySelectorAll('[data-fix-mode]').forEach((tab) => { tab.classList.toggle('active', tab.dataset.fixMode === mode); tab.setAttribute('aria-selected', tab.dataset.fixMode === mode); });
        const type = form.elements.type; const category = form.elements.category;
        const repayment = mode === 'repayment'; const loan = mode === 'loan';
        modal.querySelector('[data-fix-amount]').hidden = repayment;
        modal.querySelector('[data-fix-loan]').hidden = !repayment;
        type.disabled = loan || repayment; category.disabled = loan || repayment;
        form.elements.amount.required = !repayment;
        if (loan) { type.value = 'income'; category.innerHTML = '<option value="Loan">Loan</option>'; category.value = 'Loan'; }
        else if (repayment) { type.value = 'expense'; category.innerHTML = '<option value="Loan repayment">Loan repayment</option>'; category.value = 'Loan repayment'; }
        else { type.disabled = false; category.disabled = false; category.innerHTML = categories(type.value) || '<option value="">No categories</option>'; }
        modal.querySelector('[data-fix-error]').classList.remove('visible');
      };
      form.elements.type.addEventListener('change', () => { if (!modal.querySelector('[data-fix-mode].active').dataset.fixMode === 'standard') return; form.elements.category.innerHTML = categories(form.elements.type.value) || '<option value="">No categories</option>'; });
      modal.querySelectorAll('[data-fix-mode]').forEach((tab) => tab.addEventListener('click', () => setMode(tab.dataset.fixMode)));
      modal.querySelectorAll('[data-fix-close]').forEach((button) => button.addEventListener('click', () => close()));
      modal.addEventListener('click', (event) => { if (event.target === modal) close(); });
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const mode = modal.querySelector('[data-fix-mode].active').dataset.fixMode; const state = read();
        state.transactions = Array.isArray(state.transactions) ? state.transactions : []; state.loans = Array.isArray(state.loans) ? state.loans : [];
        const amount = Number(form.elements.amount.value || 0); const loanId = form.elements.loanId.value;
        if (!amount || amount <= 0) return error('Enter an amount greater than zero.');
        if (mode === 'repayment' && !loanId) return error('Select a loan to repay.');
        const tx = { id:newId('tx'), type:mode === 'loan' ? 'income' : mode === 'repayment' ? 'expense' : form.elements.type.value, category:mode === 'loan' ? 'Loan' : mode === 'repayment' ? 'Loan repayment' : form.elements.category.value, amount, date:form.elements.date.value, note:form.elements.note.value.trim(), loanId:mode === 'repayment' ? loanId : '' };
        state.transactions.push(tx);
        if (mode === 'loan') state.loans.push({ id:newId('loan'), name:form.elements.note.value.trim() || 'New loan', principal:amount, paid:0, balance:amount });
        if (mode === 'repayment') { const loan = state.loans.find((item) => String(item.id) === String(loanId)); if (loan) { loan.paid = (Number(loan.paid) || 0) + amount; loan.balance = Math.max(0, (Number(loan.balance) || 0) - amount); } }
        write(state); renderTransactions(); window.dispatchEvent(new CustomEvent('moneyflow:state-updated')); close(); notify('Transaction saved.');
      });
      modal._setMode = setMode;
    }
    const form = modal.querySelector('form'); form.reset(); form.elements.date.value = new Date().toISOString().slice(0,10);
    const loans = (read().loans || []).filter((loan) => Number(loan.balance) > 0);
    modal.querySelector('[name="loanId"]').innerHTML = loans.length ? loans.map((loan) => `<option value="${esc(loan.id)}">${esc(loan.name || 'Loan')} · ${esc(money(loan.balance))}</option>`).join('') : '<option value="">No outstanding loans</option>';
    modal._setMode('standard'); modal.classList.remove('hidden'); document.body.classList.add('modal-open'); modal.querySelector('[name="type"]').focus();
  };
  const close = () => { const modal = document.getElementById('transactionFixModal'); if (modal) modal.classList.add('hidden'); document.body.classList.remove('modal-open'); };

  document.addEventListener('click', (event) => {
    if (event.target.closest('#floatingAddTransaction')) { event.preventDefault(); event.stopImmediatePropagation(); open(); return; }
    const remove = event.target.closest('[data-fix-delete]');
    if (remove) { const state = read(); state.transactions = (state.transactions || []).filter((tx, index) => String(tx.id || index) !== String(remove.dataset.fixDelete)); write(state); renderTransactions(); }
  }, true);
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); });
  document.addEventListener('DOMContentLoaded', renderTransactions, { once:true });
  window.addEventListener('moneyflow:state-updated', renderTransactions);
})();
