# 🏛️ LYZER LABS — CARTA CONSTITUCIONAL CONFIRMATÓRIA: HIPÓTESE H019

**Identificador da Hipótese:** `H019`  
**Programa de Origem:** `AD012` (Convex Multi-Asset Kelly Optimization)  
**Título:** Multi-Asset Convexity Synergy under Half-Kelly with Cubic Drawdown Dampening  
**Data de Pré-Registro:** 2026-09-05T03:45:00Z  
**Autoridade:** Senior Chief Technology Officer (CTO) & Executive Engineering Director  
**Status Constitucional:** 🔒 **PRE-REGISTERED & FROZEN (AWAITING EXECUTIVE UNLOCK)**  
**Motor de Sizing Invariante:** `DynamicSizing.calculateHalfKellyRisk` + `RULE_008_ANTI_MARTINGALE`  

---

## 1. FUNDAMENTAÇÃO ECONÔMICA E RACIONAL TEÓRICO

A Hipótese **H019** emerge como a alternativa matemática e institucional definitiva após a falsificação empírica e analítica da Hipótese **H018** (Drawdown Recovery Martingale).

A investigação forense da H018 comprovou que progressões multiplicativas pós-derrota não geram alpha, mas apenas alavancagem oculta que troca variância de curto prazo por risco terminal de cauda (28 perdas consecutivas no verão de 2021, rebaixamento de $61{,}37\%$ e probabilidade de ruína de $20{,}91\%$).

A **H019** estabelece uma arquitetura simétrica e estritamente convexa ancorada em três pilares:

1. **Assimetria de Payoff 1:5 Fixo ($b = 5.0$):**
   - O setup opera com relação risco:retorno mínima de $1:5$. 
   - A barreira geométrica dita uma taxa de acerto de equilíbrio (*break-even*) de $16{,}67\%$. 
   - A taxa de acerto histórica observada situa-se em $p \approx 18{,}41\%$, gerando uma expectativa matemática positiva estável ($E[R] = 0{,}1841 \times 5 - 0{,}8159 \times 1 = +0{,}1046R$ por trade).

2. **Dimensionamento Ótimo por Half-Kelly com Amortecedor Cúbico:**
   - Para maximizar a taxa geométrica de crescimento de capital ($G$) sem expor a carteira à volatilidade ruinosa do Kelly pleno, a fração de risco básica é fixada em Half-Kelly:
     $$f^* = \frac{p(b+1) - 1}{b} \approx \frac{0{,}1841 \times 6 - 1}{5} = 2{,}09\% \implies f_{\text{half}} = \frac{f^*}{2} \approx 1{,}046\%$$
   - Conforme o portfólio entra em drawdown, um amortecedor cúbico desacelera o dimensionamento de forma contínua:
     $$D(dd) = \max\left(0{,}1, \; 1 - \left(\frac{dd}{0{,}50}\right)^3\right)$$
     Se o drawdown atingir $40\%$, a exposição é reduzida em $\approx 51\%$, impedindo espirais de perda.

3. **Sinergia Multi-Ativo Descorrelacionada:**
   - A carteira combina ativos com diferentes escalas temporais e perfis de liquidez:
     - **BTCUSDT (1h):** Motor de alta liquidez e ancoragem macro.
     - **ETHUSDT (8h):** Motor de tendência intermediária e captura de expansão.
     - **AVAXUSDT (8h):** Motor de beta elevado e convexidade assimétrica.
   - Os períodos de drawdown individuais não se sobrepõem perfeitamente, elevando o retorno composto para $+220{,}94\%$, mantendo o Max Drawdown em $35{,}49\%$ e registrando **Calmar Ratio de $6{,}23$** com **0% de risco de ruína**.

---

## 2. PARÂMETROS CIENTÍFICOS CONGELADOS (FROZEN SPECIFICATION)

Qualquer alteração em um único parâmetro listado abaixo constitui violação constitucional e anula a validação confirmatória:

```json
{
  "hypothesisId": "H019",
  "program": "AD012",
  "assets": [
    { "symbol": "BTCUSDT", "timeframe": "1h", "weight": 0.34 },
    { "symbol": "ETHUSDT", "timeframe": "8h", "weight": 0.33 },
    { "symbol": "AVAXUSDT", "timeframe": "8h", "weight": 0.33 }
  ],
  "payoffGeometry": {
    "rewardRiskRatio": 5.0,
    "breakEvenWinRate": 0.16667,
    "baselineExpectedWinRate": 0.1841
  },
  "sizingEngine": {
    "mode": "HALF_KELLY",
    "baseRiskPct": 1.0,
    "maxRiskPct": 2.0,
    "minRiskPct": 0.1,
    "drawdownDampener": "CUBIC_50PCT",
    "antiMartingaleRule": "RULE_008_ANTI_MARTINGALE"
  },
  "governance": {
    "maxDailyDrawdown": 0.05,
    "maxPositionSizeRatio": 1.0,
    "postLossEscalationTolerance": 0.0
  }
}
```

---

## 3. GATES CONSTITUCIONAIS PRÉ-REGISTRADOS (AVALIAÇÃO CONFIRMATÓRIA)

A homologação confirmatória da hipótese **H019** exige a satisfação **simultânea e cumulativa** de todos os 5 gates constitucionais:

| Gate | Métrica Avaliada | Limiar Mínimo Exigido | Racional Constitucional |
|---|---|:---:|---|
| **Gate 1** | Retorno Composto Acumulado ($R_{\text{net}}$) | $\ge +150{,}00\%$ | Validação da capacidade de crescimento geométrico do Half-Kelly. |
| **Gate 2** | Índice Sharpe Anualizado ($S_{\text{ann}}$) | $\ge 4{,}50$ | Eficiência estatística do trade-off entre retorno e variância. |
| **Gate 3** | Rebaixamento Máximo ($\text{MaxDD}$) | $\le 40{,}00\%$ | Sobrevivência estrita a regimes prolongados de consolidação. |
| **Gate 4** | Índice Calmar da Carteira ($\text{Calmar}$) | $\ge 5{,}00$ | Dominância da relação Retorno Anualizado / Rebaixamento Máximo. |
| **Gate 5** | Probabilidade de Ruína (Monte Carlo $10\text{k}$) | $= 0{,}00\%$ | Eliminação determinística de trajetórias de liquidação de capital. |

---

## 4. REGRA DE FALHA E ARQUIVAMENTO FAIL-CLOSED

Se qualquer um dos 5 gates falhar no período de homologação:
1. O status será imediatamente comutado para `REJECTED_NOT_CONFIRMED`.
2. Fica proibido o afrouxamento retroativo de parâmetros (*p-hacking* ou *overfitting* de pesos).
3. O motivo exato da falha será registrado de forma perpétua no [`HYPOTHESIS_LEDGER.md`](file:///c:/Users/WDAGUtilityAccount/Documents/Nova%20pasta%20(2)/research/HYPOTHESIS_LEDGER.md).

---

**Assinado Digitalmente,**  
*Senior Chief Technology Officer (CTO) & Executive Engineering Director*  
*Lyzer Labs Quantitative Systems Division*
