(() => {
  'use strict';

  const closeModal = (modal) => {
    if (!modal) return;
    modal.classList.add('hidden');
    document.body.classList.remove('modal-open');
    document.activeElement?.blur?.();
  };

  const bind = () => {
    document.addEventListener('click', (event) => {
      const closeButton = event.target.closest('#transactionModal [data-close-modal], #transactionModal .modal-close');
      if (closeButton) {
        event.preventDefault();
        event.stopImmediatePropagation();
        closeModal(closeButton.closest('#transactionModal'));
        return;
      }

      const backdrop = event.target.closest('#transactionModal');
      if (backdrop && event.target === backdrop) closeModal(backdrop);
    }, true);

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeModal(document.getElementById('transactionModal'));
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once: true });
  } else {
    bind();
  }
})();
