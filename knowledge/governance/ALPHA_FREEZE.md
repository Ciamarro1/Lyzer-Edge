# LYZER EDGE - ALPHA FREEZE

**Data de Congelamento:** Julho 2026
**Missão:** L6 Alpha Survival Certification

Este documento sela o estado do Lyzer Edge antes de ser submetido à Zona de Guerra (Adversarial Testing). O sistema será atacado impiedosamente nas próximas fases. **Nenhuma alteração de código na heurística ou nos parâmetros pode ser feita até que a certificação L6 esteja concluída.**

## Estado do Sistema
- **Versão:** L5 (Governance Hardened)
- **Commit Hash:** `(latest L5 sync)`
- **Provedores Ativos:**
  - V4 IMCE (Institutional Market Causality Engine)
  - SMC (Smart Money Concepts)
- **Provedores Desativados (Purged):**
  - V1 (RSI Modificado)
  - V2 (S/R Fixo)
  - V3 (Momentum Estocástico)

## Parâmetros Congelados
- **Timeframe Permitido:** M15 (M1 banido por custo transacional)
- **Circuit Breakers Ativos:**
  - Data Freshness Limit: 15.000ms
  - Confidence Threshold: >= 0.6
  - Max Drawdown Limit Diário: 15%
- **Custos Assumidos (Slippage/Spread):** Tolerância máxima de Spread 0.05%
- **Regime Transition Matrix:** Markov Chain Ativada (Prediction mode)

## Regra de Certificação
Qualquer aprovação no L6 atesta *exclusivamente* esta versão do sistema. Se um provedor for reativado ou se o V4 sofrer um patch, a certificação é revogada e o ciclo L6 deve ser repetido.
