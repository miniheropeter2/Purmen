(() => {
  'use strict';

  const STORAGE_KEY = 'moneyflow-v3';
  const DEFAULT_CATEGORIES = [
    { id: crypto.randomUUID ? crypto.randomUUID() : `cat-${Date.now()}`, name: 'Salary', type: 'income' },
    { id: crypto.randomUUID ? crypto.randomUUID() : `cat-${Date.now() + 1}`, name: 'Food', type: 'expense' },
    { id: crypto.randomUUID ? crypto.randomUUID() : `cat-${Date.now() + 2}`, name: 'Transport', type: 'expense' },
    { id: crypto.randomUUID ? crypto.randomUUID() : `cat-${Date.now() + 3}`, name: 'Housing', type: 'expense' },
    { id: crypto.randomUUID ? crypto.randomUUID() : `cat-${Date.now() + 4}`, name: 'Loan repayment', type: 'expense' }
  ];

  const buildDefaultState = () => {
    const month = new Date().toISOString().slice(0, 7);
    return {
      settings: {
        theme: 'dark',
        syncUrl: '',
        reportMonth: month,
        quickActions: [
          { id: 'quick-food', label: 'Food', type: 'expense', category: 'Food', amount: 250 },
          { id: 'quick-income', label: 'Salary', type: 'income', category: 'Salary', amount: 1200000 },
          { id: 'quick-travel', label: 'Transport', type: 'expense', category: 'Transport', amount: 150 }
        ]
      },
      categories: DEFAULT_CATEGORIES,
      budgets: [
        { id: crypto.randomUUID ? crypto.randomUUID() : `bud-${Date.now()}`, month, category: 'Food', amount: 400000 },
        { id: crypto.randomUUID ? crypto.randomUUID() : `bud-${Date.now() + 1}`, month, category: 'Transport', amount: 200000 },
        { id: crypto.randomUUID ? crypto.randomUUID() : `bud-${Date.now() + 2}`, month, category: 'Housing', amount: 550000 }
      ],
      loans: [
        { id: crypto.randomUUID ? crypto.randomUUID() : `loan-${Date.now()}`, name: 'Family loan', principal: 4000000, paid: 500000, balance: 3500000 }
      ],
      transactions: [
        { id: crypto.randomUUID ? crypto.randomUUID() : `tx-${Date.now()}`, type: 'income', category: 'Salary', amount: 1500000, date: new Date().toISOString().slice(0, 10), note: 'Monthly salary' },
        { id: crypto.randomUUID ? crypto.randomUUID() : `tx-${Date.now() + 1}`, type: 'expense', category: 'Food', amount: 240000, date: new Date().toISOString().slice(0, 10), note: 'Groceries' },
        { id: crypto.randomUUID ? crypto.randomUUID() : `tx-${Date.now() + 2}`, type: 'expense', category: 'Transport', amount: 170000, date: new Date().toISOString().slice(0, 10), note: 'Fuel' }
      ]
    };
  };

  const safeNumber = (value) => Number(String(value ?? '0').replace(/,/g, '')) || 0;
  const money = (value) => `${Math.round(safeNumber(value)).toLocaleString('en-US')} MMK`;
  const monthStamp = (date = new Date()) => date.toISOString().slice(0, 7);
  const currentMonth = () => document.getElementById('monthSelect')?.value || monthStamp();

  const normalizeState = (raw = {}) => {
    const base = buildDefaultState();
    const next = { ...base, ...raw };
    next.transactions = Array.isArray(raw.transactions) ? raw.transactions : base.transactions;
    next.budgets = Array.isArray(raw.budgets) ? raw.budgets : base.budgets;
    next.loans = Array.isArray(raw.loans) ? raw.loans : base.loans;
    next.categories = Array.isArray(raw.categories) ? raw.categories : base.categories;
    next.settings = { ...base.settings, ...(raw.settings || {}) };
    if (!next.settings.reportMonth) next.settings.reportMonth = monthStamp();
    return next;
  };

  const loadState = () => {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return normalizeState(raw);
    } catch {
      return normalizeState({});
    }
  };

  const saveState = (state) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  };

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char));

  const renderHomeCards = () => {
    const state = loadState();
    const month = currentMonth();
    const expenseOnlyMonthTx = state.transactions.filter((tx) => String(tx.date).slice(0, 7) === month && tx.type !== 'income');
    const expense = expenseOnlyMonthTx.filter((tx) => tx.type === 'expense').reduce((sum, tx) => sum + safeNumber(tx.amount), 0);
    const budgets = state.budgets.filter((b) => b.month === month).reduce((sum, b) => sum + safeNumber(b.amount), 0);
    const cards = [
      { label: 'Net amount', value: money(-expense), tone: 'expense' },
      { label: 'Income', value: money(0), tone: 'income' },
      { label: 'Expense', value: money(expense), tone: 'expense' },
      { label: 'Budget', value: money(budgets), tone: 'neutral' }
    ];
    const container = document.getElementById('cards');
    if (container) {
      container.innerHTML = cards.map((card) => `
        <article class="stat-card panel">
          <small>${esc(card.label)}</small>
          <strong>${esc(card.value)}</strong>
        </article>
      `).join('');
    }

    const dailyBudgetValue = document.getElementById('dailyBudgetValue');
    const dailyMeta = document.getElementById('dailyBudgetMeta');
    const remain = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate() - new Date().getDate() + 1;
    const daily = expense / Math.max(remain, 1);
    if (dailyBudgetValue) dailyBudgetValue.textContent = money(daily);
    if (dailyMeta) dailyMeta.textContent = `${Math.max(remain, 0)} days remaining · Expense ${money(expense)}`;

    const homeBudgetAlerts = state.budgets.filter((budget) => budget.month === month).map((budget) => {
      const spent = state.transactions.filter((tx) => tx.date?.slice(0, 7) === month && tx.type === 'expense' && tx.category === budget.category).reduce((sum, tx) => sum + safeNumber(tx.amount), 0);
      return { category: budget.category, spent, budget: safeNumber(budget.amount), ratio: safeNumber(budget.amount) ? Math.min(100, (spent / safeNumber(budget.amount)) * 100) : 0 };
    }).filter((row) => row.ratio >= 85);

    const budgetAlerts = document.getElementById('budgetAlerts');
    if (budgetAlerts) {
      if (!homeBudgetAlerts.length) {
        budgetAlerts.innerHTML = '<div class="empty-state">No alerts for this month.</div>';
      } else {
        budgetAlerts.innerHTML = homeBudgetAlerts.map((row) => `<div class="settings-item"><div class="meta"><strong>${esc(row.category)}</strong><small>${money(row.spent)} spent of ${money(row.budget)}</small></div></div>`).join('');
      }
    }
  };

  const renderDashboardSummary = () => {
    const state = loadState();
    const month = currentMonth();
    const monthTx = state.transactions.filter((tx) => String(tx.date).slice(0, 7) === month);
    const income = monthTx.filter((tx) => tx.type === 'income').reduce((sum, tx) => sum + safeNumber(tx.amount), 0);
    const expense = monthTx.filter((tx) => tx.type === 'expense').reduce((sum, tx) => sum + safeNumber(tx.amount), 0);
    const net = income - expense;

    const cashflowValue = document.getElementById('cashflowValue');
    const budgetUsedValue = document.getElementById('budgetUsedValue');
    const loanBalanceValue = document.getElementById('loanBalanceValue');
    if (cashflowValue) cashflowValue.textContent = money(net);
    if (budgetUsedValue) budgetUsedValue.textContent = money(expense);
    if (loanBalanceValue) loanBalanceValue.textContent = money(state.loans.reduce((sum, loan) => sum + safeNumber(loan.balance), 0));
  };

  const renderAll = () => {
    const monthSelect = document.getElementById('monthSelect');
    if (monthSelect) monthSelect.value = loadState().settings.reportMonth || monthStamp();
    renderHomeCards();
    renderDashboardSummary();
  };

  const init = () => {
    const state = loadState();
    if (!state.settings?.theme) {
      state.settings = { ...(state.settings || {}), theme: 'dark' };
      saveState(state);
    }
    renderAll();
    document.addEventListener('change', (event) => {
      const target = event.target;
      if (target && target.id === 'monthSelect') {
        const stateNow = loadState();
        stateNow.settings.reportMonth = target.value;
        saveState(stateNow);
        renderAll();
      }
    }, true);
    document.addEventListener('click', (event) => {
      const quick = event.target.closest('[data-quick-action]');
      if (quick) {
        const stateNow = loadState();
        const action = stateNow.settings.quickActions.find((item) => item.id === quick.dataset.quickAction);
        if (action) {
          const currentModal = document.getElementById('transactionModal');
          if (currentModal) {
            const type = currentModal.querySelector('select[name="type"]');
            const category = currentModal.querySelector('select[name="category"]');
            const amount = currentModal.querySelector('input[name="amount"]');
            if (type) type.value = action.type || 'expense';
            if (category) category.value = action.category || '';
            if (amount) amount.value = action.amount || 0;
          }
        }
      }
    }, true);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
