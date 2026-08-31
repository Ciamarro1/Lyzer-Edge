/**
 * 🏛️ LYZER EDGE — BATCH 034: PHASE 1 — GATE G3 STATISTICAL TEST
 * 
 * Target: Test whether the Absorption Residual (\varepsilon_t) has statistically significant
 * predictive power over Forward Returns (R_{t+k}) using HAC / Newey-West robust standard errors.
 * 
 * Strict Scope: IN-SAMPLE DATA ONLY (2023-01-01 -> 2024-12-31). Out-of-sample remains frozen.
 * Output: research/results/batch_034/G3_STATISTICAL_REPORT.json and .md
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, '../../../');

console.log('='.repeat(80));
console.log('🔬 BATCH 034: GATE G3 — PREDICTIVE SIGNIFICANCE & CAUSAL TEST (PREREG-034)');
console.log('='.repeat(80));

// 1. Load Event Dataset
const datasetPath = resolve(ROOT_DIR, 'research/results/batch_034/EVENT_DATASET.json');
if (!existsSync(datasetPath)) {
  console.error(`❌ Event dataset not found at: ${datasetPath}. Run 01_extract_microstructure_features.js first.`);
  process.exit(1);
}

const allEvents = JSON.parse(readFileSync(datasetPath, 'utf8'));

// Filter strictly In-Sample (2023 - 2024)
const inSample = allEvents.filter(e => !e.isOOS);
console.log(`📊 In-Sample Scope: ${inSample.length.toLocaleString()} records [${inSample[0].isoDate.slice(0, 10)} -> ${inSample[inSample.length - 1].isoDate.slice(0, 10)}]`);
console.log(`🔒 Out-Of-Sample (${allEvents.length - inSample.length} records) is FROZEN and untouched.`);

// 2. Statistical Helper Functions
function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function variance(arr, m) {
  const u = m !== undefined ? m : mean(arr);
  return arr.reduce((a, b) => a + (b - u) ** 2, 0) / (arr.length - 1);
}

function std(arr, m) {
  return Math.sqrt(variance(arr, m));
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
  
  const rankX = getRanks(x);
  const rankY = getRanks(y);
  return pearsonCorrelation(rankX, rankY);
}

/**
 * OLS Regression with Newey-West (HAC) Standard Errors for Overlapping Returns
 */
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
  
  // Residuals e_i
  const e = new Float64Array(n);
  const u = new Float64Array(n); // u_i = (x_i - mx) * e_i
  for (let i = 0; i < n; i++) {
    e[i] = y[i] - (alpha + beta * x[i]);
    u[i] = (x[i] - mx) * e[i];
  }
  
  // Gamma_0
  let gamma0 = 0;
  for (let i = 0; i < n; i++) {
    gamma0 += u[i] * u[i];
  }
  gamma0 /= n;
  
  // Sum of weighted autocovariances (Bartlett kernel)
  let sumAutocov = 0;
  for (let lag = 1; lag <= maxLag; lag++) {
    let gammaLag = 0;
    for (let i = lag; i < n; i++) {
      gammaLag += u[i] * u[i - lag];
    }
    gammaLag /= n;
    const weight = 1 - lag / (maxLag + 1);
    sumAutocov += 2 * weight * gammaLag;
  }
  
  const sHAC = gamma0 + sumAutocov;
  const sxxAvg = sxx / n;
  const varBetaHAC = (sHAC / (sxxAvg * sxxAvg)) / n;
  const seBetaHAC = Math.sqrt(Math.max(0, varBetaHAC));
  const tStatHAC = seBetaHAC > 0 ? beta / seBetaHAC : 0;
  
  // Two-tailed p-value approximation from standard normal
  const z = Math.abs(tStatHAC);
  const pValue = 2 * (1 - normalCdf(z));
  
  // R-squared
  const syy = y.reduce((acc, yi) => acc + (yi - my) ** 2, 0);
  const rSquared = syy > 0 ? (sxy * sxy) / (sxx * syy) : 0;
  
  return { alpha, beta, seBetaHAC, tStatHAC, pValue, rSquared };
}

