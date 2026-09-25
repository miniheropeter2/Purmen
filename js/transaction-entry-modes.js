(() => {
  'use strict';
  // Quick actions intentionally keep their preset-entry flow. The Add Transaction
  // button is handled independently by loan-tab-enhancement.js and never changes
  // this source flag into a quick-action state.
  const sourceKey = 'moneyflowTransactionSource';
  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-quick-action]')) document.body.dataset[sourceKey] = 'quick-entry';
  }, true);
})();
