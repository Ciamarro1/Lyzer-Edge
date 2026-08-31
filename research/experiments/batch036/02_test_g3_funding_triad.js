/**
 * 🏛️ LYZER EDGE — BATCH 036: PHASE 1 — GATE G3 TRIAD TEST (G3a, G3b, G3c)
 * 
 * Target: Independent statistical & economic test of Funding Imbalance & Macro Regimes on In-Sample (2023-2024)
 * Output: research/results/batch_036/G3_FUNDING_REPORT.json and .md
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, '../../../');

console.log('='.repeat(95));
console.log('🔬 BATCH 036: GATE G3 — TRIAD EVALUATION (G3a LINEAR, G3b INTERACTION, G3c ECONOMIC) (PREREG-036)');
console.log('='.repeat(95));

// 1. Load Event Dataset
const datasetPath = resolve(ROOT_DIR, 'research/results/batch_036/FUNDING_REGIME_EVENTS.json');
if (!existsSync(datasetPath)) {
  console.error(`❌ Events missing at: ${datasetPath}. Run 01_extract_funding_regime_features.js first.`);
  process.exit(1);
}

const allEvents = JSON.parse(readFileSync(datasetPath, 'utf8'));
const inSample = allEvents.filter(e => !e.isOOS);

console.log(`📊 In-Sample Dataset: ${inSample.length.toLocaleString()} H1 events [${inSample[0].isoDate.slice(0, 10)} -> ${inSample[inSample.length - 1].isoDate.slice(0, 10)}]`);
console.log(`🔒 Out-Of-Sample (${(allEvents.length - inSample.length).toLocaleString()} H1 events) is FROZEN and untouched.`);

// 2. Math & Matrix Helpers
function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
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

// 3. TESTE G3a: Efeito Linear do Funding Rate (Z_Funding → R_{t+k})
console.log('\n' + '='.repeat(95));
console.log('📈 TESTE G3a (LINEAR): Z_{F, t} → Retorno Futuro R_{t+k}');
console.log('='.repeat(95));
console.log(`Horizonte (H) | N Válidos |    Beta    | SE (HAC) | t-stat (HAC) |   p-value   | Spearman IC | Pearson r `);
console.log('-'.repeat(95));

const HORIZONS = [8, 24, 48, 72, 168];
const g3aResults = [];

for (const k of HORIZONS) {
  const x = [];
  const y = [];
  
  for (let i = 0; i < inSample.length; i++) {
    const e = inSample[i];
    const retK = e.forwardReturns[`h${k}`];
    if (retK !== null && !isNaN(retK) && !isNaN(e.zFunding)) {
      x.push(e.zFunding);
      y.push(retK);
    }
  }
  
  const ols = olsNeweyWest(x, y, Math.floor(k / 8) + 1);
  const ic = spearmanRankCorrelation(x, y);
  const r = pearsonCorrelation(x, y);
  
  g3aResults.push({
    horizonHours: k,
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
    `H+${String(k).padEnd(3)} (${(k/24 >= 1 ? (k/24)+'d' : k+'h').padEnd(4)}) | ` +
    `${String(x.length).padStart(9)} | ` +
    `${(ols.beta >= 0 ? '+' : '') + ols.beta.toFixed(6)} | ` +
    `${ols.seBetaHAC.toFixed(6)} | ` +
    `${(ols.tStatHAC >= 0 ? '+' : '') + ols.tStatHAC.toFixed(3).padStart(6)}   | ` +
    `${pStr.padStart(11)} | ` +
    `${(ic >= 0 ? '+' : '') + ic.toFixed(4).padStart(7)}     | ` +
    `${(r >= 0 ? '+' : '') + r.toFixed(4).padStart(7)}`
  );
}

// 4. TESTE G3b: Interação Funding × Regime de Volatilidade
console.log('\n' + '='.repeat(95));
console.log('⚡ TESTE G3b (INTERAÇÃO NÃO-LINEAR): (Z_Funding × V_t) → Retorno Futuro R_{t+k}');
console.log('='.repeat(95));

const g3bResults = [];

for (const k of HORIZONS) {
  const xInteraction = [];
  const y = [];
  
  for (let i = 0; i < inSample.length; i++) {
    const e = inSample[i];
    const retK = e.forwardReturns[`h${k}`];
    if (retK !== null && !isNaN(retK) && !isNaN(e.zFunding) && !isNaN(e.volRatio)) {
      xInteraction.push(e.zFunding * e.volRatio);
      y.push(retK);
    }
  }
  
  const ols = olsNeweyWest(xInteraction, y, Math.floor(k / 8) + 1);
  const ic = spearmanRankCorrelation(xInteraction, y);
  
  g3bResults.push({
    horizonHours: k,
    n: xInteraction.length,
    betaInteraction: ols.beta,
    seHAC: ols.seBetaHAC,
    tStatHAC: ols.tStatHAC,
    pValue: ols.pValue,
    spearmanIC: ic
  });
  
  const pStr = ols.pValue < 0.0001 ? '< 0.0001' : ols.pValue.toFixed(4);
  console.log(
    `H+${String(k).padEnd(3)} (${(k/24 >= 1 ? (k/24)+'d' : k+'h').padEnd(4)}) | ` +
    `Beta(F*V) = ${(ols.beta >= 0 ? '+' : '') + ols.beta.toFixed(6)} | ` +
    `t-stat(HAC) = ${(ols.tStatHAC >= 0 ? '+' : '') + ols.tStatHAC.toFixed(3).padStart(6)} | ` +
    `p-value = ${pStr.padStart(9)} | ` +
    `IC = ${(ic >= 0 ? '+' : '') + ic.toFixed(4)}`
  );
}

// 5. TESTE G3c: Edge Econômico Líquido em Eventos Extremos (|Z_Funding| >= 2.0)
console.log('\n' + '='.repeat(95));
console.log('💰 TESTE G3c (ECONÔMICO): Retorno Condicional em Extremos (|Z_F| >= 2.0) vs Fricção (0.08%)');
console.log('='.repeat(95));

const FRICTION = 0.08 / 100;
const g3cResults = [];

for (const k of [24, 48, 72, 168]) {
  const negEvents = inSample.filter(e => e.zFunding <= -2.0 && e.forwardReturns[`h${k}`] !== null);
  const posEvents = inSample.filter(e => e.zFunding >= +2.0 && e.forwardReturns[`h${k}`] !== null);
  const allBaseline = inSample.filter(e => e.forwardReturns[`h${k}`] !== null).map(e => e.forwardReturns[`h${k}`]);
  
  // Directional returns: Long on negative funding (expect reversal UP), Short on positive funding (expect reversal DOWN)
  const negReturns = negEvents.map(e => e.forwardReturns[`h${k}`]);
  const posReturns = posEvents.map(e => -e.forwardReturns[`h${k}`]);
  const combinedReturns = [...negReturns, ...posReturns];
  
  const meanNeg = negReturns.length > 0 ? mean(negReturns) : 0;
  const meanPos = posReturns.length > 0 ? mean(posReturns) : 0;
  const meanCombined = combinedReturns.length > 0 ? mean(combinedReturns) : 0;
  const netEdge = meanCombined - FRICTION;
  const baselineMean = mean(allBaseline);
  
  g3cResults.push({
    horizonHours: k,
    days: k / 24,
    negativeFunding: { n: negEvents.length, grossReturnPct: meanNeg * 100 },
    positiveFunding: { n: posEvents.length, grossReturnPct: meanPos * 100 },
    combined: { n: combinedReturns.length, grossReturnPct: meanCombined * 100, netEdgePct: netEdge * 100 },
    baselineGrossPct: baselineMean * 100
  });
  
  console.log(`\n⏱️ Horizonte: H+${k} (${k/24} dias) [N Total Extremos = ${combinedReturns.length}]:`);
  console.log(`   • Funding Negativo Extremo (Z <= -2.0) [LONG]:  Gross = ${(meanNeg * 100).toFixed(3)}% (N = ${negEvents.length})`);
  console.log(`   • Funding Positivo Extremo (Z >= +2.0) [SHORT]: Gross = ${(meanPos * 100).toFixed(3)}% (N = ${posEvents.length})`);
  console.log(`   • Combinado Direcional Líquido (pós-0.08%):     Net   = ${(netEdge * 100).toFixed(3)}% (Baseline Uncond: ${(baselineMean * 100).toFixed(3)}%)`);
}

// 6. Veredito Integrado
const bestG3a = g3aResults.reduce((best, cur) => Math.abs(cur.tStatHAC) > Math.abs(best.tStatHAC) ? cur : best, g3aResults[0]);
const bestG3b = g3bResults.reduce((best, cur) => Math.abs(cur.tStatHAC) > Math.abs(best.tStatHAC) ? cur : best, g3bResults[0]);
const bestG3c = g3cResults.reduce((best, cur) => cur.combined.netEdgePct > best.combined.netEdgePct ? cur : best, g3cResults[0]);

const passedG3a = Math.abs(bestG3a.tStatHAC) > 3.0 && Math.abs(bestG3a.spearmanIC) > 0.03;
const passedG3b = Math.abs(bestG3b.tStatHAC) > 3.0;
const passedG3c = bestG3c.combined.netEdgePct >= 0.20;

const overallPass = passedG3a && passedG3b && passedG3c;

console.log('\n' + '='.repeat(95));
console.log('🏛️ VEREDITO INTEGRADO DO GATE G3 (PREREG-036 CRITERIA)');
console.log('='.repeat(95));
console.log(`1. G3a Linear Funding    (t-stat > 3.0 & |IC| > 0.03): ${passedG3a ? '🟢 PASS' : '🔴 FAIL'} (Best t-stat = ${bestG3a.tStatHAC.toFixed(3)}, IC = ${bestG3a.spearmanIC.toFixed(4)})`);
console.log(`2. G3b Interação Regime  (t-stat(F*V) > 3.0):          ${passedG3b ? '🟢 PASS' : '🔴 FAIL'} (Best t-stat = ${bestG3b.tStatHAC.toFixed(3)})`);
console.log(`3. G3c Edge Econômico    (Net Edge ≥ +0.20% pós-taxa):  ${passedG3c ? '🟢 PASS' : '🔴 FAIL'} (Best Net Edge = ${bestG3c.combined.netEdgePct.toFixed(3)}% em ${bestG3c.days}d)`);
console.log('-'.repeat(95));
console.log(`STATUS FINAL DO GATE G3:                               ${overallPass ? '🟢 [PASS G3 — AUTORIZADO G4]' : '🔴 [REJECT BATCH 036 — ARCHIVE]'}`);
console.log('='.repeat(95));

// 7. Save Report
const reportDir = resolve(ROOT_DIR, 'research/results/batch_036');
const reportJsonPath = resolve(reportDir, 'G3_FUNDING_REPORT.json');
const reportMdPath = resolve(reportDir, 'G3_FUNDING_REPORT.md');

const reportData = {
  batch: 'BATCH_036',
  gate: 'G3_TRIAD_EVALUATION',
  status: overallPass ? 'PASS' : 'REJECT',
  evaluatedAt: new Date().toISOString(),
  g3a: { passed: passedG3a, best: bestG3a, all: g3aResults },
  g3b: { passed: passedG3b, best: bestG3b, all: g3bResults },
  g3c: { passed: passedG3c, best: bestG3c, all: g3cResults }
};

writeFileSync(reportJsonPath, JSON.stringify(reportData, null, 2), 'utf8');

const mdReport = `# 🏛️ LYZER EDGE — BATCH 036: GATE G3 TRIAD REPORT

**Status do Gate G3:** ${overallPass ? '🟢 **PASS — SIGNIFICÂNCIA ESTATÍSTICA E ECONÔMICA CONFIRMADA**' : '🔴 **REJECT — SEM VIABILIDADE ESTATÍSTICA/ECONÔMICA**'}  
**Data da Avaliação:** ${new Date().toISOString()}  
**Amostra In-Sample (2023–2024):** $N = ${inSample.length.toLocaleString()}$ candles H1 sincronizados com 8h Funding Rate  

---

## 1. Teste G3a: Efeito Linear do Funding Rate ($Z_{F, t} \\rightarrow R_{t+k}$)

| Horizonte | $N$ Amostra | $\\beta$ | Erro-Padrão (HAC) | $t$-stat (HAC) | $p$-value | Spearman $IC$ | Pearson $r$ |
|---|---|---|---|---|---|---|---|
${g3aResults.map(r => `| **H+${r.horizonHours} (${r.horizonHours/24 >= 1 ? r.horizonHours/24 + 'd' : r.horizonHours + 'h'})** | ${r.n.toLocaleString()} | \`${(r.beta >= 0 ? '+' : '') + r.beta.toFixed(6)}\` | \`${r.seHAC.toFixed(6)}\` | \`${(r.tStatHAC >= 0 ? '+' : '') + r.tStatHAC.toFixed(3)}\` | \`${r.pValue < 0.0001 ? '< 0.0001' : r.pValue.toFixed(4)}\` | \`${(r.spearmanIC >= 0 ? '+' : '') + r.spearmanIC.toFixed(4)}\` | \`${(r.pearsonR >= 0 ? '+' : '') + r.pearsonR.toFixed(4)}\` |`).join('\n')}

---

## 2. Teste G3b: Interação Funding $\\times$ Regime de Volatilidade ($Z_F \\times V_t \\rightarrow R_{t+k}$)

| Horizonte | $\\beta(F \\times V)$ | Erro-Padrão (HAC) | $t$-stat (HAC) | $p$-value | Spearman $IC$ |
|---|---|---|---|---|---|
${g3bResults.map(r => `| **H+${r.horizonHours} (${r.horizonHours/24 >= 1 ? r.horizonHours/24 + 'd' : r.horizonHours + 'h'})** | \`${(r.betaInteraction >= 0 ? '+' : '') + r.betaInteraction.toFixed(6)}\` | \`${r.seHAC.toFixed(6)}\` | \`${(r.tStatHAC >= 0 ? '+' : '') + r.tStatHAC.toFixed(3)}\` | \`${r.pValue < 0.0001 ? '< 0.0001' : r.pValue.toFixed(4)}\` | \`${(r.spearmanIC >= 0 ? '+' : '') + r.spearmanIC.toFixed(4)}\` |`).join('\n')}

---

## 3. Teste G3c: Desempenho Econômico em Eventos Extremos ($|Z_F| \\ge 2.0$) Líquido de Taxas ($0.08\\%$)

| Horizonte | Funding Negativo ($Z \\le -2.0$) [LONG] | Funding Positivo ($Z \\ge +2.0$) [SHORT] | Retorno Médio Líquido | Baseline Incondicional | $N$ Amostra |
|---|---|---|---|---|---|
${g3cResults.map(r => `| **H+${r.horizonHours} (${r.days} dias)** | \`${(r.negativeFunding.grossReturnPct >= 0 ? '+' : '') + r.negativeFunding.grossReturnPct.toFixed(3)}%\` | \`${(r.positiveFunding.grossReturnPct >= 0 ? '+' : '') + r.positiveFunding.grossReturnPct.toFixed(3)}%\` | \`${(r.combined.netEdgePct >= 0 ? '+' : '') + r.combined.netEdgePct.toFixed(3)}%\` | \`${(r.baselineGrossPct >= 0 ? '+' : '') + r.baselineGrossPct.toFixed(3)}%\` | Neg: ${r.negativeFunding.n} / Pos: ${r.positiveFunding.n} |`).join('\n')}

---

## 4. Veredito Forense & Governança

- **Avaliação Linear ($G_{3a}$):** ${passedG3a ? 'Aprovada ($t\\text{-stat} > 3.0$).' : 'Reprovada.'}
- **Avaliação de Interação ($G_{3b}$):** ${passedG3b ? 'Aprovada ($t\\text{-stat} > 3.0$).' : 'Reprovada.'}
- **Avaliação Econômica ($G_{3c}$):** ${passedG3c ? 'Aprovada ($Edge_{net} \\ge +0.20\\%$).' : 'Reprovada.'}
- **Decisão Final:** ${overallPass ? '🟢 **AUTORIZADO AVANÇO PARA G4 (Falsificação Adversarial)**.' : '🔴 **ARQUIVAMENTO REGISTRADO COMO [REJECT] SEM ALTERAÇÃO POST-HOC**.'}
`;

writeFileSync(reportMdPath, mdReport, 'utf8');

console.log(`💾 Saved G3 Report to: ${reportMdPath}`);
console.log('='.repeat(95));
