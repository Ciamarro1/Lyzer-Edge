# 🏛️ LYZER LABS — CARTA CONSTITUCIONAL CONFIRMATÓRIA: HIPÓTESE H017

**Identificador da Hipótese:** `H017`  
**Programa de Origem:** `AD010` (Barbell Synergy Allocation Discovery)  
**Título:** Leveraged Barbell Synergy Allocation (85% Static Carry 1.5x [3% borrow] + 15% Wyckoff Spring 1H Overlay)  
**Data de Pré-Registro:** 2026-09-04T23:45:00Z  
**Autoridade:** Senior Chief Technology Officer (CTO) & Executive Engineering Director  
**Status Constitucional:** 🔒 **PRE-REGISTERED & FROZEN (AWAITING EXECUTIVE UNLOCK)**  
**Motor V8 SHA-256 Invariante:** `fc19e807255b3ecfb8351e82d7dc9d244c1e511d9aa007ac8b67b12d584b4db1`  

---

## 1. FUNDAMENTAÇÃO ECONÔMICA E RACIONAL TEÓRICO

A Hipótese **H017** nasce da síntese epistêmica definitiva extraída dos ciclos H013 a H016. A auditoria confirmatória provou empiricamente que o mercado institucional pós-ETF de criptoativos estabeleceu um teto estrutural de rendimento livre de risco para o carry passivo puro entre **$3,1\%$ e $4,7\%$ a.a.**

Para romper esse teto sem violar nenhum princípio de integridade ou risco do Lyzer Labs, a hipótese H017 institui a **Estrutura Híbrida Barbell**:
1. **Âncora Estrutural (85% do Capital):** Alocada em *Cash-and-Carry* Delta-Neutro ($1.5\times$ gearing sob margem de portfólio, com desconto contínuo de $3,0\%$ a.a. de taxa de empréstimo). Essa âncora gera fluxo de caixa positivo a cada 8 horas, cobrindo integralmente as taxas de corretagem, slippage e potenciais perdas pontuais da ponta direcional.
2. **Motor Convexo Assimétrico (15% do Capital):** Alocado exclusivamente como margem livre para o motor compilado de produção `REC_COMP_INSTITUTIONAL_v1` (Engine V5 Wyckoff Volume Profile em BTCUSDT 1h). Esse motor permanece 100% inativo na maior parte do tempo ($> 95\%$), despertando unicamente quando ocorre uma anomalia extrema de microestrutura (reversão de mínima local de 30 barras + absorção anômala de volume $Z \ge 1.5$ + taxa de financiamento negativa $F < 0$).
3. **Mecânica de Saída:** Risco estritamente pré-determinado de $1.0\text{ ATR}$ no Stop Loss, alvo de realização de $2.5\text{ ATR}$ no Take Profit, horizonte temporal máximo de $6\text{ horas}$ e fricção de $24\text{ bps}$ por trade.

---

## 2. PARÂMETROS CIENTÍFICOS CONGELADOS (FROZEN SPECIFICATION)

Qualquer alteração em um único parâmetro listado abaixo constitui violação constitucional e anula a confirmatória:

```json
{
  "hypothesisId": "H017",
  "program": "AD010",
  "allocation": {
    "carryWeight": 0.85,
    "directionalWeight": 0.15
  },
  "carryLeg": {
    "base": "STATIC_BTC_ETH_50_50",
    "leverage": 1.5,
    "borrowRateAnnualPct": 3.0,
    "turnoverFrictionBps": 24
  },
  "directionalLeg": {
    "engine": "REC_COMP_INSTITUTIONAL_v1",
    "asset": "BTCUSDT",
    "timeframe": "1h",
    "lookback": 30,
    "volumeZScoreThreshold": 1.50,
    "requireNegativeFunding": true,
    "stopLossAtrMultiplier": 1.0,
    "takeProfitAtrMultiplier": 2.5,
    "maxHoldingHours": 6,
    "turnoverFrictionBps": 24
  }
}
```

---

## 3. GATES CONSTITUCIONAIS PRÉ-REGISTRADOS (HOLDOUT 2025–2026)

A aprovação e homologação confirmatória de H017 exige a satisfação **simultânea e cumulativa** de todos os 5 gates constitucionais no conjunto virgem de Holdout (2025-01-01 a 2026-08-31, 608 dias):

| Gate | Métrica | Limiar Mínimo Exigido | Racional Constitucional |
|---|---|:---:|---|
| **Gate 1** | Retorno Anualizado Líquido ($R_{\text{ann}}$) | $\ge +6.00\%$ a.a. | Superação comprovada do teto macro de carry puro pós-ETF. |
| **Gate 2** | Índice Sharpe Anualizado ($S_{\text{ann}}$) | $\ge 3.00$ | Manutenção de dominância estocástica institucional. |
| **Gate 3** | Rebaixamento Máximo ($\text{MaxDD}$) | $\le 2.50\%$ | Preservação patrimonial absoluta contra quedas acentuadas. |
| **Gate 4** | 14-Day Calendar Block Bootstrap | $p_{\text{block}} < 0.0500$ | Significância estatística em blocos sob $B=10.000$ replicações. |
| **Gate 5** | Neutralidade Estrutural | $\text{Time}_{\Delta=0} \ge 90.0\%$ | Garantia de que a carteira permaneceu delta-neutra em $\ge 90\%$ do tempo. |

---

## 4. REGRA DE FALHA E ARQUIVAMENTO FAIL-CLOSED

Se qualquer um dos 5 gates falhar (mesmo que por $0,01\text{ bp}$ ou $\Delta p = 0.0001$), o resultado será sumariamente classificado como `REJECTED_NOT_CONFIRMED`. É estritamente proibido recalibrar pesos de alocação, afrouxar stops, alterar ATRs ou rodar múltiplos testes sobre o Holdout.

---

**Assinado Digitalmente,**  
*Senior Chief Technology Officer (CTO) & Executive Engineering Director*  
*Lyzer Labs Quantitative Systems Group*  
