(() => {
  const DB_NAME = "debtFreedomTrackerDB";
  const DB_VERSION = 2;
  const STORE_NAME = "appState";
  const STATE_KEY = "current";
  let decorating = false;

  const money = (value) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value) || 0);
  const pad = (value) => String(value).padStart(2, "0");
  const dateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const inputDate = (value) => {
    if (!value) return null;
    const [year, month, day] = String(value).split("-").map(Number);
    return year && month && day ? new Date(year, month - 1, day) : null;
  };
  const uid = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  function openDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function readState() {
    const db = await openDb();
    const value = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const request = tx.objectStore(STORE_NAME).get(STATE_KEY);
      request.onsuccess = () => resolve(request.result?.value || null);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return value;
  }

  async function writeState(state) {
    state.updatedAt = new Date().toISOString();
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put({ key: STATE_KEY, value: state });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }

  function addMonths(date, months) {
    return new Date(date.getFullYear(), date.getMonth() + months, date.getDate());
  }

  function occurrenceForMonth(baseDateString, frequency, monthDate = new Date()) {
    const base = inputDate(baseDateString);
    if (!base) return null;
    const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
    if (base > monthEnd) return null;
    if (frequency === "one-time") return base >= monthStart && base <= monthEnd ? base : null;

    if (frequency === "weekly" || frequency === "biweekly") {
      const step = frequency === "weekly" ? 7 : 14;
      let cursor = new Date(base.getFullYear(), base.getMonth(), base.getDate());
      while (cursor < monthStart) cursor.setDate(cursor.getDate() + step);
      return cursor <= monthEnd ? cursor : null;
    }

    const baseMonth = new Date(base.getFullYear(), base.getMonth(), 1);
    const diff = (monthStart.getFullYear() - baseMonth.getFullYear()) * 12 + (monthStart.getMonth() - baseMonth.getMonth());
    const stepMonths = frequency === "quarterly" ? 3 : frequency === "yearly" ? 12 : 1;
    if (diff < 0 || diff % stepMonths !== 0) return null;
    const day = Math.min(base.getDate(), monthEnd.getDate());
    return new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
  }

  function eventFromKey(state, key) {
    const [type, id, rawDate] = String(key || "").split(":");
    const date = inputDate(rawDate);
    if (!type || !id || !date) return null;
    if (type === "debt") {
      const debt = (state.debts || []).find((item) => item.id === id);
      if (!debt) return null;
      return { type, id, date, key, name: debt.creditor || "Debt payment", amount: Number(debt.minPayment) || 0, debt };
    }
    if (type === "bill") {
      const bill = (state.bills || []).find((item) => item.id === id);
      if (!bill) return null;
      return { type, id, date, key, name: bill.name || "Bill", amount: Number(bill.amount) || 0, bill };
    }
    if (type === "subscription") {
      const sub = (state.subscriptions || []).find((item) => item.id === id);
      if (!sub) return null;
      return { type, id, date, key, name: sub.name || "Subscription", amount: Number(sub.cost) || 0, sub };
    }
    return null;
  }

  function ensureMonthlyHistory(state) {
    if (!Array.isArray(state.monthlyPaymentHistory)) state.monthlyPaymentHistory = [];
    if (!state.payments || typeof state.payments !== "object") state.payments = {};
    if (!Array.isArray(state.paymentHistory)) state.paymentHistory = [];
  }

  function upsertMonthlyHistory(state, eventInfo) {
    ensureMonthlyHistory(state);
    const existing = state.monthlyPaymentHistory.find((item) => item.sourceEventKey === eventInfo.key);
    const record = {
      id: existing?.id || uid(),
      sourceEventKey: eventInfo.key,
      itemId: eventInfo.id,
      category: eventInfo.type,
      name: eventInfo.name,
      amount: Number(eventInfo.amount) || 0,
      date: dateKey(eventInfo.date),
      status: "paid",
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    if (existing) Object.assign(existing, record);
    else state.monthlyPaymentHistory.push(record);
  }

  function removeMonthlyHistory(state, key) {
    ensureMonthlyHistory(state);
    state.monthlyPaymentHistory = state.monthlyPaymentHistory.filter((item) => item.sourceEventKey !== key);
  }

  function recalculateDebt(state, debtId) {
    const debt = (state.debts || []).find((item) => item.id === debtId);
    if (!debt) return;
    const records = (state.paymentHistory || [])
      .filter((payment) => payment.debtId === debtId)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
    let balance = Number(debt.historyBaseline ?? records[0]?.balanceBefore ?? debt.balance) || 0;
    for (const payment of records) {
      payment.balanceBefore = balance;
      payment.balanceAfter = Math.max(0, balance - (Number(payment.principal) || 0));
      balance = payment.balanceAfter;
    }
    debt.balance = Math.max(0, balance);
    debt.status = debt.balance <= 0 ? "paid" : (debt.status === "paused" ? "paused" : "active");
  }

  function addDebtPaymentFromEvent(state, eventInfo) {
    ensureMonthlyHistory(state);
    if (state.paymentHistory.some((payment) => payment.sourceEventKey === eventInfo.key)) return;
    const debt = eventInfo.debt;
    const balance = Number(debt.balance) || 0;
    const amount = Math.min(balance, Number(eventInfo.amount) || 0);
    const interest = Math.min(amount, balance * ((Number(debt.apr) || 0) / 100 / 12));
    const principal = Math.max(0, amount - interest);
    if (debt.historyBaseline == null) debt.historyBaseline = balance;
    state.paymentHistory.push({
      id: uid(),
      debtId: debt.id,
      creditorSnapshot: debt.creditor || "Unknown creditor",
      date: dateKey(eventInfo.date),
      amount,
      principal,
      interest,
      balanceBefore: balance,
      balanceAfter: Math.max(0, balance - principal),
      note: "Created from monthly paid status.",
      method: "",
      type: "scheduled",
      sourceEventKey: eventInfo.key,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    recalculateDebt(state, debt.id);
  }

  function removeDebtPaymentFromEvent(state, eventInfo) {
    state.paymentHistory = (state.paymentHistory || []).filter((payment) => payment.sourceEventKey !== eventInfo.key);
    recalculateDebt(state, eventInfo.id);
  }

  async function migrateLegacyPaidBills() {
    const state = await readState();
    if (!state || state.monthlyPaidMigrationV1) return;
    ensureMonthlyHistory(state);
    let changed = false;
    for (const bill of state.bills || []) {
      if (bill.status !== "paid") continue;
      const occurrence = occurrenceForMonth(bill.dueDate, bill.frequency, new Date());
      bill.status = "unpaid";
      changed = true;
      if (occurrence) {
        const key = `bill:${bill.id}:${dateKey(occurrence)}`;
        state.payments[key] = { paid: true, updatedAt: new Date().toISOString() };
        upsertMonthlyHistory(state, { type: "bill", id: bill.id, key, date: occurrence, name: bill.name || "Bill", amount: Number(bill.amount) || 0 });
      }
    }
    state.monthlyPaidMigrationV1 = true;
    if (changed || !state.monthlyPaidMigrationV1) await writeState(state);
    else await writeState(state);
  }

  async function handleMonthlyToggle(actionEl) {
    const key = actionEl.dataset.key;
    const state = await readState();
    if (!state) return;
    ensureMonthlyHistory(state);
    const eventInfo = eventFromKey(state, key);
    if (!eventInfo) return;
    const nextPaid = !state.payments[key]?.paid;
    state.payments[key] = { paid: nextPaid, updatedAt: new Date().toISOString() };

    if (nextPaid) {
      upsertMonthlyHistory(state, eventInfo);
      if (eventInfo.type === "debt") addDebtPaymentFromEvent(state, eventInfo);
    } else {
      removeMonthlyHistory(state, key);
      if (eventInfo.type === "debt") removeDebtPaymentFromEvent(state, eventInfo);
    }

    await writeState(state);
    location.reload();
  }

  function categoryLabel(value) {
    if (value === "debt") return "Debt";
    if (value === "subscription") return "Subscription";
    return "Bill";
  }

  async function decorateUi() {
    if (decorating) return;
    decorating = true;
    try {
      const state = await readState();
      if (!state) return;
      ensureMonthlyHistory(state);

      const billModal = document.querySelector("form[data-form='entity'] select[name='frequency']")?.closest("form[data-form='entity']");
      if (billModal) {
        const category = billModal.querySelector("select[name='category']");
        const status = billModal.querySelector("select[name='status']");
        if (category && status && status.querySelector("option[value='autopay']")) {
          const paidOption = status.querySelector("option[value='paid']");
          if (paidOption) paidOption.remove();
          if (!billModal.querySelector("[data-monthly-paid-note]")) {
            const note = document.createElement("div");
            note.dataset.monthlyPaidNote = "true";
            note.className = "info-box";
            note.textContent = "Paid is tracked month by month. Use the Calendar or Upcoming Bills Paid button after each payment. Recurring bills will automatically appear again in future months.";
            status.closest("label")?.after(note);
          }
        }
      }

      for (const editButton of document.querySelectorAll("button[data-action='open-form'][data-type='bill'][data-id]")) {
        const row = editButton.closest(".item-row");
        if (!row || row.querySelector("[data-monthly-bill-status]")) continue;
        const bill = (state.bills || []).find((item) => item.id === editButton.dataset.id);
        if (!bill) continue;
        const occurrence = occurrenceForMonth(bill.dueDate, bill.frequency, new Date());
        const paid = occurrence ? Boolean(state.payments[`bill:${bill.id}:${dateKey(occurrence)}`]?.paid) : false;
        const span = document.createElement("span");
        span.dataset.monthlyBillStatus = "true";
        span.className = `pill ${paid ? "paid" : "warning"}`;
        span.textContent = paid ? "Paid this month" : "Due this month";
        row.querySelector(".item-meta")?.append(span);
      }

      for (const debtButton of document.querySelectorAll("button[data-action='mark-debt-paid']")) {
        debtButton.title = "Mark the entire debt paid off (not just this month's payment)";
        debtButton.setAttribute("aria-label", "Mark entire debt paid off");
      }
      for (const paymentButton of document.querySelectorAll("button[data-action='open-payment-form'][data-id]")) {
        paymentButton.title = "Record a debt payment and recalculate the remaining balance";
      }

      const historyScreen = [...document.querySelectorAll(".screen")].find((screen) => screen.querySelector("input[data-action='history-query']"));
      if (historyScreen && !historyScreen.querySelector("[data-monthly-history-card]")) {
        const card = document.createElement("article");
        card.className = "card panel";
        card.dataset.monthlyHistoryCard = "true";
        const records = [...state.monthlyPaymentHistory].sort((a, b) => String(b.date).localeCompare(String(a.date)));
        const rows = records.length
          ? `<div class="row-list">${records.slice(0, 100).map((item) => `<div class="item-row"><div class="item-main"><h3 class="item-title">${escapeHtml(item.name || "Payment")}</h3><div class="item-meta"><span>${categoryLabel(item.category)}</span><span>${money(item.amount)}</span><span>${escapeHtml(item.date || "")}</span><span class="pill paid">Paid for this period</span></div></div></div>`).join("")}</div>`
          : `<div class="empty">Monthly bill, subscription, and calendar payment history will appear here.</div>`;
        card.innerHTML = `<div class="section-head"><h2>Monthly payment history</h2><span class="pill primary">${records.length} records</span></div><div class="info-box">Recurring items are recorded by due date. Marking August paid does not mark September paid.</div>${rows}`;
        historyScreen.append(card);
      }
    } finally {
      decorating = false;
    }
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  }

  document.addEventListener("click", (event) => {
    const actionEl = event.target.closest("[data-action='toggle-paid']");
    if (!actionEl) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    handleMonthlyToggle(actionEl).catch((error) => {
      console.error("Unable to update monthly payment", error);
      alert("This payment could not be updated. Please try again.");
    });
  }, true);

  const observer = new MutationObserver(() => decorateUi().catch(console.error));
  observer.observe(document.documentElement, { childList: true, subtree: true });

  migrateLegacyPaidBills()
    .then(() => decorateUi())
    .catch((error) => console.error("Monthly payment migration failed", error));
})();
