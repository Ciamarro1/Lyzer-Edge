import { InstitutionalObservabilityLayer } from '../observability/observabilityLayer.js';
import { IncidentResponseEngine } from '../incidentResponseEngine.js';
import { InstitutionalMemoryEngine } from '../institutionalMemoryEngine.js';
import { InvestmentCommitteeAI } from '../investmentCommitteeAI.js';
import { InstitutionalPortfolioManager } from '../../multiAsset/institutionalPortfolioManager.js';
import { InstitutionalRiskAllocator } from '../../multiAsset/institutionalRiskAllocator.js';
import { MacroStressEngine } from '../../multiAsset/macroStressEngine.js';

/**
 * L13 Full Operational Digital Twin Engine
 * Simula 6, 12 ou 24 meses de operação autônoma 24/7.
 * Rege patrimônio, regimes, crises intermitentes, recuperação e relatórios do comitê.
 * Opera em modo SIMULATION_BATCH para evitar exaustão de I/O em longas simulações.
 */

export class DigitalTwinEngine {
  constructor(initialAUM = 1000000) {
    this.initialAUM = initialAUM;
    this.obs = new InstitutionalObservabilityLayer();
    this.memory = new InstitutionalMemoryEngine(true); // SIMULATION_BATCH mode enabled!
    this.incident = new IncidentResponseEngine();
    this.committee = new InvestmentCommitteeAI();
    this.portfolio = new InstitutionalPortfolioManager(initialAUM);
    this.allocator = new InstitutionalRiskAllocator(this.portfolio, false);
    this.stressLab = new MacroStressEngine(this.portfolio);
  }

  runSimulation(months = 6) {
    const days = months * 30;
    console.log(`[DIGITAL TWIN] Initiating ${months}-Month (${days} days) Autonomous Operational Simulation...`);

    let currentNAV = this.initialAUM;
    let peakNAV = this.initialAUM;
    let maxDrawdownPerc = 0;
    let totalTrades = 0;
    let totalHalts = 0;
    let totalCrisesMitigated = 0;
    let currentRegime = 'RISK_NEUTRAL';

    // Loop dia a dia
    for (let day = 1; day <= days; day++) {
      // 1. Simulação de ambiente e injeção estocástica de regime/crise
      let isCrisisDay = false;
      let isContagion = false;

      // A cada ~45 dias, simula choque de regime ou crise
      if (day % 45 === 0) {
        currentRegime = 'RISK_OFF';
      } else if (day % 90 === 0) {
        currentRegime = 'SYSTEMIC_STRESS';
        isCrisisDay = true;
        isContagion = true;
      } else if (day % 15 === 0) {
        currentRegime = 'RISK_ON';
      }

      // 2. Diagnóstico de Observabilidade
      const healthSnapshot = this.obs.runFullDiagnostics({
        memoryMB: 280,
        latencyMs: isCrisisDay ? 450 : 45,
        lssScore: isCrisisDay ? 55.0 : 85.0,
        decayStatus: isCrisisDay ? 'DECAY_WARNING' : 'FULL_ALLOCATION',
        intradayDrawdownPerc: isCrisisDay ? 6.5 : 0.5,
        contagion: isContagion,
        spreadPerc: isCrisisDay ? 0.045 : 0.015,
        realityGapPerc: 4.0,
        dataDelayMs: 120,
        isDataCorrupted: false,
        anomalousGap: false
      });

      // 3. Resposta Autônoma a Incidentes
      const incidentAction = this.incident.evaluateState(healthSnapshot);
      if (incidentAction.state === 'HALT' || incidentAction.state === 'SHADOW_ONLY') {
        totalHalts += 1;
        this.memory.recordEvent('HALT_INCIDENT', { day, reason: incidentAction.reason });
      }

      // 4. Orçamento de Risco Macro L12
      const riskBudgetRes = this.allocator.evaluateRiskBudget(currentRegime, isCrisisDay ? 'DECAY_WARNING' : 'HEALTHY');

      // 5. Simulação patrimonial (NAV drift)
      let dailyReturnPerc = 0;
      if (riskBudgetRes.effectiveAllocationPerc === 0 || incidentAction.state === 'HALT') {
        // Zera exposição: retorno dia = 0% (ou leve custo de CDI/cash)
        dailyReturnPerc = 0.03; // ~10% a.a. cash return
        if (isCrisisDay) totalCrisesMitigated += 1;
      } else {
        // Alocado no Alpha
        const baseAlphaReturn = currentRegime === 'RISK_ON' ? 0.35 : (currentRegime === 'RISK_OFF' ? -0.15 : 0.12);
        // Aplica o corte do Risk Budget
        const effectiveReturn = baseAlphaReturn * (riskBudgetRes.effectiveAllocationPerc / 100);
        dailyReturnPerc = effectiveReturn;
        totalTrades += 2;
      }

      currentNAV = currentNAV * (1 + dailyReturnPerc / 100);
      if (currentNAV > peakNAV) peakNAV = currentNAV;
      const currentDD = ((peakNAV - currentNAV) / peakNAV) * 100;
      if (currentDD > maxDrawdownPerc) maxDrawdownPerc = currentDD;

      // 6. Fechamento mensal: Comitê de Investimento AI e memória
      if (day % 30 === 0) {
        this.committee.generateReport(`month_${day/30}`, {
          nav: currentNAV,
          aum: this.initialAUM,
          macroRegime: currentRegime,
          marginalVaR: 1.5,
          isContagion: isContagion,
          lssScore: isCrisisDay ? 55 : 85,
          decayStatus: isCrisisDay ? 'DECAY_WARNING' : 'FULL_ALLOCATION',
          riskBudget: riskBudgetRes.effectiveAllocationPerc,
          circuitBreakersActive: incidentAction.state === 'HALT',
          realityGapPerc: 4.0,
          exchangeStatus: 'ONLINE_HEALTHY',
          recentIncidents: []
        });
      }
    }

    // Flush de memória ao final do ensaio
    this.memory.flushBuffer();

    const totalReturnPerc = ((currentNAV - this.initialAUM) / this.initialAUM) * 100;
    const result = {
      durationMonths: months,
      durationDays: days,
      initialAUM: this.initialAUM,
      finalNAV: Math.round(currentNAV),
      totalReturnPerc: parseFloat(totalReturnPerc.toFixed(2)),
      maxDrawdownPerc: parseFloat(maxDrawdownPerc.toFixed(2)),
      totalTradesExecuted: totalTrades,
      totalAutonomousHalts: totalHalts,
      totalCrisesMitigated: totalCrisesMitigated,
      survivalPolicyCompliant: maxDrawdownPerc < 10.0 // CAPITAL_POLICY hard stop is 10%
    };

    console.log(`[DIGITAL TWIN] Simulation Complete. Final NAV: R$ ${result.finalNAV} (${result.totalReturnPerc}%). Max DD: ${result.maxDrawdownPerc}%.`);
    return result;
  }
}
