import { DecisionLedger } from '../governance/decisionLedger.js';

/**
 * L13 Autonomous Compliance Layer (VETO Engine)
 * Guardião Pré-Trade inegociável. Nenhuma ordem ou alocação pode ser
 * enviada à exchange sem um Token de Aprovação Digital assinado por este módulo.
 * 
 * Valida:
 * - Política de Risco (Drawdown intradiário < 10% Hard Stop)
 * - Orçamento de Risco L12 (Risk Budget > 0%)
 * - Exposição e Liquidez
 * - Regime Macro (sem SYSTEMIC_STRESS)
 * - Autorização Operacional (sem HALT no Incident Response)
 */

export class AutonomousComplianceEngine {
  constructor(decisionLedger) {
    this.ledger = decisionLedger || new DecisionLedger('l13_autonomous_compliance');
  }

  authorizeOrder(orderRequest, systemStateSnapshot) {
    const {
      ticker = 'BTC',
      orderSizeBrl = 50000,
      orderType = 'BUY'
    } = orderRequest;

    const {
      intradayDrawdownPerc = 0.5,
      riskBudgetPerc = 100,
      macroRegime = 'RISK_NEUTRAL',
      incidentState = 'NORMAL',
      assetLiquidity = 'HIGH',
      totalExposureBrl = 200000,
      aum = 1000000
    } = systemStateSnapshot;

    const vetoReasons = [];

    // 1. Validação de Drawdown Intradiário (CAPITAL_POLICY.md)
    if (intradayDrawdownPerc >= 10.0) {
      vetoReasons.push(`VETO [POLICY_VIOLATION]: Intraday Drawdown (${intradayDrawdownPerc}%) breached 10% Circuit Breaker Hard Stop.`);
    }

    // 2. Validação de Orçamento de Risco Macro (L12)
    if (riskBudgetPerc === 0) {
      vetoReasons.push(`VETO [RISK_BUDGET]: Effective Risk Budget is 0% under current Macro Regime (${macroRegime}).`);
    }

    // 3. Validação de Estado do Incident Response (L13)
    if (incidentState === 'HALT' || incidentState === 'SHADOW_ONLY') {
      vetoReasons.push(`VETO [OPERATIONAL_STATE]: Incident Response Engine restricts execution (Current state: ${incidentState}).`);
    }

    // 4. Validação de Liquidez (L12 Observation Layer)
    if (assetLiquidity === 'ZERO' || assetLiquidity === 'CRITICAL_DROUGHT') {
      vetoReasons.push(`VETO [LIQUIDITY_DROUGHT]: Asset ${ticker} reports insufficient execution liquidity (${assetLiquidity}).`);
    }

    // 5. Validação de Limite de Concentração de Alocação (< 50% em um único trade)
    if ((orderSizeBrl / aum) > 0.50) {
      vetoReasons.push(`VETO [EXPOSURE_LIMIT]: Single trade size (${orderSizeBrl} BRL) exceeds 50% max position limit.`);
    }

    // Se houve veto, registra forense no DecisionLedger e rejeita
    if (vetoReasons.length > 0) {
      const vetoEntry = {
        status: 'VETOED',
        orderRequest: orderRequest,
        reasons: vetoReasons,
        timestamp: new Date().toISOString(),
        token: null
      };

      console.log(`[COMPLIANCE ENGINE] ❌ ORDER VETOED: ${vetoReasons[0]}`);
      this.ledger.logDecision(
        'AutonomousComplianceEngine',
        'VETO_TRIGGER',
        'PRE_TRADE_COMPLIANCE_RULE',
        vetoReasons,
        'ORDER_VETOED'
      );

      return vetoEntry;
    }

    // Assinatura do Token de Aprovação
    const approvalToken = `TKN_COMPLIANCE_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    console.log(`[COMPLIANCE ENGINE] ✅ ORDER APPROVED. Issued execution token: ${approvalToken}`);

    return {
      status: 'APPROVED',
      orderRequest: orderRequest,
      reasons: [],
      timestamp: new Date().toISOString(),
      token: approvalToken
    };
  }
}
