#!/usr/bin/env node
/**
 * optimize_backtest.js
 * Otimizador por Varredura de Grade (Grid Search) para encontrar a combinação
 * de parâmetros mais lucrativa na lógica real do Lyzer Edge.
 */

import { LiquidityReconstructionEngine } from '../packages/lyzer-shared/src/providers/v1_smc_ict.js';
import { StructuralBoundaryEngine } from '../packages/lyzer-shared/src/providers/v2_snd_snr.js';
import { MomentumRsiEngine } from '../packages/lyzer-shared/src/providers/v3_momentum_rsi.js';
import { ScaleNormalizer } from '../packages/lyzer-shared/src/csrl/ScaleNormalizer.js';
import { CrossScaleTensorGraph } from '../packages/lyzer-shared/src/csrl/CrossScaleTensorGraph.js';
import { InvariantExtractor } from '../packages/lyzer-shared/src/csrl/InvariantExtractor.js';
import { DivergenceDetector } from '../packages/lyzer-shared/src/csrl/DivergenceDetector.js';
import { TruthKernel } from '../packages/lyzer-shared/src/engine/kernel.js';
import { ConstitutionalCourt } from '../packages/lyzer-constitution/src/eca/court.js';

// --- CONFIGURAÇÃO DE PRESET ---
const SYMBOL = 'BTCUSDT';
const OPPONENT = 'ETHUSDT';
const TIMEFRAME = '1d';
const LIMIT = 1000;

