import { DecisionLedger } from '../governance/decisionLedger.js';

/**
 * L13 Autonomous Incident Response Engine
 * Responsável por detectar anomalias da Camada de Observabilidade e
 * executar transições reativas com Hysteresis Cooldown Protocol:
 * NORMAL -> WARNING -> DEFENSIVE MODE -> SHADOW ONLY -> HALT
 * 
 * Downgrades são imediatos.
 * Recuperações exigem 60 minutos (ou ticks consecutivos) de estabilidade.
 */

export class IncidentResponseEngine {
  constructor(decisionLedger) {
    this.ledger = decisionLedger || new DecisionLedger('l13_autonomous_ops');
    this.currentState = 'NORMAL';
    this.stabilityTicks = 0;
    this.requiredStabilityTicks = 60; // 60 minutes/ticks of clean health to recover
    this.lastIncidentReason = null;
  }

  evaluateState(observabilitySnapshot) {
    const targetState = observabilitySnapshot.aggregatedStatus;
    const issues = observabilitySnapshot.issues;

    // Se o estado alvo for mais grave que o atual, rebaixa IMEDIATAMENTE
    const severityMap = {
      'NORMAL': 0,
      'WARNING': 1,
      'DEFENSIVE': 2,
      'SHADOW_ONLY': 3,
      'HALT': 4
    };

    const currentSev = severityMap[this.currentState] || 0;
    const targetSev = severityMap[targetState] || 0;

    if (targetSev > currentSev) {
      // DOWNGRADE IMEDIATO
      const oldState = this.currentState;
      this.currentState = targetState;
      this.stabilityTicks = 0;
      this.lastIncidentReason = issues.join(' | ') || `Anomalous target state ${targetState}`;

      console.log(`[INCIDENT RESPONSE] DOWNGRADE: ${oldState} -> ${this.currentState} (${this.lastIncidentReason})`);
      this.ledger.logDecision(
        'IncidentResponseEngine',
        `TargetState_${targetState}`,
        'SEVERITY_DOWNGRADE_RULE',
        issues,
        `DOWNGRADE_TO_${this.currentState}`
      );
      return { state: this.currentState, transition: 'DOWNGRADE', reason: this.lastIncidentReason };
    } 
    
    if (targetSev < currentSev) {
      // UPGRADE (Recuperação): Aplica Hysteresis Cooldown Protocol
      this.stabilityTicks += 1;
      console.log(`[INCIDENT RESPONSE] Stability cooldown accumulating: ${this.stabilityTicks}/${this.requiredStabilityTicks} ticks in ${targetState}`);

      if (this.stabilityTicks >= this.requiredStabilityTicks) {
        const oldState = this.currentState;
        this.currentState = targetState;
        this.stabilityTicks = 0;
        const reason = `Hysteresis cooldown completed (${this.requiredStabilityTicks} stable ticks). Restoring to ${this.currentState}`;
        
        console.log(`[INCIDENT RESPONSE] UPGRADE (RECOVERY): ${oldState} -> ${this.currentState}`);
        this.ledger.logDecision(
          'IncidentResponseEngine',
          `StabilityTicks_${this.requiredStabilityTicks}`,
          'HYSTERESIS_RECOVERY_RULE',
          [reason],
          `RECOVERY_TO_${this.currentState}`
        );
        return { state: this.currentState, transition: 'RECOVERY', reason };
      } else {
        return { 
          state: this.currentState, 
          transition: 'COOLDOWN_WAIT', 
          reason: `Waiting for stability cooldown (${this.stabilityTicks}/${this.requiredStabilityTicks})` 
        };
      }
    }

    // Se a severidade for igual, mantém o estado
    return { state: this.currentState, transition: 'NONE', reason: 'Stable in current state' };
  }
}
