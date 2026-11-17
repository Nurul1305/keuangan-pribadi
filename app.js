const CONFIG = {
  scriptUrl: 'https://script.google.com/macros/s/AKfycbxlpojN08GQ2rxqk8mqcjMWwVQ7SCN97-kzbWlWqKax_9nI4IgG6gsGtXV8ofCf0N1N/exec',
  defaultRange: 'today',
  sheets: {
    income: 'Pemasukan',
    expense: 'Pengeluaran'
  }
};

const state = {
  transactions: {
    income: [],
    expense: []
  },
  selectedRange: CONFIG.defaultRange,
  startDate: '',
  endDate: '',
  search: '',
  categoryFilter: 'all',
  isLoading: false
};

const els = {
  rangeChips: document.querySelectorAll('.chip'),
  customRangeWrap: document.getElementById('customRangeWrap'),
  startDate: document.getElementById('startDate'),
  endDate: document.getElementById('endDate'),
  incomeTotal: document.getElementById('incomeTotal'),
  expenseTotal: document.getElementById('expenseTotal'),
  balanceTotal: document.getElementById('balanceTotal'),
  categoryChart: document.getElementById('categoryChart'),
  topCategory: document.getElementById('topCategory'),
  dailyAverage: document.getElementById('dailyAverage'),
  comparePeriod: document.getElementById('comparePeriod'),
  transactionList: document.getElementById('transactionList'),
  searchInput: document.getElementById('searchInput'),
  categoryFilter: document.getElementById('categoryFilter'),
  trendInsights: document.getElementById('trendInsights'),
  navigation: document.querySelectorAll('.nav-item'),
  pages: document.querySelectorAll('.page'),
  fab: document.getElementById('fab'),
  modal: document.getElementById('transactionModal'),
  form: document.getElementById('transactionForm'),
  type: document.getElementById('type'),
  date: document.getElementById('date'),
  category: document.getElementById('category'),
  amount: document.getElementById('amount'),
  note: document.getElementById('note'),
  refreshBtn: document.getElementById('refreshBtn')
};

function formatRupiah(value) {
  const number = Number(value || 0);
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(number);
}

function toDateString(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function parseDate(dateValue) {
  if (!dateValue) return null;
  const date = new Date(dateValue + 'T00:00:00');
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeText(value) {
  return String(value || '').trim();
}

function initDates() {
  const today = new Date();
  const iso = toDateString(today);
  els.date.value = iso;
  state.startDate = iso;
  state.endDate = iso;
}

function setActiveTab(targetId) {
  els.pages.forEach((page) => {
    page.classList.toggle('active', page.id === targetId);
  });

  els.navigation.forEach((button) => {
    const isActive = button.dataset.target === targetId;
    button.classList.toggle('active', isActive);
  });
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast show';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 220);
  }, 1800);
}

function openModal() {
  els.modal.classList.remove('hidden');
  els.type.focus();
}

function closeModal() {
  els.modal.classList.add('hidden');
  els.form.reset();
  initDates();
}

function getRangeDates() {
  const today = new Date();
  const start = new Date(today);
  const end = new Date(today);

  if (state.selectedRange === 'today') {
    state.startDate = toDateString(start);
    state.endDate = toDateString(end);
  }

  if (state.selectedRange === 'week') {
    start.setDate(today.getDate() - 6);
    state.startDate = toDateString(start);
    state.endDate = toDateString(end);
  }

  if (state.selectedRange === 'month') {
    start.setDate(1);
    state.startDate = toDateString(start);
    state.endDate = toDateString(end);
  }

  if (state.selectedRange === 'custom') {
    state.startDate = els.startDate.value || '';
    state.endDate = els.endDate.value || '';
  }

  if (state.selectedRange !== 'custom') {
    els.startDate.value = state.startDate;
    els.endDate.value = state.endDate;
  }

  els.customRangeWrap.classList.toggle('hidden', state.selectedRange !== 'custom');
}

function isWithinRange(transactionDate, startDate, endDate) {
  if (!transactionDate) return false;
  const value = parseDate(transactionDate);
  if (!value) return false;

  const start = startDate ? parseDate(startDate) : null;
  const end = endDate ? parseDate(endDate) : null;

  if (start && value < start) return false;
  if (end && value > end) return false;
  return true;
}

