(() => {
  'use strict';

  const STORAGE_KEY = 'moneyflow-v3';
  const readState = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch (_) { return {}; }
  };
  const number = (value) => Number(String(value ?? '0').replace(/,/g, '')) || 0;
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char));
  const money = (value) => `${Math.round(number(value)).toLocaleString('en-US')} MMK`;

  const ensureLoanTab = (modal) => {
    const tabs = modal?.querySelector('.transaction-tabs');
    const standard = tabs?.querySelector('[data-mode="standard"]');
    if (!tabs || !standard || tabs.querySelector('[data-mode="loan"]')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'transaction-tab loan-tab';
    button.dataset.mode = 'loan';
    button.textContent = 'Loan';
    standard.insertAdjacentElement('afterend', button);
  };

  const populateLoans = (modal) => {
    const select = modal?.querySelector('select[name="loanId"]');
    if (!select) return;
    const loans = (readState().loans || []).filter((loan) => number(loan.balance ?? loan.remaining) > 0);
    select.innerHTML = loans.length
      ? loans.map((loan) => `<option value="${esc(loan.id)}">${esc(loan.name || 'Loan')} · ${money(loan.balance ?? loan.remaining)}</option>`).join('')
      : '<option value="">No outstanding loans</option>';
    select.disabled = !loans.length;
  };

  const setMode = (modal, mode) => {
    const form = modal?.querySelector('#transactionForm');
    if (!form) return;
    modal.querySelectorAll('.transaction-tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.mode === mode));
    const type = form.querySelector('select[name="type"]');
    const category = form.querySelector('select[name="category"]');
    const amount = form.querySelector('input[name="amount"]');
    const amountLabel = amount?.closest('label');
    const repaymentFields = modal.querySelector('#repaymentFields');
    const repaymentAmount = form.querySelector('input[name="repaymentAmount"]');
    const loanSelect = form.querySelector('select[name="loanId"]');
    const isLoan = mode === 'loan';
    const isRepayment = mode === 'repayment';

    amountLabel?.classList.toggle('hidden-field', isLoan || isRepayment);
    repaymentFields?.classList.toggle('hidden', !isRepayment);
    amount.required = !isLoan && !isRepayment;
    repaymentAmount.required = isRepayment;
    loanSelect.required = isRepayment;

    if (isLoan) {
      type.value = 'income';
      type.disabled = true;
      category.value = 'Loan';
      category.disabled = true;
      form.querySelector('input[name="note"]').placeholder = 'Loan name';
    } else if (isRepayment) {
      type.value = 'expense';
      type.disabled = true;
      category.value = 'Loan repayment';
      category.disabled = true;
      amount.value = '';
      amount.disabled = true;
      populateLoans(modal);
    } else {
      type.disabled = false;
      category.disabled = false;
      amount.disabled = false;
      form.querySelector('input[name="note"]').placeholder = 'Optional note';
    }
  };

  const decorateModal = (modal) => {
    if (!modal) return;
    ensureLoanTab(modal);
    if (!modal.dataset.loanUiBound) {
      modal.dataset.loanUiBound = 'true';
      modal.querySelector('.transaction-tabs')?.addEventListener('click', (event) => {
        const tab = event.target.closest('.transaction-tab');
        if (!tab) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        setMode(modal, tab.dataset.mode);
      }, true);
    }
    setMode(modal, modal.querySelector('.transaction-tab.active')?.dataset.mode || 'standard');

    const title = modal.querySelector('#transactionModalTitle');
    const subtitle = modal.querySelector('.modal-header small');
    const source = document.body.dataset.transactionSource;
    if (source === 'quick-entry') {
      if (title) title.textContent = 'Quick entry';
      if (subtitle) subtitle.textContent = 'Preset entry';
    } else {
      if (title) title.textContent = 'Add transaction';
      if (subtitle) subtitle.textContent = 'New transaction';
    }
    delete document.body.dataset.transactionSource;
  };

  const bind = () => {
    const style = document.createElement('style');
    style.textContent = `
      .transaction-tabs { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .transaction-modal .hidden-field { display: none !important; }
      .floating-add-transaction { position: fixed !important; right: 20px !important; bottom: 20px !important; width: 64px !important; height: 64px !important; min-height: 64px !important; padding: 0 !important; border-radius: 50% !important; display: grid !important; place-items: center !important; z-index: 90 !important; }
      .floating-add-transaction span:last-child { display: none !important; }
      @media (max-width: 560px) { .transaction-tabs { grid-template-columns: 1fr; } .floating-add-transaction { right: 16px !important; bottom: 16px !important; } }
    `;
    document.head.appendChild(style);

    // Mark the two entry points before app.js opens the shared modal.
    document.addEventListener('click', (event) => {
      if (event.target.closest('#floatingAddTransaction')) document.body.dataset.transactionSource = 'add-transaction';
      if (event.target.closest('[data-quick-action]')) document.body.dataset.transactionSource = 'quick-entry';
    }, true);

    const observer = new MutationObserver(() => decorateModal(document.getElementById('transactionModal')));
    observer.observe(document.body, { childList: true, subtree: true });
    decorateModal(document.getElementById('transactionModal'));
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();
})();
