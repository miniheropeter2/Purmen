(() => {
  'use strict';

  const KEY = 'moneyflow-v3';
  const read = () => {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (_) { return {}; }
  };
  const write = (state) => localStorage.setItem(KEY, JSON.stringify(state));
  const id = (prefix) => (window.crypto?.randomUUID ? crypto.randomUUID() : `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const money = (value) => `${Math.round(Number(value) || 0).toLocaleString('en-US')} MMK`;
  const toast = (message, error = false) => {
    const node = document.getElementById('toast');
    if (!node) return;
    node.textContent = message;
    node.style.borderColor = error ? 'rgba(239,93,114,.5)' : '';
    node.classList.add('show');
    setTimeout(() => node.classList.remove('show'), 2600);
  };

  const renderTransactions = () => {
    const body = document.getElementById('transactionTable');
    const state = read();
    if (!body) return;
    const rows = Array.isArray(state.transactions) ? state.transactions.filter(Boolean) : [];
    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="6"><div class="empty-state">No transactions yet.</div></td></tr>';
      return;
    }
    rows.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    body.innerHTML = rows.map((tx, index) => `<tr>
      <td>${esc(tx.date || '—')}</td><td><span class="pill ${tx.type === 'expense' ? 'expense' : 'income'}">${esc(tx.type || 'expense')}</span></td>
      <td>${esc(tx.category || 'General')}</td><td>${esc(money(tx.amount))}</td><td>${esc(tx.note || '—')}</td>
      <td><button type="button" class="remove-btn" data-fix-delete="${esc(tx.id || index)}">Delete</button></td>
    </tr>`).join('');
  };

  const style = () => {
    if (document.getElementById('transaction-fix-style')) return;
    const s = document.createElement('style'); s.id = 'transaction-fix-style';
    s.textContent = '.transaction-fix-backdrop{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;background:rgba(0,0,0,.68);padding:16px}.transaction-fix-backdrop.hidden{display:none}.transaction-fix-modal{width:min(680px,100%);max-height:90vh;overflow:auto;background:var(--panel,#101b2d);border:1px solid var(--line,#263752);border-radius:18px;padding:22px;box-shadow:0 20px 70px #000}.transaction-fix-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:18px 0}.transaction-fix-tabs button{padding:11px;border:1px solid var(--line);border-radius:10px;background:transparent;color:inherit;cursor:pointer}.transaction-fix-tabs button.active{background:var(--accent,#4f8cff);color:#fff}.transaction-fix-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.transaction-fix-grid label{display:grid;gap:6px}.transaction-fix-grid .full{grid-column:1/-1}.transaction-fix-grid input,.transaction-fix-grid select{min-height:42px}.transaction-fix-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:18px}@media(max-width:560px){.transaction-fix-grid{grid-template-columns:1fr}.transaction-fix-tabs{grid-template-columns:1fr}}';
    document.head.appendChild(s);
  };

  const open = () => {
    style();
    let modal = document.getElementById('transactionFixModal');
    if (!modal) {
      modal = document.createElement('div'); modal.id = 'transactionFixModal'; modal.className = 'transaction-fix-backdrop';
      modal.innerHTML = `<div class="transaction-fix-modal" role="dialog" aria-modal="true" aria-labelledby="transactionFixTitle"><div class="modal-header"><div><small>New transaction</small><h2 id="transactionFixTitle">Add transaction</h2></div><button type="button" class="modal-close" data-fix-close aria-label="Close">×</button></div><div class="transaction-fix-tabs"><button type="button" class="active" data-fix-mode="standard">Income / Expense</button><button type="button" data-fix-mode="loan">Loan</button><button type="button" data-fix-mode="repayment">Loan repayment</button></div><div class="form-error" data-fix-error role="alert"></div><form class="transaction-fix-form"><div class="transaction-fix-grid"><label><span>Type</span><select name="type"><option value="expense">Expense</option><option value="income">Income</option></select></label><label><span>Category</span><input name="category" required placeholder="Category"></label><label data-fix-amount><span>Amount</span><input name="amount" type="number" min="1" step="1" required></label><label><span>Date</span><input name="date" type="date" required></label><label class="full"><span>Note</span><input name="note" type="text" placeholder="Optional note"></label><label class="full" data-fix-loan hidden><span>Loan</span><select name="loanId"></select></label></div><div class="transaction-fix-actions"><button type="button" class="ghost-btn" data-fix-close>Close</button><button type="submit" class="primary-btn">Save transaction</button></div></form></div>`;
      document.body.appendChild(modal);
      modal.querySelectorAll('[data-fix-close]').forEach((b) => b.addEventListener('click', () => { modal.classList.add('hidden'); document.body.classList.remove('modal-open'); }));
      modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });
      const setMode = (mode) => {
        modal.querySelectorAll('[data-fix-mode]').forEach((b) => b.classList.toggle('active', b.dataset.fixMode === mode));
        const loan = modal.querySelector('[data-fix-loan]'); const amount = modal.querySelector('[data-fix-amount]');
        loan.hidden = mode !== 'repayment'; amount.hidden = mode === 'repayment';
        modal.querySelector('[name="amount"]').required = mode !== 'repayment';
        const type = modal.querySelector('[name="type"]'); const category = modal.querySelector('[name="category"]');
        type.disabled = mode !== 'standard'; category.disabled = mode !== 'standard';
        if (mode === 'loan') { type.value = 'income'; category.value = 'Loan'; }
        if (mode === 'repayment') { type.value = 'expense'; category.value = 'Loan repayment'; }
      };
      modal.querySelectorAll('[data-fix-mode]').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.fixMode)));
      modal.querySelector('form').addEventListener('submit', (event) => {
        event.preventDefault();
        const form = event.currentTarget; const mode = modal.querySelector('[data-fix-mode].active').dataset.fixMode; const state = read();
        state.transactions = Array.isArray(state.transactions) ? state.transactions : []; state.loans = Array.isArray(state.loans) ? state.loans : [];
        const amount = Number(form.elements.amount.value || 0); const loanId = form.elements.loanId.value;
        if (mode === 'repayment' && !loanId) return showError('Select a loan to repay.');
        if (!amount || amount <= 0) return showError('Enter an amount greater than zero.');
        const tx = { id:id('tx'), type:mode === 'loan' ? 'income' : mode === 'repayment' ? 'expense' : form.elements.type.value, category:mode === 'loan' ? 'Loan' : mode === 'repayment' ? 'Loan repayment' : form.elements.category.value.trim(), amount, date:form.elements.date.value || new Date().toISOString().slice(0,10), note:form.elements.note.value.trim(), loanId:mode === 'repayment' ? loanId : '' };
        state.transactions.push(tx);
        if (mode === 'loan') state.loans.push({ id:id('loan'), name:form.elements.note.value.trim() || 'New loan', principal:amount, paid:0, balance:amount });
        if (mode === 'repayment') { const loan = state.loans.find((l) => String(l.id) === String(loanId)); if (loan) { loan.paid = (Number(loan.paid)||0)+amount; loan.balance = Math.max(0,(Number(loan.balance)||0)-amount); } }
        write(state); renderTransactions(); document.dispatchEvent(new CustomEvent('moneyflow:state-updated')); modal.classList.add('hidden'); document.body.classList.remove('modal-open'); toast('Transaction saved.');
      });
      const showError = (message) => { const e = modal.querySelector('[data-fix-error]'); e.textContent = message; e.classList.add('visible'); };
    }
    const form = modal.querySelector('form'); form.reset(); form.elements.date.value = new Date().toISOString().slice(0,10);
    const loans = (read().loans || []).filter((loan) => Number(loan.balance) > 0); modal.querySelector('[name="loanId"]').innerHTML = loans.length ? loans.map((l) => `<option value="${esc(l.id)}">${esc(l.name || 'Loan')} · ${esc(money(l.balance))}</option>`).join('') : '<option value="">No outstanding loans</option>';
    modal.querySelectorAll('[data-fix-mode]').forEach((b) => b.classList.toggle('active', b.dataset.fixMode === 'standard')); modal.querySelector('[data-fix-amount]').hidden = false; modal.querySelector('[data-fix-loan]').hidden = true; modal.querySelector('[name="type"]').disabled = false; modal.querySelector('[name="category"]').disabled = false; modal.querySelector('[data-fix-error]').textContent = '';
    modal.classList.remove('hidden'); document.body.classList.add('modal-open'); modal.querySelector('[name="category"]').focus();
  };

  // Capture the button before the original handler; this prevents the old broken modal path.
  document.addEventListener('click', (event) => {
    if (event.target.closest('#floatingAddTransaction')) { event.preventDefault(); event.stopImmediatePropagation(); open(); }
    const del = event.target.closest('[data-fix-delete]');
    if (del) { const state = read(); state.transactions = (state.transactions || []).filter((tx, i) => String(tx.id || i) !== String(del.dataset.fixDelete)); localStorage.setItem(KEY, JSON.stringify(state)); renderTransactions(); }
  }, true);
  document.addEventListener('DOMContentLoaded', renderTransactions, { once: true });
  window.addEventListener('moneyflow:state-updated', renderTransactions);
})();