function getFilteredTransactions(type) {
  const { startDate, endDate, search, categoryFilter } = state;
  const source = state.transactions[type] || [];

  return source.filter((item) => {
    const dateMatch = isWithinRange(item.tanggal, startDate, endDate);
    const searchText = `${item.kategori} ${item.catatan}`.toLowerCase();
    const searchMatch = !search || searchText.includes(search.toLowerCase());
    const categoryMatch = categoryFilter === 'all' || item.kategori === categoryFilter;
    return dateMatch && searchMatch && categoryMatch;
  });
}

function computeSummary(type) {
  const list = getFilteredTransactions(type);
  return list.reduce((total, item) => total + Number(item.nominal || 0), 0);
}

function buildCategoryTotals(type) {
  const list = getFilteredTransactions(type);
  const categoryMap = new Map();

  list.forEach((item) => {
    const key = item.kategori || 'Lainnya';
    categoryMap.set(key, (categoryMap.get(key) || 0) + Number(item.nominal || 0));
  });

  return [...categoryMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
}

function drawCategoryChart() {
  const ctx = els.categoryChart.getContext('2d');
  const width = els.categoryChart.width;
  const height = els.categoryChart.height;
  const totals = buildCategoryTotals('expense');

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#eef4ff';
  ctx.fillRect(0, 0, width, height);

  if (!totals.length) {
    ctx.fillStyle = '#667085';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Belum ada data', width / 2, height / 2);
    return;
  }

  const maxValue = Math.max(...totals.map(([, value]) => value), 1);
  const chartTop = 20;
  const chartBottom = 30;
  const chartHeight = height - chartTop - chartBottom;
  const barWidth = (width - 32) / totals.length - 10;

  totals.forEach(([label, value], index) => {
    const x = 14 + index * (barWidth + 12);
    const barHeight = (value / maxValue) * chartHeight;
    const y = height - chartBottom - barHeight;

    const palette = ['#4f46e5', '#7c3aed', '#14b8a6', '#f59e0b', '#ef4444', '#10b981'];
    ctx.fillStyle = palette[index % palette.length];
    ctx.fillRect(x, y, barWidth, barHeight);

    ctx.fillStyle = '#475467';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label.slice(0, 8), x + barWidth / 2, height - 8);
  });
}

function updateSummaryCards() {
  const income = computeSummary('income');
  const expense = computeSummary('expense');
  const balance = income - expense;

  els.incomeTotal.textContent = formatRupiah(income);
  els.expenseTotal.textContent = formatRupiah(expense);
  els.balanceTotal.textContent = formatRupiah(balance);

  const expenseTotals = buildCategoryTotals('expense');
  if (!expenseTotals.length) {
    els.topCategory.textContent = 'Belum ada';
  } else {
    els.topCategory.textContent = expenseTotals[0][0];
  }

  const dailyValues = state.transactions.expense.filter((item) => isWithinRange(item.tanggal, state.startDate, state.endDate));
  const daysBetween = Math.max(1, getDayDifference(state.startDate, state.endDate) + 1);
  const avg = dailyValues.reduce((total, item) => total + Number(item.nominal || 0), 0) / daysBetween;
  els.dailyAverage.textContent = formatRupiah(avg);

  const prevStart = getPreviousRangeStart(state.startDate, state.endDate);
  const prevEnd = getPreviousRangeEnd(state.startDate, state.endDate);
  const prevIncome = computePeriodTotal('income', prevStart, prevEnd);
  const prevExpense = computePeriodTotal('expense', prevStart, prevEnd);
  const comparison = prevExpense ? ((expense - prevExpense) / prevExpense) * 100 : 0;
  const compareText = `${comparison >= 0 ? '↑' : '↓'} ${Math.abs(comparison).toFixed(1)}%`;
  els.comparePeriod.textContent = compareText;
}

function getDayDifference(startDate, endDate) {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  if (!start || !end) return 0;
  return Math.ceil((end - start) / 86400000);
}

