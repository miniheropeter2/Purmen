(() => {
  'use strict';

  const KEY = 'moneyflow-v3';
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (_) { return {}; } };
  const write = (state) => localStorage.setItem(KEY, JSON.stringify(state));
  const id = () => window.crypto?.randomUUID?.() || `tx-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const money = (value) => `${Math.round(Number(value) || 0).toLocaleString('en-US')} MMK`;

  const closeModal = () => {
    const modal = document.getElementById('clickFixTransactionModal');
    if (modal) modal.classList.add('hidden');
    document.body.classList.remove('modal-open');
  };

  const renderTransactions = () => {
    const tbody = document.getElementById('transactionTable');
    if (!tbody) return;
    const rows = Array.isArray(read().transactions) ? read().transactions.filter(Boolean) : [];
    tbody.innerHTML = rows.length ? rows.sort((a,b) => String(b.date || '').localeCompare(String(a.date || ''))).map((tx, index) => `<tr>
      <td>${esc(tx.date || '—')}</td><td><span class="pill ${tx.type === 'expense' ? 'expense' : 'income'}">${esc(tx.type || 'expense')}</span></td>
      <td>${esc(tx.category || 'General')}</td><td>${esc(money(tx.amount))}</td><td>${esc(tx.note || '—')}</td>
      <td><button type="button" class="remove-btn" data-click-fix-delete="${esc(tx.id || index)}">Delete</button></td>
    </tr>`).join('') : '<tr><td colspan="6"><div class="empty-state">No transactions yet.</div></td></tr>';
  };

  const makeModal = () => {
    if (document.getElementById('clickFixTransactionModal')) return document.getElementById('clickFixTransactionModal');
    const modal = document.createElement('div');
    modal.id = 'clickFixTransactionModal';
    modal.className = 'click-fix-modal hidden';
    modal.innerHTML = `<div class="click-fix-dialog" role="dialog" aria-modal="true" aria-labelledby="clickFixTitle">
      <div class="modal-header"><div><small>Add transaction</small><h2 id="clickFixTitle">Record a transaction</h2></div><button type="button" class="modal-close" data-click-fix-close aria-label="Close">×</button></div>
      <div class="click-fix-tabs"><button type="button" class="active" data-click-fix-mode="standard">Income / Expense</button><button type="button" data-click-fix-mode="loan">Loan</button><button type="button" data-click-fix-mode="repayment">Loan repayment</button></div>
      <div class="click-fix-error" aria-live="polite"></div><form id="clickFixForm" class="stack-form"><div class="click-fix-grid">
        <label><span>Type</span><select name="type"><option value="expense">Expense</option><option value="income">Income</option></select></label>
        <label><span>Category</span><input name="category" required placeholder="Category"></label>
        <label data-click-fix-amount><span>Amount</span><input name="amount" type="number" min="1" required></label>
        <label data-click-fix-loan hidden><span>Loan</span><select name="loanId"></select></label>
        <label><span>Date</span><input name="date" type="date" required></label>
        <label class="full"><span>Note</span><input name="note" placeholder="Optional note"></label>
      </div><div class="click-fix-actions"><button type="button" class="ghost-btn" data-click-fix-close>Close</button><button type="submit" class="primary-btn">Save transaction</button></div></form></div>`;
    document.body.appendChild(modal);
    const form = modal.querySelector('form');
    const setMode = (mode) => {
      modal.querySelectorAll('[data-click-fix-mode]').forEach((button) => button.classList.toggle('active', button.dataset.clickFixMode === mode));
      const repayment = mode === 'repayment'; const fixed = mode === 'loan' || repayment;
      modal.querySelector('[data-click-fix-amount]').hidden = repayment;
      modal.querySelector('[data-click-fix-loan]').hidden = !repayment;
      form.elements.amount.required = !repayment;
      form.elements.type.disabled = fixed; form.elements.category.disabled = fixed;
      if (mode === 'loan') { form.elements.type.value = 'income'; form.elements.category.value = 'Loan'; }
      if (repayment) { form.elements.type.value = 'expense'; form.elements.category.value = 'Loan repayment'; }
      modal.querySelector('.click-fix-error').textContent = '';
    };
    modal.querySelectorAll('[data-click-fix-mode]').forEach((button) => button.addEventListener('click', () => setMode(button.dataset.clickFixMode)));
    modal.querySelectorAll('[data-click-fix-close]').forEach((button) => button.addEventListener('click', closeModal));
    modal.addEventListener('click', (event) => { if (event.target === modal) closeModal(); });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const mode = modal.querySelector('.active[data-click-fix-mode]').dataset.clickFixMode;
      const amount = Number(form.elements.amount.value || 0);
      const error = modal.querySelector('.click-fix-error');
      if (!amount || amount <= 0) { error.textContent = 'Enter an amount greater than zero.'; return; }
      if (mode === 'repayment' && !form.elements.loanId.value) { error.textContent = 'Select a loan to repay.'; return; }
      const state = read(); state.transactions = Array.isArray(state.transactions) ? state.transactions : []; state.loans = Array.isArray(state.loans) ? state.loans : [];
      const transaction = { id:id(), type:mode === 'loan' ? 'income' : mode === 'repayment' ? 'expense' : form.elements.type.value, category:mode === 'loan' ? 'Loan' : mode === 'repayment' ? 'Loan repayment' : form.elements.category.value.trim(), amount, date:form.elements.date.value, note:form.elements.note.value.trim(), loanId:mode === 'repayment' ? form.elements.loanId.value : '' };
      state.transactions.push(transaction);
      if (mode === 'loan') state.loans.push({ id:id(), name:transaction.note || 'New loan', principal:amount, paid:0, balance:amount });
      if (mode === 'repayment') { const loan = state.loans.find((item) => String(item.id) === String(transaction.loanId)); if (loan) { loan.paid = (Number(loan.paid) || 0) + amount; loan.balance = Math.max(0, (Number(loan.balance) || 0) - amount); } }
      write(state); renderTransactions(); window.dispatchEvent(new CustomEvent('moneyflow:state-updated')); closeModal();
    });
    return modal;
  };

  const openModal = () => {
    const modal = makeModal(); const form = modal.querySelector('form'); const state = read();
    form.reset(); form.elements.date.value = new Date().toISOString().slice(0, 10);
    const loans = (state.loans || []).filter((loan) => Number(loan.balance) > 0);
    form.elements.loanId.innerHTML = loans.length ? loans.map((loan) => `<option value="${esc(loan.id)}">${esc(loan.name || 'Loan')} · ${esc(money(loan.balance))}</option>`).join('') : '<option value="">No outstanding loans</option>';
    modal.querySelector('[data-click-fix-mode="standard"]').click(); modal.classList.remove('hidden'); document.body.classList.add('modal-open'); form.elements.type.focus();
  };

  const showPage = (page) => {
    document.querySelectorAll('.page').forEach((section) => section.classList.toggle('active', section.id === page));
    document.querySelectorAll('.nav-item').forEach((button) => button.classList.toggle('active', button.dataset.page === page));
    document.body.classList.remove('sidebar-open');
  };

  const bind = () => {
    document.addEventListener('click', (event) => {
      const nav = event.target.closest('.nav-item');
      if (nav) { event.preventDefault(); event.stopPropagation(); showPage(nav.dataset.page); return; }
      if (event.target.closest('#floatingAddTransaction')) { event.preventDefault(); event.stopPropagation(); openModal(); return; }
      const remove = event.target.closest('[data-click-fix-delete]');
      if (remove) { const state = read(); state.transactions = (state.transactions || []).filter((tx, index) => String(tx.id || index) !== String(remove.dataset.clickFixDelete)); write(state); renderTransactions(); }
    }, true);
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeModal(); });
    document.getElementById('mobileMenu')?.addEventListener('click', (event) => { event.preventDefault(); event.stopPropagation(); document.body.classList.toggle('sidebar-open'); }, true);
    document.getElementById('sidebarMenuToggle')?.addEventListener('click', (event) => { event.preventDefault(); event.stopPropagation(); document.body.classList.toggle('sidebar-open'); }, true);
    renderTransactions();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once:true }); else bind();
})();