function normalCdf(x) {
  // Abramowitz & Stegun approximation
  const b1 = 0.319381530, b2 = -0.356563782, b3 = 1.781477937, b4 = -1.821255978, b5 = 1.330274429;
  const p = 0.2316419;
  const c = 0.39894228;
  if (x >= 0) {
    const t = 1.0 / (1.0 + p * x);
    return 1.0 - c * Math.exp(-x * x / 2.0) * t * (t * (t * (t * (t * b5 + b4) + b3) + b2) + b1);
  } else {
    const t = 1.0 / (1.0 - p * x);
    return c * Math.exp(-x * x / 2.0) * t * (t * (t * (t * (t * b5 + b4) + b3) + b2) + b1);
  }
}

// 3. Evaluate G3 Predictive Significance across Horizons
const HORIZONS = [1, 3, 6, 12, 24];
const results = [];

console.log('\n' + '='.repeat(80));
console.log('📈 REGRESSÃO PREDITIVA G3: ε_t (Residual de Absorção) → R_{t+k} (Retorno Futuro)');
console.log('='.repeat(80));
console.log(`Horizon | N Valid |    Beta    | SE (HAC) | t-stat (HAC) |   p-value   | Spearman IC | Pearson r |  R² (%) `);
console.log('-'.repeat(80));

for (const k of HORIZONS) {
  // Collect paired (zResidual, forwardReturn_k)
  const x = [];
  const y = [];
  
  for (let i = 0; i < inSample.length; i++) {
    const retK = inSample[i].forwardReturns[`k${k}`];
    const zRes = inSample[i].zResidual;
    if (retK !== null && !isNaN(retK) && !isNaN(zRes)) {
      x.push(zRes);
      y.push(retK);
    }
  }
  
  const lagHAC = k + 1; // Bartlett lag = horizon + 1
  const ols = olsNeweyWest(x, y, lagHAC);
  const spearmanIC = spearmanRankCorrelation(x, y);
  const pearsonR = pearsonCorrelation(x, y);
  
  const formatted = {
    horizon: `k=${k} (H+${k})`,
    horizonBars: k,
    n: x.length,
    beta: ols.beta,
    seHAC: ols.seBetaHAC,
    tStatHAC: ols.tStatHAC,
    pValue: ols.pValue,
    spearmanIC,
    pearsonR,
    rSquared: ols.rSquared * 100
  };
  results.push(formatted);
  
  const pStr = ols.pValue < 0.0001 ? '< 0.0001' : ols.pValue.toFixed(4);
  console.log(
    `k = ${String(k).padEnd(2)}  | ` +
    `${String(x.length).padStart(7)} | ` +
    `${(ols.beta >= 0 ? '+' : '') + ols.beta.toFixed(6)} | ` +
    `${ols.seBetaHAC.toFixed(6)} | ` +
    `${(ols.tStatHAC >= 0 ? '+' : '') + ols.tStatHAC.toFixed(3).padStart(6)}   | ` +
    `${pStr.padStart(11)} | ` +
    `${(spearmanIC >= 0 ? '+' : '') + spearmanIC.toFixed(4).padStart(7)}     | ` +
    `${(pearsonR >= 0 ? '+' : '') + pearsonR.toFixed(4).padStart(7)}   | ` +
    `${(ols.rSquared * 100).toFixed(3).padStart(6)}%`
  );
}

// 4. Extreme Absorption Event Study
console.log('\n' + '='.repeat(80));
console.log('⚡ ESTUDO DE EVENTOS EXTREMOS DE ABSORÇÃO (VDR × Z_ε)');
console.log('='.repeat(80));

const bullishEvents = inSample.filter(e => e.vdr <= -0.60 && e.zResidual >= 2.0 && e.forwardReturns.k6 !== null);
const bearishEvents = inSample.filter(e => e.vdr >= 0.60 && e.zResidual <= -2.0 && e.forwardReturns.k6 !== null);
const unconditionedK6 = inSample.filter(e => e.forwardReturns.k6 !== null).map(e => e.forwardReturns.k6);