function getPreviousRangeStart(startDate, endDate) {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  if (!start || !end) return '';
  const duration = end - start;
  const prevEnd = new Date(start);
  prevEnd.setTime(start.getTime() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setTime(prevEnd.getTime() - duration);
  return toDateString(prevStart);
}

function getPreviousRangeEnd(startDate, endDate) {
  const start = parseDate(startDate);
  if (!start) return '';
  const end = parseDate(endDate);
  if (!end) return '';
  const duration = end - start;
  const prevEnd = new Date(start);
  prevEnd.setTime(start.getTime() - 1);
  return toDateString(prevEnd);
}

function computePeriodTotal(type, startDate, endDate) {
  if (!startDate || !endDate) return 0;
  return (state.transactions[type] || []).reduce((total, item) => {
    return isWithinRange(item.tanggal, startDate, endDate) ? total + Number(item.nominal || 0) : total;
  }, 0);
}

function renderTransactions() {
  const list = [
    ...getFilteredTransactions('income'),
    ...getFilteredTransactions('expense')
  ].sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());

  const categoryList = new Set([
    ...state.transactions.income.map((i) => i.kategori),
    ...state.transactions.expense.map((i) => i.kategori)
  ]);

  els.categoryFilter.innerHTML = '<option value="all">Semua kategori</option>' +
    [...categoryList].map((category) => `<option value="${category}">${category}</option>`).join('');

  if (state.categoryFilter !== 'all' && categoryList.has(state.categoryFilter)) {
    els.categoryFilter.value = state.categoryFilter;
  } else {
    els.categoryFilter.value = 'all';
    state.categoryFilter = 'all';
  }

  if (!list.length) {
    els.transactionList.innerHTML = `
      <div class="empty-state">
        <p>Tidak ada transaksi di periode ini.</p>
      </div>
    `;
    return;
  }

  els.transactionList.innerHTML = list.map((item) => {
    const type = item.type || (item.nominal >= 0 ? 'income' : 'expense');
    const kind = String(item.sheetName || '').toLowerCase().includes('pemasukan') ? 'Pemasukan' : 'Pengeluaran';
    const amountClass = kind === 'Pemasukan' ? 'income' : 'expense';
    const label = kind === 'Pemasukan' ? '+' : '-';
    return `
      <article class="transaction-item" data-id="${item.id || item.tanggal + item.kategori + item.nominal}">
        <div class="transaction-meta">
          <span class="transaction-type">${kind}</span>
          <span class="transaction-title">${item.kategori || 'Tanpa kategori'}</span>
          <span class="transaction-date">${item.tanggal || '-'}${item.catatan ? ' • ' + item.catatan : ''}</span>
        </div>
        <div class="amount-wrap">
          <span class="amount ${amountClass}">${label}${formatRupiah(item.nominal)}</span>
          <button class="delete-btn" data-delete="${item.id || item.tanggal + item.kategori + item.nominal}">Hapus</button>
        </div>
      </article>
    `;
  }).join('');

  document.querySelectorAll('.delete-btn').forEach((button) => {
    button.addEventListener('click', async () => {
      const key = button.dataset.delete;
      const target = [...state.transactions.income, ...state.transactions.expense].find((item) => {
        const id = item.id || (item.tanggal + item.kategori + item.nominal);
        return id === key;
      });
      if (!target) return;

      const confirmed = window.confirm(`Hapus transaksi ${target.kategori}?`);
      if (!confirmed) return;

      try {
        await removeTransaction(target);
        showToast('Transaksi berhasil dihapus');
        await loadTransactions();
      } catch (error) {
        showToast('Gagal menghapus transaksi');
      }
    });
  });
}

function renderTrendInsights() {
  const incomeList = state.transactions.income;
  const expenseList = state.transactions.expense;
  const incomeTotal = incomeList.reduce((sum, item) => sum + Number(item.nominal || 0), 0);
  const expenseTotal = expenseList.reduce((sum, item) => sum + Number(item.nominal || 0), 0);

  const cards = `
    <div class="summary-card income">
      <span>Pemasukan total</span>
      <strong>${formatRupiah(incomeTotal)}</strong>
    </div>
    <div class="summary-card expense">
      <span>Pengeluaran total</span>
      <strong>${formatRupiah(expenseTotal)}</strong>
    </div>
  `;

  els.trendInsights.innerHTML = cards;
}

