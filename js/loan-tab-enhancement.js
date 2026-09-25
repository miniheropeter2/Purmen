(() => {
  'use strict';

  const sourceKey = 'moneyflowTransactionSource';

  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-quick-action]')) {
      document.body.dataset[sourceKey] = 'quick-entry';
      return;
    }

    if (event.target.closest('#floatingAddTransaction')) {
      delete document.body.dataset[sourceKey];
    }
  }, true);
})();
