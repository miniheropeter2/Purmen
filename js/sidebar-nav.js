(() => {
  'use strict';

  const menu = document.getElementById('mobileMenu');
  const drawerButton = document.getElementById('sidebarMenuToggle');
  const sidebar = document.getElementById('sidebar');

  if (!menu || !sidebar) return;

  const sync = (open) => {
    document.body.classList.toggle('sidebar-open', open);
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
    sidebar.setAttribute('aria-hidden', String(!open));

    if (drawerButton) {
      drawerButton.setAttribute('aria-expanded', String(open));
      drawerButton.setAttribute('aria-label', open ? 'Hide navigation menu' : 'Show navigation menu');
      const label = drawerButton.querySelector('[data-menu-label]');
      if (label) label.textContent = open ? 'Hide menu' : 'Show menu';
    }
  };

  const toggle = (event) => {
    event.preventDefault();
    event.stopPropagation();
    sync(!document.body.classList.contains('sidebar-open'));
  };

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (target.closest('#mobileMenu, #sidebarMenuToggle')) {
      toggle(event);
      return;
    }

    if (window.innerWidth <= 760 && document.body.classList.contains('sidebar-open') && !sidebar.contains(target) && !menu.contains(target)) {
      sync(false);
    }
  }, true);

  sidebar.addEventListener('click', (event) => {
    if (window.innerWidth <= 760 && event.target.closest('.nav-item')) {
      sync(false);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') sync(false);
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 760) sync(false);
  }, { passive: true });

  sync(false);
})();