async function fetchFromScript(action, payload = {}) {
  if (!CONFIG.scriptUrl || CONFIG.scriptUrl.includes('PASTE_')) {
    throw new Error('URL Apps Script belum diset.');
  }

  const response = await fetch(CONFIG.scriptUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, payload })
  });

  if (!response.ok) {
    throw new Error('Gagal menghubungi Apps Script');
  }

  return response.json();
}

async function loadTransactions() {
  state.isLoading = true;
  try {
    const result = await fetchFromScript('readTransactions');
    state.transactions.income = Array.isArray(result.data?.pemasukan) ? result.data.pemasukan : [];
    state.transactions.expense = Array.isArray(result.data?.pengeluaran) ? result.data.pengeluaran : [];

    state.transactions.income = state.transactions.income.map((item) => ({ ...item, sheetName: 'Pemasukan' }));
    state.transactions.expense = state.transactions.expense.map((item) => ({ ...item, sheetName: 'Pengeluaran' }));

    getRangeDates();
    drawCategoryChart();
    updateSummaryCards();
    renderTrendInsights();
    renderTransactions();
  } catch (error) {
    showToast(error.message || 'Gagal memuat data');
  } finally {
    state.isLoading = false;
  }
}

async function saveTransaction(event) {
  event.preventDefault();

  const type = els.type.value;
  const payload = {
    date: els.date.value,
    category: normalizeText(els.category.value),
    amount: Number(els.amount.value || 0),
    note: normalizeText(els.note.value),
    sheet: type === 'Pemasukan' ? 'Pemasukan' : 'Pengeluaran'
  };

  if (!payload.date || !payload.category || payload.amount <= 0) {
    showToast('Nominal, tanggal, dan kategori wajib diisi.');
    return;
  }

  try {
    const result = await fetchFromScript('saveTransaction', payload);
    if (!result.ok) {
      throw new Error(result.message || 'Gagal menyimpan');
    }
    showToast('Transaksi berhasil disimpan');
    closeModal();
    await loadTransactions();
  } catch (error) {
    showToast(error.message || 'Gagal menyimpan transaksi');
  }
}

async function removeTransaction(target) {
  const payload = {
    sheet: target.sheetName,
    date: target.tanggal,
    category: target.kategori,
    amount: Number(target.nominal || 0),
    note: target.catatan || ''
  };

  const result = await fetchFromScript('deleteTransaction', payload);
  if (!result.ok) {
    throw new Error(result.message || 'Gagal menghapus');
  }
}

function bindEvents() {
  els.rangeChips.forEach((button) => {
    button.addEventListener('click', () => {
      els.rangeChips.forEach((chip) => chip.classList.toggle('active', chip === button));
      state.selectedRange = button.dataset.range;
      getRangeDates();
      updateSummaryCards();
      renderTransactions();
      drawCategoryChart();
    });
  });

  els.startDate.addEventListener('change', () => {
    if (state.selectedRange === 'custom') {
      getRangeDates();
      updateSummaryCards();
      renderTransactions();
      drawCategoryChart();
    }
  });

  els.endDate.addEventListener('change', () => {
    if (state.selectedRange === 'custom') {
      getRangeDates();
      updateSummaryCards();
      renderTransactions();
      drawCategoryChart();
    }
  });

  els.searchInput.addEventListener('input', (event) => {
    state.search = event.target.value.trim();
    renderTransactions();
  });

  els.categoryFilter.addEventListener('change', (event) => {
    state.categoryFilter = event.target.value;
    renderTransactions();
  });

  els.navigation.forEach((button) => {
    button.addEventListener('click', () => setActiveTab(button.dataset.target));
  });

  els.fab.addEventListener('click', openModal);
  document.getElementById('closeModalBtn').addEventListener('click', closeModal);
  document.getElementById('cancelBtn').addEventListener('click', closeModal);
  els.form.addEventListener('submit', saveTransaction);
  els.refreshBtn.addEventListener('click', loadTransactions);

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeModal();
  });

  els.modal.addEventListener('click', (event) => {
    if (event.target === els.modal) closeModal();
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

async function initializeApp() {
  initDates();
  bindEvents();
  await loadTransactions();
}

initializeApp();
