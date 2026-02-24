export type Side = "V" | "R";

export type StreakConditional = {
  side: Side;
  k: number;
  base: number;
  nextV: number;
  nextR: number;
  pNextV: number;
  pNextR: number;
};

export type StreakDistributionRow = {
  k: number;
  casos: number;
  rupturas: number;
  pctRuptura: number;
};

export type EdgeSnapshot = {
  n: number;
  wins: number;
  efectividad: number;
};

export type WilsonCI = {
  low: number;
  high: number;
};

export type HistoryAnalysisResult = {
  n: number;
  wins: number;
  expectedSide: Side;
  efectividad: number;
  ci95: WilsonCI;
  maxStreakV: number;
  maxStreakR: number;
  currentStreakSide: Side | null;
  currentStreakLen: number;
  currentConditional: StreakConditional | null;
  condV: StreakConditional[];
  condR: StreakConditional[];
  distribution: StreakDistributionRow[];
  all: EdgeSnapshot;
  lastQuarter: EdgeSnapshot;
  deltaLastQuarter: number;
};

function pct(num: number, den: number) {
  if (den <= 0) return 0;
  return num / den;
}

export function wilson95(successes: number, total: number): WilsonCI {
  if (total <= 0) return { low: 0, high: 0 };
  const z = 1.959963984540054;
  const p = successes / total;
  const z2 = z * z;
  const denom = 1 + z2 / total;
  const center = (p + z2 / (2 * total)) / denom;
  const margin = (z * Math.sqrt((p * (1 - p) + z2 / (4 * total)) / total)) / denom;
  return {
    low: Math.max(0, center - margin),
    high: Math.min(1, center + margin),
  };
}

function currentStreak(results: Side[]) {
  if (results.length === 0) return { side: null as Side | null, len: 0 };
  const side = results[results.length - 1];
  let len = 1;
  for (let i = results.length - 2; i >= 0; i -= 1) {
    if (results[i] !== side) break;
    len += 1;
  }
  return { side, len };
}

function maxStreak(results: Side[], target: Side) {
  let best = 0;
  let run = 0;
  for (const value of results) {
    if (value === target) {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }
  return best;
}

function conditionalByExactStreak(results: Side[], side: Side, k: number): StreakConditional {
  let base = 0;
  let nextV = 0;
  let nextR = 0;

  for (let i = 0; i < results.length - 1; i += 1) {
    if (results[i] !== side) continue;

    let run = 1;
    let j = i - 1;
    while (j >= 0 && results[j] === side) {
      run += 1;
      j -= 1;
    }

    if (run !== k) continue;

    base += 1;
    if (results[i + 1] === "V") nextV += 1;
    else nextR += 1;
  }

  return {
    side,
    k,
    base,
    nextV,
    nextR,
    pNextV: pct(nextV, base),
    pNextR: pct(nextR, base),
  };
}

function buildDistribution(results: Side[], maxK: number): StreakDistributionRow[] {
  const rows: StreakDistributionRow[] = [];
  for (let k = 1; k <= maxK; k += 1) {
    const condV = conditionalByExactStreak(results, "V", k);
    const condR = conditionalByExactStreak(results, "R", k);
    const casos = condV.base + condR.base;
    const rupturas = condV.nextR + condR.nextV;
    rows.push({
      k,
      casos,
      rupturas,
      pctRuptura: pct(rupturas, casos),
    });
  }
  return rows;
}

function edgeSnapshot(results: Side[], expectedSide: Side): EdgeSnapshot {
  const n = results.length;
  const wins = results.filter((x) => x === expectedSide).length;
  return {
    n,
    wins,
    efectividad: pct(wins, n),
  };
}

export function analyzeHistory(results: Side[], expectedSide: Side): HistoryAnalysisResult {
  const n = results.length;
  const all = edgeSnapshot(results, expectedSide);
  const ci95 = wilson95(all.wins, all.n);

  const current = currentStreak(results);
  const maxStreakV = maxStreak(results, "V");
  const maxStreakR = maxStreak(results, "R");

  const maxK = Math.max(1, Math.min(5, Math.max(maxStreakV, maxStreakR)));
  const distribution = buildDistribution(results, maxK);

  const condV = Array.from({ length: Math.min(3, maxK) }, (_, idx) => conditionalByExactStreak(results, "V", idx + 1));
  const condR = Array.from({ length: Math.min(3, maxK) }, (_, idx) => conditionalByExactStreak(results, "R", idx + 1));

  const currentConditional = current.side && current.len > 0
    ? conditionalByExactStreak(results, current.side, current.len)
    : null;

  const quarterSize = Math.min(n, Math.max(Math.ceil(n * 0.25), 10));
  const quarterResults = results.slice(Math.max(0, n - quarterSize));
  const lastQuarter = edgeSnapshot(quarterResults, expectedSide);

  return {
    n,
    wins: all.wins,
    expectedSide,
    efectividad: all.efectividad,
    ci95,
    maxStreakV,
    maxStreakR,
    currentStreakSide: current.side,
    currentStreakLen: current.len,
    currentConditional,
    condV,
    condR,
    distribution,
    all,
    lastQuarter,
    deltaLastQuarter: lastQuarter.efectividad - all.efectividad,
  };
}
