/**
 * spendingField — the analysis behind Pulse.
 *
 * Pure functions over spending transactions only. Nothing here knows about
 * income, balance, savings, debt, net worth or forecasts, and nothing here
 * imports a renderer. Every value returned is derived from:
 *
 *   amount · date · merchant · category · frequency · recurrence ·
 *   distribution · velocity · clusters · outliers
 *
 * The output is a portrait: a set of measured behavioural properties that the
 * renderer turns into a world. Two people who spend the same total produce
 * completely different fields, because the shape of the spending differs.
 */

/* ─── small statistics ───────────────────────────────────────────────────── */

export function median(xs) {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function mean(xs) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

export function stdev(xs) {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) * (b - m), 0) / (xs.length - 1));
}

/** Median absolute deviation, scaled to be comparable with a standard deviation. */
export function mad(xs) {
  if (xs.length < 2) return 0;
  const m = median(xs);
  return median(xs.map(x => Math.abs(x - m))) * 1.4826;
}

/** Days since epoch. Integer, timezone-stable. */
export function dayNumber(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

export function dateFromDayNumber(dn) {
  return new Date(dn * 86400000).toISOString().slice(0, 10);
}

function hash01(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967295;
}

/**
 * Reduce a free-text description to a merchant key. The data has no merchant
 * field, so the description is all we have; normalising conservatively means
 * a repeated string becomes a repeated merchant, and anything that only ever
 * appears once is treated as incidental rather than as a place you go.
 */
export function merchantKey(description) {
  if (!description) return '';
  return description
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b\d+\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleCase(s) {
  return s.replace(/\b\w/g, c => c.toUpperCase());
}

/* ─── the field ──────────────────────────────────────────────────────────── */

/**
 * @param {Array} transactions  [{ amount, date:'YYYY-MM-DD', description, category:{name} }]
 * @returns null when there is nothing to draw, otherwise the full portrait.
 */
export function buildSpendingField(transactions) {
  const tx = (transactions || [])
    .map(t => ({
      amount: Math.abs(Number(t.amount) || 0),
      date: typeof t.date === 'string' ? t.date.slice(0, 10) : '',
      description: (t.description || '').trim(),
      category: t.category?.name || 'Uncategorised',
    }))
    .filter(t => t.amount > 0 && /^\d{4}-\d{2}-\d{2}$/.test(t.date))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  if (!tx.length) return null;

  const amounts = tx.map(t => t.amount);
  const totalSpent = amounts.reduce((a, b) => a + b, 0);
  const medianAmount = median(amounts);
  const madAmount = mad(amounts) || medianAmount * 0.5 || 1;
  const maxAmount = Math.max(...amounts);
  const minDay = dayNumber(tx[0].date);
  const maxDay = dayNumber(tx[tx.length - 1].date);
  const spanDays = Math.max(maxDay - minDay + 1, 1);

  /* Categories — ordered by spend, so colour indices are stable and meaningful */
  const catTotals = new Map();
  const catCounts = new Map();
  tx.forEach(t => {
    catTotals.set(t.category, (catTotals.get(t.category) || 0) + t.amount);
    catCounts.set(t.category, (catCounts.get(t.category) || 0) + 1);
  });
  const categories = [...catTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, total], i) => ({
      name, total, index: i,
      count: catCounts.get(name) || 0,
      share: total / totalSpent,
      // Grain: a category of many tiny purchases reads as dust, a category of
      // a few large ones reads as boulders. Same total, different texture.
      meanTicket: total / (catCounts.get(name) || 1),
    }));
  const catIndex = new Map(categories.map(c => [c.name, c.index]));

  /* Per-category robust spread — used to judge what is unusual *for you*,
     within that category, rather than against a global average. */
  const catAmounts = new Map();
  tx.forEach(t => {
    if (!catAmounts.has(t.category)) catAmounts.set(t.category, []);
    catAmounts.get(t.category).push(t.amount);
  });
  const catStats = new Map();
  catAmounts.forEach((xs, name) => {
    const med = median(xs);
    catStats.set(name, { median: med, mad: mad(xs) || med * 0.5 || 1, count: xs.length });
  });

  /* Daily totals → velocity, bursts, cadence */
  const dayTotals = new Map();
  const dayCounts = new Map();
  tx.forEach(t => {
    const dn = dayNumber(t.date);
    dayTotals.set(dn, (dayTotals.get(dn) || 0) + t.amount);
    dayCounts.set(dn, (dayCounts.get(dn) || 0) + 1);
  });
  const activeDays = [...dayTotals.keys()].sort((a, b) => a - b);
  const activeDayTotals = activeDays.map(d => dayTotals.get(d));
  const dayMean = mean(activeDayTotals);
  const daySd = stdev(activeDayTotals);

  // A burst is a day that spends far above your own typical active day.
  const bursts = activeDays
    .map(dn => {
      const total = dayTotals.get(dn);
      const z = daySd > 0 ? (total - dayMean) / daySd : 0;
      return { dayNum: dn, date: dateFromDayNumber(dn), total, z, count: dayCounts.get(dn) };
    })
    .filter(b => b.z >= 1.6)
    .sort((a, b) => b.z - a.z)
    .slice(0, 8);

  // Cadence: the typical gap between the days you spend at all. This is the
  // rate the whole field breathes at.
  const dayGaps = [];
  for (let i = 1; i < activeDays.length; i++) dayGaps.push(activeDays[i] - activeDays[i - 1]);
  const cadenceDays = dayGaps.length ? median(dayGaps) : 1;
  const purchasesPerActiveDay = tx.length / activeDays.length;

  // Rolling 7-day spend rate, sampled per day across the span.
  const rate = [];
  for (let dn = minDay; dn <= maxDay; dn++) {
    let sum = 0;
    for (let k = 0; k < 7; k++) sum += dayTotals.get(dn - k) || 0;
    rate.push({ dayNum: dn, value: sum / 7 });
  }
  const maxRate = Math.max(...rate.map(r => r.value), 1);

  /* Merchants — a description that recurs is a place you go; a description
     that appears once is incidental and folds into its category. */
  const byKey = new Map();
  tx.forEach(t => {
    const k = merchantKey(t.description);
    if (!k) return;
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k).push(t);
  });

  const merchants = [];
  const merchantOf = new Map();   // transaction index → merchant index
  byKey.forEach((items, k) => {
    if (items.length < 2) return;             // singletons are not habits
    const amts = items.map(i => i.amount);
    const days = items.map(i => dayNumber(i.date)).sort((a, b) => a - b);
    const gaps = [];
    for (let i = 1; i < days.length; i++) gaps.push(days[i] - days[i - 1]);
    const gapMean = mean(gaps);
    const gapSd = stdev(gaps);
    // Regularity: 1 when every gap is identical, falling toward 0 as the
    // intervals scatter. This is what makes a chain crystalline or warped.
    const regularity = gaps.length >= 2 && gapMean > 0
      ? Math.max(0, Math.min(1, 1 - gapSd / gapMean))
      : (gaps.length === 1 ? 0.5 : 0);
    // Amount steadiness: a subscription charges the same figure every time.
    const amtMean = mean(amts);
    const amtSteady = amtMean > 0 ? Math.max(0, Math.min(1, 1 - stdev(amts) / amtMean)) : 0;
    merchants.push({
      key: k,
      label: titleCase(items[0].description).slice(0, 22),
      category: items[0].category,
      catIdx: catIndex.get(items[0].category) ?? 0,
      count: items.length,
      total: amts.reduce((a, b) => a + b, 0),
      meanAmount: amtMean,
      medianAmount: median(amts),
      firstDay: days[0],
      lastDay: days[days.length - 1],
      cadenceDays: gaps.length ? median(gaps) : 0,
      regularity,
      amtSteady,
      // A committed habit is one you return to, at a steady interval, for a
      // steady amount. That combination is what forms a rigid lattice.
      commitment: Math.min(1, (items.length / 6)) * (0.5 + 0.5 * regularity) * (0.5 + 0.5 * amtSteady),
      seed: hash01(k),
    });
  });
  merchants.sort((a, b) => b.total - a.total);
  merchants.forEach((m, i) => { m.index = i; });
  const merchantByKey = new Map(merchants.map(m => [m.key, m]));

  // Every event needs a home on the map. Purchases that never repeat are not
  // habits, but they still happened — they gather into one node per category
  // so the map shows both the places you return to and the wider ecosystem
  // each of them sits inside.
  const repeatedKeys = new Set(merchants.map(m => m.key));
  const looseByCat = new Map();
  tx.forEach(t => {
    const k = merchantKey(t.description);
    if (k && repeatedKeys.has(k)) return;
    if (!looseByCat.has(t.category)) looseByCat.set(t.category, []);
    looseByCat.get(t.category).push(t);
  });
  const nodes = merchants.map(m => ({ ...m, kind: 'merchant' }));
  looseByCat.forEach((items, cat) => {
    const amts = items.map(i => i.amount);
    nodes.push({
      key: `__cat__${cat}`,
      label: cat,
      category: cat,
      catIdx: catIndex.get(cat) ?? 0,
      kind: 'category',
      count: items.length,
      total: amts.reduce((a, b) => a + b, 0),
      meanAmount: mean(amts),
      medianAmount: median(amts),
      cadenceDays: 0, regularity: 0, amtSteady: 0, commitment: 0,
      seed: hash01(`cat|${cat}`),
      index: nodes.length,
    });
  });
  nodes.forEach((nd, i) => { nd.index = i; });
  const nodeByKey = new Map(nodes.map(nd => [nd.key, nd]));

  /* Transactions become events */
  const events = tx.map((t, i) => {
    const dn = dayNumber(t.date);
    const cs = catStats.get(t.category);
    const ratioToTypical = cs.median > 0 ? t.amount / cs.median : 1;
    const robustZ = cs.mad > 0 ? (t.amount - cs.median) / cs.mad : 0;
    const mk = merchantKey(t.description);
    const m = mk ? merchantByKey.get(mk) : null;
    const node = m || nodeByKey.get(`__cat__${t.category}`);
    if (m) merchantOf.set(i, m.index);
    const d = new Date(dn * 86400000);
    return {
      i,
      amount: t.amount,
      date: t.date,
      dayNum: dn,
      dayOfWeek: d.getUTCDay(),
      weekIndex: Math.floor((dn - minDay) / 7),
      description: t.description,
      category: t.category,
      catIdx: catIndex.get(t.category) ?? 0,
      merchantIdx: m ? m.index : -1,
      merchantLabel: m ? m.label : '',
      nodeIdx: node ? node.index : 0,
      isHabit: !!m,
      // Where this sits in your own size range, log-scaled so small purchases
      // are not crushed by one large one.
      sizeNorm: Math.log10(t.amount + 1) / Math.log10(maxAmount + 1),
      ratioToTypical,
      robustZ,
      isOutlier: robustZ >= 3.5 && t.amount > cs.median * 1.8,
      dayTotal: dayTotals.get(dn),
      dayCount: dayCounts.get(dn),
      seed: hash01(`${t.date}|${t.amount}|${i}`),
      seed2: hash01(`b|${i}|${t.amount}`),
      seed3: hash01(`c|${t.date}|${i}`),
    };
  });

  /* Distribution of purchase sizes — the shape of how you spend, in log bins */
  const BINS = 9;
  const logMax = Math.log10(maxAmount + 1) || 1;
  const distribution = Array.from({ length: BINS }, (_, b) => ({
    bin: b,
    lo: Math.pow(10, (b / BINS) * logMax) - 1,
    hi: Math.pow(10, ((b + 1) / BINS) * logMax) - 1,
    count: 0, total: 0,
  }));
  events.forEach(e => {
    const b = Math.min(BINS - 1, Math.floor(e.sizeNorm * BINS));
    distribution[b].count += 1;
    distribution[b].total += e.amount;
    e.bin = b;
  });
  const maxBinCount = Math.max(...distribution.map(d => d.count), 1);
  // Position within its own bin column, so a bin of 20 purchases stacks.
  const binSeen = new Array(BINS).fill(0);
  events.forEach(e => { e.binPos = binSeen[e.bin]++; });

  /* RECURRENCE lens needs two more coordinates: which chain a habit occupies
     (recurRank, spread across recurring merchants so each gets its own
     angle) and where a visit sits along that chain (habitPos, its 0-based
     position in the merchant's chronological visit order). Both are cheap
     to derive from what is already built above. */
  const recurringNodes = nodes.filter(nd => nd.kind === 'merchant' && nd.count >= 2);
  recurringNodes
    .sort((a, b) => b.total - a.total)
    .forEach((nd, rank) => { nd.recurRank = rank; });
  const recurCount = recurringNodes.length;
  const visitOrder = new Map();   // nodeIdx → chronologically sorted event indices
  events.forEach(e => {
    if (!e.isHabit) return;
    if (!visitOrder.has(e.nodeIdx)) visitOrder.set(e.nodeIdx, []);
    visitOrder.get(e.nodeIdx).push(e);
  });
  visitOrder.forEach(list => {
    list.sort((a, b) => a.dayNum - b.dayNum);
    list.forEach((e, pos) => { e.habitPos = pos; });
  });

  /* Merchant map — a force layout driven by which places you visit together.
     Merchants bought on the same days pull toward one another, so your routine
     clusters on its own rather than being filed into a template. */
  const layout = layoutNodes(nodes, events);

  /* Behavioural signature — three measured adjectives, not decoration */
  const perDay = tx.length / spanDays;
  const concentration = categories.reduce((a, c) => a + c.share * c.share, 0);   // Herfindahl
  const dailyCv = dayMean > 0 ? daySd / dayMean : 0;
  const signature = [
    perDay >= 1 ? 'DAILY' : perDay >= 0.4 ? 'FREQUENT' : perDay >= 0.15 ? 'OCCASIONAL' : 'RARE',
    medianAmount <= maxAmount * 0.08 ? 'SMALL-TICKET'
      : medianAmount >= maxAmount * 0.35 ? 'BIG-TICKET' : 'MIXED-TICKET',
    dailyCv >= 0.9 ? 'BURSTY' : dailyCv <= 0.45 ? 'STEADY' : 'UNEVEN',
    concentration >= 0.4 ? 'CONCENTRATED' : concentration <= 0.2 ? 'SPREAD' : 'BALANCED',
  ];

  const recurring = merchants.filter(m => m.count >= 3 && m.regularity >= 0.35);

  return {
    events, merchants, nodes, categories, catIndex, catStats,
    layout, distribution, rate, bursts, recurring, recurCount,
    totalSpent, medianAmount, madAmount, maxAmount,
    minDay, maxDay, spanDays,
    activeDayCount: activeDays.length,
    cadenceDays, purchasesPerActiveDay,
    dayMean, daySd, maxRate, maxBinCount,
    concentration, dailyCv, perDay,
    signature,
    count: events.length,
  };
}

