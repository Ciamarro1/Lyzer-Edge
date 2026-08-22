import { describe, it, expect } from 'vitest';
import { StatisticalValidator } from '../../../packages/lyzer-shared/src/research/statisticalValidator.js';
import { classifyRegime } from '../../../packages/lyzer-shared/src/research/regimeClassifier.js';
import { AlphaEvolutionEngine } from '../../../packages/lyzer-shared/src/research/alphaEvolutionEngine.js';

describe('Autonomous Research Lab - Suite de Testes do Motor Científico', () => {
  it('deve calcular estatísticas completas de trades via StatisticalValidator', () => {
    const validator = new StatisticalValidator();
    const trades = [
      { pnl: 0.05, holdingBars: 5, exitReason: 'TP' },
      { pnl: -0.02, holdingBars: 3, exitReason: 'SL' },
      { pnl: 0.04, holdingBars: 8, exitReason: 'TP' },
      { pnl: -0.01, holdingBars: 2, exitReason: 'SL' },
      { pnl: 0.03, holdingBars: 4, exitReason: 'TP' }
    ];

    const stats = validator.computeAll(trades);
    expect(stats).toHaveProperty('totalReturn');
    expect(stats.winRate).toBe(0.6);
    expect(stats.profitFactor).toBeGreaterThan(1.0);
    expect(stats.sharpe).toBeDefined();
    expect(stats.maxDrawdown).toBeLessThanOrEqual(0);
  });

  it('deve classificar regimes de mercado via classifyRegime', () => {
    const candles = Array.from({ length: 35 }, (_, i) => ({
      open: 100 + i * 0.5,
      high: 102 + i * 0.5,
      low: 99 + i * 0.5,
      close: 101 + i * 0.5,
      volume: 1000 + i * 10
    }));

    const result = classifyRegime(candles);
    expect(result).toHaveProperty('regime');
    expect(result).toHaveProperty('confidence');
    expect(result.metrics).toHaveProperty('atrRatio');
    expect(result.transition).toHaveProperty('predictedNext');
  });

  it('deve instanciar e gerenciar hipóteses via AlphaEvolutionEngine', () => {
    const engine = new AlphaEvolutionEngine();
    expect(engine).toBeDefined();
    const id = engine.propose('Test Hypothesis', 'Test description', {}, {});
    expect(id).toBeDefined();
    expect(typeof engine.monitor).toBe('function');
  });
});
