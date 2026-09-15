// Money OS — iOS Home Screen Widget
// ─────────────────────────────────────────────────────────────────────────────
// Requirements: Scriptable (free, App Store)
//
// Setup:
//   1. Install Scriptable from the App Store
//   2. Create a new script, paste this entire file
//   3. Replace YOUR_TOKEN_HERE below with your API token
//      (Settings → API Keys in Money OS → copy the token)
//   4. Long-press your home screen → + → Scriptable → Small or Medium
//   5. Edit the widget → choose this script
// ─────────────────────────────────────────────────────────────────────────────

const API_TOKEN = "YOUR_TOKEN_HERE";
const BASE_URL  = "https://jaiparmani.pythonanywhere.com";
const APP_URL   = "https://roaring-phoenix-c2dfd0.netlify.app";

// Palette
const DARK_BG    = new Color("#0a0e1a");
const CARD_BG    = new Color("#111827");
const MINT       = new Color("#2dd4a7");
const AMBER      = new Color("#f59e0b");
const MUTED      = new Color("#64748b");
const SECONDARY  = new Color("#94a3b8");
const WHITE      = Color.white();

// ── helpers ──────────────────────────────────────────────────────────────────

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function fmt(n) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

async function apiFetch(path) {
  const req = new Request(BASE_URL + path);
  req.headers = { Authorization: "Token " + API_TOKEN };
  req.timeoutInterval = 8;
  return req.loadJSON();
}

async function loadData() {
  const t = todayStr();

  // Today's expenses
  const todayRes = await apiFetch(
    `/api/expenses/expenses/?date_from=${t}&date_to=${t}&page_size=100`
  );
  const expenses = todayRes.results || [];
  const todayTotal = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);

  // Top category by spend
  const catMap = {};
  expenses.forEach(e => {
    const cat = e.category_name || "Other";
    catMap[cat] = (catMap[cat] || 0) + parseFloat(e.amount || 0);
  });
  const topCat = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0];

  // Streak: last 100 expenses, count consecutive days from today backward
  const recentRes = await apiFetch(
    `/api/expenses/expenses/?ordering=-date&page_size=100`
  );
  const recent = recentRes.results || [];
  const dateSets = new Set(recent.map(e => e.date));
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  for (let i = 0; i < 60; i++) {
    const ds = cursor.toISOString().split("T")[0];
    if (dateSets.has(ds)) {
      streak++;
    } else if (i > 0) {
      break; // gap — stop counting
    }
    cursor.setDate(cursor.getDate() - 1);
  }

  // Monthly summary (current month spend vs prev)
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const summaryRes = await apiFetch(
    `/api/expenses/expenses/summary/?date_from=${monthStart}&date_to=${t}`
  );
  const monthTotal = parseFloat(summaryRes.total_expenses || 0);

  return { todayTotal, count: expenses.length, topCat, streak, monthTotal };
}

// ── widget builder ────────────────────────────────────────────────────────────

const hour = new Date().getHours();
const greeting =
  hour < 5  ? "Night"     :
  hour < 12 ? "Morning"   :
  hour < 17 ? "Afternoon" : "Evening";

const w = new ListWidget();
w.backgroundColor = DARK_BG;
w.url = APP_URL;
w.setPadding(14, 14, 14, 14);
w.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000); // refresh every 15 min

let data;
try {
  data = await loadData();
} catch (err) {
  // Fallback if no network / bad token
  const t = w.addText("Money OS");
  t.textColor = WHITE;
  t.font = Font.boldSystemFont(16);
  w.addSpacer(4);
  const sub = w.addText(API_TOKEN === "YOUR_TOKEN_HERE"
    ? "Tap to set your API token"
    : "Couldn't load data");
  sub.textColor = MUTED;
  sub.font = Font.systemFont(11);
  Script.setWidget(w);
  Script.complete();
  return;
}

// ── SMALL layout ──────────────────────────────────────────────────────────────
if (config.widgetFamily === "small" || !config.widgetFamily) {
  const greet = w.addText(greeting);
  greet.textColor = SECONDARY;
  greet.font = Font.systemFont(10);

  w.addSpacer(6);

  const amt = w.addText(fmt(data.todayTotal));
  amt.textColor = WHITE;
  amt.font = Font.boldSystemFont(26);
  amt.minimumScaleFactor = 0.5;

  const txn = w.addText(`${data.count} today`);
  txn.textColor = MUTED;
  txn.font = Font.systemFont(10);

  w.addSpacer();

  if (data.topCat) {
    const cat = w.addText(data.topCat[0]);
    cat.textColor = MINT;
    cat.font = Font.systemFont(10);
    cat.lineLimit = 1;
  }

  if (data.streak > 0) {
    const s = w.addText(`🔥 ${data.streak}d`);
    s.textColor = AMBER;
    s.font = Font.systemFont(10);
  }
}

