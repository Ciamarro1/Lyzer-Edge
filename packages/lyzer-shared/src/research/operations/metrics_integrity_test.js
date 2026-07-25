import { ContinuousAlphaAuditor } from './continuousAlphaAuditor.js';
import { InstitutionalRealityEngine } from './institutionalRealityEngine.js';

export function runMetricsIntegrityCheck() {
  console.log("=== RUNNING METRICS INTEGRITY CHECK ===");

  // 1. Validar Baseline Fixa no Auditor (Prevenção de Slow Decay)
  console.log("Testing ContinuousAlphaAuditor Baseline Immutability...");
  const auditor = new ContinuousAlphaAuditor(1.5, 0.45);
  
  // Força uma degradação
  auditor.auditTrade(-0.01);
  auditor.auditTrade(-0.02);
  
  const initialBaseline = auditor.baselineSharpe;
  // O baseline original tem que permanecer 1.5, independentemente dos trades que entraram.
  if (auditor.baselineSharpe !== 1.5) {
    throw new Error("[INTEGRITY FAILED] Baseline Sharpe was mutated during audit.");
  }
  console.log("[PASS] Baseline Sharpe remains immutable.");

  // 2. Validar Cálculo de Drawdown (Proteção contra Overflow e Inversão de Sinal)
  console.log("Testing Reality Engine Gap Calculation Boundaries...");
  const engine = new InstitutionalRealityEngine();
  // Simular um ganho irreal na execução vs teórico (caso onde a slippage seria negativa, ou seja, comprou mais barato que o bot)
  // Isso não deve gerar "penalidade negativa" que esconda problemas sistêmicos.
  engine.logExecution(0.01, 0.02, 10, 100, 100); 
  const gap = engine.calculateRealityGap();
  
  if (gap.gapScore < 0) {
    throw new Error("[INTEGRITY FAILED] Gap Score is negative, masking future errors.");
  }
  console.log("[PASS] Reality Gap respects zero-boundary constraints.");

  console.log("=== INTEGRITY CHECKS COMPLETED SUCCESSFULLY ===");
}
