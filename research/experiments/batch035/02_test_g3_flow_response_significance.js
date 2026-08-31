/**
 * 🏛️ LYZER EDGE — BATCH 035: PHASE 1 — GATE G3 DUAL TEST (STATISTICAL & ECONOMIC)
 * 
 * Target: Statistically and economically evaluate Flow-Price Response Mechanisms on In-Sample (2023-2024)
 * Output: research/results/batch_035/G3_FLOW_RESPONSE_REPORT.json and .md
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, '../../../');

console.log('='.repeat(95));
console.log('🔬 BATCH 035: GATE G3 — DUAL TEST (STATISTICAL G3a & ECONOMIC G3b) (PREREG-035)');
console.log('='.repeat(95));

// 1. Load Event Dataset
const datasetPath = resolve(ROOT_DIR, 'research/results/batch_035/FLOW_RESPONSE_EVENTS.json');
if (!existsSync(datasetPath)) {
  console.error(`❌ Events missing at: ${datasetPath}. Run 01_extract_flow_response_events.js first.`);
  process.exit(1);
}

const allEvents = JSON.parse(readFileSync(datasetPath, 'utf8'));
const inSample = allEvents.filter(e => !e.isOOS);

console.log(`📊 In-Sample Dataset: ${inSample.length.toLocaleString()} events [${inSample[0].isoDate.slice(0, 10)} -> ${inSample[inSample.length - 1].isoDate.slice(0, 10)}]`);
console.log(`🔒 Out-Of-Sample (${(allEvents.length - inSample.length).toLocaleString()} events) is FROZEN and untouched.`);

// 2. Statistical Helper Functions
function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function variance(arr, m) {
  const u = m !== undefined ? m : mean(arr);
  return arr.reduce((a, b) => a + (b - u) ** 2, 0) / (arr.length - 1);
}

function pearsonCorrelation(x, y) {
  const n = x.length;
  if (n === 0) return 0;
  const mx = mean(x);
  const my = mean(y);
  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx;
    const dy = y[i] - my;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const den = Math.sqrt(denX * denY);
  return den === 0 ? 0 : num / den;
}

function spearmanRankCorrelation(x, y) {
  const n = x.length;
  if (n === 0) return 0;
  function getRanks(arr) {
    const sorted = arr.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
    const ranks = new Float64Array(n);
    let i = 0;
    while (i < n) {
      let j = i;
      while (j < n - 1 && sorted[j].v === sorted[j + 1].v) j++;
      const rank = (i + j + 2) / 2;
      for (let k = i; k <= j; k++) ranks[sorted[k].i] = rank;
      i = j + 1;
    }
    return ranks;
  }
  return pearsonCorrelation(getRanks(x), getRanks(y));
}

function olsNeweyWest(x, y, maxLag) {
  const n = x.length;
  const mx = mean(x);
  const my = mean(y);
  let sxx = 0, sxy = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx;
    sxx += dx * dx;
    sxy += dx * (y[i] - my);
  }
  const beta = sxy / sxx;
  const alpha = my - beta * mx;
  
  const e = new Float64Array(n);
  const u = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    e[i] = y[i] - (alpha + beta * x[i]);
    u[i] = (x[i] - mx) * e[i];
  }
  
  let gamma0 = 0;
  for (let i = 0; i < n; i++) gamma0 += u[i] * u[i];
  gamma0 /= n;
  
  let sumAutocov = 0;
  for (let lag = 1; lag <= maxLag; lag++) {
    let gammaLag = 0;
    for (let i = lag; i < n; i++) gammaLag += u[i] * u[i - lag];
    gammaLag /= n;
    const weight = 1 - lag / (maxLag + 1);
    sumAutocov += 2 * weight * gammaLag;
  }
  
  const sHAC = gamma0 + sumAutocov;
  const sxxAvg = sxx / n;
  const varBetaHAC = (sHAC / (sxxAvg * sxxAvg)) / n;
  const seBetaHAC = Math.sqrt(Math.max(0, varBetaHAC));
  const tStatHAC = seBetaHAC > 0 ? beta / seBetaHAC : 0;
  
  const z = Math.abs(tStatHAC);
  const b1 = 0.319381530, b2 = -0.356563782, b3 = 1.781477937, b4 = -1.821255978, b5 = 1.330274429, p = 0.2316419, c = 0.39894228;
  const t = 1.0 / (1.0 + p * z);
  const cdf = 1.0 - c * Math.exp(-z * z / 2.0) * t * (t * (t * (t * (t * b5 + b4) + b3) + b2) + b1);
  const pValue = 2 * (1 - cdf);
  
  return { alpha, beta, seBetaHAC, tStatHAC, pValue };
}

// 3. DIMENSÃO 1: TESTE ESTATÍSTICO G3a (Regressão Direcional de Fluxo)
console.log('\n' + '='.repeat(95));
console.log('📈 DIMENSÃO G3a (ESTATÍSTICA): Regressão Direcional |VDR_t * FI_t| → R_{t+k} * sign(VDR_t)');
console.log('='.repeat(95));
console.log(`Horizonte (5m) | N Válidos |    Beta    | SE (HAC) | t-stat (HAC) |   p-value   | Spearman IC | Pearson r `);
console.log('-'.repeat(95));

const HORIZONS = [1, 3, 6, 12, 24, 48];
const statisticalResults = [];

for (const k of HORIZONS) {
  const x = [];
  const y = [];
  
  for (let i = 0; i < inSample.length; i++) {
    const e = inSample[i];
    const retK = e.forwardReturns[`k${k}`];
    if (retK !== null && !isNaN(retK) && e.hasFlowShock) {
      const flowSignal = Math.abs(e.vdr) * e.flowIntensity;
      const directionalReturn = retK * Math.sign(e.vdr);
      x.push(flowSignal);
      y.push(directionalReturn);
    }
  }
  
  if (x.length < 100) continue;
  
  const ols = olsNeweyWest(x, y, k + 1);
  const ic = spearmanRankCorrelation(x, y);
  const r = pearsonCorrelation(x, y);
  
  statisticalResults.push({
    horizonBars: k,
    minutes: k * 5,
    n: x.length,
    beta: ols.beta,
    seHAC: ols.seBetaHAC,
    tStatHAC: ols.tStatHAC,
    pValue: ols.pValue,
    spearmanIC: ic,
    pearsonR: r
  });
  
  const pStr = ols.pValue < 0.0001 ? '< 0.0001' : ols.pValue.toFixed(4);
  console.log(
    `k=${String(k).padEnd(2)} (${(k*5+'m').padEnd(4)})  | ` +
    `${String(x.length).padStart(9)} | ` +
    `${(ols.beta >= 0 ? '+' : '') + ols.beta.toFixed(6)} | ` +
    `${ols.seBetaHAC.toFixed(6)} | ` +
    `${(ols.tStatHAC >= 0 ? '+' : '') + ols.tStatHAC.toFixed(3).padStart(6)}   | ` +
    `${pStr.padStart(11)} | ` +
    `${(ic >= 0 ? '+' : '') + ic.toFixed(4).padStart(7)}     | ` +
    `${(r >= 0 ? '+' : '') + r.toFixed(4).padStart(7)}`
  );
}

// 4. DIMENSÃO 2: TESTE ECONÔMICO G3b (Retorno Médio Líquido por Regime de Microestrutura)
console.log('\n' + '='.repeat(95));
console.log('⚡ DIMENSÃO G3b (ECONÔMICA): Retorno Condicional Direcional por Regime de Resposta vs Fricção');
console.log('='.repeat(95));

const FRICTION_ROUNDTRIP = 0.08 / 100; // 0.08% taker roundtrip fee (8 bps)
const TARGET_HORIZONS = [3, 6, 12, 24]; // 15m, 30m, 1h, 2h

const economicResults = [];

for (const k of TARGET_HORIZONS) {
  const transEvents = inSample.filter(e => e.regime === 'TRANSMISSION' && e.forwardReturns[`k${k}`] !== null);
  const absEvents = inSample.filter(e => e.regime === 'ABSORPTION' && e.forwardReturns[`k${k}`] !== null);
  const unconditioned = inSample.filter(e => e.forwardReturns[`k${k}`] !== null).map(e => e.forwardReturns[`k${k}`]);
  
  // Directional returns: follow flow for transmission, fade flow for absorption
  const transReturns = transEvents.map(e => e.forwardReturns[`k${k}`] * Math.sign(e.vdr));
  const absReturns = absEvents.map(e => e.forwardReturns[`k${k}`] * (-Math.sign(e.vdr)));
  
  const transMean = transReturns.length > 0 ? mean(transReturns) : 0;
  const absMean = absReturns.length > 0 ? mean(absReturns) : 0;
  const unconditionedMeanAbs = mean(unconditioned.map(r => Math.abs(r)));
  
  const transNetEdge = transMean - FRICTION_ROUNDTRIP;
  const absNetEdge = absMean - FRICTION_ROUNDTRIP;
  
  economicResults.push({
    horizonBars: k,
    minutes: k * 5,
    transmission: { n: transEvents.length, grossReturnPct: transMean * 100, netEdgePct: transNetEdge * 100 },
    absorption: { n: absEvents.length, grossReturnPct: absMean * 100, netEdgePct: absNetEdge * 100 },
    unconditionedGrossPct: unconditionedMeanAbs * 100
  });
  
  console.log(`\n⏱️ Horizonte: k=${k} (${k*5}m):`);
  console.log(`   [TRANSMISSION] (Follow Flow): Gross = ${(transMean * 100).toFixed(3)}% | Net (pós-0.08%) = ${(transNetEdge * 100).toFixed(3)}% (N = ${transEvents.length})`);
  console.log(`   [ABSORPTION]   (Fade Flow):   Gross = ${(absMean * 100).toFixed(3)}% | Net (pós-0.08%) = ${(absNetEdge * 100).toFixed(3)}% (N = ${absEvents.length})`);
}

// 5. Veredito Oficial do Gate G3
const bestStat = statisticalResults.reduce((best, cur) => Math.abs(cur.tStatHAC) > Math.abs(best.tStatHAC) ? cur : best, statisticalResults[0]);
const bestEcon = economicResults.reduce((best, cur) => cur.transmission.netEdgePct > best.transmission.netEdgePct ? cur : best, economicResults[0]);

const passedG3a = Math.abs(bestStat.tStatHAC) > 3.0 && Math.abs(bestStat.spearmanIC) > 0.03;
const passedG3b = bestEcon.transmission.netEdgePct >= 0.10 || bestEcon.absorption.netEdgePct >= 0.10;
const overallG3Pass = passedG3a && passedG3b;

console.log('\n' + '='.repeat(95));
console.log('🏛️ VEREDITO INTEGRADO DO GATE G3 (PREREG-035 CRITERIA)');
console.log('='.repeat(95));
console.log(`1. G3a Estatístico (t-stat > 3.0 & |IC| > 0.03):  ${passedG3a ? '🟢 PASS' : '🔴 FAIL'} (t-stat = ${bestStat.tStatHAC.toFixed(3)}, IC = ${bestStat.spearmanIC.toFixed(4)})`);
console.log(`2. G3b Econômico   (Net Edge ≥ +0.10% pós-taxas): ${passedG3b ? '🟢 PASS' : '🔴 FAIL'} (Best Net Edge = ${bestEcon.transmission.netEdgePct.toFixed(3)}%)`);
console.log(`-----------------------------------------------------------------------------------------------`);
console.log(`GATE G3 STATUS GERAL:                            ${overallG3Pass ? '🟢 [PASS G3 — AUTORIZADO G4]' : '🔴 [REJECT BATCH 035 — ARCHIVE]'}`);
console.log('='.repeat(95));

// 6. Save Report Artifacts
const reportDir = resolve(ROOT_DIR, 'research/results/batch_035');
const reportJsonPath = resolve(reportDir, 'G3_FLOW_RESPONSE_REPORT.json');
const reportMdPath = resolve(reportDir, 'G3_FLOW_RESPONSE_REPORT.md');

const reportData = {
  batch: 'BATCH_035',
  gate: 'G3_DUAL_EVALUATION',
  status: overallG3Pass ? 'PASS' : 'REJECT',
  evaluatedAt: new Date().toISOString(),
  statisticalG3a: { passed: passedG3a, best: bestStat, all: statisticalResults },
  economicG3b: { passed: passedG3b, best: bestEcon, all: economicResults }
};

writeFileSync(reportJsonPath, JSON.stringify(reportData, null, 2), 'utf8');

const mdReport = `# 🏛️ LYZER EDGE — BATCH 035: GATE G3 DUAL REPORT

**Status do Gate G3:** ${overallG3Pass ? '🟢 **PASS — SIGNIFICÂNCIA ESTATÍSTICA E ECONÔMICA CONFIRMADA**' : '🔴 **REJECT — SEM VIABILIDADE ESTATÍSTICA/ECONÔMICA**'}  
**Data da Avaliação:** ${new Date().toISOString()}  
**Dataset:** BTCUSDT Futures M5 In-Sample (2023–2024) | $N = ${inSample.length.toLocaleString()}$ candles  

---

## 1. Dimensão G3a: Tabela de Regressão Preditiva de Fluxo

| Horizonte | $N$ Eventos | $\\beta$ (Coeficiente) | Erro-Padrão (HAC) | $t$-statistic (HAC) | $p$-value | Spearman $IC$ | Pearson $r$ |
|---|---|---|---|---|---|---|---|
${statisticalResults.map(r => `| **${r.minutes}m (k=${r.horizonBars})** | ${r.n.toLocaleString()} | \`${(r.beta >= 0 ? '+' : '') + r.beta.toFixed(6)}\` | \`${r.seHAC.toFixed(6)}\` | \`${(r.tStatHAC >= 0 ? '+' : '') + r.tStatHAC.toFixed(3)}\` | \`${r.pValue < 0.0001 ? '< 0.0001' : r.pValue.toFixed(4)}\` | \`${(r.spearmanIC >= 0 ? '+' : '') + r.spearmanIC.toFixed(4)}\` | \`${(r.pearsonR >= 0 ? '+' : '') + r.pearsonR.toFixed(4)}\` |`).join('\n')}

---

## 2. Dimensão G3b: Desempenho Econômico por Regime (Líquido de Taxas 0.08%)

| Horizonte | Regime Transmission (Bruto) | Regime Transmission (Líquido) | Regime Absorption (Bruto) | Regime Absorption (Líquido) | $N$ Amostra |
|---|---|---|---|---|---|
${economicResults.map(e => `| **${e.minutes}m** | \`${(e.transmission.grossReturnPct >= 0 ? '+' : '') + e.transmission.grossReturnPct.toFixed(3)}%\` | \`${(e.transmission.netEdgePct >= 0 ? '+' : '') + e.transmission.netEdgePct.toFixed(3)}%\` | \`${(e.absorption.grossReturnPct >= 0 ? '+' : '') + e.absorption.grossReturnPct.toFixed(3)}%\` | \`${(e.absorption.netEdgePct >= 0 ? '+' : '') + e.absorption.netEdgePct.toFixed(3)}%\` | Trans: ${e.transmission.n} / Abs: ${e.absorption.n} |`).join('\n')}

---

## 3. Veredito do Comitê de Governança

- **Avaliação Estatística ($G_{3a}$):** ${passedG3a ? 'Aprovada ($t\\text{-stat} > 3.0$, $|IC| > 0.03$).' : 'Reprovada.'}
- **Avaliação Econômica ($G_{3b}$):** ${passedG3b ? 'Aprovada ($Edge_{net} \\ge +0.10\\%$ pós-taxas).' : 'Reprovada (Retorno líquido insuficiente para cobrir o atrito de spread e taxas).'}
- **Decisão Final:** ${overallG3Pass ? '🟢 **AUTORIZADO AVANÇO PARA G4 (Falsificação Adversarial)**.' : '🔴 **ARQUIVAMENTO REGISTRADO COMO [REJECT] SEM ALTERAÇÃO POST-HOC**.'}
`;

writeFileSync(reportMdPath, mdReport, 'utf8');

console.log(`💾 Saved G3 Dual Report to: ${reportMdPath}`);
console.log('='.repeat(95));