async function fetchCandles(symbol, interval, limit) {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Erro na API da Binance para ${symbol}`);
  const data = await res.json();
  return data.map(k => ({
    openTime: k[0],
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5]),
    closed: true
  }));
}

// Helper de correlação
function calculateCorrelation(arr1, arr2) {
  if (arr1.length === 0 || arr2.length === 0) return 1.0;
  const n = Math.min(arr1.length, arr2.length);
  const mean1 = arr1.reduce((sum, val) => sum + val, 0) / n;
  const mean2 = arr2.reduce((sum, val) => sum + val, 0) / n;
  let num = 0, den1 = 0, den2 = 0;
  for (let i = 0; i < n; i++) {
    const diff1 = arr1[i] - mean1;
    const diff2 = arr2[i] - mean2;
    num += diff1 * diff2;
    den1 += diff1 * diff1;
    den2 += diff2 * diff2;
  }
  if (den1 === 0 || den2 === 0) return 1.0;
  return num / Math.sqrt(den1 * den2);
}

async function runOptimization() {
  console.log(`\n======================================================`);
  console.log(`🔍 LYZER EDGE: OTIMIZADOR DE PARÂMETROS MULTIDIMENSIONAL`);
  console.log(`Ativo: ${SYMBOL} | Líder: ${OPPONENT} | Período: Últimos ${LIMIT} dias`);
  console.log(`======================================================\n`);

  try {
    const btcCandles = await fetchCandles(SYMBOL, TIMEFRAME, LIMIT);
    const ethCandles = await fetchCandles(OPPONENT, TIMEFRAME, LIMIT);
    const length = Math.min(btcCandles.length, ethCandles.length);

    console.log(`[API] Dados baixados. Iniciando varredura em lote...`);

    // Espaço de busca (parâmetros a testar)
    const trgThresholds = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6];
    const stopDistances = [0.015, 0.02, 0.03, 0.04, 0.05, 0.06]; // De 1.5% a 6%
    const rewardRatios = [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0]; // Take Profit = SL * Razão
    const dvfFloors = [0.05, 0.1, 0.15];

    const results = [];

    // Pre-calcular dados de sinais por vela para economizar CPU
    const signalCache = [];
    const v1 = new LiquidityReconstructionEngine();
    const v2 = new StructuralBoundaryEngine();
    const v3 = new MomentumRsiEngine();
    const scaleNormalizer = new ScaleNormalizer();
    const cstg = new CrossScaleTensorGraph();
    const invariantExtractor = new InvariantExtractor();
    const divergenceDetector = new DivergenceDetector();

    for (let i = 50; i < length; i++) {
      const currentCandle = btcCandles[i];
      const mtfCandles = {
        '1m': btcCandles.slice(Math.max(0, i - 100), i + 1),
        '5m': btcCandles.slice(Math.max(0, i - 100), i + 1),
        '15m': btcCandles.slice(Math.max(0, i - 100), i + 1),
        '1h': btcCandles.slice(Math.max(0, i - 100), i + 1),
        '4h': btcCandles.slice(Math.max(0, i - 100), i + 1),
        '1d': btcCandles.slice(Math.max(0, i - 100), i + 1)
      };
      Object.defineProperty(mtfCandles, 'fast', { get: () => mtfCandles['1d'] });
      Object.defineProperty(mtfCandles, 'intermediate', { get: () => mtfCandles['1d'] });
      Object.defineProperty(mtfCandles, 'slow', { get: () => mtfCandles['1d'] });

      const v1Narrative = v1.reconstruct(mtfCandles);
      const v2Narrative = v2.reconstruct(mtfCandles);
      const v3Narrative = v3.reconstruct(mtfCandles);

      const alignedTensors = scaleNormalizer.alignScales(mtfCandles);
      const topology = cstg.buildTopology(alignedTensors);
      const invariants = invariantExtractor.extract(topology);
      const sds = divergenceDetector.detect(topology);

      const providers = {
        v1: { signal: v1Narrative.signal, confidence: v1Narrative.confidence },
        v2: { signal: v2Narrative.signal, confidence: v2Narrative.confidence },
        v3: { signal: v3Narrative.signal, confidence: v3Narrative.confidence }
      };

      signalCache.push({
        index: i,
        candle: currentCandle,
        providers,
        invariants,
        sds,
        v1Narrative,
        v2Narrative,
        v3Narrative
      });
    }

    console.log(`[OTIMIZADOR] Sinais pré-calculados. Testando ${trgThresholds.length * stopDistances.length * rewardRatios.length * dvfFloors.length} combinações...`);

    // Iniciar Grid Search
    for (const trg of trgThresholds) {
      for (const sl of stopDistances) {
        for (const ratio of rewardRatios) {
          for (const dvfFloor of dvfFloors) {
            
            // Instanciar Kernel & Corte com a configuração atual
            const truthKernel = new TruthKernel({
              trgThreshold: trg,
              lhdsVetoLimit: 0.8,
              ontologicalCollapseTrg: 0.7
            });
            const court = new ConstitutionalCourt();
            court.configure(
              { dvfFloor: dvfFloor, stressAccumulation: 0.002, lethalIllusionLimit: 0.9, stressRelease: 0.1 },
              { sclThreshold: 3 }
            );

            let balance = 10000;
            const initialBalance = 10000;
            let peakBalance = 10000;
            let maxDrawdown = 0;
            let position = null;
            let totalTrades = 0;
            let wins = 0;

            for (const step of signalCache) {
              const currentCandle = step.candle;

              // Avaliar com o TruthKernel
              const kernelVerdict = truthKernel.evaluate(step.providers, {
                liquidityDivergence: 1.0,
                scaleDivergence: step.sds,
                lhds: 0.1,
                invariants: step.invariants
              });

              let courtApproved = false;
              if (kernelVerdict.eef) {
                const permissionToken = court.requestPermission('EXECUTE_TRADE', kernelVerdict, {
                  eef: kernelVerdict.eef,
                  reason: kernelVerdict.reason_codes[0]
                });
                if (permissionToken.granted) {
                  courtApproved = true;
                }
              }

              // Entrada na Posição
              if (courtApproved && !position) {
                const combinedSignal = step.v1Narrative.signal !== 'flat' ? step.v1Narrative.signal 
                                     : (step.v2Narrative.signal !== 'flat' ? step.v2Narrative.signal : step.v3Narrative.signal);
                const direction = (combinedSignal === 'go' || combinedSignal === 'long') ? 'LONG' : 'SHORT';
                const entryPrice = currentCandle.close;

                const stopLoss = direction === 'LONG' ? entryPrice * (1 - sl) : entryPrice * (1 + sl);
                const takeProfit = direction === 'LONG' ? entryPrice * (1 + (sl * ratio)) : entryPrice * (1 - (sl * ratio));

                position = {
                  type: direction,
                  entryPrice,
                  stopLoss,
                  takeProfit,
                  amount: 2000 / entryPrice
                };
              }

              // Gerenciar Saídas
              if (position) {
                let closed = false;
                let exitPrice = 0;

                if (position.type === 'LONG') {
                  if (currentCandle.low <= position.stopLoss) {
                    closed = true;
                    exitPrice = position.stopLoss;
                  } else if (currentCandle.high >= position.takeProfit) {
                    closed = true;
                    exitPrice = position.takeProfit;
                  }
                } else {
                  if (currentCandle.high <= position.stopLoss) {
                    closed = true;
                    exitPrice = position.stopLoss;
                  } else if (currentCandle.low >= position.takeProfit) {
                    closed = true;
                    exitPrice = position.takeProfit;
                  }
                }

                if (closed) {
                  const fees = (position.amount * position.entryPrice * 0.001) + (position.amount * exitPrice * 0.001);
                  const rawPnl = position.type === 'LONG'
                    ? (exitPrice - position.entryPrice) * position.amount
                    : (position.entryPrice - exitPrice) * position.amount;
                  const pnl = rawPnl - fees;

                  balance += pnl;
                  peakBalance = Math.max(peakBalance, balance);
                  const dd = ((peakBalance - balance) / peakBalance) * 100;
                  maxDrawdown = Math.max(maxDrawdown, dd);

                  totalTrades++;
                  if (pnl > 0) wins++;

                  position = null;
                }
              }
            }

            const netPnL = balance - initialBalance;
            const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
            const profitFactor = totalTrades > 0 ? (wins / Math.max(1, totalTrades - wins)) : 0;

            results.push({
              trgThreshold: trg,
              stopDistance: sl,
              rewardRatio: ratio,
              dvfFloor,
              netPnL,
              netPnLPct: (netPnL / initialBalance) * 100,
              winRate,
              totalTrades,
              maxDrawdown,
              profitFactor
            });
          }
        }
      }
    }

    // Filtrar configurações válidas (ex: mínimo de 15 trades para evitar overfitting/sorte)
    const validResults = results.filter(r => r.totalTrades >= 15);
    validResults.sort((a, b) => b.netPnL - a.netPnL);

    console.log(`\n======================================================`);
    console.log(`🏆 TOP 5 PARÂMETROS MAIS LUCRATIVOS ENCONTRADOS`);
    console.log(`======================================================`);
    
    for (let i = 0; i < Math.min(5, validResults.length); i++) {
      const r = validResults[i];
      console.log(`\n🥇 RANK #${i + 1}:`);
      console.log(`  • TRG Threshold:       ${r.trgThreshold}`);
      console.log(`  • Stop Loss (SL):      ${(r.stopDistance * 100).toFixed(1)}%`);
      console.log(`  • Take Profit (TP):    ${((r.stopDistance * r.rewardRatio) * 100).toFixed(1)}% (Rácio R:R = 1:${r.rewardRatio})`);
      console.log(`  • Corte DVF Floor:     ${r.dvfFloor}`);
      console.log(`  ----------------------------------------------------`);
      console.log(`  • Retorno Líquido:     +$${r.netPnL.toFixed(2)} (+${r.netPnLPct.toFixed(2)}%)`);
      console.log(`  • Total de Trades:     ${r.totalTrades}`);
      console.log(`  • Taxa de Acerto:      ${r.winRate.toFixed(2)}%`);
      console.log(`  • Max Drawdown:        ${r.maxDrawdown.toFixed(2)}%`);
    }
    console.log(`======================================================\n`);

  } catch (error) {
    console.error("Erro durante a otimização:", error);
  }
}

runOptimization();