// ── MEDIUM layout ─────────────────────────────────────────────────────────────
else if (config.widgetFamily === "medium") {
  const header = w.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();

  const titleStack = header.addStack();
  titleStack.layoutVertically();

  const greet = titleStack.addText(`Good ${greeting}`);
  greet.textColor = SECONDARY;
  greet.font = Font.systemFont(11);

  const appName = titleStack.addText("Money OS");
  appName.textColor = WHITE;
  appName.font = Font.boldSystemFont(13);

  header.addSpacer();

  if (data.streak > 0) {
    const streakPill = header.addStack();
    streakPill.backgroundColor = new Color("#f59e0b22");
    streakPill.cornerRadius = 8;
    streakPill.setPadding(3, 7, 3, 7);
    const st = streakPill.addText(`🔥 ${data.streak}d`);
    st.textColor = AMBER;
    st.font = Font.boldSystemFont(11);
  }

  w.addSpacer(10);

  const row = w.addStack();
  row.layoutHorizontally();
  row.spacing = 12;

  // Today block
  const todayBlock = row.addStack();
  todayBlock.layoutVertically();
  const todayLabel = todayBlock.addText("Today");
  todayLabel.textColor = MUTED;
  todayLabel.font = Font.systemFont(10);
  const todayAmt = todayBlock.addText(fmt(data.todayTotal));
  todayAmt.textColor = WHITE;
  todayAmt.font = Font.boldSystemFont(22);
  todayAmt.minimumScaleFactor = 0.6;
  const txnCount = todayBlock.addText(`${data.count} transactions`);
  txnCount.textColor = MUTED;
  txnCount.font = Font.systemFont(10);

  row.addSpacer();

  // Month block
  const monthBlock = row.addStack();
  monthBlock.layoutVertically();
  const monthLabel = monthBlock.addText("This month");
  monthLabel.textColor = MUTED;
  monthLabel.font = Font.systemFont(10);
  const monthAmt = monthBlock.addText(fmt(data.monthTotal));
  monthAmt.textColor = MINT;
  monthAmt.font = Font.boldSystemFont(22);
  monthAmt.minimumScaleFactor = 0.6;
  if (data.topCat) {
    const topCatText = monthBlock.addText(data.topCat[0]);
    topCatText.textColor = MUTED;
    topCatText.font = Font.systemFont(10);
    topCatText.lineLimit = 1;
  }
}

// ── LARGE layout ──────────────────────────────────────────────────────────────
else {
  const greet = w.addText(`Good ${greeting}`);
  greet.textColor = SECONDARY;
  greet.font = Font.systemFont(12);
  w.addSpacer(4);

  const todayLabel = w.addText("Today");
  todayLabel.textColor = MUTED;
  todayLabel.font = Font.systemFont(11);

  const todayAmt = w.addText(fmt(data.todayTotal));
  todayAmt.textColor = WHITE;
  todayAmt.font = Font.boldSystemFont(32);

  const txn = w.addText(`${data.count} transactions`);
  txn.textColor = MUTED;
  txn.font = Font.systemFont(11);

  w.addSpacer(14);

  const monthLabel = w.addText("This month");
  monthLabel.textColor = MUTED;
  monthLabel.font = Font.systemFont(11);

  const monthAmt = w.addText(fmt(data.monthTotal));
  monthAmt.textColor = MINT;
  monthAmt.font = Font.boldSystemFont(28);

  if (data.topCat) {
    w.addSpacer(8);
    const catLabel = w.addText("Top category");
    catLabel.textColor = MUTED;
    catLabel.font = Font.systemFont(10);
    const catVal = w.addText(data.topCat[0] + "  " + fmt(data.topCat[1]));
    catVal.textColor = WHITE;
    catVal.font = Font.systemFont(13);
  }

  w.addSpacer();

  if (data.streak > 0) {
    const milestones = { 7: "7-day streak!", 30: "Month streak!", 100: "100 days!" };
    const label = milestones[data.streak] || `🔥 ${data.streak} day streak`;
    const streakText = w.addText(label);
    streakText.textColor = AMBER;
    streakText.font = Font.boldSystemFont(12);
  }
}

Script.setWidget(w);
Script.complete();