/**
 * Deterministic force-directed placement of merchant nodes.
 *
 * Attraction: merchants bought on the same day, and merchants sharing a
 * category, so an ecosystem forms around the things you actually do together.
 * Repulsion: everything, scaled by spend so heavy habits claim more room.
 *
 * Runs a fixed number of iterations at build time from a deterministic seed,
 * so the same history always produces the same map.
 */
function layoutNodes(merchants, events) {
  const n = merchants.length;
  if (!n) return [];

  // Seeded start on a spiral — deterministic, and already roughly spread.
  const nodes = merchants.map((m, i) => {
    const a = i * 2.399963;                       // golden angle
    const r = 3 + 7 * Math.sqrt(i / Math.max(n, 1));
    return { x: Math.cos(a) * r, z: Math.sin(a) * r, vx: 0, vz: 0, m };
  });

  // Edge weights: co-occurrence on the same day.
  const byDay = new Map();
  events.forEach(e => {
    if (e.nodeIdx == null) return;
    if (!byDay.has(e.dayNum)) byDay.set(e.dayNum, new Set());
    byDay.get(e.dayNum).add(e.nodeIdx);
  });
  const edges = new Map();
  byDay.forEach(set => {
    const ids = [...set];
    for (let a = 0; a < ids.length; a++) {
      for (let b = a + 1; b < ids.length; b++) {
        const k = `${ids[a]}|${ids[b]}`;
        edges.set(k, (edges.get(k) || 0) + 1);
      }
    }
  });
  // Same-category affinity, weaker than genuine co-occurrence.
  for (let a = 0; a < n; a++) {
    for (let b = a + 1; b < n; b++) {
      if (merchants[a].catIdx === merchants[b].catIdx) {
        const k = `${a}|${b}`;
        edges.set(k, (edges.get(k) || 0) + 0.45);
      }
    }
  }
  const edgeList = [...edges.entries()].map(([k, w]) => {
    const [a, b] = k.split('|').map(Number);
    return { a, b, w };
  });

  const maxTotal = Math.max(...merchants.map(m => m.total), 1);
  const massOf = (m) => 0.5 + (m.total / maxTotal) * 1.5;

  const ITER = 320;
  for (let it = 0; it < ITER; it++) {
    const cool = 1 - it / ITER;
    // Repulsion
    for (let a = 0; a < n; a++) {
      for (let b = a + 1; b < n; b++) {
        let dx = nodes[a].x - nodes[b].x;
        let dz = nodes[a].z - nodes[b].z;
        let d2 = dx * dx + dz * dz;
        if (d2 < 0.0001) { dx = (a - b) * 0.01 + 0.01; dz = 0.01; d2 = dx * dx + dz * dz; }
        const d = Math.sqrt(d2);
        const force = (12 * massOf(nodes[a].m) * massOf(nodes[b].m)) / d2;
        const fx = (dx / d) * force, fz = (dz / d) * force;
        nodes[a].vx += fx; nodes[a].vz += fz;
        nodes[b].vx -= fx; nodes[b].vz -= fz;
      }
    }
    // Attraction along edges
    edgeList.forEach(({ a, b, w }) => {
      const dx = nodes[b].x - nodes[a].x;
      const dz = nodes[b].z - nodes[a].z;
      const d = Math.sqrt(dx * dx + dz * dz) || 0.001;
      const force = Math.min(w, 6) * d * 0.012;
      const fx = (dx / d) * force, fz = (dz / d) * force;
      nodes[a].vx += fx; nodes[a].vz += fz;
      nodes[b].vx -= fx; nodes[b].vz -= fz;
    });
    // Gentle centring so the map does not drift off
    nodes.forEach(nd => {
      nd.vx -= nd.x * 0.006;
      nd.vz -= nd.z * 0.006;
      nd.x += nd.vx * 0.08 * cool;
      nd.z += nd.vz * 0.08 * cool;
      nd.vx *= 0.82; nd.vz *= 0.82;
    });
  }

  // Normalise into a disc so the map fills the field regardless of scale.
  const maxR = Math.max(...nodes.map(nd => Math.hypot(nd.x, nd.z)), 0.001);
  const target = 10.5;
  return nodes.map(nd => ({
    x: (nd.x / maxR) * target,
    z: (nd.z / maxR) * target,
    merchant: nd.m,
  }));
}
