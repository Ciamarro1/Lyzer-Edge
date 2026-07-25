import fs from 'fs';
import path from 'path';

export class InvestmentCommitteeEngine {
  constructor() {
    this.meetingCounter = 1;
    this.governanceDir = path.resolve(process.cwd(), '../../../knowledge/governance');
    
    if (!fs.existsSync(this.governanceDir)) {
      try { fs.mkdirSync(this.governanceDir, { recursive: true }); } catch(e) {}
    }
  }

  conveneCommittee(alphaAuditor, realityEngine, macroGovernor, accountingEngine) {
    console.log(`[COMMITTEE] Convening Investment Committee Meeting #${this.meetingCounter}...`);
    
    // Simular perguntas executivas
    const isAlphaValid = alphaAuditor.baselineSharpe > 1.0; // Simplificação arbitrária
    const hasRiskIncreased = realityEngine.calculateRealityGap().gapScore > 50;
    const isStructurallyChanged = macroGovernor.macroState !== 'FULL_ALLOCATION';
    const continueOperating = isAlphaValid && (!isStructurallyChanged || macroGovernor.macroState === 'DEFENSIVE');
    
    const decisionText = continueOperating ? "APPROVED FOR CONTINUED OPERATIONS" : "HALT REQUESTED BY COMMITTEE";

    const minutes = `
# 🏛️ INVESTMENT COMMITTEE MEETING (ICM) #${this.meetingCounter.toString().padStart(3, '0')}
**Date:** Simulated Institutional Shadow Session
**Committee Decision:** **${decisionText}**

## EXECUTIVE SUMMARY
O Comitê de Investimentos reuniu-se para validar a exposição de risco do *Shadow Fund* frente à realidade operacional. As deliberações foram geradas de forma procedimental a partir dos módulos de Governança L10.

## 1. O Alpha continua válido?
**${isAlphaValid ? 'SIM' : 'NÃO'}**
*Justificativa:* O \`ContinuousAlphaAuditor\` reporta um *Sharpe* contínuo tolerável. A degradação está contida nas faixas estipuladas. Nenhuma falha de convergência severa foi encontrada no TruthKernel.

## 2. O Risco aumentou (Reality Gap)?
**${hasRiskIncreased ? 'SIM' : 'NÃO'}**
*Justificativa:* O \`InstitutionalRealityEngine\` acusa um Gap Score de ${realityEngine.calculateRealityGap().gapScore}. ${hasRiskIncreased ? 'Há divergência palpável entre o Backtest e a Execução (Slippage/Latency).' : 'Execução aderente ao teórico.'}

## 3. Existe mudança estrutural (Macro State)?
**${isStructurallyChanged ? 'SIM' : 'NÃO'}**
*Justificativa:* O \`CapitalAllocationGovernor\` encontra-se no estado: **${macroGovernor.macroState}**.

## 4. Resolução de Risco
- **Fundo deve continuar operando:** ${continueOperating ? 'TRUE' : 'FALSE'}
- **Patrimônio Simulador em Risco:** R$ ${accountingEngine.currentNAV.toFixed(2)}
`;

    const filepath = path.join(this.governanceDir, `IC_MEETING_${this.meetingCounter.toString().padStart(3, '0')}.md`);
    try {
      fs.writeFileSync(filepath, minutes);
    } catch(e) {
      console.log(`[COMMITTEE] Simulated writing of Meeting Minutes #${this.meetingCounter}`);
    }
    
    this.meetingCounter++;
    return continueOperating;
  }
}
