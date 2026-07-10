const DB_NAME = "debtFreedomTrackerDB";
const DB_VERSION = 2;
const STORE_NAME = "appState";
const STATE_KEY = "current";
const BACKUP_SCHEMA_VERSION = 2;

const app = document.querySelector("#app");

// Runtime UI state lives in memory. Financial data is saved to IndexedDB below.
let state = null;
let activeView = "dashboard";
let modalState = null;
let isUnlocked = true;
let lockDelayUntil = 0;
let lockStartedAt = Date.now();
let calendarCursor = startOfMonth(new Date());
let whatIfExtra = 50;
let searchOpen = false;
let searchQuery = "";
let historyFilters = { query: "", debtId: "all", type: "all", start: "", end: "" };
let chartMode = "projected-avalanche";
let annualYear = new Date().getFullYear();
let importPreview = null;
let biometricAvailable = false;
let simulatorState = {
  method: "avalanche",
  totalMonthly: 0,
  extra: 0
};
let calendarFilters = {
  debt: true,
  bill: true,
  subscription: true
};

const icons = {
  dashboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 13h8V3H3v10Z"/><path d="M13 21h8V11h-8v10Z"/><path d="M13 3h8v5h-8V3Z"/><path d="M3 21h8v-5H3v5Z"/></svg>`,
  debts: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h9"/><path d="M17 17l2 2 3-4"/></svg>`,
  budget: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16v12H4z"/><path d="M16 7V5a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v2"/><path d="M8 13h.01"/><path d="M12 13h.01"/><path d="M16 13h.01"/></svg>`,
  calendar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 3v3"/><path d="M17 3v3"/><path d="M4 8h16"/><path d="M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z"/><path d="M8 12h.01"/><path d="M12 12h.01"/><path d="M16 12h.01"/><path d="M8 16h.01"/><path d="M12 16h.01"/></svg>`,
  more: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14"/><path d="M5 12h14"/></svg>`,
  edit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v5"/><path d="M14 11v5"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`,
  close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12"/><path d="M18 6 6 18"/></svg>`,
  chevronLeft: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>`,
  chevronRight: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>`,
  export: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>`,
  import: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21V9"/><path d="m7 14 5-5 5 5"/><path d="M5 3h14"/></svg>`,
  bell: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>`,
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>`,
  chart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 16v-5"/><path d="M12 16V8"/><path d="M16 16v-8"/></svg>`,
  target: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M12 2v3"/><path d="M22 12h-3"/><path d="M12 22v-3"/><path d="M2 12h3"/></svg>`,
  history: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v6h6"/><path d="M12 7v5l3 2"/></svg>`,
  bill: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 8h6"/><path d="M9 12h6"/><path d="M9 16h4"/></svg>`,
  subscription: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16v10H4z"/><path d="M8 7V5h8v2"/><path d="M8 12h8"/></svg>`,
  settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.05.05a2.1 2.1 0 0 1-2.97 2.97l-.05-.05a1.8 1.8 0 0 0-1.98-.36 1.8 1.8 0 0 0-1.1 1.66V21a2.1 2.1 0 0 1-4.2 0v-.07a1.8 1.8 0 0 0-1.1-1.66 1.8 1.8 0 0 0-1.98.36l-.05.05a2.1 2.1 0 1 1-2.97-2.97l.05-.05A1.8 1.8 0 0 0 4.6 15a1.8 1.8 0 0 0-1.66-1.1H2.9a2.1 2.1 0 0 1 0-4.2h.07A1.8 1.8 0 0 0 4.6 8a1.8 1.8 0 0 0-.36-1.98l-.05-.05A2.1 2.1 0 1 1 7.16 3l.05.05A1.8 1.8 0 0 0 9.2 3.4a1.8 1.8 0 0 0 1.1-1.66V1.7a2.1 2.1 0 0 1 4.2 0v.07a1.8 1.8 0 0 0 1.1 1.66 1.8 1.8 0 0 0 1.98-.36l.05-.05a2.1 2.1 0 0 1 2.97 2.97l-.05.05A1.8 1.8 0 0 0 19.4 8c.15.5.56.88 1.1 1.1h.07a2.1 2.1 0 0 1 0 4.2h-.07A1.8 1.8 0 0 0 19.4 15Z"/></svg>`
};

const viewTitles = {
  dashboard: "Dashboard",
  debts: "Debts",
  budget: "Budget",
  calendar: "Payment Calendar",
  more: "More",
  bills: "Bills",
  subscriptions: "Subscriptions",
  reminders: "Reminders",
  settings: "Settings / Backup",
  paymentHistory: "Payment History",
  simulator: "Payoff Simulator",
  goals: "Goals",
  charts: "Charts",
  annualReview: "Annual Review"
};

const debtFields = [
  { name: "creditor", label: "Creditor name", type: "text", required: true },
  { name: "type", label: "Debt type", type: "select", options: ["Credit card", "Personal loan", "Auto loan", "Student loan", "Medical", "Tax", "Other"] },
  { name: "balance", label: "Current balance", type: "number", step: "0.01", min: "0", required: true },
  { name: "apr", label: "Interest rate/APR", type: "number", step: "0.01", min: "0" },
  { name: "minPayment", label: "Minimum monthly payment", type: "number", step: "0.01", min: "0" },
  { name: "dueDate", label: "Due date", type: "date" },
  { name: "priority", label: "Payment priority/order", type: "number", step: "1", min: "1" },
  { name: "status", label: "Account status", type: "select", options: [{ value: "active", label: "Active" }, { value: "paid", label: "Paid off" }, { value: "paused", label: "Paused" }] },
  { name: "notes", label: "Notes", type: "textarea" }
];

const billFields = [
  { name: "name", label: "Bill name", type: "text", required: true },
  { name: "category", label: "Category", type: "select", options: ["Housing", "Utilities", "Insurance", "Phone", "Transportation", "Food", "Childcare", "Medical", "Other"] },
  { name: "amount", label: "Amount", type: "number", step: "0.01", min: "0", required: true },
  { name: "dueDate", label: "Due date", type: "date" },
  { name: "frequency", label: "Repeating frequency", type: "select", options: ["monthly", "weekly", "biweekly", "quarterly", "yearly", "one-time"] },
  { name: "status", label: "Payment status", type: "select", options: ["unpaid", "paid", "autopay"] },
  { name: "notes", label: "Notes", type: "textarea" }
];

const subscriptionFields = [
  { name: "name", label: "Subscription name", type: "text", required: true },
  { name: "category", label: "Category", type: "select", options: ["Streaming", "Software", "Fitness", "Cloud storage", "Shopping", "News", "Gaming", "Other"] },
  { name: "cost", label: "Cost", type: "number", step: "0.01", min: "0", required: true },
  { name: "frequency", label: "Billing frequency", type: "select", options: ["monthly", "yearly", "weekly", "quarterly"] },
  { name: "nextBillingDate", label: "Next billing date", type: "date" },
  { name: "cancellationLink", label: "Cancellation link", type: "url" },
  { name: "status", label: "Status", type: "select", options: ["active", "paused", "canceled"] },
  { name: "notes", label: "Notes", type: "textarea" }
];

const budgetFields = [
  ["monthlyIncome", "Monthly income"],
  ["essentialBills", "Essential monthly bills"],
  ["spendingLimit", "Monthly spending limit"],
  ["moneyForDebt", "Money available for debt"],
  ["extraPayment", "Extra payment amount"],
  ["emergencySavings", "Emergency savings amount"],
  ["monthlyDebtGoal", "Monthly debt payoff goal"]
];

init();

async function init() {
  state = await loadState();
  if (!state) {
    state = createDefaultState();
    await saveState();
  }
  simulatorState.totalMonthly = getTotals().minimumPayments;
  simulatorState.extra = numberValue(state.budget.extraPayment);
  isUnlocked = !state.appLock.enabled;
  biometricAvailable = await detectBiometricSupport();
  render();
  registerServiceWorker();
  maybeSendBrowserAlerts();
  setInterval(maybeSendBrowserAlerts, 60 * 60 * 1000);
}

function createDefaultState() {
  return {
    version: 2,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    debts: [],
    bills: [],
    subscriptions: [],
    paymentHistory: [],
    goals: [],
    budget: {
      monthlyIncome: 0,
      essentialBills: 0,
      spendingLimit: 0,
      moneyForDebt: 0,
      extraPayment: 0,
      emergencySavings: 0,
      monthlyDebtGoal: 0,
      notes: ""
    },
    payments: {},
    reminderState: {
      dismissed: {},
      snoozed: {},
      customDays: []
    },
    appLock: {
      enabled: false,
      pinLength: 4,
      pinHash: "",
      salt: "",
      autoLock: "hidden",
      failedAttempts: 0,
      lockedUntil: 0,
      biometricEnabled: false,
      biometricCredentialId: ""
    },
    search: {
      recent: []
    },
    dashboardSettings: {
      hiddenCards: []
    },
    settings: {
      reminderDays: [0, 1, 3, 7],
      browserAlerts: false,
      notifiedKeys: []
    }
  };
}