const unconditionedMeanK6 = mean(unconditionedK6) * 100;
const bullishMeanK6 = bullishEvents.length > 0 ? mean(bullishEvents.map(e => e.forwardReturns.k6)) * 100 : 0;
const bearishMeanK6 = bearishEvents.length > 0 ? mean(bearishEvents.map(e => e.forwardReturns.k6)) * 100 : 0;

console.log(`Unconditioned Baseline Return (H+6):   ${(unconditionedMeanK6 >= 0 ? '+' : '') + unconditionedMeanK6.toFixed(3)}% (N = ${unconditionedK6.length.toLocaleString()})`);
console.log(`Bullish Absorption (VDR ≤ -0.6, Z_ε ≥ 2.0): ${(bullishMeanK6 >= 0 ? '+' : '') + bullishMeanK6.toFixed(3)}% (N = ${bullishEvents.length}) → Expected Reversal UP`);
console.log(`Bearish Absorption (VDR ≥ +0.6, Z_ε ≤ -2.0): ${(bearishMeanK6 >= 0 ? '+' : '') + bearishMeanK6.toFixed(3)}% (N = ${bearishEvents.length}) → Expected Reversal DOWN`);

// 5. Gate G3 Evaluation
// Criterion from PREREG-034: t-stat(HAC) > 3.0 and IC > 0.03 for at least one horizon in [3, 12]
const candidateHorizons = results.filter(r => r.horizonBars >= 3 && r.horizonBars <= 12);
const bestCandidate = candidateHorizons.reduce((best, cur) => cur.tStatHAC > best.tStatHAC ? cur : best, candidateHorizons[0]);

const passedG3 = bestCandidate && bestCandidate.tStatHAC > 3.0 && bestCandidate.spearmanIC > 0.03;

console.log('\n' + '='.repeat(80));
console.log('🏛️ VEREDITO DO GATE G3 (PREREG-034 CRITERIA)');
console.log('='.repeat(80));
console.log(`Best Candidate Horizon:     ${bestCandidate.horizon}`);
console.log(`Observed t-stat (HAC):      ${bestCandidate.tStatHAC.toFixed(3)} (Threshold Ex-Ante: > 3.000)`);
console.log(`Observed Spearman IC:       ${bestCandidate.spearmanIC.toFixed(4)} (Threshold Ex-Ante: > 0.030)`);
console.log(`Observed p-value (HAC):     ${bestCandidate.pValue < 0.0001 ? '< 0.0001' : bestCandidate.pValue.toFixed(4)}`);
console.log(`GATE G3 STATUS:             ${passedG3 ? '🟢 [PASS G3 — PROCEED TO G4]' : '🔴 [REJECT BATCH 034 — ARCHIVE]'}`);
console.log('='.repeat(80));

// 6. Save Report Artifacts
const reportDir = resolve(ROOT_DIR, 'research/results/batch_034');
const reportJsonPath = resolve(reportDir, 'G3_STATISTICAL_REPORT.json');
const reportMdPath = resolve(reportDir, 'G3_STATISTICAL_REPORT.md');

const reportData = {
  batch: 'BATCH_034',
  gate: 'G3_PREDICTIVE_SIGNIFICANCE',
  status: passedG3 ? 'PASS' : 'REJECT',
  evaluatedAt: new Date().toISOString(),
  inSampleRange: '2023-01-01 -> 2024-12-31',
  sampleSize: inSample.length,
  bestCandidate,
  allHorizons: results,
  extremeEvents: {
    unconditionedMeanK6: unconditionedMeanK6,
    bullishAbsorption: { n: bullishEvents.length, meanReturnK6: bullishMeanK6 },
    bearishAbsorption: { n: bearishEvents.length, meanReturnK6: bearishMeanK6 }
  }
};

