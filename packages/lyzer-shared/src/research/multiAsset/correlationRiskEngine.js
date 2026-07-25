import fs from 'fs';
import path from 'path';

/**
 * L12 Correlation Risk Engine
 * Detecta falsa diversificação e contágio agudo via Fast-Correlation Trigger (3 dias / janela curta).
 */
export class CorrelationRiskEngine {
  constructor() {
    this.shortWindowCorr = 0.2; // 3-day fast correlation
    this.longWindowCorr = 0.3;  // 90-day correlation
    this.researchDir = path.resolve(process.cwd(), '../../../knowledge/research');
    if (!fs.existsSync(this.researchDir)) {
      try { fs.mkdirSync(this.researchDir, { recursive: true }); } catch(e) {}
    }
  }

  updateCorrelations(shortCorr, longCorr) {
    this.shortWindowCorr = shortCorr;
    this.longWindowCorr = longCorr;
  }

  isContagionDetected() {
    // Se a correlação de curto prazo entre ativos de risco explodir para > 0.80, há contágio (Black Swan / Flash Crash)
    return this.shortWindowCorr > 0.80;
  }

  generateCorrelationMap() {
    const isContagion = this.isContagionDetected();
    const mapContent = `
# 🌐 INSTITUTIONAL CROSS-MARKET CORRELATION MAP (L12)
**Date:** Julho 2026
**Status:** ${isContagion ? '🚨 CONTAGION ALERT (HIGH CORRELATION)' : '🟢 NORMAL DIVERSIFICATION'}

## 1. MATRIZ DE CORRELAÇÃO SINTÉTICA
| Ativo / Cluster | Crypto (BTC/ETH) | Macro Equities (SPY/QQQ) | Rates/Dollar (DXY/VIX) | Commodities (GLD/USOIL) |
|---|---|---|---|---|
| **Crypto** | 1.00 | ${this.shortWindowCorr.toFixed(2)} | -0.45 | 0.15 |
| **Macro Equities** | ${this.shortWindowCorr.toFixed(2)} | 1.00 | -0.60 | 0.10 |
| **Rates/Dollar** | -0.45 | -0.60 | 1.00 | -0.30 |
| **Commodities** | 0.15 | 0.10 | -0.30 | 1.00 |

## 2. ANÁLISE DE FALSA DIVERSIFICAÇÃO
- **Fast-Correlation (3-Day Window):** ${this.shortWindowCorr.toFixed(2)}
- **Long-Correlation (90-Day Window):** ${this.longWindowCorr.toFixed(2)}
- **Diagnóstico:** ${isContagion ? 'Falsa diversificação detectada. Todos os ativos de risco convergiram para correlação unitária positiva. O risco sistêmico anulou os benefícios de portfólio multi-ativo.' : 'Os clusters operam de forma autônoma. Diversificação real e saudável.'}
`;
    const filepath = path.join(this.researchDir, 'correlation_map.md');
    try {
      fs.writeFileSync(filepath, mapContent);
    } catch(e) {
      console.log(`[CORRELATION] Simulated saving of correlation_map.md`);
    }
    return mapContent;
  }
}
