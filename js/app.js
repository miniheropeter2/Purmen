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
  const fmtDate = (value) => {
    if (!value) return '';
    const d = new Date(value + 'T12:00:00');
    return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  const monthStamp = (date = new Date()) => date.toISOString().slice(0, 7);
  const monthDays = (month = monthStamp()) => new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
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
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore storage error in static/disconnected front-end
    }
  };

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char] || char));

  const showToast = (message, isError = false) => {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.style.borderColor = isError ? 'rgba(239,93,114,.28)' : 'var(--line)';
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('show'), 2600);
  };

  const buildStyles = () => {
    if (document.getElementById('moneyflow-runtime-style')) return;
    const style = document.createElement('style');
    style.id = 'moneyflow-runtime-style';
    style.textContent = `
      .empty-state { color: var(--muted); padding: 14px 12px; border: 1px dashed var(--line); border-radius: 12px; }
      .settings-item { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:10px 12px; border:1px solid var(--line); border-radius:12px; background: rgba(79,140,255,.04); }
      .settings-item .meta { display:grid; gap:4px; }
      .settings-item strong { font-size: .95rem; }
      .settings-item small { color: var(--muted); }
      .loan-item { display:grid; gap:4px; padding:12px; border: 1px solid var(--line); border-radius: 12px; background: rgba(79,140,255,.04); }
      .loan-meta { display:flex; justify-content:space-between; gap:12px; color: var(--muted); font-size:.86rem; }
      .quick-action-row { display:flex; align-items:center; gap:8px; }
      .quick-action-row .secondary-btn, .quick-action-row .danger-btn { min-height: 36px; padding: 8px 10px; }
      .remove-btn { background: transparent; border: 0; color: var(--red); font-weight: 700; cursor: pointer; }
      .inline-form { display:grid; grid-template-columns: 1.2fr 1fr .8fr auto; gap:8px; align-items:end; }
      .inline-form input, .inline-form select { min-height: 40px; }
      .small-note { color: var(--muted); font-size: .8rem; line-height: 1.5; }
      .transaction-modal { position: fixed; inset: 0; display: grid; place-items: center; background: rgba(2,6,23,.7); z-index: 1000; }
      .transaction-modal.hidden { display: none; }
      .transaction-modal .modal-header { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
      .transaction-modal .modal-close { background: transparent; border: 0; font-size: 2rem; line-height: 1; cursor: pointer; }
      .transaction-modal .transaction-tabs { display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap:8px; }
      .transaction-modal .transaction-tab { min-height:42px; border:1px solid var(--line); border-radius:12px; background:transparent; color:var(--muted); }
      .transaction-modal .transaction-tab.active { background: linear-gradient(135deg, var(--blue), var(--violet)); color: white; }
      .transaction-modal .stack-form { display:grid; gap:14px; }
      .transaction-modal .transaction-form-grid { display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
      .transaction-modal .transaction-amount-field.hidden { display: none; }
      .transaction-modal #repaymentFields.hidden { display: none; }
      .transaction-modal .full { grid-column: 1 / -1; }
      .transaction-modal label { display:grid; gap:6px; }
      .transaction-modal input, .transaction-modal select { min-height:44px; width:100%; padding:0 12px; border:1px solid var(--line); border-radius:12px; background: rgba(255,255,255,.03); color: var(--text); }
      .transaction-modal .ghost-btn, .transaction-modal .primary-btn { min-height:42px; padding:0 14px; border:0; border-radius:12px; }
      .transaction-modal .primary-btn { background: linear-gradient(135deg, var(--blue), var(--violet)); color: white; }
      .transaction-modal .ghost-btn { background: rgba(255,255,255,.08); color: var(--text); }
      .modal-backdrop { position: fixed; inset: 0; background: rgba(2,6,23,.66); display: grid; place-items: center; padding: 16px; z-index: 1000; }
      .modal-backdrop.hidden { display: none; }
      @media (max-width: 760px) { .transaction-modal .transaction-form-grid { grid-template-columns: 1fr; } }
      @media (max-width: 760px) { .transaction-modal .transaction-tabs { grid-template-columns: 1fr; } }
    `;
    document.head.appendChild(style);
  };

  const setTheme = (mode) => {
    const next = mode || 'dark';
    const state = loadState();
    state.settings.theme = next;
    saveState(state);
    document.body.classList.toggle('dark', next === 'dark');
    const darkToggle = document.getElementById('darkModeToggle');
    if (darkToggle) darkToggle.checked = next === 'dark';
  };

  const monthOptions = () => {
    const currentYear = new Date().getFullYear();
    const months = [];
    for (let i = 0; i < 18; i += 1) {
      const d = new Date(currentYear, new Date().getMonth() - i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push(value);
    }
    return months.reverse();
  };

  const populateMonthSelect = () => {
    const monthSelect = document.getElementById('monthSelect');
    if (!monthSelect) return;

    const months = monthOptions();
    const state = loadState();
    monthSelect.innerHTML = months.map((value) => `
      <option value="${value}">${new Date(`${value}-01T12:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</option>
    `).join('');

    monthSelect.value = state.settings.reportMonth || monthStamp();
  };

  const setActivePage = (pageId) => {
    document.querySelectorAll('.nav-item').forEach((button) => button.classList.toggle('active', button.dataset.page === pageId));
    document.querySelectorAll('.page').forEach((section) => section.classList.toggle('active', section.id === pageId));
  };

  const getCategoriesByType = (type) => {
    const state = loadState();
    return (state.categories || []).filter((cat) => cat.type === type);
  };

  const renderCategoryOptions = () => {
    const state = loadState();
    const allCategories = state.categories || [];

    const budgetSelect = document.getElementById('budgetCategory');
    if (budgetSelect) {
      const options = allCategories.filter((cat) => cat.type === 'expense').map((cat) => `
        <option value="${esc(cat.name)}">${esc(cat.name)}</option>
      `).join('');
      budgetSelect.innerHTML = options || '<option value="">No expense categories</option>';
    }

    const formSelect = document.querySelector('select[name="category"]');
    if (formSelect) {
      const options = allCategories.map((cat) => `
        <option value="${esc(cat.name)}">${esc(cat.name)}</option>
      `).join('');
      formSelect.innerHTML = options || '<option value="">No categories</option>';
    }
  };

  const renderHomeCards = () => {
    const state = loadState();
    const month = currentMonth();

    const homeTx = state.transactions.filter((tx) => {
      const txMonth = String(tx.date || '').slice(0, 7);
      return txMonth === month && tx.type !== 'income';
    });

    const income = homeTx.filter((tx) => tx.type === 'income').reduce((sum, tx) => sum + safeNumber(tx.amount), 0);
    const expense = homeTx.filter((tx) => tx.type === 'expense').reduce((sum, tx) => sum + safeNumber(tx.amount), 0);
    const net = income - expense;

    const budgets = state.budgets.filter((b) => b.month === month).reduce((sum, b) => sum + safeNumber(b.amount), 0);

    const cards = [
      { label: 'Net amount', value: money(net), tone: net >= 0 ? 'income' : 'expense' },
      { label: 'Income', value: money(income), tone: 'income' },
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
    const remain = monthDays(month) - new Date().getDate() + 1;
    const daily = net / Math.max(remain, 1);
    if (dailyBudgetValue) dailyBudgetValue.textContent = `${money(daily)}`;
    if (dailyMeta) dailyMeta.textContent = `${Math.max(remain, 0)} days remaining · Net ${money(net)}`;

    const cashflowValue = document.getElementById('cashflowValue');
    const budgetUsedValue = document.getElementById('budgetUsedValue');
    const loanBalanceValue = document.getElementById('loanBalanceValue');

    if (cashflowValue) cashflowValue.textContent = money(
      state.transactions.filter((tx) => String(tx.date || '').slice(0, 7) === month).reduce((sum, tx) => sum + safeNumber(tx.amount) * (tx.type === 'income' ? 1 : -1), 0)
    );
    if (budgetUsedValue) budgetUsedValue.textContent = money(
      state.transactions.filter((tx) => String(tx.date || '').slice(0, 7) === month).reduce((sum, tx) => sum + safeNumber(tx.amount) * (tx.type === 'expense' ? 1 : 0), 0)
    );
    if (loanBalanceValue) loanBalanceValue.textContent = money(state.loans.reduce((sum, loan) => sum + safeNumber(loan.balance), 0));

    const failedBudgets = state.budgets.filter((budget) => budget.month === month).map((budget) => {
      const spent = state.transactions.filter((tx) => tx.date?.slice(0, 7) === month && tx.type === 'expense' && tx.category === budget.category).reduce((sum, tx) => sum + safeNumber(tx.amount), 0);
      return { category: budget.category, spent, budget: safeNumber(budget.amount), ratio: safeNumber(budget.amount) ? Math.min(100, (spent / safeNumber(budget.amount)) * 100) : 0 };
    }).filter((row) => row.ratio >= 85);

    const budgetAlerts = document.getElementById('budgetAlerts');
    if (budgetAlerts) {
      if (!failedBudgets.length) {
        budgetAlerts.innerHTML = '<div class="empty-state">No alerts for this month.</div>';
      } else {
        budgetAlerts.innerHTML = failedBudgets.map((row) => `
          <div class="settings-item">
            <div class="meta">
              <strong>${esc(row.category)}</strong>
              <small>${money(row.spent)} spent of ${money(row.budget)}</small>
            </div>
          </div>
        `).join('');
      }
    }
  };

  const renderBudgetChart = () => {
    const state = loadState();
    const month = currentMonth();
    const tracker = document.getElementById('budgetVsSpendingChart');
    if (!tracker) return;

    const rows = state.budgets.filter((budget) => budget.month === month).map((budget) => {
      const spent = state.transactions.filter((tx) => tx.date?.slice(0, 7) === month && tx.type === 'expense' && tx.category === budget.category).reduce((sum, tx) => sum + safeNumber(tx.amount), 0);
      const limit = safeNumber(budget.amount);
      const percent = limit ? Math.min(100, (spent / limit) * 100) : 0;
      return { category: budget.category, spent, limit, percent };
    });

    if (!rows.length) {
      tracker.innerHTML = '<div class="empty-state">No budget rows for this month.</div>';
      return;
    }

    tracker.innerHTML = rows.map((row) => `
      <div class="budget-bar-card ${row.percent >= 100 ? 'over' : ''}">
        <div class="bar-head">
          <strong>${esc(row.category)}</strong>
          <span>${money(row.spent)} / ${money(row.limit)}</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width: ${Math.max(row.percent, row.spent ? 8 : 0)}%;"></div>
        </div>
      </div>
    `).join('');
  };

  const renderLoanList = () => {
    const state = loadState();
    const container = document.getElementById('loanList');
    if (!container) return;
    if (!state.loans.length) {
      container.innerHTML = '<div class="empty-state">No loan records yet.</div>';
      return;
    }

    container.innerHTML = state.loans.map((loan) => `
      <div class="loan-item">
        <div class="loan-meta"><strong>${esc(loan.name)}</strong><span>${money(safeNumber(loan.balance))}</span></div>
        <div class="loan-meta"><span>Principal</span><span>${money(loan.principal)}</span></div>
        <div class="loan-meta"><span>Paid</span><span>${money(loan.paid)}</span></div>
      </div>
    `).join('');
  };

  const renderTransactions = () => {
    const state = loadState();
    const tbody = document.getElementById('transactionTable');
    if (!tbody) return;

    const rows = [...(state.transactions || [])].filter(Boolean);
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state">No transactions yet.</div></td></tr>';
      return;
    }

    rows.sort((a, b) => {
      const da = a.date ? new Date(a.date + 'T12:00:00').getTime() : 0;
      const db = b.date ? new Date(b.date + 'T12:00:00').getTime() : 0;
      return db - da;
    });

    tbody.innerHTML = rows.map((tx) => `
      <tr>
        <td>${fmtDate(tx.date)}</td>
        <td><span class="pill ${esc(tx.type === 'expense' ? 'expense' : 'income')}">${esc(tx.type)}</span></td>
        <td>${esc(tx.category || 'General')}</td>
        <td>${esc(money(tx.amount))}</td>
        <td>${esc(tx.note || '—')}</td>
        <td><button type="button" class="remove-btn" data-remove-tx="${esc(tx.id)}">Delete</button></td>
      </tr>
    `).join('');
  };

  const renderQuickActions = () => {
    const state = loadState();
    const container = document.getElementById('quickActions');
    if (!container) return;

    const actions = state.settings.quickActions || [];
    container.innerHTML = actions.map((action) => `
      <button type="button" class="quick-action" data-quick-action="${esc(action.id)}">
        <strong>${esc(action.label)}</strong>
        <small>${esc(action.type)} · ${esc(action.category)}</small>
      </button>
    `).join('');

    const settingsHost = document.getElementById('quickActionSettings');
    if (settingsHost) {
      settingsHost.innerHTML = actions.map((action, index) => `
        <div class="settings-item">
          <div class="meta">
            <strong>${esc(action.label)}</strong>
            <small>${esc(action.type)} • ${esc(action.category)}</small>
          </div>
          <div class="quick-action-row">
            <button type="button" class="secondary-btn" data-edit-quick="${esc(action.id)}">Edit</button>
            <button type="button" class="danger-btn" data-remove-quick="${esc(action.id)}">Remove</button>
          </div>
        </div>
      `).join('');
    }
  };

  const renderBudgetList = () => {
    const state = loadState();
    const container = document.getElementById('budgetList');
    if (!container) return;

    if (!state.budgets.length) {
      container.innerHTML = '<div class="empty-state">No budgets yet.</div>';
      return;
    }

    container.innerHTML = state.budgets.slice().reverse().map((row) => `
      <div class="settings-item">
        <div class="meta">
          <strong>${esc(row.category)}</strong>
          <small>${esc(row.month)} · ${money(row.amount)}</small>
        </div>
        <button type="button" class="remove-btn" data-remove-budget="${esc(row.id)}">Delete</button>
      </div>
    `).join('');
  };

  const renderCategoryList = () => {
    const state = loadState();
    const container = document.getElementById('categoryList');
    if (!container) return;

    if (!state.categories.length) {
      container.innerHTML = '<div class="empty-state">No categories yet.</div>';
      return;
    }

    container.innerHTML = state.categories.map((cat) => `
      <div class="settings-item">
        <div class="meta">
          <strong>${esc(cat.name)}</strong>
          <small>${esc(cat.type)}</small>
        </div>
        <button type="button" class="remove-btn" data-remove-category="${esc(cat.id)}">Delete</button>
      </div>
    `).join('');
  };

  const renderAll = () => {
    populateMonthSelect();
    renderCategoryOptions();
    renderHomeCards();
    renderBudgetChart();
    renderLoanList();
    renderTransactions();
    renderQuickActions();
    renderBudgetList();
    renderCategoryList();
  };

  const buildTransactionModal = () => {
    const existing = document.getElementById('transactionModal');
    if (existing) return;

    const modal = document.createElement('div');
    modal.id = 'transactionModal';
    modal.className = 'modal-backdrop hidden';

    modal.innerHTML = `
      <div class="transaction-modal" role="dialog" aria-modal="true" aria-labelledby="transactionModalTitle">
        <div class="modal-header">
          <div>
            <small>Quick entry</small>
            <h2 id="transactionModalTitle">Add transaction</h2>
          </div>
          <button type="button" class="modal-close" aria-label="Close">×</button>
        </div>

        <div class="transaction-tabs">
          <button type="button" class="transaction-tab active" data-mode="standard">Income / Expense</button>
          <button type="button" class="transaction-tab" data-mode="loan">Loan</button>
          <button type="button" class="transaction-tab" data-mode="repayment">Loan repayment</button>
        </div>

        <div id="transactionFormError" class="form-error" role="alert"></div>

        <form id="transactionForm" class="stack-form">
          <div class="transaction-form-grid">
            <label>
              <span>Type</span>
              <select name="type">
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </label>

            <label>
              <span>Category</span>
              <select name="category"></select>
            </label>

            <label class="transaction-amount-field">
              <span>Amount</span>
              <input name="amount" type="number" min="1" step="1" required />
            </label>

            <label>
              <span>Date</span>
              <input name="date" type="date" required />
            </label>

            <label class="full">
              <span>Note</span>
              <input name="note" type="text" placeholder="Optional note" />
            </label>
          </div>

          <div id="repaymentFields" class="repayment-row hidden">
            <label>
              <span>Loan</span>
              <select name="loanId"></select>
            </label>

            <label>
              <span>Repayment amount</span>
              <input name="repaymentAmount" type="number" min="1" step="1" placeholder="Repayment amount" />
            </label>
          </div>

          <div style="display:flex; justify-content:flex-end; gap:10px;">
            <button type="button" class="ghost-btn" data-close-modal>Close</button>
            <button type="submit" class="primary-btn">Save transaction</button>
          </div>
        </form>
      </div>
    `;

    const loanSelect = modal.querySelector('select[name="loanId"]');
    const state = loadState();
    if (loanSelect) {
      loanSelect.innerHTML = (state.loans || []).filter((loan) => safeNumber(loan.balance) > 0).map((loan) => `
        <option value="${esc(loan.id)}">${esc(loan.name)} · ${money(loan.balance)}</option>
      `).join('') || '<option value="">No loans yet</option>';
    }

    modal.querySelector('.modal-close').addEventListener('click', closeTransactionForm);
    modal.querySelector('[data-close-modal]').addEventListener('click', closeTransactionForm);

    modal.addEventListener('click', (event) => {
      if (event.target === modal) closeTransactionForm();
    });

    const typeSelect = modal.querySelector('select[name="type"]');
    const categorySelect = modal.querySelector('select[name="category"]');
    const currentBudgetCategories = () => getCategoriesByType(typeSelect.value).map((cat) => `
      <option value="${esc(cat.name)}">${esc(cat.name)}</option>
    `).join('');

    categorySelect.innerHTML = currentBudgetCategories() || '<option value="">No categories</option>';

    typeSelect.addEventListener('change', () => {
      const activeMode = modal.querySelector('.transaction-tab.active')?.dataset.mode || 'standard';
      if (activeMode !== 'standard') return;
      categorySelect.innerHTML = currentBudgetCategories() || '<option value="">No categories</option>';
      if (typeSelect.value === 'expense') {
        categorySelect.value = 'Food';
      } else {
        const incomeCat = getCategoriesByType('income')[0];
        if (incomeCat) categorySelect.value = incomeCat.name;
      }
    });

    const modeButtons = modal.querySelectorAll('.transaction-tab');
    const setMode = (mode) => {
      modeButtons.forEach((button) => button.classList.toggle('active', button.dataset.mode === mode));
      const form = modal.querySelector('#transactionForm');
      if (!form) return;

      const type = form.querySelector('select[name="type"]');
      const category = form.querySelector('select[name="category"]');
      const amountField = form.querySelector('.transaction-amount-field');
      const repaymentFields = form.parentNode.querySelector('#repaymentFields');
      const amountInput = form.querySelector('input[name="amount"]');
      const repaymentInput = form.querySelector('input[name="repaymentAmount"]');
      const loanSelectField = form.querySelector('select[name="loanId"]');

      const isLoan = mode === 'loan';
      const isRepayment = mode === 'repayment';
      amountField?.classList.toggle('hidden', isLoan || isRepayment);
      repaymentFields?.classList.toggle('hidden', !isRepayment);
      amountInput.required = !isLoan && !isRepayment;
      repaymentInput.required = isRepayment;
      loanSelectField.required = isRepayment;

      if (isLoan) {
        type.value = 'income';
        category.value = 'Loan';
        category.disabled = true;
      } else if (isRepayment) {
        type.value = 'expense';
        category.value = 'Loan repayment';
        category.disabled = true;
      } else {
        category.disabled = false;
      }
    };

    modeButtons.forEach((button) => button.addEventListener('click', () => setMode(button.dataset.mode)));

    const form = modal.querySelector('#transactionForm');
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const errorBox = document.getElementById('transactionFormError');

      const selectedMode = modal.querySelector('.transaction-tab.active')?.dataset.mode || 'standard';
      const payload = {
        type: form.querySelector('select[name="type"]').value,
        category: form.querySelector('select[name="category"]').value,
        amount: Number(form.querySelector('input[name="amount"]').value || 0),
        date: form.querySelector('input[name="date"]').value || new Date().toISOString().slice(0, 10),
        note: form.querySelector('input[name="note"]').value || '',
        loanId: form.querySelector('select[name="loanId"]').value || '',
        repaymentAmount: Number(form.querySelector('input[name="repaymentAmount"]').value || 0)
      };

      if (selectedMode === 'repayment') {
        if (!payload.loanId) {
          errorBox.textContent = 'Select the loan that is being repaid.';
          errorBox.classList.add('visible');
          return;
        }
        if (!payload.repaymentAmount || payload.repaymentAmount <= 0) {
          errorBox.textContent = 'Repayment amount is required for loan repayment entries.';
          errorBox.classList.add('visible');
          return;
        }
        payload.type = 'expense';
        payload.category = 'Loan repayment';
        payload.amount = payload.repaymentAmount;
      } else if (selectedMode === 'loan') {
        if (!payload.amount || payload.amount <= 0) {
          errorBox.textContent = 'Enter a valid loan amount greater than zero.';
          errorBox.classList.add('visible');
          return;
        }
        payload.type = 'income';
        payload.category = 'Loan';
      } else {
        if (!payload.amount || payload.amount <= 0) {
          errorBox.textContent = 'Enter a valid amount greater than zero.';
          errorBox.classList.add('visible');
          return;
        }
      }

      const transactionState = loadState();
      const tx = {
        id: crypto.randomUUID ? crypto.randomUUID() : `tx-${Date.now()}`,
        type: payload.type,
        category: payload.category,
        amount: payload.amount,
        date: payload.date,
        note: payload.note,
        loanId: selectedMode === 'repayment' ? payload.loanId : ''
      };

      transactionState.transactions.push(tx);

      if (selectedMode === 'repayment') {
        const targetLoan = transactionState.loans.find((loan) => loan.id === payload.loanId);
        if (targetLoan) {
          targetLoan.paid = safeNumber(targetLoan.paid) + payload.amount;
          targetLoan.balance = Math.max(0, safeNumber(targetLoan.balance) - payload.amount);
        }
      }

      saveState(transactionState);
      renderAll();
      closeTransactionForm();
      showToast(selectedMode === 'repayment' ? 'Loan repayment saved.' : 'Transaction saved.');
    });

    document.body.appendChild(modal);
  };

  const openTransactionForm = (preset = {}) => {
    buildTransactionModal();
    const modal = document.getElementById('transactionModal');
    if (!modal) return;

    const form = document.getElementById('transactionForm');
    if (!form) return;

    const typeSelect = form.querySelector('select[name="type"]');
    const categorySelect = form.querySelector('select[name="category"]');
    const amountInput = form.querySelector('input[name="amount"]');
    const noteInput = form.querySelector('input[name="note"]');
    const repSelect = form.querySelector('select[name="loanId"]');

    if (typeSelect) typeSelect.value = preset.type || 'expense';
    if (categorySelect && preset.category) categorySelect.value = preset.category;
    if (amountInput && preset.amount !== undefined) amountInput.value = preset.amount;
    if (noteInput && preset.note) noteInput.value = preset.note;
    if (repSelect && preset.loanId) repSelect.value = preset.loanId;

    const modeButtons = modal.querySelectorAll('.transaction-tab');
    const selectedMode = preset.type === 'income' && preset.category === 'Loan' ? 'loan' : 'standard';
    modeButtons.forEach((button) => button.classList.toggle('active', button.dataset.mode === selectedMode));

    const currentMode = modal.querySelector('.transaction-tab.active')?.dataset.mode || 'standard';
    const updateTransactionMode = () => {
      const modalForm = document.getElementById('transactionForm');
      const amountField = modalForm?.querySelector('.transaction-amount-field');
      const repaymentFields = modal.querySelector('#repaymentFields');
      const amountInputField = modalForm?.querySelector('input[name="amount"]');
      const repaymentInput = modalForm?.querySelector('input[name="repaymentAmount"]');
      const loanSelect = modalForm?.querySelector('select[name="loanId"]');

      if (!modalForm) return;

      const shouldShowRepayment = currentMode === 'repayment';
      const shouldShowLoan = currentMode === 'loan';
      amountField?.classList.toggle('hidden', shouldShowRepayment || shouldShowLoan);
      repaymentFields?.classList.toggle('hidden', !shouldShowRepayment);
      amountInputField.required = !shouldShowRepayment && !shouldShowLoan;
      repaymentInput.required = shouldShowRepayment;
      loanSelect.required = shouldShowRepayment;

      if (currentMode === 'loan') {
        modalForm.querySelector('select[name="type"]').value = 'income';
        modalForm.querySelector('select[name=\"category\"]').value = 'Loan';
      } else if (currentMode === 'repayment') {
        modalForm.querySelector('select[name=\"type\"]').value = 'expense';
        modalForm.querySelector('select[name=\"category\"]').value = 'Loan repayment';
      }
    };

    updateTransactionMode();

    const modalDate = form.querySelector('input[name="date"]');
    if (modalDate && !modalDate.value) modalDate.value = new Date().toISOString().slice(0, 10);

    const errorBox = document.getElementById('transactionFormError');
    if (errorBox) errorBox.classList.remove('visible');
    modal.classList.remove('hidden');
    document.body.classList.add('modal-open');
  };

  const closeTransactionForm = () => {
    const modal = document.getElementById('transactionModal');
    if (!modal) return;
    modal.classList.add('hidden');
    document.body.classList.remove('modal-open');
  };

  const wireEvents = () => {
    document.querySelectorAll('.nav-item').forEach((button) => {
      button.addEventListener('click', () => setActivePage(button.dataset.page));
    });

    document.getElementById('monthSelect')?.addEventListener('change', () => {
      const state = loadState();
      state.settings.reportMonth = document.getElementById('monthSelect').value;
      saveState(state);
      renderAll();
    });

    document.getElementById('floatingAddTransaction')?.addEventListener('click', () => openTransactionForm());
    document.getElementById('syncButton')?.addEventListener('click', () => showToast('Sync queued.'));
    document.getElementById('themeButton')?.addEventListener('click', () => {
      const state = loadState();
      const next = state.settings.theme === 'dark' ? 'light' : 'dark';
      setTheme(next);
      showToast(`Switched to ${next} mode.`);
    });

    document.getElementById('darkModeToggle')?.addEventListener('change', (event) => setTheme(event.target.checked ? 'dark' : 'light'));

    document.getElementById('budgetForm')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const state = loadState();
      const category = form.elements.budgetCategory.value;
      const month = form.elements.budgetMonth.value;
      const amount = Number(form.elements.budgetAmount.value || 0);
      if (!category || !month || !amount || amount <= 0) {
        showToast('Please complete budget details.', true);
        return;
      }
      state.budgets.push({ id: crypto.randomUUID ? crypto.randomUUID() : `bud-${Date.now()}`, month, category, amount });
      saveState(state);
      form.reset();
      renderAll();
      showToast('Budget saved.');
    });

    document.getElementById('categoryForm')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const name = form.elements.categoryName.value.trim();
      const type = form.elements.categoryType.value;
      if (!name) {
        showToast('Category name is required.', true);
        return;
      }
      const state = loadState();
      if (state.categories.some((cat) => cat.name.toLowerCase() === name.toLowerCase())) {
        showToast('This category already exists.', true);
        return;
      }
      state.categories.push({ id: crypto.randomUUID ? crypto.randomUUID() : `cat-${Date.now()}`, name, type });
      saveState(state);
      form.reset();
      renderAll();
      showToast('Category added.');
    });

    document.addEventListener('click', (event) => {
      const txDelete = event.target.closest('[data-remove-tx]');
      if (txDelete) {
        const state = loadState();
        state.transactions = state.transactions.filter((tx) => tx.id !== txDelete.dataset.removeTx);
        saveState(state);
        renderAll();
        showToast('Transaction deleted.');
      }

      const quickAction = event.target.closest('[data-quick-action]');
      if (quickAction) {
        const state = loadState();
        const action = state.settings.quickActions.find((item) => item.id === quickAction.dataset.quickAction);
        if (action) openTransactionForm({ type: action.type, category: action.category, amount: action.amount || '' });
      }

      const removeBudget = event.target.closest('[data-remove-budget]');
      if (removeBudget) {
        const state = loadState();
        state.budgets = state.budgets.filter((row) => row.id !== removeBudget.dataset.removeBudget);
        saveState(state);
        renderAll();
        showToast('Budget removed.');
      }

      const removeCategory = event.target.closest('[data-remove-category]');
      if (removeCategory) {
        const state = loadState();
        state.categories = state.categories.filter((cat) => cat.id !== removeCategory.dataset.removeCategory);
        saveState(state);
        renderAll();
        showToast('Category removed.');
      }

      const removeQuick = event.target.closest('[data-remove-quick]');
      if (removeQuick) {
        const state = loadState();
        state.settings.quickActions = state.settings.quickActions.filter((item) => item.id !== removeQuick.dataset.removeQuick);
        saveState(state);
        renderAll();
        showToast('Quick action removed.');
      }

      const editQuick = event.target.closest('[data-edit-quick]');
      if (editQuick) {
        const state = loadState();
        const item = state.settings.quickActions.find((entry) => entry.id === editQuick.dataset.editQuick);
        if (!item) return;
        const label = window.prompt('Quick action label', item.label || '');
        if (label === null) return;
        const category = window.prompt('Category name', item.category || '');
        if (category === null) return;
        const amount = window.prompt('Preset amount', item.amount || '');
        if (amount === null) return;
        item.label = label.trim() || item.label;
        item.category = category.trim() || item.category;
        item.amount = Number(amount) || 0;
        saveState(state);
        renderAll();
        showToast('Quick action updated.');
      }
    });

    document.getElementById('clearAllTransactions')?.addEventListener('click', () => {
      if (!window.confirm('Clear all transactions? This cannot be undone.')) return;
      const state = loadState();
      state.transactions = [];
      saveState(state);
      renderAll();
      showToast('All transactions cleared.');
    });

    const currentState = loadState();
    const syncUrlInput = document.getElementById('syncUrl');
    if (syncUrlInput) {
      syncUrlInput.value = currentState.settings.syncUrl || '';
      syncUrlInput.addEventListener('input', (event) => {
        const state = loadState();
        state.settings.syncUrl = event.target.value;
        saveState(state);
      });
    }

    const darkToggle = document.getElementById('darkModeToggle');
    if (darkToggle) darkToggle.checked = currentState.settings.theme !== 'light';
    const savedTheme = currentState.settings.theme || 'dark';
    setTheme(savedTheme);
  };

  const init = () => {
    buildStyles();
    const state = loadState();
    if (!state.settings || !state.settings.theme) state.settings.theme = 'dark';
    saveState(state);
    setActivePage('home');
    renderAll();
    wireEvents();

    const menuButton = document.getElementById('mobileMenu');
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarMenuToggle');

    const toggleSidebar = () => document.body.classList.toggle('sidebar-open');
    menuButton?.addEventListener('click', toggleSidebar);
    sidebarToggle?.addEventListener('click', toggleSidebar);

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') document.body.classList.remove('sidebar-open');
    });

    document.addEventListener('click', (event) => {
      const insideSidebar = event.target.closest('#sidebar');
      const insideButton = event.target.closest('#mobileMenu') || event.target.closest('#sidebarMenuToggle');
      if (!insideSidebar && !insideButton && window.innerWidth <= 760) {
        document.body.classList.remove('sidebar-open');
      }
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