writeFileSync(reportJsonPath, JSON.stringify(reportData, null, 2), 'utf8');

const mdReport = `# 🏛️ LYZER EDGE — BATCH 034: GATE G3 STATISTICAL REPORT

**Status do Gate G3:** ${passedG3 ? '🟢 **PASS — SIGNIFICÂNCIA PREDITIVA CONFIRMADA**' : '🔴 **REJECT — SEM SIGNIFICÂNCIA ESTATÍSTICA**'}  
**Data da Avaliação:** ${new Date().toISOString()}  
**Dataset:** BTCUSDT 1H In-Sample (2023–2024) | $N = ${inSample.length.toLocaleString()}$ barras  
**Métrica de Teste:** Regressão OLS com Erros-Padrão Newey-West (HAC) $R_{t+k} = \\alpha + \\beta \\cdot \\varepsilon_t + \\eta_{t+k}$  

---

## 1. Tabela de Regressão Preditiva por Horizonte

| Horizonte | $N$ Válidos | $\\beta$ (Coeficiente) | Erro-Padrão (HAC) | $t$-statistic (HAC) | $p$-value | Spearman $IC$ | Pearson $r$ | $R^2$ (%) |
|---|---|---|---|---|---|---|---|---|
${results.map(r => `| **${r.horizon}** | ${r.n.toLocaleString()} | \`${(r.beta >= 0 ? '+' : '') + r.beta.toFixed(6)}\` | \`${r.seHAC.toFixed(6)}\` | \`${(r.tStatHAC >= 0 ? '+' : '') + r.tStatHAC.toFixed(3)}\` | \`${r.pValue < 0.0001 ? '< 0.0001' : r.pValue.toFixed(4)}\` | \`${(r.spearmanIC >= 0 ? '+' : '') + r.spearmanIC.toFixed(4)}\` | \`${(r.pearsonR >= 0 ? '+' : '') + r.pearsonR.toFixed(4)}\` | \`${r.rSquared.toFixed(3)}%\` |`).join('\n')}

---

## 2. Estudo de Eventos Extremos de Absorção

- **Baseline Incondicional ($H+6$):** \`${(unconditionedMeanK6 >= 0 ? '+' : '') + unconditionedMeanK6.toFixed(3)}%\` ($N = ${unconditionedK6.length.toLocaleString()}$)
- **Bullish Absorption ($VDR \\le -0.60, Z_{\\varepsilon} \\ge +2.0$):** \`${(bullishMeanK6 >= 0 ? '+' : '') + bullishMeanK6.toFixed(3)}%\` ($N = ${bullishEvents.length}$)
- **Bearish Absorption ($VDR \\ge +0.60, Z_{\\varepsilon} \\le -2.0$):** \`${(bearishMeanK6 >= 0 ? '+' : '') + bearishMeanK6.toFixed(3)}%\` ($N = ${bearishEvents.length}$)

---

## 3. Conclusão e Próximo Passo

${passedG3 ? `O Gate G3 foi **APROVADO**. O resíduo de absorção $\\varepsilon_t$ demonstrou poder preditivo estatisticamente significante com $t\\text{-stat}(HAC) = ${bestCandidate.tStatHAC.toFixed(3)} > 3.0$ e $IC = ${bestCandidate.spearmanIC.toFixed(4)} > 0.03$ no horizonte ${bestCandidate.horizon}. A hipótese nula $H_0$ foi rejeitada com $p < 0.0013$. Autorizado avanço para o Comitê de Falsificação ($G_4 \\dots G_{10}$).` : `O Gate G3 foi **REPROVADO**. O resíduo de absorção não atingiu os critérios ex-ante de significância preditiva. Conforme o mandato de governança, o Batch 034 é arquivado como [REJECT] sem ajuste post-hoc de parâmetros.`}
`;

writeFileSync(reportMdPath, mdReport, 'utf8');

console.log(`💾 Saved G3 Report to: ${reportMdPath}`);
console.log('='.repeat(80));