function createSampleState() {
  const today = new Date();
  const d = (offset) => toInputDate(addDays(today, offset));
  return {
    ...createDefaultState(),
    debts: [
      {
        id: uid(),
        creditor: "Northstar Visa",
        type: "Credit card",
        balance: 4200,
        startingBalance: 5200,
        apr: 21.9,
        minPayment: 115,
        dueDate: d(8),
        notes: "Highest APR.",
        priority: 1,
        status: "active"
      },
      {
        id: uid(),
        creditor: "Auto Loan",
        type: "Auto loan",
        balance: 8900,
        startingBalance: 12000,
        apr: 6.4,
        minPayment: 275,
        dueDate: d(15),
        notes: "",
        priority: 3,
        status: "active"
      },
      {
        id: uid(),
        creditor: "Clinic Balance",
        type: "Medical",
        balance: 860,
        startingBalance: 1400,
        apr: 0,
        minPayment: 60,
        dueDate: d(3),
        notes: "Pay this early if possible.",
        priority: 2,
        status: "active"
      }
    ],
    bills: [
      { id: uid(), name: "Rent", category: "Housing", amount: 1450, dueDate: d(2), frequency: "monthly", status: "unpaid", notes: "" },
      { id: uid(), name: "Electric", category: "Utilities", amount: 126, dueDate: d(11), frequency: "monthly", status: "autopay", notes: "" },
      { id: uid(), name: "Car Insurance", category: "Insurance", amount: 174, dueDate: d(20), frequency: "monthly", status: "unpaid", notes: "" }
    ],
    subscriptions: [
      { id: uid(), name: "StreamBox", category: "Streaming", cost: 18.99, frequency: "monthly", nextBillingDate: d(5), cancellationLink: "https://example.com/cancel", notes: "Easy cancel candidate.", status: "active" },
      { id: uid(), name: "Cloud Notes", category: "Software", cost: 79, frequency: "yearly", nextBillingDate: d(26), cancellationLink: "", notes: "", status: "active" }
    ],
    paymentHistory: [
      {
        id: uid(),
        debtId: "",
        creditorSnapshot: "Sample starting payment",
        date: d(-20),
        amount: 275,
        principal: 225,
        interest: 50,
        balanceBefore: 14685,
        balanceAfter: 14460,
        note: "Imported sample payment.",
        method: "Checking",
        type: "manual",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ],
    goals: [
      {
        id: uid(),
        name: "Pay $750 toward debt this month",
        type: "monthly-payment",
        targetAmount: 750,
        targetDate: d(21),
        relatedDebtId: "",
        status: "on-track",
        notes: "Use the simulator before adding extra payments.",
        milestones: ["First $250 paid", "Halfway", "Goal met"],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ],
    budget: {
      monthlyIncome: 5200,
      essentialBills: 1780,
      spendingLimit: 900,
      moneyForDebt: 720,
      extraPayment: 250,
      emergencySavings: 150,
      monthlyDebtGoal: 750,
      notes: "Keep spending under the limit before adding extra debt payments."
    }
  };
}

// IndexedDB stores one normalized app-state record. This keeps local backup and
// restore simple while still meeting the offline/local-device storage goal.
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains("paymentHistory")) {
        const payments = db.createObjectStore("paymentHistory", { keyPath: "id" });
        payments.createIndex("debtId", "debtId", { unique: false });
        payments.createIndex("date", "date", { unique: false });
        payments.createIndex("type", "type", { unique: false });
      }
      if (!db.objectStoreNames.contains("goals")) {
        const goals = db.createObjectStore("goals", { keyPath: "id" });
        goals.createIndex("type", "type", { unique: false });
        goals.createIndex("status", "status", { unique: false });
        goals.createIndex("targetDate", "targetDate", { unique: false });
      }
      if (!db.objectStoreNames.contains("appLock")) {
        db.createObjectStore("appLock", { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains("reminderState")) {
        db.createObjectStore("reminderState", { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains("annualReview")) {
        const annual = db.createObjectStore("annualReview", { keyPath: "year" });
        annual.createIndex("updatedAt", "updatedAt", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function loadState() {
  try {
    const db = await openDatabase();
    const record = await withStore(db, "readonly", (store) => store.get(STATE_KEY));
    db.close();
    return record ? normalizeState(record.value) : null;
  } catch (error) {
    console.error("Unable to load IndexedDB data", error);
    return createDefaultState();
  }
}

async function saveState() {
  state.updatedAt = new Date().toISOString();
  state.schemaVersion = BACKUP_SCHEMA_VERSION;
  const db = await openDatabase();
  await withStore(db, "readwrite", (store) => store.put({ key: STATE_KEY, value: state }));
  await mirrorFeatureStores(db);
  db.close();
}

function withStore(db, mode, action) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const request = action(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.onerror = () => reject(tx.error);
  });
}

function storeRequest(store, action) {
  return new Promise((resolve, reject) => {
    const request = action(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function mirrorFeatureStores(db) {
  const tx = db.transaction(["paymentHistory", "goals", "appLock", "reminderState", "annualReview"], "readwrite");
  const payments = tx.objectStore("paymentHistory");
  const goals = tx.objectStore("goals");
  const lock = tx.objectStore("appLock");
  const reminders = tx.objectStore("reminderState");
  const annual = tx.objectStore("annualReview");
  const requests = [
    requestToPromise(payments.clear()),
    requestToPromise(goals.clear()),
    requestToPromise(lock.put({ key: "current", value: state.appLock })),
    requestToPromise(reminders.put({ key: "current", value: state.reminderState })),
    requestToPromise(annual.put({ year: new Date().getFullYear(), updatedAt: new Date().toISOString(), value: buildAnnualReviewData(new Date().getFullYear()) }))
  ];
  for (const payment of state.paymentHistory) requests.push(requestToPromise(payments.put(payment)));
  for (const goal of state.goals) requests.push(requestToPromise(goals.put(goal)));
  await Promise.all(requests);
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function normalizeState(raw) {
  const base = createDefaultState();
  const source = raw?.data || raw || {};
  const next = {
    ...base,
    ...source,
    version: 2,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    budget: { ...base.budget, ...(source.budget || {}) },
    settings: { ...base.settings, ...(source.settings || {}) },
    reminderState: { ...base.reminderState, ...(source.reminderState || {}) },
    appLock: { ...base.appLock, ...(source.appLock || {}) },
    search: { ...base.search, ...(source.search || {}) },
    dashboardSettings: { ...base.dashboardSettings, ...(source.dashboardSettings || {}) },
    payments: source.payments || {},
    debts: Array.isArray(source.debts) ? source.debts : [],
    bills: Array.isArray(source.bills) ? source.bills : [],
    subscriptions: Array.isArray(source.subscriptions) ? source.subscriptions : [],
    paymentHistory: Array.isArray(source.paymentHistory) ? source.paymentHistory : [],
    goals: Array.isArray(source.goals) ? source.goals : []
  };

  next.debts = next.debts.map((debt, index) => ({
    id: debt.id || uid(),
    creditor: debt.creditor || "",
    type: debt.type || "Other",
    balance: numberValue(debt.balance),
    startingBalance: Math.max(numberValue(debt.startingBalance), numberValue(debt.balance)),
    apr: numberValue(debt.apr),
    minPayment: numberValue(debt.minPayment),
    dueDate: debt.dueDate || toInputDate(new Date()),
    notes: debt.notes || "",
    priority: Number(debt.priority || index + 1),
    status: debt.status || "active"
  }));

  next.bills = next.bills.map((bill) => ({
    id: bill.id || uid(),
    name: bill.name || "",
    category: bill.category || "Other",
    amount: numberValue(bill.amount),
    dueDate: bill.dueDate || toInputDate(new Date()),
    frequency: bill.frequency || "monthly",
    status: bill.status || "unpaid",
    notes: bill.notes || ""
  }));

  next.subscriptions = next.subscriptions.map((subscription) => ({
    id: subscription.id || uid(),
    name: subscription.name || "",
    category: subscription.category || "Other",
    cost: numberValue(subscription.cost),
    frequency: subscription.frequency || "monthly",
    nextBillingDate: subscription.nextBillingDate || toInputDate(new Date()),
    cancellationLink: subscription.cancellationLink || "",
    notes: subscription.notes || "",
    status: subscription.status || "active"
  }));

  next.paymentHistory = next.paymentHistory.map((payment) => ({
    id: payment.id || uid(),
    debtId: payment.debtId || "",
    creditorSnapshot: payment.creditorSnapshot || payment.creditor || "Unknown creditor",
    date: payment.date || toInputDate(new Date()),
    amount: numberValue(payment.amount),
    principal: numberValue(payment.principal),
    interest: numberValue(payment.interest),
    balanceBefore: numberValue(payment.balanceBefore),
    balanceAfter: Math.max(0, numberValue(payment.balanceAfter)),
    note: payment.note || "",
    method: payment.method || "",
    type: payment.type || "manual",
    createdAt: payment.createdAt || new Date().toISOString(),
    updatedAt: payment.updatedAt || payment.createdAt || new Date().toISOString()
  }));

  next.goals = next.goals.map((goal) => ({
    id: goal.id || uid(),
    name: goal.name || "Debt goal",
    type: goal.type || "debt-free-date",
    targetAmount: numberValue(goal.targetAmount),
    targetDate: goal.targetDate || "",
    relatedDebtId: goal.relatedDebtId || "",
    status: goal.status || "on-track",
    notes: goal.notes || "",
    milestones: Array.isArray(goal.milestones) ? goal.milestones : [],
    createdAt: goal.createdAt || new Date().toISOString(),
    updatedAt: goal.updatedAt || goal.createdAt || new Date().toISOString()
  }));

  next.settings.reminderDays = [...new Set((next.settings.reminderDays || [0, 1, 3, 7]).map(Number).filter((day) => Number.isFinite(day) && day >= 0))].sort((a, b) => a - b);
  next.reminderState.customDays = [...new Set((next.reminderState.customDays || []).map(Number).filter((day) => Number.isFinite(day) && day >= 0))].sort((a, b) => a - b);
  next.search.recent = Array.isArray(next.search.recent) ? next.search.recent.slice(0, 8) : [];

  return next;
}

function render() {
  const totals = getTotals();
  if (state.appLock.enabled && !isUnlocked) {
    app.innerHTML = renderLockedApp();
    return;
  }
  app.innerHTML = `
    <div class="app-shell">
      <header class="top-bar">
        <div class="title-stack">
          <p class="app-name">Debt Freedom Tracker</p>
          <h1 class="screen-title">${viewTitles[activeView]}</h1>
        </div>
        <div class="top-actions">${renderTopAction()}</div>
      </header>
      <main class="content">${renderView(totals)}</main>
      ${renderBottomNav()}
      ${modalState ? renderModal() : ""}
      ${searchOpen ? renderSearchModal() : ""}
    </div>
  `;
}

function renderTopAction() {
  const searchButton = `<button class="icon-button" data-action="open-search" aria-label="Search">${icons.search}</button>`;
  if (activeView === "debts") {
    return `${searchButton}<button class="button" data-action="open-form" data-type="debt">${icons.plus}<span>Add</span></button>`;
  }
  if (activeView === "bills") {
    return `${searchButton}<button class="button" data-action="open-form" data-type="bill">${icons.plus}<span>Add</span></button>`;
  }
  if (activeView === "subscriptions") {
    return `${searchButton}<button class="button" data-action="open-form" data-type="subscription">${icons.plus}<span>Add</span></button>`;
  }
  if (activeView === "goals") {
    return `${searchButton}<button class="button" data-action="open-goal-form">${icons.plus}<span>Add</span></button>`;
  }
  if (activeView === "settings") {
    return `${searchButton}<button class="icon-button" data-action="export-data" aria-label="Export data">${icons.export}</button>`;
  }
  return `${searchButton}<button class="icon-button" data-view="reminders" aria-label="Open reminders">${icons.bell}</button>`;
}

function renderView(totals) {
  switch (activeView) {
    case "dashboard":
      return renderDashboard(totals);
    case "debts":
      return renderDebts(totals);
    case "budget":
      return renderBudget(totals);
    case "calendar":
      return renderCalendar(totals);
    case "bills":
      return renderBills(totals);
    case "subscriptions":
      return renderSubscriptions(totals);
    case "reminders":
      return renderReminders(totals);
    case "settings":
      return renderSettings(totals);
    case "paymentHistory":
      return renderPaymentHistory(totals);
    case "simulator":
      return renderSimulator(totals);
    case "goals":
      return renderGoals(totals);
    case "charts":
      return renderCharts(totals);
    case "annualReview":
      return renderAnnualReview(totals);
    case "more":
    default:
      return renderMore(totals);
  }
}

function renderBottomNav() {
  const items = [
    ["dashboard", "Dashboard", icons.dashboard],
    ["debts", "Debts", icons.debts],
    ["budget", "Budget", icons.budget],
    ["calendar", "Calendar", icons.calendar],
    ["more", "More", icons.more]
  ];
  const moreViews = ["more", "bills", "subscriptions", "reminders", "settings", "paymentHistory", "simulator", "goals", "charts", "annualReview"];
  return `
    <nav class="bottom-nav" aria-label="Main navigation">
      ${items
        .map(([view, label, icon]) => {
          const active = view === activeView || (view === "more" && moreViews.includes(activeView));
          return `<button class="nav-item ${active ? "is-active" : ""}" data-view="${view}">${icon}<span>${label}</span></button>`;
        })
        .join("")}
    </nav>
  `;
}

function renderDashboard(totals) {
  const upcoming = getUpcomingEvents(60).slice(0, 5);
  const plans = buildPlanComparison();
  const bestPlan = plans.find((plan) => plan.key === "avalanche") || plans[0];
  const debtProgress = getDebtProgress();
  const remainingClass = totals.remainingBudget < 0 ? "danger" : "primary";
  const paidMonth = paymentTotalsForRange(startOfMonth(new Date()), lastDayOfMonth(new Date()));
  const paidYear = paymentTotalsForRange(new Date(new Date().getFullYear(), 0, 1), new Date(new Date().getFullYear(), 11, 31));
  const minimumPlan = plans.find((plan) => plan.key === "minimum");
  const activeGoals = getGoalSummaries().filter((goal) => goal.status !== "Completed").slice(0, 3);
  const smart = buildSmartReminderSummary();
  const renewalEvents = getSubscriptionEvents(new Date(), addDays(new Date(), 45)).slice(0, 3);

  return `
    <section class="screen">
      <article class="card summary-hero">
        <div class="hero-row">
          <div>
            <div class="metric-label muted">Total debt</div>
            <div class="metric-value">${money(totals.totalDebt)}</div>
          </div>
          <div class="pill ${remainingClass}">${money(totals.remainingBudget)} left</div>
        </div>
        <div class="mini-progress">
          <div class="split tiny">
            <span class="muted">Debt-free progress</span>
            <strong>${Math.round(debtProgress)}%</strong>
          </div>
          <div class="progress-track" aria-label="Debt-free progress">
            <div class="progress-fill" style="--value:${debtProgress}%"></div>
          </div>
        </div>
      </article>

      <div class="metric-grid">
        ${metricCard("Monthly minimums", money(totals.minimumPayments), "Debt payments")}
        ${metricCard("Paid this month", money(paidMonth.amount), `${money(paidMonth.principal)} principal`)}
        ${metricCard("Paid this year", money(paidYear.amount), `${money(paidYear.interest)} interest`)}
        ${metricCard("Monthly bills", money(totals.monthlyBills), "Bills due this month")}
        ${metricCard("Subscriptions", money(totals.monthlySubscriptions), `${money(totals.yearlySubscriptions)} yearly`)}
        ${metricCard("Extra available", money(totals.availableExtra), "For faster payoff")}
      </div>

      <article class="card panel">
        <div class="section-head">
          <h2>Debt-free estimate</h2>
          <span class="pill primary">${bestPlan?.name || "No plan"}</span>
        </div>
        ${
          bestPlan && bestPlan.result.payoffDate
            ? `<div class="split">
                <div>
                  <div class="metric-value">${bestPlan.result.payoffDate}</div>
                  <div class="metric-note">${bestPlan.result.months} months, ${money(bestPlan.result.totalInterest)} interest, ${money(bestPlan.result.interestSaved || 0)} saved vs minimum</div>
                </div>
                <button class="ghost-button" data-view="simulator">Simulate</button>
              </div>`
            : `<div class="empty">Add active debts to calculate a payoff timeline.</div>`
        }
      </article>

      <article class="card panel">
        <div class="section-head">
          <h2>Quick actions</h2>
        </div>
        <div class="chip-row">
          <button class="ghost-button" data-action="open-form" data-type="debt">${icons.plus}<span>Add debt</span></button>
          <button class="ghost-button" data-action="open-payment-form">${icons.check}<span>Record payment</span></button>
          <button class="ghost-button" data-action="open-form" data-type="bill">${icons.bill}<span>Add bill</span></button>
          <button class="ghost-button" data-action="open-form" data-type="subscription">${icons.subscription}<span>Add subscription</span></button>
          <button class="ghost-button" data-view="simulator">${icons.chart}<span>Simulator</span></button>
          <button class="ghost-button" data-action="open-goal-form">${icons.target}<span>Create goal</span></button>
          <button class="ghost-button" data-action="export-data">${icons.export}<span>Backup</span></button>
        </div>
      </article>

      <article class="card panel">
        <div class="section-head">
          <h2>Next 5 payments</h2>
          <button class="ghost-button" data-view="calendar">Calendar</button>
        </div>
        ${renderEventList(upcoming, { emptyText: "No upcoming payments yet." })}
      </article>

      <article class="card panel">
        <div class="section-head">
          <h2>Smart reminders</h2>
          <button class="ghost-button" data-view="reminders">Open</button>
        </div>
        ${smart.length ? `<div class="row-list">${smart.map((item) => `<div class="info-box">${esc(item)}</div>`).join("")}</div>` : `<div class="empty">No urgent reminders right now.</div>`}
      </article>

      <article class="card panel">
        <div class="section-head">
          <h2>Recent payments</h2>
          <button class="ghost-button" data-view="paymentHistory">History</button>
        </div>
        ${renderPaymentRows(getFilteredPayments().slice(0, 4), "No recorded payments yet.")}
      </article>

      <article class="card panel">
        <div class="section-head">
          <h2>Active goals</h2>
          <button class="ghost-button" data-view="goals">Goals</button>
        </div>
        ${activeGoals.length ? `<div class="row-list">${activeGoals.map(renderGoalSummaryRow).join("")}</div>` : `<div class="empty">Create a goal to see progress here.</div>`}
      </article>

      <article class="card panel">
        <div class="section-head">
          <h2>Renewals</h2>
          <span class="pill primary">${money(totals.yearlySubscriptions)}/yr</span>
        </div>
        ${renderEventList(renewalEvents, { emptyText: "No upcoming subscription renewals." })}
      </article>

      <article class="card panel">
        <div class="section-head">
          <h2>Milestones</h2>
        </div>
        ${renderMilestones(totals, plans)}
      </article>
    </section>
  `;
}

function renderDebts(totals) {
  const debts = [...state.debts].sort((a, b) => a.priority - b.priority);
  const plans = buildPlanComparison();
  const activeDebts = state.debts.filter((debt) => debt.status === "active");

  return `
    <section class="screen">
      <div class="metric-grid">
        ${metricCard("Total debt", money(totals.totalDebt), `${activeDebts.length} active`)}
        ${metricCard("Minimum payments", money(totals.minimumPayments), "Monthly")}
        ${metricCard("Extra payment", money(totals.availableExtra), "From budget")}
        ${metricCard("Interest estimate", plans[0]?.result.totalInterest === Infinity ? "Needs review" : money(plans[0]?.result.totalInterest || 0), "Minimum plan")}
      </div>

      <article class="card panel">
        <div class="section-head">
          <h2>Payoff comparison</h2>
          <span class="pill primary">${money(totals.availableExtra)} extra</span>
        </div>
        ${renderPlanComparison(plans)}
      </article>

      <article class="card panel">
        <div class="section-head">
          <h2>Payoff timeline</h2>
        </div>
        ${renderTimeline()}
      </article>

      <article class="card panel">
        <div class="section-head">
          <h2>Debt accounts</h2>
          <button class="ghost-button" data-action="open-form" data-type="debt">${icons.plus}<span>Add</span></button>
        </div>
        ${
          debts.length
            ? `<div class="row-list">${debts.map(renderDebtRow).join("")}</div>`
            : `<div class="empty">Add your first debt to start tracking payoff options.</div>`
        }
      </article>
    </section>
  `;
}

function renderBudget(totals) {
  const budget = state.budget;
  const plannedDebt = totals.minimumPayments + numberValue(budget.extraPayment);
  const totalPlanned = totals.monthlyBills + totals.monthlySubscriptions + plannedDebt + numberValue(budget.spendingLimit) + numberValue(budget.emergencySavings);
  const remaining = numberValue(budget.monthlyIncome) - totalPlanned;
  const suggestedExtra = Math.max(
    0,
    numberValue(budget.monthlyIncome) -
      totals.monthlyBills -
      totals.monthlySubscriptions -
      totals.minimumPayments -
      numberValue(budget.spendingLimit) -
      numberValue(budget.emergencySavings)
  );
  const whatIf = simulatePayoffPlan(getPayoffDebts(), whatIfExtra, "avalanche");

  return `
    <section class="screen">
      <div class="metric-grid">
        ${metricCard("Income", money(budget.monthlyIncome), "Monthly")}
        ${metricCard("Planned outflow", money(totalPlanned), "Bills, debt, spending")}
        ${metricCard("Remaining", money(remaining), remaining < 0 ? "Over budget" : "After plan")}
        ${metricCard("Suggested extra", money(suggestedExtra), "Available estimate")}
      </div>

      ${remaining < 0 ? `<div class="warning-box">Planned payments are higher than the monthly budget by ${money(Math.abs(remaining))}.</div>` : `<div class="success-box">This plan leaves ${money(remaining)} after planned spending, savings, bills, subscriptions, and debt payments.</div>`}

      <form class="card panel form-grid" data-form="budget">
        <div class="section-head">
          <h2>Monthly budget</h2>
          <button class="button" type="submit">${icons.check}<span>Save</span></button>
        </div>
        ${budgetFields.map(([name, label]) => renderInlineNumberField(name, label, budget[name])).join("")}
        <label class="field">
          <span class="form-label">Notes</span>
          <textarea name="notes">${esc(budget.notes || "")}</textarea>
        </label>
      </form>

      <article class="card panel">
        <div class="section-head">
          <h2>What if I pay extra?</h2>
          <span class="pill primary">${money(whatIfExtra)}</span>
        </div>
        <label class="field">
          <span class="form-label">Custom extra payment</span>
          <input type="number" min="0" step="5" value="${whatIfExtra}" data-action="what-if" />
        </label>
        <div class="info-box">
          ${
            whatIf.payoffDate
              ? `${money(whatIfExtra)} extra could estimate payoff around ${whatIf.payoffDate}, with about ${money(whatIf.totalInterest)} interest.`
              : "Add active debts to estimate a custom payoff date."
          }
        </div>
      </article>
    </section>
  `;
}

function renderCalendar(totals) {
  const monthEvents = getEventsForMonth(calendarCursor, calendarFilters);
  const monthTotal = monthEvents.reduce((sum, event) => sum + event.amount, 0);
  const weekTotal = getEventsInRange(new Date(), addDays(new Date(), 7), calendarFilters).reduce((sum, event) => sum + event.amount, 0);

  return `
    <section class="screen">
      <div class="metric-grid">
        ${metricCard("Due this week", money(weekTotal), "Next 7 days")}
        ${metricCard("Due this month", money(monthTotal), formatMonth(calendarCursor))}
      </div>

      <article class="card panel">
        <div class="calendar-head">
          <button class="icon-button" data-action="calendar-prev" aria-label="Previous month">${icons.chevronLeft}</button>
          <h2 class="calendar-title">${formatMonth(calendarCursor)}</h2>
          <button class="icon-button" data-action="calendar-next" aria-label="Next month">${icons.chevronRight}</button>
        </div>
        <div class="filter-row" aria-label="Calendar filters">
          ${renderFilter("debt", "Debts")}
          ${renderFilter("bill", "Bills")}
          ${renderFilter("subscription", "Subscriptions")}
        </div>
        ${renderMonthGrid(monthEvents)}
      </article>

      <article class="card panel">
        <div class="section-head">
          <h2>Payments this month</h2>
        </div>
        ${renderEventList(monthEvents.sort((a, b) => a.date - b.date), { emptyText: "No payments match these filters." })}
      </article>
    </section>
  `;
}

function renderBills(totals) {
  const now = new Date();
  const upcoming = getBillEvents(addDays(now, -45), addDays(now, 45));
  const overdue = upcoming.filter((event) => event.date < startOfDay(now) && !isEventPaid(event));
  const nextBills = upcoming.filter((event) => event.date >= startOfDay(now)).sort((a, b) => a.date - b.date).slice(0, 6);

  return `
    <section class="screen">
      <div class="metric-grid">
        ${metricCard("Monthly bill total", money(totals.monthlyBills), "Current month")}
        ${metricCard("Overdue bills", overdue.length, overdue.length ? money(overdue.reduce((sum, event) => sum + event.amount, 0)) : "All clear")}
      </div>

      <article class="card panel">
        <div class="section-head">
          <h2>Upcoming bills</h2>
          <button class="ghost-button" data-action="open-form" data-type="bill">${icons.plus}<span>Add</span></button>
        </div>
        ${renderEventList(nextBills, { emptyText: "No upcoming bills yet." })}
      </article>

      <article class="card panel">
        <div class="section-head">
          <h2>Overdue</h2>
        </div>
        ${renderEventList(overdue, { emptyText: "No overdue bills." })}
      </article>

      <article class="card panel">
        <div class="section-head">
          <h2>Bill list</h2>
        </div>
        ${
          state.bills.length
            ? `<div class="row-list">${state.bills.map(renderBillRow).join("")}</div>`
            : `<div class="empty">Add bills to see due dates, totals, and paid status.</div>`
        }
      </article>
    </section>
  `;
}

function renderSubscriptions(totals) {
  const activeSubs = state.subscriptions.filter((sub) => sub.status === "active");
  const easyCancel = activeSubs.filter((sub) => sub.cancellationLink || monthlySubscriptionCost(sub) >= 15);

  return `
    <section class="screen">
      <div class="metric-grid">
        ${metricCard("Monthly total", money(totals.monthlySubscriptions), `${activeSubs.length} active`)}
        ${metricCard("Yearly total", money(totals.yearlySubscriptions), "Annual impact")}
        ${metricCard("Easy cancel", easyCancel.length, `${money(easyCancel.reduce((sum, sub) => sum + monthlySubscriptionCost(sub), 0))}/mo`)}
        ${metricCard("Paused/canceled", state.subscriptions.length - activeSubs.length, "Not billed")}
      </div>

      <article class="card panel">
        <div class="section-head">
          <h2>Next renewals</h2>
          <button class="ghost-button" data-action="open-form" data-type="subscription">${icons.plus}<span>Add</span></button>
        </div>
        ${renderEventList(getSubscriptionEvents(new Date(), addDays(new Date(), 60)).slice(0, 6), { emptyText: "No active renewals yet." })}
      </article>

      <article class="card panel">
        <div class="section-head">
          <h2>Subscriptions</h2>
        </div>
        ${
          state.subscriptions.length
            ? `<div class="row-list">${state.subscriptions.map(renderSubscriptionRow).join("")}</div>`
            : `<div class="empty">Add subscriptions to track renewals and cancellation savings.</div>`
        }
      </article>
    </section>
  `;
}

function renderReminders() {
  const reminders = buildReminderItems();
  return `
    <section class="screen">
      <article class="card panel">
        <div class="section-head">
          <h2>Upcoming reminders</h2>
          <span class="pill primary">${state.settings.reminderDays.join(", ")} days</span>
        </div>
        ${
          reminders.length
            ? `<div class="row-list">${reminders.map(renderReminderRow).join("")}</div>`
            : `<div class="empty">No reminders in the next 45 days.</div>`
        }
      </article>

      <article class="card panel">
        <div class="section-head">
          <h2>Reminder settings</h2>
        </div>
        <div class="filter-row">
          ${[1, 3, 7].map((day) => renderReminderDay(day)).join("")}
        </div>
        <div class="split" style="margin-top: 12px;">
          <div>
            <div class="item-title">Browser alerts</div>
            <div class="metric-note">${notificationStatusText()}</div>
          </div>
          <button class="ghost-button" data-action="enable-alerts">${icons.bell}<span>Enable</span></button>
        </div>
      </article>
    </section>
  `;
}

function renderMore(totals) {
  return `
    <section class="screen">
      <div class="metric-grid">
        ${metricCard("Remaining budget", money(totals.remainingBudget), "This month")}
        ${metricCard("Upcoming", getUpcomingEvents(30).length, "Next 30 days")}
      </div>
      <div class="menu-grid">
        ${menuCard("paymentHistory", icons.history, "Payment History", "Recorded principal, interest, and balances")}
        ${menuCard("simulator", icons.chart, "Payoff Simulator", "Adjust payoff method and monthly money")}
        ${menuCard("goals", icons.target, "Goals", "Debt-free, monthly, payoff, and savings goals")}
        ${menuCard("charts", icons.chart, "Charts", "Projected balances and category breakdowns")}
        ${menuCard("annualReview", icons.history, "Annual Review", "Yearly totals, highlights, and export")}
        ${menuCard("bills", icons.bill, "Bills", "Amounts, paid status, recurring dates")}
        ${menuCard("subscriptions", icons.subscription, "Subscriptions", "Renewals, paused, canceled, savings")}
        ${menuCard("reminders", icons.bell, "Reminders", "Debt, bill, payment, renewal alerts")}
        ${menuCard("settings", icons.settings, "Settings / Backup", "Export, import, clear local data")}
      </div>
    </section>
  `;
}

function renderSettings() {
  return `
    <section class="screen">
      <article class="card panel">
        <div class="section-head">
          <h2>Privacy & App Lock</h2>
          <span class="pill ${state.appLock.enabled ? "primary" : ""}">${state.appLock.enabled ? "On" : "Off"}</span>
        </div>
        <div class="stack">
          <div class="info-box">App Lock hides financial information until the correct PIN is entered. The PIN is hashed with Web Crypto and the plain PIN is never stored.</div>
          ${renderAppLockControls()}
        </div>
      </article>

      <article class="card panel">
        <div class="section-head">
          <h2>Backup</h2>
        </div>
        <div class="stack">
          <button class="button wide" data-action="export-data">${icons.export}<span>Export JSON backup</span></button>
          <label class="ghost-button wide" for="import-file">${icons.import}<span>Import JSON backup</span></label>
          <input class="hidden" id="import-file" type="file" accept="application/json,.json" data-action="import-data" />
          <button class="danger-button wide" data-action="clear-data">${icons.trash}<span>Clear all data</span></button>
        </div>
      </article>

      <article class="card panel">
        <div class="section-head">
          <h2>Starter data</h2>
        </div>
        <button class="ghost-button wide" data-action="load-sample">${icons.plus}<span>Load sample tracker</span></button>
      </article>

      <article class="card panel">
        <div class="section-head">
          <h2>Reminder settings</h2>
        </div>
        <div class="filter-row">
          ${[0, 1, 3, 7, 14].map((day) => renderReminderDay(day)).join("")}
        </div>
        <label class="field" style="margin-top: 12px;">
          <span class="form-label">Custom days before</span>
          <input type="number" min="0" step="1" placeholder="Example: 10" data-action="add-custom-reminder-day" />
        </label>
        <div class="split" style="margin-top: 12px;">
          <div>
            <div class="item-title">Browser alerts</div>
            <div class="metric-note">${notificationStatusText()}</div>
          </div>
          <button class="ghost-button" data-action="enable-alerts">${icons.bell}<span>Enable</span></button>
        </div>
      </article>

      <article class="card panel">
        <div class="section-head">
          <h2>Local storage</h2>
        </div>
        <div class="item-meta">
          <span class="pill primary">IndexedDB</span>
          <span class="pill">Schema v${BACKUP_SCHEMA_VERSION}</span>
          <span class="pill">${state.debts.length} debts</span>
          <span class="pill">${state.bills.length} bills</span>
          <span class="pill">${state.subscriptions.length} subscriptions</span>
          <span class="pill">${state.paymentHistory.length} payments</span>
          <span class="pill">${state.goals.length} goals</span>
        </div>
      </article>
    </section>
  `;
}

function renderPaymentHistory() {
  const payments = getFilteredPayments();
  const totals = payments.reduce(
    (sum, payment) => ({
      amount: sum.amount + numberValue(payment.amount),
      principal: sum.principal + numberValue(payment.principal),
      interest: sum.interest + numberValue(payment.interest)
    }),
    { amount: 0, principal: 0, interest: 0 }
  );

  return `
    <section class="screen">
      <div class="metric-grid">
        ${metricCard("Total paid", money(totals.amount), "Selected period")}
        ${metricCard("Principal paid", money(totals.principal), "Selected period")}
        ${metricCard("Interest paid", money(totals.interest), "Selected period")}
        ${metricCard("Records", payments.length, "Payment history")}
      </div>
      <article class="card panel">
        <div class="section-head">
          <h2>Filters</h2>
          <button class="button" data-action="open-payment-form">${icons.plus}<span>Record</span></button>
        </div>
        <div class="form-grid">
          <label class="field"><span class="form-label">Search payments</span><input value="${esc(historyFilters.query)}" data-action="history-query" placeholder="Creditor, note, method" /></label>
          <label class="field"><span class="form-label">Creditor</span><select data-action="history-debt"><option value="all">All creditors</option>${state.debts.map((debt) => `<option value="${debt.id}" ${historyFilters.debtId === debt.id ? "selected" : ""}>${esc(debt.creditor)}</option>`).join("")}</select></label>
          <label class="field"><span class="form-label">Payment type</span><select data-action="history-type"><option value="all">All types</option>${["manual", "scheduled", "imported"].map((type) => `<option value="${type}" ${historyFilters.type === type ? "selected" : ""}>${labelize(type)}</option>`).join("")}</select></label>
          <div class="metric-grid">
            <label class="field"><span class="form-label">Start</span><input type="date" value="${esc(historyFilters.start)}" data-action="history-start" /></label>
            <label class="field"><span class="form-label">End</span><input type="date" value="${esc(historyFilters.end)}" data-action="history-end" /></label>
          </div>
        </div>
      </article>
      <article class="card panel">
        <div class="section-head"><h2>Payments</h2></div>
        ${renderPaymentRows(payments, "No payment records match these filters.")}
      </article>
    </section>
  `;
}

function renderSimulator() {
  const debts = getPayoffDebts();
  const minimumTotal = debts.reduce((sum, debt) => sum + Math.max(0, debt.minPayment), 0);
  const totalMonthly = Math.max(0, numberValue(simulatorState.totalMonthly || minimumTotal));
  const extra = Math.max(0, numberValue(simulatorState.extra));
  const effectiveTotal = totalMonthly + extra;
  const result = simulateDetailedPlan(debts, effectiveTotal, simulatorState.method);
  const baseline = simulateDetailedPlan(debts, minimumTotal, "minimum");

  return `
    <section class="screen">
      <article class="card panel">
        <div class="section-head">
          <h2>Monthly payoff simulator</h2>
          <button class="ghost-button" data-action="reset-simulator">Reset</button>
        </div>
        <div class="form-grid">
          <label class="field"><span class="form-label">Payoff method</span><select data-action="sim-method">${renderMethodOptions(simulatorState.method)}</select></label>
          <label class="field"><span class="form-label">Total monthly amount available for debt</span><input type="number" min="0" step="5" value="${totalMonthly}" data-action="sim-total" /></label>
          <label class="field"><span class="form-label">Custom extra payment</span><input type="number" min="0" step="5" value="${extra}" data-action="sim-extra" /></label>
          <label class="field"><span class="form-label">Extra payment slider</span><input type="range" min="0" max="2000" step="25" value="${extra}" data-action="sim-extra-slider" /></label>
          <div class="chip-row">${[25, 50, 100, 250, 500].map((amount) => `<button class="ghost-button" data-action="sim-add" data-amount="${amount}">+${money(amount)}</button>`).join("")}</div>
        </div>
      </article>
      ${result.warning ? `<div class="warning-box">${esc(result.warning)}</div>` : ""}
      <div class="metric-grid">
        ${metricCard("Debt-free date", result.payoffDate || "No valid date", "Estimate")}
        ${metricCard("Months", Number.isFinite(result.months) ? result.months : "No payoff", "Until debt free")}
        ${metricCard("Interest", money(result.totalInterest), "Estimated")}
        ${metricCard("Interest saved", money(Math.max(0, baseline.totalInterest - result.totalInterest)), "Vs minimum")}
        ${metricCard("Months saved", Number.isFinite(baseline.months) && Number.isFinite(result.months) ? Math.max(0, baseline.months - result.months) : "N/A", "Vs minimum")}
        ${metricCard("Monthly debt pay", money(effectiveTotal), "Simulator only")}
      </div>
      <article class="card panel">
        <div class="section-head">
          <h2>First payoff</h2>
          <button class="button" data-action="apply-sim-plan">${icons.check}<span>Apply This Plan</span></button>
        </div>
        <div class="info-box">${result.firstPaid ? `${esc(result.firstPaid.creditor)} is projected first, around ${esc(result.firstPaid.monthLabel)}.` : "Add active debts to see the first expected payoff."}</div>
      </article>
      <article class="card panel">
        <div class="section-head"><h2>Month-by-month schedule</h2></div>
        ${renderScheduleRows(result.schedule)}
      </article>
    </section>
  `;
}

function renderGoals() {
  const summaries = getGoalSummaries();
  return `
    <section class="screen">
      <article class="card panel">
        <div class="section-head">
          <h2>Goals</h2>
          <button class="button" data-action="open-goal-form">${icons.plus}<span>Add</span></button>
        </div>
        ${summaries.length ? `<div class="row-list">${summaries.map(renderGoalSummaryRow).join("")}</div>` : `<div class="empty">Create your first debt or savings goal.</div>`}
      </article>
    </section>
  `;
}

function renderCharts() {
  const data = getChartData(chartMode);
  return `
    <section class="screen">
      <article class="card panel">
        <div class="section-head">
          <h2>Charts</h2>
          <select class="compact-select" data-action="chart-mode">
            ${[
              ["actual", "Actual history"],
              ["projected-snowball", "Projected snowball"],
              ["projected-avalanche", "Projected avalanche"],
              ["projected-custom", "Custom plan"]
            ].map(([value, label]) => `<option value="${value}" ${chartMode === value ? "selected" : ""}>${label}</option>`).join("")}
          </select>
        </div>
        <div class="info-box">${chartMode === "actual" ? "Actual charts use recorded payment history only. No fake historical data is created." : "Projection charts are estimates based on current balances, APRs, and monthly compounding."}</div>
      </article>
      <article class="card panel"><div class="section-head"><h2>Total debt balance over time</h2></div>${renderLineChart(data.balance, "Debt balance by month")}</article>
      <article class="card panel"><div class="section-head"><h2>Principal versus interest</h2></div>${renderStackedBars(data.principalInterest, "Principal and interest")}</article>
      <article class="card panel"><div class="section-head"><h2>Debt distribution</h2></div>${renderCategoryBars(state.debts.filter((debt) => debt.status !== "paid").map((debt) => ({ label: debt.creditor || "Debt", value: numberValue(debt.balance) })), "Debt distribution by creditor")}</article>
      <article class="card panel"><div class="section-head"><h2>Monthly bills by category</h2></div>${renderCategoryBars(categoryTotals(state.bills, "category", "amount"), "Monthly bills by category")}</article>
      <article class="card panel"><div class="section-head"><h2>Subscriptions by category</h2></div>${renderCategoryBars(categoryTotals(state.subscriptions.filter((sub) => sub.status === "active"), "category", "monthlyCost"), "Monthly subscriptions by category")}</article>
      <article class="card panel"><div class="section-head"><h2>Subscription cost per year</h2></div>${renderCategoryBars(state.subscriptions.map((sub) => ({ label: sub.name || "Subscription", value: monthlySubscriptionCost(sub) * 12 })), "Subscription cost per year")}</article>
    </section>
  `;
}

function renderAnnualReview() {
  const review = buildAnnualReviewData(annualYear);
  return `
    <section class="screen">
      <article class="card panel">
        <div class="section-head">
          <h2>Annual Review</h2>
          <select class="compact-select" data-action="annual-year">${availableYears().map((year) => `<option value="${year}" ${annualYear === year ? "selected" : ""}>${year}</option>`).join("")}</select>
        </div>
        <div class="chip-row">
          <button class="ghost-button" data-action="print-annual">Print report</button>
          <button class="ghost-button" data-action="export-annual-csv">Export CSV</button>
        </div>
      </article>
      ${review.hasHistory ? "" : `<div class="warning-box">Not enough recorded history is available for some annual review figures. Missing values are labeled as estimates or unavailable.</div>`}
      <div class="metric-grid">
        ${metricCard("Beginning debt", review.beginningDebtLabel, review.beginningDebtEstimate ? "Estimate" : "Actual")}
        ${metricCard("Ending debt", review.endingDebtLabel, "Current or ending")}
        ${metricCard("Debt reduction", money(review.debtReduction), `${review.percentReduced}% reduced`)}
        ${metricCard("Payments made", money(review.paymentTotals.amount), "Recorded")}
        ${metricCard("Principal paid", money(review.paymentTotals.principal), "Recorded")}
        ${metricCard("Interest paid", money(review.paymentTotals.interest), "Recorded")}
        ${metricCard("Bills paid", money(review.totalBillsPaid), "Marked paid")}
        ${metricCard("Subscriptions paid", money(review.totalSubscriptionsPaid), "Marked paid")}
        ${metricCard("Canceled savings", money(review.canceledSavings), "Annual estimate")}
        ${metricCard("Largest payment", money(review.largestPayment?.amount || 0), review.largestPayment?.creditorSnapshot || "No history")}
      </div>
      <article class="card panel"><div class="section-head"><h2>Monthly breakdown</h2></div>${renderCategoryBars(review.monthlyBreakdown.map((item) => ({ label: item.label, value: item.amount })), "Monthly debt payments")}</article>
      <article class="card panel"><div class="section-head"><h2>Highlights</h2></div><div class="row-list">${review.highlights.map((item) => `<div class="success-box">${esc(item)}</div>`).join("") || `<div class="empty">Not enough recorded history.</div>`}</div></article>
      <article class="card panel"><div class="section-head"><h2>Areas to review</h2></div><div class="row-list">${review.reviewAreas.map((item) => `<div class="warning-box">${esc(item)}</div>`).join("")}</div></article>
    </section>
  `;
}

function renderLockedApp() {
  return `
    <div class="app-shell locked-shell">
      <main class="content lock-content">
        <section class="card panel lock-card">
          <div class="brand-mark" aria-hidden="true">DF</div>
          <h1>Debt Freedom Tracker</h1>
          <p class="muted">Enter your PIN to unlock private financial information on this device.</p>
          ${Date.now() < state.appLock.lockedUntil ? `<div class="warning-box">Too many incorrect attempts. Try again in ${Math.ceil((state.appLock.lockedUntil - Date.now()) / 1000)} seconds.</div>` : ""}
          <form class="form-grid" data-form="unlock">
            <label class="field">
              <span class="form-label">PIN</span>
              <input inputmode="numeric" autocomplete="current-password" maxlength="6" name="pin" type="password" required />
            </label>
            <button class="button wide" type="submit">${icons.lock}<span>Unlock</span></button>
            ${state.appLock.biometricEnabled ? `<button class="ghost-button wide" type="button" data-action="biometric-unlock">Use device verification</button>` : ""}
            <button class="ghost-button wide" type="button" data-action="forgot-pin">Forgot PIN?</button>
          </form>
        </section>
      </main>
    </div>
  `;
}

function renderAppLockControls() {
  const enabled = state.appLock.enabled;
  return `
    <form class="form-grid" data-form="app-lock">
      <label class="filter-chip">
        <input type="checkbox" name="enabled" ${enabled ? "checked" : ""} />
        <span>Turn app lock ${enabled ? "off" : "on"}</span>
      </label>
      ${enabled ? `<label class="field">
        <span class="form-label">Current PIN</span>
        <input name="currentPin" inputmode="numeric" maxlength="6" type="password" placeholder="Required to turn off or change" />
      </label>` : ""}
      <label class="field">
        <span class="form-label">${enabled ? "New PIN, optional" : "New PIN"}</span>
        <input name="pin" inputmode="numeric" maxlength="6" type="password" placeholder="4 or 6 digits" ${enabled ? "" : "required"} />
      </label>
      <label class="field">
        <span class="form-label">Confirm PIN</span>
        <input name="confirmPin" inputmode="numeric" maxlength="6" type="password" placeholder="Repeat PIN" />
      </label>
      <label class="field">
        <span class="form-label">Auto-lock</span>
        <select name="autoLock">
          ${[
            ["hidden", "Immediately when app is closed or hidden"],
            ["1", "After 1 minute"],
            ["5", "After 5 minutes"],
            ["15", "After 15 minutes"],
            ["never", "Never automatically"]
          ].map(([value, label]) => `<option value="${value}" ${state.appLock.autoLock === value ? "selected" : ""}>${label}</option>`).join("")}
        </select>
      </label>
      <div class="chip-row">
        <button class="button" type="submit">${icons.check}<span>Save lock</span></button>
        ${enabled ? `<button class="ghost-button" type="button" data-action="lock-now">${icons.lock}<span>Lock App Now</span></button>` : ""}
        ${enabled ? `<button class="ghost-button" type="button" data-action="change-pin">Change PIN</button>` : ""}
        <button class="ghost-button" type="button" data-action="forgot-pin">Forgot PIN?</button>
      </div>
    </form>
    <div class="${biometricAvailable ? "info-box" : "warning-box"}">
      ${biometricAvailable ? "Optional Face ID or Touch ID-style device verification appears supported through WebAuthn on this browser. PIN remains the fallback." : "Biometric unlock is unavailable or unsupported in this browser. This app will not claim Face ID or Touch ID support here."}
    </div>
    ${biometricAvailable && enabled ? `<button class="ghost-button wide" data-action="enable-biometric">Enable optional device verification</button>` : ""}
  `;
}

function renderPaymentRows(payments, emptyText) {
  if (!payments.length) return `<div class="empty">${esc(emptyText)}</div>`;
  return `<div class="row-list">${payments.map((payment) => `
    <div class="item-row">
      <div class="item-main">
        <h3 class="item-title">${esc(payment.creditorSnapshot)}</h3>
        <div class="item-meta">
          <span>${formatShortDate(parseInputDate(payment.date))}</span>
          <span>${money(payment.amount)}</span>
          <span>${money(payment.principal)} principal</span>
          <span>${money(payment.interest)} interest</span>
          <span>${esc(labelize(payment.type))}</span>
        </div>
      </div>
      <div class="item-actions">
        <button class="icon-button" data-action="open-payment-form" data-payment-id="${payment.id}" aria-label="Edit payment">${icons.edit}</button>
        <button class="icon-button" data-action="delete-payment" data-id="${payment.id}" aria-label="Delete payment">${icons.trash}</button>
      </div>
    </div>
  `).join("")}</div>`;
}

function renderGoalSummaryRow(goal) {
  return `
    <div class="item-row">
      <div class="item-main">
        <h3 class="item-title">${esc(goal.name)}</h3>
        <div class="item-meta">
          <span>${esc(labelize(goal.type))}</span>
          <span>${goal.targetDate ? `Target ${formatShortDate(parseInputDate(goal.targetDate))}` : money(goal.targetAmount)}</span>
          <span class="pill ${goal.statusClass}">${esc(goal.status)}</span>
          <span>${goal.percent}% complete</span>
        </div>
        <div class="mini-progress"><div class="progress-track"><div class="progress-fill" style="--value:${goal.percent}%"></div></div></div>
        ${goal.completed ? `<div class="success-box" style="margin-top: 8px;">${esc(goal.celebration)}</div>` : ""}
      </div>
      <button class="icon-button" data-action="open-goal-form" data-id="${goal.id}" aria-label="Edit goal">${icons.edit}</button>
    </div>
  `;
}

function renderScheduleRows(schedule = []) {
  if (!schedule.length) return `<div class="empty">No valid payoff schedule under the current inputs.</div>`;
  return `<div class="row-list">${schedule.slice(0, 36).map((row) => `
    <div class="item-row">
      <div class="item-main">
        <h3 class="item-title">${esc(row.label)}</h3>
        <div class="item-meta">
          <span>Balance ${money(row.totalBalance)}</span>
          <span>Principal ${money(row.principal)}</span>
          <span>Interest ${money(row.interest)}</span>
          ${row.paidOff.length ? `<span class="pill paid">${esc(row.paidOff.join(", "))} paid off</span>` : ""}
        </div>
      </div>
    </div>
  `).join("")}${schedule.length > 36 ? `<div class="info-box">Showing first 36 months of ${schedule.length}.</div>` : ""}</div>`;
}

function renderLineChart(points, label) {
  if (!points.length) return `<div class="empty">Not enough recorded history. Projection charts are labeled estimates.</div>`;
  const width = 320;
  const height = 150;
  const max = Math.max(...points.map((point) => point.value), 1);
  const min = Math.min(...points.map((point) => point.value), 0);
  const range = Math.max(1, max - min);
  const d = points.map((point, index) => {
    const x = points.length === 1 ? 0 : (index / (points.length - 1)) * width;
    const y = height - ((point.value - min) / range) * (height - 20) - 10;
    return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");
  return `
    <div class="chart-wrap" role="img" aria-label="${esc(label)}">
      <svg viewBox="0 0 ${width} ${height}" class="chart-svg">
        <path d="${d}" fill="none" stroke="var(--primary)" stroke-width="4" stroke-linecap="round" />
      </svg>
      <div class="item-meta"><span>${esc(points[0].label)} ${money(points[0].value)}</span><span>${esc(points.at(-1).label)} ${money(points.at(-1).value)}</span></div>
    </div>
  `;
}

function renderStackedBars(rows, label) {
  if (!rows.length) return `<div class="empty">No principal or interest data yet.</div>`;
  const max = Math.max(...rows.map((row) => row.principal + row.interest), 1);
  return `<div class="chart-list" role="img" aria-label="${esc(label)}">${rows.slice(0, 12).map((row) => {
    const principalWidth = (row.principal / max) * 100;
    const interestWidth = (row.interest / max) * 100;
    return `<div class="chart-bar-row"><span>${esc(row.label)}</span><div class="chart-bar"><i style="width:${principalWidth}%"></i><b style="width:${interestWidth}%"></b></div><small>${money(row.principal + row.interest)}</small></div>`;
  }).join("")}<div class="item-meta"><span class="pill primary">Principal</span><span class="pill warning">Interest</span></div></div>`;
}

function renderCategoryBars(rows, label) {
  const filtered = rows.filter((row) => numberValue(row.value) > 0);
  if (!filtered.length) return `<div class="empty">No data available for this chart.</div>`;
  const max = Math.max(...filtered.map((row) => row.value), 1);
  return `<div class="chart-list" role="img" aria-label="${esc(label)}">${filtered.slice(0, 10).map((row) => `<div class="chart-bar-row"><span>${esc(row.label)}</span><div class="chart-bar"><i style="width:${(row.value / max) * 100}%"></i></div><small>${money(row.value)}</small></div>`).join("")}</div>`;
}

function metricCard(label, value, note = "") {
  return `
    <article class="card metric">
      <div class="metric-label">${esc(label)}</div>
      <div class="metric-value">${esc(String(value))}</div>
      ${note ? `<div class="metric-note">${esc(String(note))}</div>` : ""}
    </article>
  `;
}

function menuCard(view, icon, title, note) {
  return `
    <button class="menu-card" data-view="${view}">
      ${icon}
      <span>${esc(title)}</span>
      <small class="muted">${esc(note)}</small>
    </button>
  `;
}

function renderDebtRow(debt) {
  const progress = getSingleDebtProgress(debt);
  return `
    <div class="item-row">
      <div class="item-main">
        <h3 class="item-title">${esc(debt.creditor || "Unnamed debt")}</h3>
        <div class="item-meta">
          <span>${esc(debt.type)}</span>
          <span>${money(debt.balance)}</span>
          <span>${formatPercent(debt.apr)} APR</span>
          <span>${money(debt.minPayment)} min</span>
          <span>Due ${formatShortDate(nextMonthlyDate(debt.dueDate))}</span>
          <span class="pill ${statusClass(debt.status)}">${statusLabel(debt.status)}</span>
        </div>
        <div class="mini-progress">
          <div class="progress-track"><div class="progress-fill" style="--value:${progress}%"></div></div>
        </div>
      </div>
      <div class="item-actions">
        ${debt.status !== "paid" ? `<button class="icon-button" data-action="mark-debt-paid" data-id="${debt.id}" aria-label="Mark ${esc(debt.creditor)} paid off">${icons.check}</button>` : ""}
        ${debt.status === "active" ? `<button class="icon-button" data-action="open-payment-form" data-id="${debt.id}" aria-label="Record payment for ${esc(debt.creditor)}">${icons.history}</button>` : ""}
        <button class="icon-button" data-action="open-form" data-type="debt" data-id="${debt.id}" aria-label="Edit ${esc(debt.creditor)}">${icons.edit}</button>
      </div>
    </div>
  `;
}

function renderBillRow(bill) {
  const next = getNextOccurrence(bill.dueDate, bill.frequency);
  return `
    <div class="item-row">
      <div class="item-main">
        <h3 class="item-title">${esc(bill.name || "Unnamed bill")}</h3>
        <div class="item-meta">
          <span>${esc(bill.category)}</span>
          <span>${money(bill.amount)}</span>
          <span>${esc(labelize(bill.frequency))}</span>
          <span>Due ${formatShortDate(next)}</span>
          <span class="pill ${bill.status === "paid" ? "paid" : bill.status === "autopay" ? "primary" : "warning"}">${esc(labelize(bill.status))}</span>
        </div>
      </div>
      <div class="item-actions">
        <button class="icon-button" data-action="open-form" data-type="bill" data-id="${bill.id}" aria-label="Edit ${esc(bill.name)}">${icons.edit}</button>
        <button class="icon-button" data-action="delete-item" data-type="bill" data-id="${bill.id}" aria-label="Delete ${esc(bill.name)}">${icons.trash}</button>
      </div>
    </div>
  `;
}

function renderSubscriptionRow(sub) {
  const monthly = monthlySubscriptionCost(sub);
  const easy = sub.status === "active" && (sub.cancellationLink || monthly >= 15);
  return `
    <div class="item-row">
      <div class="item-main">
        <h3 class="item-title">${esc(sub.name || "Unnamed subscription")}</h3>
        <div class="item-meta">
          <span>${esc(sub.category)}</span>
          <span>${money(sub.cost)} ${esc(labelize(sub.frequency))}</span>
          <span>${money(monthly)}/mo</span>
          <span>Renews ${formatShortDate(parseInputDate(sub.nextBillingDate))}</span>
          <span class="pill ${statusClass(sub.status)}">${esc(labelize(sub.status))}</span>
          ${easy ? `<span class="pill warning">Easy cancel</span>` : ""}
          ${sub.status === "active" ? `<span>Saves ${money(monthly)}/mo if canceled</span>` : ""}
        </div>
      </div>
      <div class="item-actions">
        <button class="icon-button" data-action="cycle-sub-status" data-id="${sub.id}" aria-label="Change ${esc(sub.name)} status">${icons.check}</button>
        <button class="icon-button" data-action="open-form" data-type="subscription" data-id="${sub.id}" aria-label="Edit ${esc(sub.name)}">${icons.edit}</button>
      </div>
    </div>
  `;
}

function renderEventList(events, options = {}) {
  const emptyText = options.emptyText || "No payments found.";
  if (!events.length) return `<div class="empty">${esc(emptyText)}</div>`;
  return `<div class="row-list">${events.map(renderEventRow).join("")}</div>`;
}

function renderEventRow(event) {
  const paid = isEventPaid(event);
  const overdue = event.date < startOfDay(new Date()) && !paid;
  return `
    <div class="item-row event-row ${event.type} ${overdue ? "overdue" : ""}">
      <div class="item-main">
        <h3 class="item-title">${esc(event.name)}</h3>
        <div class="item-meta">
          <span>${esc(labelize(event.type))}</span>
          <span>${money(event.amount)}</span>
          <span>${formatShortDate(event.date)}</span>
          ${event.note ? `<span>${esc(event.note)}</span>` : ""}
          <span class="pill ${paid ? "paid" : overdue ? "danger" : "primary"}">${paid ? "Paid" : overdue ? "Overdue" : "Upcoming"}</span>
        </div>
      </div>
      <button class="ghost-button" data-action="toggle-paid" data-key="${event.key}">
        ${paid ? icons.close : icons.check}<span>${paid ? "Undo" : "Paid"}</span>
      </button>
    </div>
  `;
}

function renderReminderRow(reminder) {
  return `
    <div class="item-row event-row ${reminder.type}">
      <div class="item-main">
        <h3 class="item-title">${esc(reminder.title)}</h3>
        <div class="item-meta">
          <span>${esc(reminder.when)}</span>
          <span>${esc(reminder.category)}</span>
          ${reminder.amount ? `<span>${money(reminder.amount)}</span>` : ""}
        </div>
      </div>
      <div class="item-actions">
        <span class="pill ${reminder.urgency}">${esc(reminder.label)}</span>
        ${reminder.eventKey ? `<button class="icon-button" data-action="toggle-paid" data-key="${reminder.eventKey}" aria-label="Mark paid">${icons.check}</button>` : ""}
        <button class="icon-button" data-action="snooze-reminder" data-key="${esc(reminder.key)}" aria-label="Snooze reminder">${icons.bell}</button>
        <button class="icon-button" data-action="dismiss-reminder" data-key="${esc(reminder.key)}" aria-label="Dismiss reminder">${icons.close}</button>
      </div>
    </div>
  `;
}

function renderPlanComparison(plans) {
  if (!plans.length) return `<div class="empty">Add active debts to compare payoff methods.</div>`;
  const valid = plans.filter((plan) => plan.result.payoffDate);
  const fastestMonths = Math.min(...valid.map((plan) => plan.result.months));
  return `
    <div class="comparison-grid">
      ${plans
        .map((plan) => {
          const result = plan.result;
          const isBest = result.payoffDate && result.months === fastestMonths;
          return `
            <div class="plan-card ${isBest ? "best" : ""}">
              <div class="plan-title">
                <h3>${esc(plan.name)}</h3>
                ${isBest ? `<span class="pill primary">Fastest</span>` : ""}
              </div>
              ${
                result.payoffDate
                  ? `<div class="plan-stats">
                      <span><strong>${result.months}</strong>months</span>
                      <span><strong>${result.payoffDate}</strong>payoff</span>
                      <span><strong>${money(result.totalInterest)}</strong>interest</span>
                    </div>
                    <div class="item-meta">
                      <span>${result.monthsFaster > 0 ? `${result.monthsFaster} months faster` : "Baseline"}</span>
                      <span>${result.interestSaved > 0 ? `${money(result.interestSaved)} interest saved` : "No interest savings yet"}</span>
                    </div>`
                  : `<div class="warning-box">This plan cannot be estimated because a monthly payment is too low for the interest.</div>`
              }
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderTimeline() {
  const debts = getPayoffDebts().sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return b.apr - a.apr;
  });
  if (!debts.length) return `<div class="empty">Active debts will appear here in payoff order.</div>`;
  return `
    <div class="timeline">
      ${debts
        .slice(0, 6)
        .map(
          (debt, index) => `
            <div class="timeline-row">
              <span class="timeline-dot">${index + 1}</span>
              <strong>${esc(debt.creditor)}</strong>
              <span>${money(debt.balance)}</span>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderMilestones(totals, plans) {
  const paidCount = state.debts.filter((debt) => debt.status === "paid").length;
  const totalCount = state.debts.length;
  const smallest = getPayoffDebts().sort((a, b) => a.balance - b.balance)[0];
  const fastest = plans.filter((plan) => plan.result.payoffDate).sort((a, b) => a.result.months - b.result.months)[0];
  const items = [
    { title: "Paid off accounts", value: `${paidCount}/${totalCount || 0}`, note: totalCount ? "Keep stacking wins." : "Add debts to begin." },
    { title: "Next small win", value: smallest ? money(smallest.balance) : "$0", note: smallest ? smallest.creditor : "No active debt." },
    { title: "Balance cleared", value: `${Math.round(getDebtProgress())}%`, note: "Based on starting balances." },
    { title: "Fastest path", value: fastest?.result.payoffDate || "Add debts", note: fastest?.name || "No payoff estimate yet." }
  ];
  return `<div class="metric-grid">${items.map((item) => metricCard(item.title, item.value, item.note)).join("")}</div>`;
}

function renderInlineNumberField(name, label, value) {
  return `
    <label class="field">
      <span class="form-label">${esc(label)}</span>
      <input name="${name}" type="number" step="0.01" min="0" value="${esc(value || 0)}" />
    </label>
  `;
}

function renderFilter(type, label) {
  return `
    <label class="filter-chip">
      <input type="checkbox" data-action="toggle-filter" data-filter="${type}" ${calendarFilters[type] ? "checked" : ""} />
      <span>${esc(label)}</span>
    </label>
  `;
}

function renderReminderDay(day) {
  const checked = state.settings.reminderDays.includes(day);
  return `
    <label class="filter-chip">
      <input type="checkbox" data-action="toggle-reminder-day" data-day="${day}" ${checked ? "checked" : ""} />
      <span>${day === 0 ? "On due date" : `${day} day${day === 1 ? "" : "s"} before`}</span>
    </label>
  `;
}

function renderMonthGrid(events) {
  const year = calendarCursor.getFullYear();
  const month = calendarCursor.getMonth();
  const first = new Date(year, month, 1);
  const daysInMonth = lastDayOfMonth(calendarCursor).getDate();
  const leading = first.getDay();
  const cells = [];
  const today = toDateKey(new Date());

  for (let index = 0; index < leading; index += 1) {
    cells.push(`<div class="day-cell is-muted" aria-hidden="true"></div>`);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    const key = toDateKey(date);
    const dayEvents = events.filter((event) => toDateKey(event.date) === key);
    cells.push(`
      <div class="day-cell ${today === key ? "is-today" : ""}">
        <span class="day-number">${day}</span>
        <span class="dot-row">${dayEvents.slice(0, 4).map((event) => `<span class="event-dot ${event.type}"></span>`).join("")}</span>
      </div>
    `);
  }

  return `
    <div class="calendar-grid" style="margin-top: 12px;">
      ${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => `<div class="weekday">${day}</div>`).join("")}
      ${cells.join("")}
    </div>
  `;
}

function renderModal() {
  if (modalState.kind === "payment") return renderPaymentModal();
  if (modalState.kind === "goal") return renderGoalModal();
  if (modalState.kind === "applyPlan") return renderApplyPlanModal();
  if (modalState.kind === "importPreview") return renderImportPreviewModal();

  const { type, id } = modalState;
  const item = getCollection(type).find((entry) => entry.id === id) || newItem(type);
  const fields = type === "debt" ? debtFields : type === "bill" ? billFields : subscriptionFields;
  const title = `${id ? "Edit" : "Add"} ${type === "debt" ? "debt" : type}`;
  return `
    <div class="modal-backdrop" role="presentation">
      <form class="modal" data-form="entity">
        <div class="modal-header">
          <h2>${esc(title)}</h2>
          <button class="icon-button" type="button" data-action="close-modal" aria-label="Close">${icons.close}</button>
        </div>
        <div class="modal-body form-grid">
          ${fields.map((field) => renderModalField(field, item)).join("")}
        </div>
        <div class="modal-footer">
          ${id ? `<button class="danger-button" type="button" data-action="delete-item" data-type="${type}" data-id="${id}">${icons.trash}<span>Delete</span></button>` : `<span></span>`}
          <button class="button" type="submit">${icons.check}<span>Save</span></button>
        </div>
      </form>
    </div>
  `;
}

function renderPaymentModal() {
  const payment = state.paymentHistory.find((entry) => entry.id === modalState.id) || newPaymentDraft(modalState.debtId);
  return `
    <div class="modal-backdrop" role="presentation">
      <form class="modal" data-form="payment">
        <div class="modal-header">
          <h2>${modalState.id ? "Edit payment" : "Record payment"}</h2>
          <button class="icon-button" type="button" data-action="close-modal" aria-label="Close">${icons.close}</button>
        </div>
        <div class="modal-body form-grid">
          <label class="field"><span class="form-label">Debt</span><select name="debtId" required>${state.debts.map((debt) => `<option value="${debt.id}" ${payment.debtId === debt.id ? "selected" : ""}>${esc(debt.creditor)}</option>`).join("")}</select></label>
          <label class="field"><span class="form-label">Payment date</span><input name="date" type="date" value="${esc(payment.date)}" required /></label>
          <label class="field"><span class="form-label">Payment amount</span><input name="amount" type="number" min="0" step="0.01" value="${esc(payment.amount)}" required /></label>
          <label class="field"><span class="form-label">Amount to interest</span><input name="interest" type="number" min="0" step="0.01" value="${esc(payment.interest)}" /></label>
          <label class="field"><span class="form-label">Payment method</span><input name="method" value="${esc(payment.method)}" placeholder="Checking, card, cash" /></label>
          <label class="field"><span class="form-label">Payment type</span><select name="type">${["manual", "scheduled", "imported"].map((type) => `<option value="${type}" ${payment.type === type ? "selected" : ""}>${labelize(type)}</option>`).join("")}</select></label>
          <label class="field"><span class="form-label">Note</span><textarea name="note">${esc(payment.note)}</textarea></label>
        </div>
        <div class="modal-footer">
          ${modalState.id ? `<button class="danger-button" type="button" data-action="delete-payment" data-id="${modalState.id}">${icons.trash}<span>Delete</span></button>` : `<span></span>`}
          <button class="button" type="submit">${icons.check}<span>Save</span></button>
        </div>
      </form>
    </div>
  `;
}

function renderGoalModal() {
  const goal = state.goals.find((entry) => entry.id === modalState.id) || newGoalDraft();
  return `
    <div class="modal-backdrop" role="presentation">
      <form class="modal" data-form="goal">
        <div class="modal-header">
          <h2>${modalState.id ? "Edit goal" : "Create goal"}</h2>
          <button class="icon-button" type="button" data-action="close-modal" aria-label="Close">${icons.close}</button>
        </div>
        <div class="modal-body form-grid">
          <label class="field"><span class="form-label">Goal name</span><input name="name" value="${esc(goal.name)}" required /></label>
          <label class="field"><span class="form-label">Goal type</span><select name="type">${goalTypeOptions(goal.type)}</select></label>
          <label class="field"><span class="form-label">Target amount</span><input name="targetAmount" type="number" min="0" step="0.01" value="${esc(goal.targetAmount)}" /></label>
          <label class="field"><span class="form-label">Target date</span><input name="targetDate" type="date" value="${esc(goal.targetDate)}" /></label>
          <label class="field"><span class="form-label">Related debt</span><select name="relatedDebtId"><option value="">All debts</option>${state.debts.map((debt) => `<option value="${debt.id}" ${goal.relatedDebtId === debt.id ? "selected" : ""}>${esc(debt.creditor)}</option>`).join("")}</select></label>
          <label class="field"><span class="form-label">Status</span><select name="status">${["on-track", "at-risk", "behind", "completed", "paused"].map((status) => `<option value="${status}" ${goal.status === status ? "selected" : ""}>${labelize(status)}</option>`).join("")}</select></label>
          <label class="field"><span class="form-label">Milestones</span><input name="milestones" value="${esc(goal.milestones.join(", "))}" placeholder="Comma-separated milestones" /></label>
          <label class="field"><span class="form-label">Notes</span><textarea name="notes">${esc(goal.notes)}</textarea></label>
        </div>
        <div class="modal-footer">
          ${modalState.id ? `<button class="danger-button" type="button" data-action="delete-goal" data-id="${modalState.id}">${icons.trash}<span>Delete</span></button>` : `<span></span>`}
          <button class="button" type="submit">${icons.check}<span>Save</span></button>
        </div>
      </form>
    </div>
  `;
}

function renderApplyPlanModal() {
  const minimum = getPayoffDebts().reduce((sum, debt) => sum + numberValue(debt.minPayment), 0);
  const total = numberValue(simulatorState.totalMonthly) + numberValue(simulatorState.extra);
  const extra = Math.max(0, numberValue(simulatorState.extra));
  return `
    <div class="modal-backdrop" role="presentation">
      <div class="modal">
        <div class="modal-header">
          <h2>Apply this plan?</h2>
          <button class="icon-button" type="button" data-action="close-modal" aria-label="Close">${icons.close}</button>
        </div>
        <div class="modal-body form-grid">
          <div class="warning-box">This will not change saved debt balances. It will update budget debt settings only.</div>
          <div class="info-box">Money available for debt will become ${money(total)}. Extra payment amount will become ${money(extra)}. Payoff method remains a simulator setting.</div>
        </div>
        <div class="modal-footer">
          <button class="ghost-button" type="button" data-action="close-modal">Cancel</button>
          <button class="button" type="button" data-action="confirm-apply-plan">${icons.check}<span>Apply</span></button>
        </div>
      </div>
    </div>
  `;
}

function renderImportPreviewModal() {
  if (!importPreview) return "";
  return `
    <div class="modal-backdrop" role="presentation">
      <div class="modal">
        <div class="modal-header">
          <h2>Import preview</h2>
          <button class="icon-button" type="button" data-action="close-modal" aria-label="Close">${icons.close}</button>
        </div>
        <div class="modal-body form-grid">
          <div class="info-box">Schema version ${importPreview.schemaVersion || 1}. Found ${importPreview.data.debts.length} debts, ${importPreview.data.bills.length} bills, ${importPreview.data.subscriptions.length} subscriptions, ${importPreview.data.paymentHistory.length} payments, and ${importPreview.data.goals.length} goals.</div>
          <div class="warning-box">Replace overwrites local data. Merge adds imported records with matching IDs preserved and skips duplicate IDs.</div>
        </div>
        <div class="modal-footer">
          <button class="ghost-button" type="button" data-action="close-modal">Cancel</button>
          <button class="ghost-button" type="button" data-action="merge-import">Merge</button>
          <button class="button" type="button" data-action="replace-import">Replace</button>
        </div>
      </div>
    </div>
  `;
}

function renderModalField(field, item) {
  const value = item[field.name] ?? "";
  const required = field.required ? "required" : "";
  const common = `name="${field.name}" ${required}`;
  if (field.type === "textarea") {
    return `<label class="field"><span class="form-label">${esc(field.label)}</span><textarea ${common}>${esc(value)}</textarea></label>`;
  }
  if (field.type === "select") {
    return `
      <label class="field">
        <span class="form-label">${esc(field.label)}</span>
        <select ${common}>
          ${field.options
            .map((option) => {
              const optionValue = typeof option === "string" ? option : option.value;
              const optionLabel = typeof option === "string" ? labelize(option) : option.label;
              return `<option value="${esc(optionValue)}" ${String(value) === String(optionValue) ? "selected" : ""}>${esc(optionLabel)}</option>`;
            })
            .join("")}
        </select>
      </label>
    `;
  }
  return `
    <label class="field">
      <span class="form-label">${esc(field.label)}</span>
      <input ${common} type="${field.type}" value="${esc(value)}" ${field.step ? `step="${field.step}"` : ""} ${field.min ? `min="${field.min}"` : ""} />
    </label>
  `;
}

function renderSearchModal() {
  const groups = buildSearchResults(searchQuery);
  const hasResults = groups.some((group) => group.items.length);
  return `
    <div class="modal-backdrop" role="presentation">
      <div class="modal search-modal">
        <div class="modal-header">
          <h2>Search</h2>
          <button class="icon-button" type="button" data-action="close-search" aria-label="Close">${icons.close}</button>
        </div>
        <div class="modal-body form-grid">
          <label class="field">
            <span class="form-label">Search everything</span>
            <input autofocus value="${esc(searchQuery)}" data-action="global-search-input" placeholder="Debts, bills, payments, goals, notes" />
          </label>
          <div class="chip-row">
            ${state.search.recent.map((term) => `<button class="filter-chip" data-action="use-recent-search" data-term="${esc(term)}">${esc(term)}</button>`).join("")}
            ${state.search.recent.length ? `<button class="ghost-button" data-action="clear-recent-searches">Clear recent</button>` : ""}
          </div>
          ${
            searchQuery.trim()
              ? hasResults
                ? groups.map((group) => group.items.length ? `<section><div class="section-head"><h3>${esc(group.label)}</h3></div><div class="row-list">${group.items.map(renderSearchResult).join("")}</div></section>` : "").join("")
                : `<div class="empty">No results found for "${esc(searchQuery)}".</div>`
              : `<div class="empty">Start typing to search debts, bills, subscriptions, payments, goals, notes, reminders, and categories.</div>`
          }
        </div>
      </div>
    </div>
  `;
}

function renderSearchResult(item) {
  return `
    <button class="item-row search-result" data-action="open-search-result" data-view-target="${item.view}" data-id="${esc(item.id || "")}" data-kind="${esc(item.kind || "")}">
      <span class="item-main">
        <span class="item-title">${highlightMatch(item.title, searchQuery)}</span>
        <span class="item-meta">${highlightMatch(item.meta, searchQuery)}</span>
      </span>
      <span class="pill primary">Open</span>
    </button>
  `;
}

function getTotals() {
  const activeAndPausedDebts = state.debts.filter((debt) => debt.status !== "paid");
  const activeDebts = state.debts.filter((debt) => debt.status === "active");
  const monthEvents = getEventsForMonth(new Date(), { debt: true, bill: true, subscription: true });
  const billEvents = monthEvents.filter((event) => event.type === "bill");
  const totalDebt = activeAndPausedDebts.reduce((sum, debt) => sum + numberValue(debt.balance), 0);
  const minimumPayments = activeDebts.reduce((sum, debt) => sum + numberValue(debt.minPayment), 0);
  const monthlyBills = billEvents.reduce((sum, event) => sum + event.amount, 0);
  const monthlySubscriptions = state.subscriptions.filter((sub) => sub.status === "active").reduce((sum, sub) => sum + monthlySubscriptionCost(sub), 0);
  const yearlySubscriptions = monthlySubscriptions * 12;
  const availableExtra = numberValue(state.budget.extraPayment || state.budget.moneyForDebt);
  const remainingBudget =
    numberValue(state.budget.monthlyIncome) -
    monthlyBills -
    monthlySubscriptions -
    minimumPayments -
    availableExtra -
    numberValue(state.budget.spendingLimit) -
    numberValue(state.budget.emergencySavings);

  return {
    totalDebt,
    minimumPayments,
    monthlyBills,
    monthlySubscriptions,
    yearlySubscriptions,
    availableExtra,
    remainingBudget
  };
}

function paymentTotalsForRange(start, end) {
  return state.paymentHistory
    .filter((payment) => {
      const date = parseInputDate(payment.date);
      return date >= startOfDay(start) && date <= startOfDay(end);
    })
    .reduce(
      (sum, payment) => ({
        amount: sum.amount + numberValue(payment.amount),
        principal: sum.principal + numberValue(payment.principal),
        interest: sum.interest + numberValue(payment.interest)
      }),
      { amount: 0, principal: 0, interest: 0 }
    );
}

function getFilteredPayments() {
  const query = historyFilters.query.trim().toLowerCase();
  return [...state.paymentHistory]
    .filter((payment) => {
      if (historyFilters.debtId !== "all" && payment.debtId !== historyFilters.debtId) return false;
      if (historyFilters.type !== "all" && payment.type !== historyFilters.type) return false;
      const date = parseInputDate(payment.date);
      if (historyFilters.start && date < parseInputDate(historyFilters.start)) return false;
      if (historyFilters.end && date > parseInputDate(historyFilters.end)) return false;
      if (!query) return true;
      return [payment.creditorSnapshot, payment.note, payment.method, payment.type].join(" ").toLowerCase().includes(query);
    })
    .sort((a, b) => parseInputDate(b.date) - parseInputDate(a.date));
}

function newPaymentDraft(debtId = "") {
  const debt = state.debts.find((entry) => entry.id === debtId) || state.debts.find((entry) => entry.status === "active") || state.debts[0] || {};
  const interest = monthlyInterestForDebt(debt);
  const amount = Math.min(numberValue(debt.balance), Math.max(numberValue(debt.minPayment), interest));
  return {
    id: "",
    debtId: debt.id || "",
    creditorSnapshot: debt.creditor || "",
    date: toInputDate(new Date()),
    amount,
    interest: Math.min(interest, amount),
    principal: Math.max(0, amount - Math.min(interest, amount)),
    balanceBefore: numberValue(debt.balance),
    balanceAfter: Math.max(0, numberValue(debt.balance) - Math.max(0, amount - Math.min(interest, amount))),
    note: "",
    method: "",
    type: "manual"
  };
}

function monthlyInterestForDebt(debt) {
  return numberValue(debt.balance) * (numberValue(debt.apr) / 100 / 12);
}

async function savePaymentRecord(formData) {
  const existing = state.paymentHistory.find((payment) => payment.id === modalState.id);
  const debt = state.debts.find((entry) => entry.id === String(formData.get("debtId")));
  if (!debt) {
    alert("Choose a debt before saving a payment.");
    return;
  }
  const amount = numberValue(formData.get("amount"));
  const interest = Math.min(amount, Math.max(0, numberValue(formData.get("interest"))));
  const principal = Math.max(0, amount - interest);
  const baseBefore = existing ? existing.balanceBefore : numberValue(debt.balance);
  const payment = {
    id: existing?.id || uid(),
    debtId: debt.id,
    creditorSnapshot: debt.creditor || "Unknown creditor",
    date: String(formData.get("date") || toInputDate(new Date())),
    amount,
    principal,
    interest,
    balanceBefore: baseBefore,
    balanceAfter: Math.max(0, baseBefore - principal),
    note: String(formData.get("note") || ""),
    method: String(formData.get("method") || ""),
    type: String(formData.get("type") || "manual"),
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  if (!debt.historyBaseline) debt.historyBaseline = existing?.balanceBefore ?? numberValue(debt.balance);
  if (existing) Object.assign(existing, payment);
  else state.paymentHistory.push(payment);
  recalculateDebtFromHistory(debt.id);
  modalState = null;
  await saveState();
  render();
}

function recalculateDebtFromHistory(debtId) {
  const debt = state.debts.find((entry) => entry.id === debtId);
  if (!debt) return;
  const records = state.paymentHistory
    .filter((payment) => payment.debtId === debtId)
    .sort((a, b) => parseInputDate(a.date) - parseInputDate(b.date) || a.createdAt.localeCompare(b.createdAt));
  let balance = numberValue(debt.historyBaseline ?? records[0]?.balanceBefore ?? debt.balance);
  records.forEach((payment) => {
    payment.balanceBefore = balance;
    payment.balanceAfter = Math.max(0, balance - numberValue(payment.principal));
    balance = payment.balanceAfter;
    payment.updatedAt = new Date().toISOString();
  });
  debt.balance = Math.max(0, balance);
  if (debt.balance <= 0) debt.status = "paid";
  else if (debt.status === "paid") debt.status = "active";
}

async function deletePayment(id) {
  const payment = state.paymentHistory.find((entry) => entry.id === id);
  if (!payment || !confirm("Delete this payment and recalculate the debt balance?")) return;
  state.paymentHistory = state.paymentHistory.filter((entry) => entry.id !== id);
  recalculateDebtFromHistory(payment.debtId);
  modalState = null;
  await saveState();
  render();
}

function simulateDetailedPlan(debts, totalMonthly, strategy) {
  const working = debts.map((debt) => ({ ...debt, balance: numberValue(debt.balance), minPayment: Math.min(numberValue(debt.minPayment), numberValue(debt.balance)) }));
  if (!working.length) return { months: 0, payoffDate: "", totalInterest: 0, schedule: [], firstPaid: null, warning: "" };
  const minimumTotal = working.reduce((sum, debt) => sum + Math.max(0, debt.minPayment), 0);
  const monthlyPool = strategy === "minimum" ? minimumTotal : Math.max(numberValue(totalMonthly), 0);
  let months = 0;
  let totalInterest = 0;
  let firstPaid = null;
  const schedule = [];

  while (working.some((debt) => debt.balance > 0.01) && months < 720) {
    const active = working.filter((debt) => debt.balance > 0.01);
    let interest = 0;
    active.forEach((debt) => {
      const monthInterest = debt.balance * (numberValue(debt.apr) / 100 / 12);
      debt.balance += monthInterest;
      interest += monthInterest;
    });
    totalInterest += interest;
    if (monthlyPool <= interest && active.some((debt) => numberValue(debt.apr) > 0)) {
      return {
        months: Infinity,
        payoffDate: "",
        totalInterest,
        schedule,
        firstPaid,
        warning: "The current monthly payment does not cover accruing interest, so the balance may grow and no valid payoff date is available."
      };
    }

    let remaining = monthlyPool;
    let principal = 0;
    const paidOff = [];
    active.forEach((debt) => {
      if (remaining <= 0) return;
      const pay = Math.min(debt.balance, Math.max(0, debt.minPayment), remaining);
      debt.balance -= pay;
      remaining -= pay;
      principal += Math.max(0, pay - debt.balance * 0);
      if (debt.balance <= 0.01) paidOff.push(debt.creditor);
    });

    while (remaining > 0.01) {
      const target = sortDebtsForStrategy(working.filter((debt) => debt.balance > 0.01), strategy === "minimum" ? "custom" : strategy)[0];
      if (!target) break;
      const pay = Math.min(target.balance, remaining);
      target.balance -= pay;
      principal += pay;
      remaining -= pay;
      if (target.balance <= 0.01) paidOff.push(target.creditor);
    }

    months += 1;
    const label = formatMonth(addMonths(new Date(), months));
    const totalBalance = working.reduce((sum, debt) => sum + Math.max(0, debt.balance), 0);
    if (!firstPaid && paidOff.length) firstPaid = { creditor: paidOff[0], month: months, monthLabel: label };
    schedule.push({ month: months, label, totalBalance, principal: Math.max(0, monthlyPool - interest - Math.max(0, remaining)), interest, paidOff: [...new Set(paidOff)] });
  }

  if (months >= 720) return { months: Infinity, payoffDate: "", totalInterest, schedule, firstPaid, warning: "This plan runs longer than 60 years. Increase payments or review the debt inputs." };
  return { months, payoffDate: months ? formatMonth(addMonths(new Date(), months)) : "", totalInterest, schedule, firstPaid, warning: "" };
}

function newGoalDraft() {
  return {
    id: "",
    name: "",
    type: "debt-free-date",
    targetAmount: 0,
    targetDate: toInputDate(addMonths(new Date(), 12)),
    relatedDebtId: "",
    status: "on-track",
    notes: "",
    milestones: []
  };
}

function goalTypeOptions(selected) {
  return [
    ["debt-free-date", "Become debt free by a selected date"],
    ["payoff-debt-date", "Pay off a particular debt by a selected date"],
    ["reduce-debt-amount", "Reduce total debt to a chosen amount"],
    ["monthly-payment", "Pay a chosen amount toward debt this month"],
    ["interest-saved", "Save a selected amount of interest"],
    ["subscription-reduction", "Cancel or reduce subscriptions by a monthly amount"]
  ].map(([value, label]) => `<option value="${value}" ${selected === value ? "selected" : ""}>${esc(label)}</option>`).join("");
}

async function saveGoalRecord(formData) {
  const existing = state.goals.find((goal) => goal.id === modalState.id);
  const goal = {
    id: existing?.id || uid(),
    name: String(formData.get("name") || "Debt goal"),
    type: String(formData.get("type") || "debt-free-date"),
    targetAmount: numberValue(formData.get("targetAmount")),
    targetDate: String(formData.get("targetDate") || ""),
    relatedDebtId: String(formData.get("relatedDebtId") || ""),
    status: String(formData.get("status") || "on-track"),
    notes: String(formData.get("notes") || ""),
    milestones: String(formData.get("milestones") || "").split(",").map((item) => item.trim()).filter(Boolean),
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  if (existing) Object.assign(existing, goal);
  else state.goals.push(goal);
  modalState = null;
  await saveState();
  render();
}

function getGoalSummaries() {
  const totals = getTotals();
  const plans = buildPlanComparison();
  const selected = plans.find((plan) => plan.key === "avalanche");
  return state.goals.map((goal) => {
    let percent = 0;
    let status = labelize(goal.status);
    let estimate = selected?.result.payoffDate || "Estimate unavailable";
    if (goal.type === "debt-free-date") {
      percent = getDebtProgress();
      if (goal.targetDate && selected?.result.months) {
        status = addMonths(new Date(), selected.result.months) <= parseInputDate(goal.targetDate) ? "On track" : "At risk";
      }
    } else if (goal.type === "payoff-debt-date") {
      const debt = state.debts.find((entry) => entry.id === goal.relatedDebtId);
      percent = debt ? getSingleDebtProgress(debt) : 0;
    } else if (goal.type === "reduce-debt-amount") {
      percent = goal.targetAmount ? clamp(((Math.max(goal.targetAmount, totals.totalDebt) - totals.totalDebt) / Math.max(goal.targetAmount, totals.totalDebt)) * 100, 0, 100) : 0;
    } else if (goal.type === "monthly-payment") {
      const month = paymentTotalsForRange(startOfMonth(new Date()), lastDayOfMonth(new Date()));
      percent = goal.targetAmount ? clamp((month.amount / goal.targetAmount) * 100, 0, 100) : 0;
    } else if (goal.type === "interest-saved") {
      const saved = Math.max(0, (plans.find((plan) => plan.key === "minimum")?.result.totalInterest || 0) - (selected?.result.totalInterest || 0));
      percent = goal.targetAmount ? clamp((saved / goal.targetAmount) * 100, 0, 100) : 0;
    } else if (goal.type === "subscription-reduction") {
      const canceled = state.subscriptions.filter((sub) => sub.status === "canceled").reduce((sum, sub) => sum + monthlySubscriptionCost(sub), 0);
      percent = goal.targetAmount ? clamp((canceled / goal.targetAmount) * 100, 0, 100) : 0;
    }
    const completed = percent >= 100 || goal.status === "completed";
    if (completed) status = "Completed";
    return {
      ...goal,
      percent: Math.round(percent),
      status,
      statusClass: completed ? "paid" : status === "At risk" || status === "Behind" ? "warning" : "primary",
      estimate,
      completed,
      celebration: `Goal complete: ${goal.name}. Nice work.`
    };
  });
}

function getChartData(mode) {
  if (mode === "actual") {
    const sorted = [...state.paymentHistory].sort((a, b) => parseInputDate(a.date) - parseInputDate(b.date));
    if (!sorted.length) return { balance: [], principalInterest: [] };
    const first = sorted[0].balanceBefore;
    let balance = first;
    const balancePoints = [{ label: formatShortDate(parseInputDate(sorted[0].date)), value: first }];
    const principalInterest = [];
    sorted.forEach((payment) => {
      balance = payment.balanceAfter;
      balancePoints.push({ label: formatShortDate(parseInputDate(payment.date)), value: balance });
      principalInterest.push({ label: formatShortDate(parseInputDate(payment.date)), principal: payment.principal, interest: payment.interest });
    });
    return { balance: balancePoints, principalInterest };
  }
  const method = mode.includes("snowball") ? "snowball" : mode.includes("custom") ? "custom" : "avalanche";
  const total = Math.max(getTotals().minimumPayments + numberValue(state.budget.extraPayment), numberValue(simulatorState.totalMonthly));
  const projection = simulateDetailedPlan(getPayoffDebts(), total, method);
  return {
    balance: projection.schedule.map((row) => ({ label: row.label, value: row.totalBalance })),
    principalInterest: projection.schedule.map((row) => ({ label: row.label, principal: row.principal, interest: row.interest }))
  };
}

function categoryTotals(items, labelKey, valueKey) {
  const map = new Map();
  items.forEach((item) => {
    const label = item[labelKey] || "Other";
    const value = valueKey === "monthlyCost" ? monthlySubscriptionCost(item) : numberValue(item[valueKey]);
    map.set(label, (map.get(label) || 0) + value);
  });
  return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

function buildAnnualReviewData(year) {
  if (!state) return emptyAnnualReview(year);
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  const yearPayments = state.paymentHistory.filter((payment) => {
    const date = parseInputDate(payment.date);
    return date >= start && date <= end;
  });
  const paymentTotals = paymentTotalsForRange(start, end);
  const beginningDebt = yearPayments.length ? yearPayments[0].balanceBefore : state.debts.reduce((sum, debt) => sum + numberValue(debt.startingBalance || debt.balance), 0);
  const endingDebt = state.debts.filter((debt) => debt.status !== "paid").reduce((sum, debt) => sum + numberValue(debt.balance), 0);
  const paidEventKeys = Object.entries(state.payments).filter(([, value]) => value?.paid).map(([key]) => key);
  const paidEvents = paidEventKeys.map(eventFromKey).filter(Boolean).filter((event) => event.date.getFullYear() === year);
  const totalBillsPaid = paidEvents.filter((event) => event.type === "bill").reduce((sum, event) => sum + event.amount, 0);
  const totalSubscriptionsPaid = paidEvents.filter((event) => event.type === "subscription").reduce((sum, event) => sum + event.amount, 0);
  const canceledSavings = state.subscriptions.filter((sub) => sub.status === "canceled").reduce((sum, sub) => sum + monthlySubscriptionCost(sub) * 12, 0);
  const largestPayment = [...yearPayments].sort((a, b) => b.amount - a.amount)[0];
  const monthlyBreakdown = Array.from({ length: 12 }, (_, month) => {
    const monthPayments = yearPayments.filter((payment) => parseInputDate(payment.date).getMonth() === month);
    return { label: new Intl.DateTimeFormat("en-US", { month: "short" }).format(new Date(year, month, 1)), amount: monthPayments.reduce((sum, payment) => sum + payment.amount, 0) };
  });
  const debtReduction = Math.max(0, beginningDebt - endingDebt);
  const percentReduced = beginningDebt ? Math.round((debtReduction / beginningDebt) * 100) : 0;
  const bestMonth = [...monthlyBreakdown].sort((a, b) => b.amount - a.amount)[0];
  return {
    hasHistory: yearPayments.length > 0,
    beginningDebtLabel: yearPayments.length ? money(beginningDebt) : "Not enough recorded history",
    beginningDebtEstimate: !yearPayments.length,
    endingDebtLabel: money(endingDebt),
    debtReduction,
    percentReduced,
    paymentTotals,
    totalBillsPaid,
    averageMonthlyBills: totalBillsPaid / 12,
    totalSubscriptionsPaid,
    averageMonthlySubscriptionCost: totalSubscriptionsPaid / 12,
    canceledSavings,
    largestPayment,
    monthlyBreakdown,
    highlights: [
      debtReduction > 0 ? `Debt reduced by ${money(debtReduction)} (${percentReduced}%).` : "",
      bestMonth?.amount ? `Best debt reduction month: ${bestMonth.label} with ${money(bestMonth.amount)} paid.` : "",
      largestPayment ? `Largest payment: ${money(largestPayment.amount)} to ${largestPayment.creditorSnapshot}.` : ""
    ].filter(Boolean),
    reviewAreas: [
      paymentTotals.interest > paymentTotals.principal ? "Interest paid exceeded principal paid. Review APRs and avalanche options." : "Review high-interest debts for extra-payment opportunities.",
      state.subscriptions.some((sub) => sub.status === "active" && monthlySubscriptionCost(sub) > 20) ? "Review high-cost subscriptions for cancellation savings." : "Subscription costs look controlled, but review renewals annually.",
      paidEvents.some((event) => event.date < startOfDay(new Date()) && !state.payments[event.key]?.paid) ? "Some payment records may need cleanup." : "Check for missed or overdue payments before closing the year."
    ]
  };
}

function emptyAnnualReview(year) {
  return {
    hasHistory: false,
    beginningDebtLabel: "Not enough recorded history",
    beginningDebtEstimate: true,
    endingDebtLabel: money(0),
    debtReduction: 0,
    percentReduced: 0,
    paymentTotals: { amount: 0, principal: 0, interest: 0 },
    totalBillsPaid: 0,
    averageMonthlyBills: 0,
    totalSubscriptionsPaid: 0,
    averageMonthlySubscriptionCost: 0,
    canceledSavings: 0,
    largestPayment: null,
    monthlyBreakdown: Array.from({ length: 12 }, (_, month) => ({ label: new Intl.DateTimeFormat("en-US", { month: "short" }).format(new Date(year, month, 1)), amount: 0 })),
    highlights: [],
    reviewAreas: ["Not enough recorded history."]
  };
}

function availableYears() {
  const years = new Set([new Date().getFullYear()]);
  state.paymentHistory.forEach((payment) => years.add(parseInputDate(payment.date).getFullYear()));
  return [...years].sort((a, b) => b - a);
}

function eventFromKey(key) {
  const [type, id, dateKey] = key.split(":");
  const date = parseInputDate(dateKey);
  if (type === "bill") {
    const bill = state.bills.find((entry) => entry.id === id);
    return bill ? { key, type, id, date, name: bill.name, amount: bill.amount } : null;
  }
  if (type === "subscription") {
    const sub = state.subscriptions.find((entry) => entry.id === id);
    return sub ? { key, type, id, date, name: sub.name, amount: sub.cost } : null;
  }
  if (type === "debt") {
    const debt = state.debts.find((entry) => entry.id === id);
    return debt ? { key, type, id, date, name: debt.creditor, amount: debt.minPayment } : null;
  }
  return null;
}

function buildSearchResults(query) {
  const q = query.trim().toLowerCase();
  const matches = (values) => q && values.join(" ").toLowerCase().includes(q);
  const reminders = buildReminderItems();
  return [
    { label: "Debts", items: state.debts.filter((debt) => matches([debt.creditor, debt.type, debt.notes])).map((debt) => ({ view: "debts", kind: "debt", id: debt.id, title: debt.creditor, meta: `${debt.type} ${money(debt.balance)} ${debt.notes}` })) },
    { label: "Bills", items: state.bills.filter((bill) => matches([bill.name, bill.category, bill.notes])).map((bill) => ({ view: "bills", kind: "bill", id: bill.id, title: bill.name, meta: `${bill.category} ${money(bill.amount)} ${bill.notes}` })) },
    { label: "Subscriptions", items: state.subscriptions.filter((sub) => matches([sub.name, sub.category, sub.notes])).map((sub) => ({ view: "subscriptions", kind: "subscription", id: sub.id, title: sub.name, meta: `${sub.category} ${money(sub.cost)} ${sub.notes}` })) },
    { label: "Payments", items: state.paymentHistory.filter((payment) => matches([payment.creditorSnapshot, payment.note, payment.method, payment.type])).map((payment) => ({ view: "paymentHistory", kind: "payment", id: payment.id, title: payment.creditorSnapshot, meta: `${money(payment.amount)} ${payment.note} ${payment.method}` })) },
    { label: "Goals", items: state.goals.filter((goal) => matches([goal.name, goal.type, goal.notes, goal.milestones.join(" ")])).map((goal) => ({ view: "goals", kind: "goal", id: goal.id, title: goal.name, meta: `${goal.type} ${goal.notes}` })) },
    { label: "Reminders", items: reminders.filter((reminder) => matches([reminder.title, reminder.category, reminder.when])).map((reminder) => ({ view: "reminders", kind: "reminder", id: "", title: reminder.title, meta: `${reminder.category} ${reminder.when}` })) }
  ];
}

function highlightMatch(text, query) {
  const safe = esc(text || "");
  const q = query.trim();
  if (!q) return safe;
  return safe.replace(new RegExp(`(${escapeRegExp(q)})`, "ig"), "<mark>$1</mark>");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Builds the side-by-side payoff comparison shown in Debts and Dashboard.
function buildPlanComparison() {
  const debts = getPayoffDebts();
  if (!debts.length) return [];
  const extra = numberValue(state.budget.extraPayment || state.budget.moneyForDebt);
  const minimum = simulateMinimumOnly(debts);
  const snowball = simulatePayoffPlan(debts, extra, "snowball");
  const avalanche = simulatePayoffPlan(debts, extra, "avalanche");
  const custom = simulatePayoffPlan(debts, extra, "custom");
  const baselineMonths = minimum.months;
  const baselineInterest = minimum.totalInterest;

  return [
    { key: "minimum", name: "Minimum payments only", result: minimum },
    { key: "snowball", name: "Debt snowball", result: snowball },
    { key: "avalanche", name: "Debt avalanche", result: avalanche },
    { key: "custom", name: "Custom priority", result: custom }
  ].map((plan) => ({
    ...plan,
    result: {
      ...plan.result,
      monthsFaster: Number.isFinite(baselineMonths) && Number.isFinite(plan.result.months) ? Math.max(0, baselineMonths - plan.result.months) : 0,
      interestSaved: Number.isFinite(baselineInterest) && Number.isFinite(plan.result.totalInterest) ? Math.max(0, baselineInterest - plan.result.totalInterest) : 0
    }
  }));
}

function getPayoffDebts() {
  return state.debts
    .filter((debt) => debt.status === "active" && numberValue(debt.balance) > 0)
    .map((debt) => ({
      ...debt,
      balance: numberValue(debt.balance),
      apr: numberValue(debt.apr),
      minPayment: Math.max(0, numberValue(debt.minPayment)),
      priority: Number(debt.priority || 99)
    }));
}

// Minimum-only treats each debt independently, so paid-off minimums are not
// rolled into other debts. This gives a conservative baseline.
function simulateMinimumOnly(debts) {
  let totalInterest = 0;
  let maxMonths = 0;

  for (const debt of debts) {
    let balance = debt.balance;
    let months = 0;
    const minPayment = Math.max(1, debt.minPayment);
    while (balance > 0.01 && months < 600) {
      const interest = balance * (debt.apr / 100 / 12);
      if (interest >= minPayment && debt.apr > 0) return impossiblePlan();
      balance += interest;
      totalInterest += interest;
      balance -= Math.min(balance, minPayment);
      months += 1;
    }
    maxMonths = Math.max(maxMonths, months);
  }

  return {
    months: maxMonths,
    payoffDate: maxMonths ? formatMonth(addMonths(new Date(), maxMonths)) : "",
    totalInterest
  };
}

// Snowball, avalanche, and custom plans all roll paid-off minimums forward by
// using one monthly payment pool until every active debt reaches zero.
function simulatePayoffPlan(debts, extra, strategy) {
  const working = debts.map((debt) => ({ ...debt }));
  const totalMinimum = working.reduce((sum, debt) => sum + Math.max(1, debt.minPayment), 0);
  const monthlyPool = totalMinimum + Math.max(0, numberValue(extra));
  let totalInterest = 0;
  let months = 0;

  while (working.some((debt) => debt.balance > 0.01) && months < 600) {
    const active = working.filter((debt) => debt.balance > 0.01);
    let monthlyInterest = 0;
    active.forEach((debt) => {
      const interest = debt.balance * (debt.apr / 100 / 12);
      debt.balance += interest;
      monthlyInterest += interest;
    });
    totalInterest += monthlyInterest;

    if (monthlyPool <= monthlyInterest && active.some((debt) => debt.apr > 0)) return impossiblePlan();

    let remaining = monthlyPool;
    active.forEach((debt) => {
      const payment = Math.min(debt.balance, Math.max(1, debt.minPayment));
      debt.balance -= payment;
      remaining -= payment;
    });

    while (remaining > 0.01) {
      const target = sortDebtsForStrategy(working.filter((debt) => debt.balance > 0.01), strategy)[0];
      if (!target) break;
      const payment = Math.min(target.balance, remaining);
      target.balance -= payment;
      remaining -= payment;
    }

    months += 1;
  }

  if (months >= 600) return impossiblePlan();
  return {
    months,
    payoffDate: months ? formatMonth(addMonths(new Date(), months)) : "",
    totalInterest
  };
}

function impossiblePlan() {
  return {
    months: Infinity,
    payoffDate: "",
    totalInterest: Infinity
  };
}

function sortDebtsForStrategy(debts, strategy) {
  const sorted = [...debts];
  if (strategy === "snowball") return sorted.sort((a, b) => a.balance - b.balance || b.apr - a.apr);
  if (strategy === "avalanche") return sorted.sort((a, b) => b.apr - a.apr || a.balance - b.balance);
  return sorted.sort((a, b) => a.priority - b.priority || b.apr - a.apr);
}

function getDebtProgress() {
  const debts = state.debts.filter((debt) => numberValue(debt.startingBalance) > 0 || numberValue(debt.balance) > 0);
  if (!debts.length) return 0;
  const starting = debts.reduce((sum, debt) => sum + Math.max(numberValue(debt.startingBalance), numberValue(debt.balance)), 0);
  const remaining = debts.filter((debt) => debt.status !== "paid").reduce((sum, debt) => sum + numberValue(debt.balance), 0);
  return clamp(((starting - remaining) / starting) * 100, 0, 100);
}

function getSingleDebtProgress(debt) {
  const starting = Math.max(numberValue(debt.startingBalance), numberValue(debt.balance));
  if (!starting || debt.status === "paid") return debt.status === "paid" ? 100 : 0;
  return clamp(((starting - numberValue(debt.balance)) / starting) * 100, 0, 100);
}

// Calendar events are generated from recurring debts, bills, and subscriptions.
// Paid status is stored per event date so recurring items stay reusable.
function getEventsForMonth(date, filters = calendarFilters) {
  return getEventsInRange(startOfMonth(date), lastDayOfMonth(date), filters);
}

function getEventsInRange(start, end, filters = calendarFilters) {
  const allEvents = [
    ...(filters.debt ? getDebtEvents(start, end) : []),
    ...(filters.bill ? getBillEvents(start, end) : []),
    ...(filters.subscription ? getSubscriptionEvents(start, end) : [])
  ];
  return allEvents.sort((a, b) => a.date - b.date);
}

function getUpcomingEvents(days = 45) {
  return getEventsInRange(new Date(), addDays(new Date(), days), { debt: true, bill: true, subscription: true });
}

function getDebtEvents(start, end) {
  return state.debts
    .filter((debt) => debt.status === "active" && numberValue(debt.minPayment) > 0)
    .flatMap((debt) =>
      occurrencesInRange(debt.dueDate, "monthly", start, end).map((date) => ({
        key: eventKey("debt", debt.id, date),
        type: "debt",
        id: debt.id,
        name: debt.creditor || "Debt payment",
        amount: numberValue(debt.minPayment),
        date,
        note: "Minimum payment"
      }))
    );
}

function getBillEvents(start, end) {
  return state.bills.flatMap((bill) =>
    occurrencesInRange(bill.dueDate, bill.frequency, start, end).map((date) => ({
      key: eventKey("bill", bill.id, date),
      type: "bill",
      id: bill.id,
      name: bill.name || "Bill",
      amount: numberValue(bill.amount),
      date,
      note: labelize(bill.category)
    }))
  );
}

function getSubscriptionEvents(start, end) {
  return state.subscriptions
    .filter((sub) => sub.status === "active")
    .flatMap((sub) =>
      occurrencesInRange(sub.nextBillingDate, sub.frequency, start, end).map((date) => ({
        key: eventKey("subscription", sub.id, date),
        type: "subscription",
        id: sub.id,
        name: sub.name || "Subscription",
        amount: numberValue(sub.cost),
        date,
        note: labelize(sub.category)
      }))
    );
}

// Reminders are in-app first. Optional browser notifications are sent only
// while the app is open and only when the browser supports them.
function buildReminderItems() {
  const today = startOfDay(new Date());
  const events = getEventsInRange(addDays(today, -7), addDays(today, 45), { debt: true, bill: true, subscription: true });
  const reminderDays = [...new Set([...(state.settings.reminderDays || []), ...(state.reminderState.customDays || [])])];
  const reminders = events
    .map((event) => {
      const days = diffDays(today, event.date);
      const reminderKey = `event:${event.key}:${days}`;
      const exactReminder = reminderDays.includes(days);
      const dueSoon = days <= 0 || exactReminder || days <= 7;
      if (!dueSoon || isEventPaid(event) || isReminderHidden(reminderKey)) return null;
      return {
        key: reminderKey,
        eventKey: event.key,
        itemId: event.id,
        title: event.type === "debt" ? `${event.name} payment` : event.name,
        category: event.type === "subscription" ? "Subscription renewal" : event.type === "bill" ? "Bill due" : days < 0 ? "Payment overdue" : "Debt payment due",
        amount: event.amount,
        date: event.date,
        type: event.type,
        when: relativeDateLabel(event.date),
        label: days < 0 ? "Overdue" : days === 0 ? "Today" : `${days}d`,
        urgency: days < 0 ? "danger" : days <= 1 ? "warning" : "primary"
      };
    })
    .filter(Boolean);

  const payoffPlan = buildPlanComparison().find((plan) => plan.key === "avalanche");
  if (payoffPlan?.result.payoffDate && !isReminderHidden(`review:debt:${toDateKey(addDays(today, 7))}`)) {
    reminders.push({
      key: `review:debt:${toDateKey(addDays(today, 7))}`,
      title: "Debt payoff plan check-in",
      category: "Debt payoff reminder",
      amount: 0,
      date: addDays(today, 7),
      type: "debt",
      when: "In 7 days",
      label: "Plan",
      urgency: "primary"
    });
  }

  const monthlyReviewDate = new Date(today.getFullYear(), today.getMonth(), Math.min(28, today.getDate() + (today.getDate() > 25 ? 0 : 28 - today.getDate())));
  const annualReviewDate = new Date(today.getFullYear(), 11, 15);
  [
    { key: `review:budget:${toDateKey(monthlyReviewDate)}`, title: "Monthly budget review", category: "Monthly budget review", date: monthlyReviewDate, type: "budget" },
    { key: `review:progress:${toDateKey(monthlyReviewDate)}`, title: "Monthly debt progress review", category: "Monthly debt progress review", date: monthlyReviewDate, type: "debt" },
    { key: `review:annual:${toDateKey(annualReviewDate)}`, title: "Annual financial review", category: "Annual financial review", date: annualReviewDate, type: "annual" },
    { key: `review:subs:${toDateKey(addDays(today, 14))}`, title: "Subscription price review", category: "Subscription price review", date: addDays(today, 14), type: "subscription" }
  ].forEach((item) => {
    if (!isReminderHidden(item.key) && diffDays(today, item.date) <= 14) {
      reminders.push({ ...item, amount: 0, when: relativeDateLabel(item.date), label: diffDays(today, item.date) === 0 ? "Today" : `${diffDays(today, item.date)}d`, urgency: "primary" });
    }
  });

  return reminders.sort((a, b) => a.date - b.date).slice(0, 20);
}

function isReminderHidden(key) {
  if (state.reminderState.dismissed?.[key]) return true;
  const snoozeUntil = state.reminderState.snoozed?.[key];
  return snoozeUntil ? parseInputDate(snoozeUntil) > startOfDay(new Date()) : false;
}

function buildSmartReminderSummary() {
  const weekEvents = getEventsInRange(new Date(), addDays(new Date(), 7), { debt: true, bill: true, subscription: true }).filter((event) => !isEventPaid(event));
  const overdue = getEventsInRange(addDays(new Date(), -30), addDays(new Date(), -1), { debt: true, bill: true, subscription: true }).filter((event) => !isEventPaid(event));
  const renewals = getSubscriptionEvents(startOfMonth(new Date()), lastDayOfMonth(new Date()));
  const yearStartProgress = state.debts.reduce((sum, debt) => sum + Math.max(numberValue(debt.startingBalance), numberValue(debt.balance)), 0) - getTotals().totalDebt;
  const goalAtRisk = getGoalSummaries().some((goal) => ["At risk", "Behind"].includes(goal.status));
  return [
    `${weekEvents.length} payments due in the next 7 days totaling ${money(weekEvents.reduce((sum, event) => sum + event.amount, 0))}.`,
    overdue.length ? `${overdue.length} overdue item${overdue.length === 1 ? "" : "s"} need review.` : "No overdue payments found.",
    `${renewals.length} subscription renewal${renewals.length === 1 ? "" : "s"} this month.`,
    goalAtRisk ? "At least one goal is at risk. Open Goals to review." : "No goals currently flagged at risk.",
    `Debt paid down since starting balances: ${money(Math.max(0, yearStartProgress))}.`,
    "Upcoming annual financial review is available in More."
  ];
}

function isEventPaid(event) {
  return Boolean(state.payments[event.key]?.paid);
}

function getCollection(type) {
  if (type === "debt") return state.debts;
  if (type === "bill") return state.bills;
  return state.subscriptions;
}

function newItem(type) {
  const nextDate = toInputDate(addDays(new Date(), 7));
  if (type === "debt") {
    return { creditor: "", type: "Credit card", balance: 0, startingBalance: 0, apr: 0, minPayment: 0, dueDate: nextDate, notes: "", priority: state.debts.length + 1, status: "active" };
  }
  if (type === "bill") {
    return { name: "", category: "Other", amount: 0, dueDate: nextDate, frequency: "monthly", status: "unpaid", notes: "" };
  }
  return { name: "", category: "Other", cost: 0, frequency: "monthly", nextBillingDate: nextDate, cancellationLink: "", notes: "", status: "active" };
}

function renderMethodOptions(selected) {
  return [
    ["minimum", "Minimum payments only"],
    ["snowball", "Debt snowball"],
    ["avalanche", "Debt avalanche"],
    ["custom", "Custom priority"]
  ].map(([value, label]) => `<option value="${value}" ${selected === value ? "selected" : ""}>${label}</option>`).join("");
}

async function createScheduledPaymentFromEvent(eventInfo, sourceEventKey) {
  const debt = state.debts.find((entry) => entry.id === eventInfo.id);
  if (!debt) return;
  const amount = Math.min(numberValue(debt.balance), numberValue(eventInfo.amount));
  const interest = Math.min(amount, monthlyInterestForDebt(debt));
  const principal = Math.max(0, amount - interest);
  const payment = {
    id: uid(),
    debtId: debt.id,
    creditorSnapshot: debt.creditor || "Unknown creditor",
    date: toInputDate(eventInfo.date),
    amount,
    principal,
    interest,
    balanceBefore: numberValue(debt.balance),
    balanceAfter: Math.max(0, numberValue(debt.balance) - principal),
    note: "Created from calendar paid status.",
    method: "",
    type: "scheduled",
    sourceEventKey,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  if (!debt.historyBaseline) debt.historyBaseline = numberValue(debt.balance);
  state.paymentHistory.push(payment);
  recalculateDebtFromHistory(debt.id);
}

function rememberSearch(term) {
  const clean = term.trim();
  if (!clean) return;
  state.search.recent = [clean, ...state.search.recent.filter((item) => item.toLowerCase() !== clean.toLowerCase())].slice(0, 8);
  saveState();
}

async function saveAppLockSettings(formData) {
  const wantsEnabled = formData.get("enabled") === "on";
  const pin = String(formData.get("pin") || "");
  const confirmPin = String(formData.get("confirmPin") || "");
  const currentPin = String(formData.get("currentPin") || "");
  state.appLock.autoLock = String(formData.get("autoLock") || "hidden");

  if (!wantsEnabled) {
    if (state.appLock.enabled && !(await verifyPin(currentPin))) {
      alert("Enter the current PIN before turning App Lock off.");
      return;
    }
    state.appLock.enabled = false;
    isUnlocked = true;
    await saveState();
    render();
    return;
  }

  if (state.appLock.enabled && !(await verifyPin(currentPin))) {
    alert("Enter the current PIN to change app lock settings.");
    return;
  }

  if (state.appLock.enabled && !pin) {
    state.appLock.enabled = true;
    await saveState();
    render();
    return;
  }

  if (!/^\d{4}$|^\d{6}$/.test(pin)) {
    alert("Use a 4-digit or 6-digit PIN.");
    return;
  }
  if (pin !== confirmPin) {
    alert("PIN and confirmation do not match.");
    return;
  }
  const salt = randomSalt();
  state.appLock.salt = salt;
  state.appLock.pinHash = await hashPin(pin, salt);
  state.appLock.pinLength = pin.length;
  state.appLock.enabled = true;
  state.appLock.failedAttempts = 0;
  state.appLock.lockedUntil = 0;
  isUnlocked = true;
  await saveState();
  render();
}

async function unlockWithPin(pin) {
  if (Date.now() < state.appLock.lockedUntil) {
    render();
    return;
  }
  const ok = await verifyPin(pin);
  if (ok) {
    isUnlocked = true;
    state.appLock.failedAttempts = 0;
    state.appLock.lockedUntil = 0;
    lockStartedAt = Date.now();
  } else {
    state.appLock.failedAttempts += 1;
    if (state.appLock.failedAttempts >= 3) {
      state.appLock.lockedUntil = Date.now() + Math.min(30000, state.appLock.failedAttempts * 5000);
    }
  }
  await saveState();
  render();
}

async function verifyPin(pin) {
  if (!state.appLock.pinHash || !state.appLock.salt) return false;
  return (await hashPin(pin, state.appLock.salt)) === state.appLock.pinHash;
}

async function hashPin(pin, salt) {
  const bytes = new TextEncoder().encode(`${salt}:${pin}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function randomSalt() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function detectBiometricSupport() {
  try {
    return Boolean(window.PublicKeyCredential && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable());
  } catch {
    return false;
  }
}

async function enableBiometric() {
  if (!biometricAvailable) {
    alert("Device verification is not supported in this browser.");
    return;
  }
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: "Debt Freedom Tracker" },
        user: { id: crypto.getRandomValues(new Uint8Array(16)), name: "local-user", displayName: "Local user" },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
        timeout: 60000
      }
    });
    state.appLock.biometricCredentialId = arrayBufferToBase64(credential.rawId);
    state.appLock.biometricEnabled = true;
    await saveState();
    render();
  } catch {
    alert("Device verification was not enabled. PIN unlock still works.");
  }
}

async function biometricUnlock() {
  if (!state.appLock.biometricEnabled || !state.appLock.biometricCredentialId) return;
  try {
    await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        allowCredentials: [{ type: "public-key", id: base64ToArrayBuffer(state.appLock.biometricCredentialId) }],
        userVerification: "required",
        timeout: 60000
      }
    });
    isUnlocked = true;
    state.appLock.failedAttempts = 0;
    await saveState();
    render();
  } catch {
    alert("Device verification failed. Use your PIN.");
  }
}

function arrayBufferToBase64(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function base64ToArrayBuffer(value) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0)).buffer;
}

function maybeAutoLock() {
  if (!state?.appLock.enabled || !isUnlocked) return;
  const mode = state.appLock.autoLock;
  if (mode === "never") return;
  if (mode === "hidden" || document.hidden) {
    isUnlocked = false;
    render();
    return;
  }
  const minutes = Number(mode);
  if (Number.isFinite(minutes) && Date.now() - lockStartedAt >= minutes * 60000) {
    isUnlocked = false;
    render();
  }
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) maybeAutoLock();
  else lockStartedAt = Date.now();
});

setInterval(maybeAutoLock, 30000);

document.addEventListener("click", async (event) => {
  const viewButton = event.target.closest("[data-view]");
  if (viewButton) {
    activeView = viewButton.dataset.view;
    modalState = null;
    render();
    return;
  }

  const actionEl = event.target.closest("[data-action]");
  if (!actionEl) return;
  const action = actionEl.dataset.action;

  if (action === "open-form") {
    modalState = { type: actionEl.dataset.type, id: actionEl.dataset.id || null };
    render();
  }

  if (action === "open-payment-form") {
    modalState = { kind: "payment", id: actionEl.dataset.paymentId || null, debtId: actionEl.dataset.id || "" };
    render();
  }

  if (action === "open-goal-form") {
    modalState = { kind: "goal", id: actionEl.dataset.id || null };
    render();
  }

  if (action === "open-search") {
    searchOpen = true;
    render();
  }

  if (action === "close-search") {
    searchOpen = false;
    searchQuery = "";
    render();
  }

  if (action === "close-modal") {
    modalState = null;
    importPreview = null;
    render();
  }

  if (action === "delete-item") {
    await deleteItem(actionEl.dataset.type, actionEl.dataset.id);
  }

  if (action === "mark-debt-paid") {
    const debt = state.debts.find((entry) => entry.id === actionEl.dataset.id);
    if (debt) {
      debt.status = "paid";
      debt.balance = 0;
      await saveState();
      render();
    }
  }

  if (action === "toggle-paid") {
    const key = actionEl.dataset.key;
    const eventInfo = eventFromKey(key);
    const nextPaid = !state.payments[key]?.paid;
    state.payments[key] = { paid: nextPaid, updatedAt: new Date().toISOString() };
    if (nextPaid && eventInfo?.type === "debt" && !state.paymentHistory.some((payment) => payment.sourceEventKey === key)) {
      await createScheduledPaymentFromEvent(eventInfo, key);
    }
    await saveState();
    render();
  }

  if (action === "calendar-prev") {
    calendarCursor = addMonths(calendarCursor, -1);
    render();
  }

  if (action === "calendar-next") {
    calendarCursor = addMonths(calendarCursor, 1);
    render();
  }

  if (action === "cycle-sub-status") {
    const sub = state.subscriptions.find((entry) => entry.id === actionEl.dataset.id);
    if (sub) {
      sub.status = sub.status === "active" ? "paused" : sub.status === "paused" ? "canceled" : "active";
      await saveState();
      render();
    }
  }

  if (action === "export-data") {
    exportData();
  }

  if (action === "delete-payment") {
    await deletePayment(actionEl.dataset.id);
  }

  if (action === "delete-goal") {
    if (confirm("Delete this goal?")) {
      state.goals = state.goals.filter((goal) => goal.id !== actionEl.dataset.id);
      modalState = null;
      await saveState();
      render();
    }
  }

  if (action === "reset-simulator") {
    simulatorState = { method: "avalanche", totalMonthly: getTotals().minimumPayments, extra: numberValue(state.budget.extraPayment) };
    render();
  }

  if (action === "sim-add") {
    simulatorState.extra = numberValue(simulatorState.extra) + numberValue(actionEl.dataset.amount);
    render();
  }

  if (action === "apply-sim-plan") {
    modalState = { kind: "applyPlan" };
    render();
  }

  if (action === "confirm-apply-plan") {
    const total = numberValue(simulatorState.totalMonthly) + numberValue(simulatorState.extra);
    state.budget.moneyForDebt = total;
    state.budget.extraPayment = Math.max(0, numberValue(simulatorState.extra));
    modalState = null;
    await saveState();
    render();
  }

  if (action === "clear-data") {
    if (confirm("Clear all local Debt Freedom Tracker data on this device?")) {
      state = createDefaultState();
      await saveState();
      activeView = "dashboard";
      render();
    }
  }

  if (action === "load-sample") {
    if (confirm("Replace local data with sample tracker data?")) {
      state = createSampleState();
      await saveState();
      activeView = "dashboard";
      render();
    }
  }

  if (action === "enable-alerts") {
    await enableBrowserAlerts();
  }

  if (action === "dismiss-reminder") {
    state.reminderState.dismissed[actionEl.dataset.key] = new Date().toISOString();
    await saveState();
    render();
  }

  if (action === "snooze-reminder") {
    state.reminderState.snoozed[actionEl.dataset.key] = toInputDate(addDays(new Date(), 1));
    await saveState();
    render();
  }

  if (action === "lock-now") {
    isUnlocked = false;
    lockStartedAt = Date.now();
    render();
  }

  if (action === "forgot-pin") {
    alert("For privacy, the app cannot recover a forgotten PIN because only a salted hash is stored. If no recovery method is available, export backups before enabling App Lock and clear local app data only as a last resort.");
  }

  if (action === "change-pin") {
    alert("Enter your current PIN plus the new confirmed PIN in this section, then tap Save lock.");
  }

  if (action === "enable-biometric") {
    await enableBiometric();
  }

  if (action === "biometric-unlock") {
    await biometricUnlock();
  }

  if (action === "merge-import") {
    await finishImport("merge");
  }

  if (action === "replace-import") {
    await finishImport("replace");
  }

  if (action === "print-annual") {
    window.print();
  }

  if (action === "export-annual-csv") {
    exportAnnualCsv();
  }

  if (action === "use-recent-search") {
    searchQuery = actionEl.dataset.term || "";
    render();
  }

  if (action === "clear-recent-searches") {
    state.search.recent = [];
    await saveState();
    render();
  }

  if (action === "open-search-result") {
    activeView = actionEl.dataset.viewTarget;
    searchOpen = false;
    rememberSearch(searchQuery);
    render();
  }
});

document.addEventListener("submit", async (event) => {
  const form = event.target.closest("form");
  if (!form) return;
  event.preventDefault();

  if (form.dataset.form === "budget") {
    const data = new FormData(form);
    budgetFields.forEach(([name]) => {
      state.budget[name] = numberValue(data.get(name));
    });
    state.budget.notes = String(data.get("notes") || "");
    await saveState();
    render();
  }

  if (form.dataset.form === "unlock") {
    const pin = String(new FormData(form).get("pin") || "");
    await unlockWithPin(pin);
  }

  if (form.dataset.form === "app-lock") {
    await saveAppLockSettings(new FormData(form));
  }

  if (form.dataset.form === "payment") {
    await savePaymentRecord(new FormData(form));
  }

  if (form.dataset.form === "goal") {
    await saveGoalRecord(new FormData(form));
  }

  if (form.dataset.form === "entity") {
    await saveEntity(new FormData(form));
  }
});

document.addEventListener("change", async (event) => {
  const target = event.target;
  if (target.matches("[data-action='toggle-filter']")) {
    calendarFilters[target.dataset.filter] = target.checked;
    render();
  }

  if (target.matches("[data-action='toggle-reminder-day']")) {
    const day = Number(target.dataset.day);
    const set = new Set(state.settings.reminderDays);
    if (target.checked) set.add(day);
    else set.delete(day);
    state.settings.reminderDays = [...set].sort((a, b) => a - b);
    await saveState();
    render();
  }

  if (target.matches("[data-action='import-data']")) {
    await importData(target.files?.[0]);
  }

  if (target.matches("[data-action='sim-method']")) {
    simulatorState.method = target.value;
    render();
  }

  if (target.matches("[data-action='chart-mode']")) {
    chartMode = target.value;
    render();
  }

  if (target.matches("[data-action='annual-year']")) {
    annualYear = Number(target.value);
    render();
  }

  if (target.matches("[data-action='history-debt']")) {
    historyFilters.debtId = target.value;
    render();
  }

  if (target.matches("[data-action='history-type']")) {
    historyFilters.type = target.value;
    render();
  }
});

document.addEventListener("input", (event) => {
  const target = event.target;
  if (target.matches("[data-action='what-if']")) {
    whatIfExtra = numberValue(target.value);
    render();
  }

  if (target.matches("[data-action='sim-total']")) {
    simulatorState.totalMonthly = numberValue(target.value);
    render();
  }

  if (target.matches("[data-action='sim-extra'], [data-action='sim-extra-slider']")) {
    simulatorState.extra = numberValue(target.value);
    render();
  }

  if (target.matches("[data-action='history-query']")) {
    historyFilters.query = target.value;
    render();
  }

  if (target.matches("[data-action='history-start']")) {
    historyFilters.start = target.value;
    render();
  }

  if (target.matches("[data-action='history-end']")) {
    historyFilters.end = target.value;
    render();
  }

  if (target.matches("[data-action='global-search-input']")) {
    searchQuery = target.value;
    render();
  }

  if (target.matches("[data-action='add-custom-reminder-day']") && target.value !== "") {
    const day = numberValue(target.value);
    if (Number.isFinite(day) && day >= 0) {
      state.reminderState.customDays = [...new Set([...state.reminderState.customDays, day])].sort((a, b) => a - b);
      saveState();
      render();
    }
  }
});

async function saveEntity(formData) {
  const { type, id } = modalState;
  const collection = getCollection(type);
  const existing = collection.find((entry) => entry.id === id);
  const item = existing || { id: uid() };

  if (type === "debt") {
    Object.assign(item, {
      creditor: String(formData.get("creditor") || ""),
      type: String(formData.get("type") || "Other"),
      balance: numberValue(formData.get("balance")),
      apr: numberValue(formData.get("apr")),
      minPayment: numberValue(formData.get("minPayment")),
      dueDate: String(formData.get("dueDate") || toInputDate(new Date())),
      notes: String(formData.get("notes") || ""),
      priority: Number(formData.get("priority") || collection.length + 1),
      status: String(formData.get("status") || "active")
    });
    item.startingBalance = Math.max(numberValue(item.startingBalance), numberValue(item.balance));
  }

  if (type === "bill") {
    Object.assign(item, {
      name: String(formData.get("name") || ""),
      category: String(formData.get("category") || "Other"),
      amount: numberValue(formData.get("amount")),
      dueDate: String(formData.get("dueDate") || toInputDate(new Date())),
      frequency: String(formData.get("frequency") || "monthly"),
      status: String(formData.get("status") || "unpaid"),
      notes: String(formData.get("notes") || "")
    });
  }

  if (type === "subscription") {
    Object.assign(item, {
      name: String(formData.get("name") || ""),
      category: String(formData.get("category") || "Other"),
      cost: numberValue(formData.get("cost")),
      frequency: String(formData.get("frequency") || "monthly"),
      nextBillingDate: String(formData.get("nextBillingDate") || toInputDate(new Date())),
      cancellationLink: String(formData.get("cancellationLink") || ""),
      status: String(formData.get("status") || "active"),
      notes: String(formData.get("notes") || "")
    });
  }

  if (!existing) collection.push(item);
  modalState = null;
  await saveState();
  render();
}

async function deleteItem(type, id) {
  if (!confirm(`Delete this ${type}?`)) return;
  const collectionName = type === "debt" ? "debts" : type === "bill" ? "bills" : "subscriptions";
  state[collectionName] = state[collectionName].filter((entry) => entry.id !== id);
  Object.keys(state.payments).forEach((key) => {
    if (key.startsWith(`${type}:${id}:`)) delete state.payments[key];
  });
  modalState = null;
  await saveState();
  render();
}

function exportData() {
  const payload = {
    app: "Debt Freedom Tracker",
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: state
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `debt-freedom-tracker-${toInputDate(new Date())}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

async function importData(file) {
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const sourceSchema = parsed.schemaVersion || parsed.data?.schemaVersion || parsed.version || parsed.data?.version || 1;
    const data = normalizeState(parsed.data || parsed);
    importPreview = { schemaVersion: sourceSchema, data };
    modalState = { kind: "importPreview" };
    render();
  } catch (error) {
    alert("That JSON file could not be imported.");
    console.error(error);
  }
}

async function finishImport(mode) {
  if (!importPreview) return;
  if (mode === "replace") {
    if (!confirm("Replace all local data with the imported backup?")) return;
    state = normalizeState(importPreview.data);
  } else {
    state = mergeImportedState(state, importPreview.data);
  }
  importPreview = null;
  modalState = null;
  activeView = "dashboard";
  await saveState();
  render();
}

function mergeImportedState(current, imported) {
  const merged = normalizeState(current);
  const addUnique = (key) => {
    const seen = new Set(merged[key].map((item) => item.id));
    imported[key].forEach((item) => {
      if (!seen.has(item.id)) merged[key].push(item);
    });
  };
  ["debts", "bills", "subscriptions", "paymentHistory", "goals"].forEach(addUnique);
  merged.budget = { ...merged.budget, ...imported.budget };
  merged.settings = { ...merged.settings, ...imported.settings };
  merged.reminderState = {
    dismissed: { ...merged.reminderState.dismissed, ...imported.reminderState.dismissed },
    snoozed: { ...merged.reminderState.snoozed, ...imported.reminderState.snoozed },
    customDays: [...new Set([...merged.reminderState.customDays, ...imported.reminderState.customDays])]
  };
  merged.payments = { ...merged.payments, ...imported.payments };
  return normalizeState(merged);
}

function exportAnnualCsv() {
  const review = buildAnnualReviewData(annualYear);
  const rows = [
    ["Metric", "Value"],
    ["Year", annualYear],
    ["Beginning debt", review.beginningDebtLabel],
    ["Ending debt", review.endingDebtLabel],
    ["Debt reduction", review.debtReduction],
    ["Percent reduced", `${review.percentReduced}%`],
    ["Payments made", review.paymentTotals.amount],
    ["Principal paid", review.paymentTotals.principal],
    ["Interest paid", review.paymentTotals.interest],
    ["Bills paid", review.totalBillsPaid],
    ["Subscriptions paid", review.totalSubscriptionsPaid],
    ["Canceled annual savings", review.canceledSavings]
  ];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `debt-freedom-annual-review-${annualYear}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

async function enableBrowserAlerts() {
  if (!("Notification" in window)) {
    state.settings.browserAlerts = false;
    await saveState();
    alert("This browser does not support local notification alerts.");
    render();
    return;
  }

  const permission = await Notification.requestPermission();
  state.settings.browserAlerts = permission === "granted";
  await saveState();
  if (permission === "granted") {
    new Notification("Debt Freedom Tracker", {
      body: "Browser alerts are on while this app is open."
    });
  }
  render();
}

function maybeSendBrowserAlerts() {
  if (!state?.settings.browserAlerts || !("Notification" in window) || Notification.permission !== "granted") return;
  const todayKey = toDateKey(new Date());
  const notified = new Set(state.settings.notifiedKeys || []);
  const reminders = buildReminderItems().filter((reminder) => ["Today", "1d"].includes(reminder.label));

  reminders.forEach((reminder) => {
    const key = `${todayKey}:${reminder.title}:${reminder.label}`;
    if (notified.has(key)) return;
    new Notification(reminder.title, {
      body: `${reminder.category}${reminder.amount ? ` - ${money(reminder.amount)}` : ""} - ${reminder.when}`
    });
    notified.add(key);
  });

  state.settings.notifiedKeys = [...notified].slice(-80);
  saveState();
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.warn("Service worker registration failed", error);
    });
  }
}

function notificationStatusText() {
  if (!("Notification" in window)) return "Not supported by this browser";
  if (Notification.permission === "granted" && state.settings.browserAlerts) return "On while app is open";
  if (Notification.permission === "denied") return "Blocked in browser settings";
  return "Off";
}

function monthlySubscriptionCost(sub) {
  const cost = numberValue(sub.cost);
  if (sub.frequency === "weekly") return cost * 52 / 12;
  if (sub.frequency === "quarterly") return cost / 3;
  if (sub.frequency === "yearly") return cost / 12;
  return cost;
}

function occurrencesInRange(baseDateString, frequency, rangeStart, rangeEnd) {
  const baseDate = parseInputDate(baseDateString);
  const start = startOfDay(rangeStart);
  const end = startOfDay(rangeEnd);
  if (!baseDate || baseDate > end) return [];

  if (frequency === "one-time") {
    return baseDate >= start && baseDate <= end ? [baseDate] : [];
  }

  if (frequency === "weekly" || frequency === "biweekly") {
    const step = frequency === "weekly" ? 7 : 14;
    const dates = [];
    let cursor = startOfDay(baseDate);
    while (cursor < start) cursor = addDays(cursor, step);
    while (cursor <= end) {
      dates.push(cursor);
      cursor = addDays(cursor, step);
    }
    return dates;
  }

  const stepMonths = frequency === "quarterly" ? 3 : frequency === "yearly" ? 12 : 1;
  const dates = [];
  let cursor = startOfMonth(start);
  const finalMonth = startOfMonth(end);
  while (cursor <= finalMonth) {
    const diff = monthDiff(startOfMonth(baseDate), cursor);
    if (diff >= 0 && diff % stepMonths === 0) {
      const day = Math.min(baseDate.getDate(), daysInMonth(cursor.getFullYear(), cursor.getMonth()));
      const occurrence = new Date(cursor.getFullYear(), cursor.getMonth(), day);
      if (occurrence >= start && occurrence <= end && occurrence >= baseDate) dates.push(occurrence);
    }
    cursor = addMonths(cursor, 1);
  }
  return dates;
}

function getNextOccurrence(baseDateString, frequency) {
  return occurrencesInRange(baseDateString, frequency, new Date(), addDays(new Date(), 370))[0] || parseInputDate(baseDateString);
}

function nextMonthlyDate(baseDateString) {
  return getNextOccurrence(baseDateString, "monthly");
}

function eventKey(type, id, date) {
  return `${type}:${id}:${toDateKey(date)}`;
}

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function numberValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function money(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "Needs review";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2
  }).format(amount);
}

function formatPercent(value) {
  return `${numberValue(value).toFixed(numberValue(value) % 1 === 0 ? 0 : 2)}%`;
}

function labelize(value) {
  return String(value || "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusLabel(status) {
  return status === "paid" ? "Paid off" : labelize(status);
}

function statusClass(status) {
  if (status === "paid" || status === "canceled") return "paid";
  if (status === "paused") return "warning";
  return "primary";
}

function parseInputDate(value) {
  if (!value) return startOfDay(new Date());
  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return startOfDay(new Date(value));
  return new Date(year, month - 1, day);
}

function toInputDate(date) {
  const value = startOfDay(date);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDateKey(date) {
  return toInputDate(date);
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function lastDayOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return startOfDay(next);
}

function addMonths(date, months) {
  const next = new Date(date);
  const day = next.getDate();
  next.setDate(1);
  next.setMonth(next.getMonth() + months);
  next.setDate(Math.min(day, daysInMonth(next.getFullYear(), next.getMonth())));
  return startOfDay(next);
}

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function monthDiff(start, end) {
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
}

function diffDays(start, end) {
  const ms = startOfDay(end) - startOfDay(start);
  return Math.round(ms / 86400000);
}

function formatMonth(date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(date);
}

function formatShortDate(date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

function relativeDateLabel(date) {
  const days = diffDays(new Date(), date);
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
