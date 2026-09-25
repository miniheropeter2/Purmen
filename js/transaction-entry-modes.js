(() => {
  'use strict';

  const sourceKey = 'moneyflowTransactionSource';

  const setSource = (source) => {
    document.body.dataset[sourceKey] = source;
  };

  const getSource = () => document.body.dataset[sourceKey] || 'add-transaction';

  const resetFormForQuickEntry = (modal) => {
    const form = modal.querySelector('#transactionForm');
    if (!form) return;
    const standard = modal.querySelector('[data-mode="standard"]');
    modal.querySelectorAll('.transaction-tab').forEach((tab) => {
      const isStandard = tab === standard;
      tab.hidden = !isStandard;
      tab.classList.toggle('active', isStandard);
    });
    modal.querySelector('#repaymentFields')?.classList.add('hidden');
    const amount = form.querySelector('input[name="amount"]');
    const repaymentAmount = form.querySelector('input[name="repaymentAmount"]');
    const loanId = form.querySelector('select[name="loanId"]');
    const type = form.querySelector('select[name="type"]');
    const category = form.querySelector('select[name="category"]');
    amount?.closest('label')?.classList.remove('hidden-field');
    if (amount) { amount.disabled = false; amount.required = true; }
    if (repaymentAmount) { repaymentAmount.required = false; repaymentAmount.disabled = true; repaymentAmount.value = ''; }
    if (loanId) { loanId.required = false; loanId.disabled = true; }
    if (type) type.disabled = false;
    if (category) category.disabled = false;
    const title = modal.querySelector('#transactionModalTitle');
    const subtitle = modal.querySelector('.modal-header small');
    if (title) title.textContent = 'Quick entry';
    if (subtitle) subtitle.textContent = 'Preset entry';
  };

  const configureAddTransaction = (modal) => {
    const tabs = modal.querySelector('.transaction-tabs');
    const standard = tabs?.querySelector('[data-mode="standard"]');
    if (!tabs || !standard) return;
    let loan = tabs.querySelector('[data-mode="loan"]');
    if (!loan) {
      loan = document.createElement('button');
      loan.type = 'button';
      loan.className = 'transaction-tab loan-tab';
      loan.dataset.mode = 'loan';
      loan.textContent = 'Loan';
      standard.insertAdjacentElement('afterend', loan);
    }
    tabs.querySelectorAll('.transaction-tab').forEach((tab) => { tab.hidden = false; });
    const title = modal.querySelector('#transactionModalTitle');
    const subtitle = modal.querySelector('.modal-header small');
    if (title) title.textContent = 'Add transaction';
    if (subtitle) subtitle.textContent = 'New transaction';
    modal.querySelector('input[name="repaymentAmount"]')?.removeAttribute('disabled');
    modal.querySelector('select[name="loanId"]')?.removeAttribute('disabled');
  };

  const configureModal = (modal) => {
    if (!modal) return;
    if (getSource() === 'quick-entry') resetFormForQuickEntry(modal);
    else configureAddTransaction(modal);
    document.activeElement?.blur?.();
  };

  const bind = () => {
    document.addEventListener('click', (event) => {
      if (event.target.closest('#floatingAddTransaction')) setSource('add-transaction');
      if (event.target.closest('[data-quick-action]')) setSource('quick-entry');
    }, true);

    document.addEventListener('click', (event) => {
      if (event.target.closest('#transactionModal [data-close-modal], #transactionModal .modal-close')) {
        delete document.body.dataset[sourceKey];
      }
    }, true);

    const observer = new MutationObserver(() => {
      configureModal(document.getElementById('transactionModal'));
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    configureModal(document.getElementById('transactionModal'));
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();
})();
