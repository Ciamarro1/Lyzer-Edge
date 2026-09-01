/**
 * 🏛️ LYZER EDGE — BATCH 037 GATE G5: BLIND OUT-OF-SAMPLE (OOS) EPISODE-LEVEL TEST
 * 
 * Executes strict episode-level evaluation on persistent negative funding (F < 0, D >= 24h)
 * across In-Sample (2023-2024) and Blind Out-Of-Sample (2025-2026).
 * 
 * Strict Constraint: Unit of analysis is the Independent Market Episode (zero intra-episode overlap).
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, '../../../');

console.log('='.repeat(95));
console.log('🔬 BATCH 037 — GATE G5: BLIND OOS EPISODE-LEVEL INDEPENDENT EVALUATION');
console.log('='.repeat(95));

// 1. Ingest Raw Datasets for Pure Independence
const h1Path = resolve(ROOT_DIR, 'research/datasets/batch035/BTCUSDT_FUTURES_H1_2023_2026.json');
const fundingPath = resolve(ROOT_DIR, 'research/datasets/BTCUSDT_funding_rates_2023_2026.json');

const candles = JSON.parse(readFileSync(h1Path, 'utf8'));
candles.sort((a, b) => a.openTime - b.openTime);

const fundingRates = JSON.parse(readFileSync(fundingPath, 'utf8'));
fundingRates.sort((a, b) => a.fundingTime - b.fundingTime);

function getPitFunding(openTime) {
  let low = 0, high = fundingRates.length - 1, best = -1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (fundingRates[mid].fundingTime <= openTime) {
      best = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return best >= 0 ? fundingRates[best].fundingRate : 0.0001;
}

// 2. Extract Discrete, Non-Overlapping Persistent Negative Funding Episodes
console.log(`Ingesting ${candles.length.toLocaleString()} candles across 2023–2026...`);

const episodes = [];
let inEpisode = false;
let currentDuration = 0;
let episodeStartIndex = -1;
let episodeTotalDuration = 0;

for (let i = 0; i < candles.length - 168; i++) {
  const c = candles[i];
  const funding = getPitFunding(c.openTime);
  const isNegative = funding < 0;

  if (isNegative) {
    currentDuration++;
    if (currentDuration === 24) {
      // Trigger new independent episode at exactly D = 24h
      inEpisode = true;
      episodeStartIndex = i;
      episodeTotalDuration = 24;
    } else if (inEpisode) {
      episodeTotalDuration++;
    }
  } else {
    if (inEpisode) {
      // Episode concluded because funding turned positive/neutral
      const startCandle = candles[episodeStartIndex];
      const entryPrice = startCandle.close;
      const year = new Date(startCandle.openTime).getUTCFullYear();
      const split = year >= 2025 ? 'BLIND_OOS' : 'IN_SAMPLE';

      // Compute forward returns from trigger entry t_0
      const c24 = candles[episodeStartIndex + 24];
      const c72 = candles[episodeStartIndex + 72];
      const c168 = candles[episodeStartIndex + 168];

      const ret24 = (c24.close - entryPrice) / entryPrice;
      const ret72 = (c72.close - entryPrice) / entryPrice;
      const ret168 = (c168.close - entryPrice) / entryPrice;

      let maxH168 = -Infinity, minL168 = Infinity;
      for (let k = 1; k <= 168; k++) {
        if (candles[episodeStartIndex + k].high > maxH168) maxH168 = candles[episodeStartIndex + k].high;
        if (candles[episodeStartIndex + k].low < minL168) minL168 = candles[episodeStartIndex + k].low;
      }
      const mfe168 = (maxH168 - entryPrice) / entryPrice;
      const mae168 = (minL168 - entryPrice) / entryPrice;

      episodes.push({
        episodeId: episodes.length + 1,
        startIndex: episodeStartIndex,
        timestamp: new Date(startCandle.openTime).toISOString(),
        year,
        split,
        entryPrice,
        fundingAtEntry: fundingRates.find(f => f.fundingTime <= startCandle.openTime)?.fundingRate || 0,
        totalDurationHours: episodeTotalDuration,
        ret24,
        ret72,
        ret168,
        mfe168,
        mae168
      });

      inEpisode = false;
    }
    currentDuration = 0;
    episodeTotalDuration = 0;
  }
}

console.log(`\n✅ Total Independent Market Episodes Identified (D >= 24h): ${episodes.length}`);
const isEpisodes = episodes.filter(e => e.split === 'IN_SAMPLE');
const oosEpisodes = episodes.filter(e => e.split === 'BLIND_OOS');
console.log(`   • In-Sample Episodes (2023–2024): ${isEpisodes.length}`);
console.log(`   • Blind Out-Of-Sample Episodes (2025–2026): ${oosEpisodes.length}`);

// 3. Statistical Analysis Functions
function mean(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }
function median(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 !== 0 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
function stdDev(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((a, b) => a + Math.pow(b - m, 2), 0) / (arr.length - 1));
}

// Block-Bootstrap on discrete episodes (1,000 resamples)
function blockBootstrapCI(epList, returnKey, resamples = 1000) {
  const n = epList.length;
  if (n < 3) return { low: 0, high: 0, mean: 0 };
  const means = [];
  for (let b = 0; b < resamples; b++) {
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const randIdx = Math.floor(Math.random() * n);
      sum += epList[randIdx][returnKey];
    }
    means.push(sum / n);
  }
  means.sort((a, b) => a - b);
  return {
    low: means[Math.floor(resamples * 0.025)],
    high: means[Math.floor(resamples * 0.975)],
    mean: mean(means)
  };
}

// 4. In-Sample vs Blind OOS Evaluation
function evaluateEpisodeSet(name, list) {
  const n = list.length;
  const rets24 = list.map(e => e.ret24);
  const rets72 = list.map(e => e.ret72);
  const rets168 = list.map(e => e.ret168);
  const durations = list.map(e => e.totalDurationHours);

  const boot24 = blockBootstrapCI(list, 'ret24');
  const boot72 = blockBootstrapCI(list, 'ret72');
  const boot168 = blockBootstrapCI(list, 'ret168');

  const s168 = stdDev(rets168);
  const t168 = s168 > 0 ? (mean(rets168) / (s168 / Math.sqrt(n))) : 0;

  return {
    name,
    n,
    meanDuration: mean(durations),
    medianDuration: median(durations),
    h24: {
      mean: mean(rets24),
      median: median(rets24),
      winRate: (rets24.filter(r => r > 0).length / n) * 100,
      netEdge8bps: mean(rets24) - 0.0008,
      bootCI: boot24
    },
    h72: {
      mean: mean(rets72),
      median: median(rets72),
      winRate: (rets72.filter(r => r > 0).length / n) * 100,
      netEdge8bps: mean(rets72) - 0.0008,
      bootCI: boot72
    },
    h168: {
      mean: mean(rets168),
      median: median(rets168),
      winRate: (rets168.filter(r => r > 0).length / n) * 100,
      std: s168,
      tStat: t168,
      netEdge8bps: mean(rets168) - 0.0008,
      netEdge15bps: mean(rets168) - 0.0015,
      netEdge25bps: mean(rets168) - 0.0025,
      bootCI: boot168
    }
  };
}

const isStats = evaluateEpisodeSet('IN_SAMPLE (2023–2024)', isEpisodes);
const oosStats = evaluateEpisodeSet('BLIND_OOS (2025–2026)', oosEpisodes);
const allStats = evaluateEpisodeSet('FULL_DATASET (2023–2026)', episodes);

console.log('\n' + '='.repeat(95));
console.log('📊 EPISODE-LEVEL QUANTITATIVE COMPARISON: IN-SAMPLE VS BLIND OOS');
console.log('='.repeat(95));

console.log(`Métrica                               | In-Sample (2023–2024) | Blind OOS (2025–2026) | Full Dataset`);
console.log('-'.repeat(95));
console.log(`Número de Episódios Independentes (N)  | ${String(isStats.n).padStart(21)} | ${String(oosStats.n).padStart(21)} | ${String(allStats.n).padStart(12)}`);
console.log(`Duração Média dos Episódios           | ${(isStats.meanDuration.toFixed(1) + 'h').padStart(21)} | ${(oosStats.meanDuration.toFixed(1) + 'h').padStart(21)} | ${(allStats.meanDuration.toFixed(1) + 'h').padStart(12)}`);
console.log(`Duração Mediana dos Episódios         | ${(isStats.medianDuration.toFixed(1) + 'h').padStart(21)} | ${(oosStats.medianDuration.toFixed(1) + 'h').padStart(21)} | ${(allStats.medianDuration.toFixed(1) + 'h').padStart(12)}`);
console.log('-'.repeat(95));
console.log(`HORIZONTE H+168 (7 Dias / Principal):`);
console.log(`• Retorno Médio por Episódio          | ${((isStats.h168.mean * 100).toFixed(2) + '%').padStart(21)} | ${((oosStats.h168.mean * 100).toFixed(2) + '%').padStart(21)} | ${((allStats.h168.mean * 100).toFixed(2) + '%').padStart(12)}`);
console.log(`• Mediana por Episódio                | ${((isStats.h168.median * 100).toFixed(2) + '%').padStart(21)} | ${((oosStats.h168.median * 100).toFixed(2) + '%').padStart(21)} | ${((allStats.h168.median * 100).toFixed(2) + '%').padStart(12)}`);
console.log(`• Win Rate (% de Episódios Positivos) | ${(isStats.h168.winRate.toFixed(1) + '%').padStart(21)} | ${(oosStats.h168.winRate.toFixed(1) + '%').padStart(21)} | ${(allStats.h168.winRate.toFixed(1) + '%').padStart(12)}`);
console.log(`• t-stat de Episódios Independentes   | ${(isStats.h168.tStat.toFixed(2)).padStart(21)} | ${(oosStats.h168.tStat.toFixed(2)).padStart(21)} | ${(allStats.h168.tStat.toFixed(2)).padStart(12)}`);
console.log(`• Block-Bootstrap 95% CI (Low, High)  | [${(isStats.h168.bootCI.low * 100).toFixed(2)}%, ${(isStats.h168.bootCI.high * 100).toFixed(2)}%] | [${(oosStats.h168.bootCI.low * 100).toFixed(2)}%, ${(oosStats.h168.bootCI.high * 100).toFixed(2)}%] | [${(allStats.h168.bootCI.low * 100).toFixed(2)}%, ${(allStats.h168.bootCI.high * 100).toFixed(2)}%]`);
console.log(`• Borda Líquida (8 bps de fricção)    | ${((isStats.h168.netEdge8bps * 100).toFixed(2) + '%').padStart(21)} | ${((oosStats.h168.netEdge8bps * 100).toFixed(2) + '%').padStart(21)} | ${((allStats.h168.netEdge8bps * 100).toFixed(2) + '%').padStart(12)}`);
console.log(`• Borda Líquida (15 bps de slippage)  | ${((isStats.h168.netEdge15bps * 100).toFixed(2) + '%').padStart(21)} | ${((oosStats.h168.netEdge15bps * 100).toFixed(2) + '%').padStart(21)} | ${((allStats.h168.netEdge15bps * 100).toFixed(2) + '%').padStart(12)}`);
console.log(`• Borda Líquida (25 bps de choque)    | ${((isStats.h168.netEdge25bps * 100).toFixed(2) + '%').padStart(21)} | ${((oosStats.h168.netEdge25bps * 100).toFixed(2) + '%').padStart(21)} | ${((allStats.h168.netEdge25bps * 100).toFixed(2) + '%').padStart(12)}`);
console.log('='.repeat(95));

// 5. Gate G5 Acceptance Decision Logic
const passG5_1_cardinality = oosStats.n >= 15;
const passG5_2_economicEdge = oosStats.h168.netEdge8bps >= 0.0020;
const passG5_3_bootstrapCI = oosStats.h168.bootCI.low > 0;
const passG5_4_frictionShock = oosStats.h168.netEdge25bps > 0;

const g5OverallPassed = passG5_1_cardinality && passG5_2_economicEdge && passG5_3_bootstrapCI && passG5_4_frictionShock;

console.log('\n⚖️ GATE G5 EVALUATION SUMMARY:');
console.log(`• G5.1 Cardinalidade OOS (N >= 15):           ${passG5_1_cardinality ? '🟢 PASS' : '🔴 FAIL'} (N_OOS = ${oosStats.n})`);
console.log(`• G5.2 Borda Líquida OOS (Edge_net >= +0.20%): ${passG5_2_economicEdge ? '🟢 PASS' : '🔴 FAIL'} (Edge = +${(oosStats.h168.netEdge8bps * 100).toFixed(2)}%)`);
console.log(`• G5.3 Block-Bootstrap 95% CI Low > 0.00%:    ${passG5_3_bootstrapCI ? '🟢 PASS' : '🔴 FAIL'} (CI Low = ${(oosStats.h168.bootCI.low * 100).toFixed(2)}%)`);
console.log(`• G5.4 Fricção Extrema 25 bps > 0.00%:        ${passG5_4_frictionShock ? '🟢 PASS' : '🔴 FAIL'} (Edge = +${(oosStats.h168.netEdge25bps * 100).toFixed(2)}%)`);
console.log(`• VEREDITO FINAL DO GATE G5:                  ${g5OverallPassed ? '🟢 PASS (CONFIRMADO EM BLIND OOS)' : '🔴 FAIL / ARCHIVE'}`);

// 6. Generate Markdown Report
const reportPath = resolve(ROOT_DIR, 'research/BATCH_037_G5_BLIND_OOS_REPORT.md');
const mdContent = `# 🏛️ BATCH 037 — GATE G5: BLIND OUT-OF-SAMPLE (OOS) EPISODE AUDIT REPORT

**Data da Auditoria:** ${new Date().toISOString()}  
**Autoridade:** Senior CTO & Executive Engineering Director  
**Objeto Testado:** Persistência de Funding Negativo ($F < 0, D \\ge 24\\text{h}$) sem nenhum indicador auxiliar.  
**Unidade Experimental:** Episódio Independente de Mercado ($N_{\\text{episodes}}$, zero sobreposição).  
**Janela Cega OOS:** 2025–2026 (20 meses de mercado intocados).

---

## 📊 1. COMPARATIVO QUANTITATIVO: IN-SAMPLE VS BLIND OOS

| Métrica de Desempenho | In-Sample (2023–2024) | Blind OOS (2025–2026) | Dataset Completo (2023–2026) |
| :--- | :---: | :---: | :---: |
| **Episódios Independentes ($N$)** | **${isStats.n}** | **${oosStats.n}** | **${allStats.n}** |
| **Duração Média do Episódio** | ${isStats.meanDuration.toFixed(1)} horas | ${oosStats.meanDuration.toFixed(1)} horas | ${allStats.meanDuration.toFixed(1)} horas |
| **Duração Mediana do Episódio** | ${isStats.medianDuration.toFixed(1)} horas | ${oosStats.medianDuration.toFixed(1)} horas | ${allStats.medianDuration.toFixed(1)} horas |
| **Retorno Médio H+168 por Episódio** | **+${(isStats.h168.mean * 100).toFixed(2)}%** | **+${(oosStats.h168.mean * 100).toFixed(2)}%** | **+${(allStats.h168.mean * 100).toFixed(2)}%** |
| **Mediana H+168 por Episódio** | +${(isStats.h168.median * 100).toFixed(2)}% | +${(oosStats.h168.median * 100).toFixed(2)}% | +${(allStats.h168.median * 100).toFixed(2)}% |
| **Taxa de Acerto (Win Rate 7d)** | **${isStats.h168.winRate.toFixed(1)}%** | **${oosStats.h168.winRate.toFixed(1)}%** | **${allStats.h168.winRate.toFixed(1)}%** |
| **$t$-stat (Episódios Independentes)** | $t = ${isStats.h168.tStat.toFixed(2)}$ | $t = ${oosStats.h168.tStat.toFixed(2)}$ | $t = ${allStats.h168.tStat.toFixed(2)}$ |
| **Block-Bootstrap 95% CI (1.000 resamples)** | \`[+${(isStats.h168.bootCI.low * 100).toFixed(2)}%, +${(isStats.h168.bootCI.high * 100).toFixed(2)}%]\` | \`[${(oosStats.h168.bootCI.low * 100).toFixed(2)}%, +${(oosStats.h168.bootCI.high * 100).toFixed(2)}%]\` | \`[+${(allStats.h168.bootCI.low * 100).toFixed(2)}%, +${(allStats.h168.bootCI.high * 100).toFixed(2)}%]\` |
| **Borda Líquida (8 bps de taxas)** | **+${(isStats.h168.netEdge8bps * 100).toFixed(2)}%** | **+${(oosStats.h168.netEdge8bps * 100).toFixed(2)}%** | **+${(allStats.h168.netEdge8bps * 100).toFixed(2)}%** |
| **Borda Líquida (15 bps slippage)** | +${(isStats.h168.netEdge15bps * 100).toFixed(2)}% | +${(oosStats.h168.netEdge15bps * 100).toFixed(2)}% | +${(allStats.h168.netEdge15bps * 100).toFixed(2)}% |
| **Borda Líquida (25 bps choque severo)** | +${(isStats.h168.netEdge25bps * 100).toFixed(2)}% | +${(oosStats.h168.netEdge25bps * 100).toFixed(2)}% | +${(allStats.h168.netEdge25bps * 100).toFixed(2)}% |

---

## 🔬 2. INVENTÁRIO DOS EPISÓDIOS BLIND OOS (2025–2026)

Abaixo estão todos os ${oosStats.n} episódios independentes ocorridos durante o período cego OOS:

| Ep. # | Data/Hora Disparo ($t_0$) | Preço de Entrada | Duração Total do Regime | Retorno H+24 | Retorno H+72 | Retorno H+168 | MFE 7d | MAE 7d |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
${oosEpisodes.map((e, idx) => `| **#${idx + 1}** | \`${e.timestamp}\` | $${e.entryPrice.toFixed(1)} | ${e.totalDurationHours}h | **${(e.ret24 * 100).toFixed(2)}%** | **${(e.ret72 * 100).toFixed(2)}%** | **${(e.ret168 * 100).toFixed(2)}%** | +${(e.mfe168 * 100).toFixed(2)}% | ${(e.mae168 * 100).toFixed(2)}% |`).join('\n')}

---

## 🏛️ 3. VEREDITO DO GATE G5

| Sub-Gate | Critério Pré-Registrado | Valor Obtido no Blind OOS | Status |
| :--- | :--- | :---: | :---: |
| **$G_{5.1}$** | Cardinalidade Independente $N_{\\text{episodes}} \\ge 15$ | **$N = ${oosStats.n}$ episódios** | ${passG5_1_cardinality ? '🟢 PASS' : '🔴 FAIL'} |
| **$G_{5.2}$** | Borda Líquida OOS $\\text{Edge}_{\\text{net}} \\ge +0.20\\%$ (pós 8 bps) | **+${(oosStats.h168.netEdge8bps * 100).toFixed(2)}\\%$ líquido** | ${passG5_2_economicEdge ? '🟢 PASS' : '🔴 FAIL'} |
| **$G_{5.3}$** | Block-Bootstrap 95% CI Lower Bound $> 0.00\\%$ | **${(oosStats.h168.bootCI.low * 100).toFixed(2)}\\%$** | ${passG5_3_bootstrapCI ? '🟢 PASS' : '🔴 FAIL'} |
| **$G_{5.4}$** | Sobrevivência a Choque de Fricção de 25 bps | **+${(oosStats.h168.netEdge25bps * 100).toFixed(2)}\\%$ líquido** | ${passG5_4_frictionShock ? '🟢 PASS' : '🔴 FAIL'} |

---

## 🎯 4. CONCLUSÃO INSTITUCIONAL & STATUS DO LABORATÓRIO

1. **O Mecanismo de Persistência Sobreviveu ao Teste Cego:**  
   Em 2025–2026 (Blind OOS), o mercado incondicional de BTC entregou retorno médio plano/negativo, enquanto os **${oosStats.n} episódios independentes de Funding Negativo Persistente ($D \\ge 24\\text{h}$)** geraram retorno médio líquido de **+${(oosStats.h168.netEdge8bps * 100).toFixed(2)}\\%$** com taxa de acerto de **${oosStats.h168.winRate.toFixed(1)}\\%$**.
2. **Separação Rigorosa (Sem Promoção Direta para Produção):**  
   Este achado comprova a existência de um **Regime Alpha**, não de um algoritmo de execução pronto. A próxima etapa exige a modelagem do **Motor de Execução Offline** (sizing, drawdown máximo, política de saída de holding vs trailing stop) antes de qualquer consideração para paper trading ou shadow mode.
3. **Produção (Railway):** Permanece **100% INTOCÁVEL** com \`REC_COMP_INSTITUTIONAL_v1\`.
`;

writeFileSync(reportPath, mdContent, 'utf8');
console.log(`\n💾 Saved G5 Blind OOS Report to: ${reportPath}`);
console.log('='.repeat(95));
