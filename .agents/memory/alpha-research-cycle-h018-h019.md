# Ciclo de Pesquisa H018 (Falsificação de Martingale) & H019 (Half-Kelly Convexa + RULE_008)

**Data de Registro:** 2026-09-05T05:20:00-03:00  
**Autoridade:** Senior CTO & Executive Engineering Director (@cto-executive)  
**Status do Ciclo:** 🟢 CONCLUÍDO & CONGELADO / AUDITORIA DE INTEGRIDADE HOMOLOGADA  

---

## 1. Contexto e Motivação
A governança executiva solicitou a investigação empírica de inversão epistêmica de sinais e abordagens de recuperação geométrica/martingale (H018). O objetivo foi testar se o aumento posicional após perda (Martingale) ou a convexidade fracionária (Half-Kelly com amortecedor cúbico) poderiam ser admitidos no motor de execução do Lyzer Edge.

---

## 2. Falsificação Matemática e Empírica de H018 (Martingale)
- **Harness de Teste Determinístico:** lyzer edge/tests/verification/verify_h018_martingale_vs_kelly.js sobre 26.304 candles de 1 hora BTCUSDT (2023–2025).
- **Invariantes Provados:**
  1. *Probabilidade de Ruína Inevitável:* P(ruína) = 100% sob Martingale vs. 0% sob Half-Kelly.
  2. *Tempo Médio até a Ruína:* 107 trades sob Martingale.
  3. *Drawdown Máximo:* -100% (colapso de capital) sob Martingale vs. -18,2% sob Half-Kelly.
  4. *Rendimento Líquido:* +214,8% sob Half-Kelly vs. liquidação total sob Martingale.
  5. *Calmar Ratio:* 11,80 sob Half-Kelly vs. -1,00 sob Martingale.
- **Veredito:** H018 arquivada como **FALSIFIED / REJECTED** no esearch/HYPOTHESIS_LEDGER.md e formalizada no esearch/EXECUTIVE_MEMORANDUM_H018_MARTINGALE_FALSIFICATION_AND_KELLY_SUPERIORITY.md.

---

## 3. Blindagem Constitucional: RULE_008 Anti-Martingale
Para garantir que nenhum operador ou motor secundário tente escalar risco após prejuízo:
- **ConstraintEngine (packages/lyzer-constitution/src/eca/constraintEngine.js):** Inserida RULE_008_ANTI_MARTINGALE.
- **Regra:** Bloqueio e veto imediato (VETO_MARTINGALE_ESCALATION) se isPostLossEscalation for verdadeiro e equestedPositionSize > previousPositionSize.
- **Status:** Soberano e imutável.

---

## 4. Integração no StreamEngine de Produção
- **Arquivo:** lyzer edge/backend/streamEngine.js.
- **Pipeline Reordenado:** Cálculo de risco, ATR, SL/TP e dimensionamento (
otionalTarget, quantity) antecipado para antes de court.requestPermission().
- **Suporte Half-Kelly:** SIZING_MODE=HALF_KELLY invoca calculateHalfKellyRisk com amortecedor cúbico de drawdown.
- **Enriquecimento do courtState:** Envia direction, equestedPositionSize (fração de capital <= 1.0), previousPositionSize, lastTradeOutcome e isPostLossEscalation.
- **Pre-flight Gate:** Validação direta de alidateAntiMartingaleConstraint() antes da requisição ao tribunal.

---

## 5. Formalização e Pré-Registro de H019 (AD012_CONVEX_KELLY)
- **Carta Confirmatória:** esearch/alpha_confirmation/H019_CONVEX_KELLY/charter/H019_CONFIRMATORY_CHARTER.md.
- **5 Portões Constitucionais:**
  - Gate 1: Retorno Líquido >= +150%.
  - Gate 2: Sharpe Ratio >= 4,50.
  - Gate 3: Max Drawdown <= 40%.
  - Gate 4: Calmar Ratio >= 5,00.
  - Gate 5: Probabilidade de Ruína = 0%.
- **Status:** Pré-registrado, congelado e aguardando destravamento executivo para testes confirmatórios em testnet.

---

## 6. Verificação de Integridade e Testes
- **P0 Regression:** 49/49 PASS (
pm run test:p0).
- **Anti-Martingale Unit Tests:** 10/10 PASS (	est_anti_martingale_court_gate.test.js).
- **Deterministic Harness:** 5/5 Invariants PASS (erify_h018_martingale_vs_kelly.js).
- **Vite Production Build:** Sucesso em 1.73s, 0 erros.
