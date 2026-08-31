# 🏛️ LYZER EDGE — BATCH 036: CROSS-MARKET FUNDING IMBALANCE & CONDITIONAL PRICE RESPONSE (PREREG-036)

**Status:** 🔒 **FROZEN PRE-REGISTRATION / ZERO PRIOR EXPLORATION**  
**Data do Registro:** 2026-08-31T23:45:00Z  
**Autoridade:** Senior CTO & Executive Engineering Director  
**Trilha:** Track 2 — Structural Alpha & Macro-Regime Discovery  
**Datasets Certificados:** `BTCUSDT_funding_rates_2023_2026.json` & `BTCUSDT_FUTURES_H1_2023_2026.json` (G-DATA-0 Certified)  
**Baseline de Produção:** `RETAIL_BASELINE_PROVIDER_v1` (Engine V5 no Soak do Railway — 100% Intocado)  
**Target de Pesquisa:** `INSTITUTIONAL_FUNDING_REGIME_RESEARCH_PROVIDER_v1`  

---

## 🛑 MANDATO DE NÃO-CONTAMINAÇÃO & GOVERNANÇA EX-ANTE (RULE #0)

1. **Honestidade Epistêmica sobre Dados de Derivativos:**
   Funding Rate mede o desbalanceamento de prêmio/desconto entre o mercado Spot e o contrato Perpétuo (custo de carrego transferido entre longs e shorts). Não mede diretamente liquidações forçadas do livro. O batch investiga **desequilíbrio de funding e resposta condicional de preço**, sem rotulação especulativa de "liquidation squeeze".
2. **Hierarquia Temporal Invertida:**
   O desequilíbrio de carrego é um fenômeno estrutural de baixa frequência (8h/1h). A hierarquia de teste posiciona **Funding (8h) + H1 (Regime de Volatilidade)** como protagonistas, e **M15** como resposta intradiária. Resoluções finas (M5/M1) são restritas à medição de fricção/execução, nunca geradoras primárias de hipótese.
3. **Regra de Término Brutal (Termination Mandate):**
   Se o desbalanceamento de funding falhar isoladamente ($G_{3a}$), sob interação de regime macro ($G_{3b}$) e sob filtro intradiário ($G_{3c}$), a linha inteira de investigação será definitivamente arquivada como **[REJECT]** sem busca secundária de novos thresholds.

---

## 1. ECONOMIC THESIS & PHENOMENON (PREREG-036)

### 1.1 Tese Econômica
$$\text{"Quando o funding rate apresenta desequilíbrio extremo e persistente, a subsequente resposta do preço pode apresentar assimetria direcional condicionada pelo regime de volatilidade macro e pela estrutura de preço, sendo essa relação potencialmente superior ao retorno incondicional após custos."}$$

### 1.2 Causalidade Econômica Subjacente
1. **Custo de Carrego Assemétrico:**
   Quando $FundingRate_t \ll 0$ (funding negativo extremo), detentores de posições vendidas alavancadas em perpétuo pagam uma taxa periódica contínua para os comprados. Esse custo desestimula a manutenção passiva de posições vendidas prolongadas, reduzindo a liquidez de venda a termo e criando vulnerabilidade a repiques de preço para cima.
2. **Interação com Regime de Volatilidade:**
   Em regimes de **alta volatilidade** ($High\_Vol$), desequilíbrios de funding tendem a ser resolvidos rapidamente com deslocamentos violentos de preço. Em regimes de **baixa volatilidade / compressão** ($Low\_Vol$), o funding rate pode permanecer desbalanceado por semanas sem gerar deslocamento imediato de preço.

---

## 2. DATASET CONTRACT & PARTIÇÃO TEMPORAL

| Componente | Resolução | Contagem Auditada | Integridade |
|---|---|---|---|
| **Funding History** | 8 Horas (00:00, 08:00, 16:00 UTC) | 4.003 eventos | Binance Futures `fapi/v1/fundingRate` |
| **Price & Volatility** | 1 Hora (H1) | 32.112 candles | `BTCUSDT_FUTURES_H1_2023_2026.json` (SHA-256 Validado) |
| **Intraday Context** | 15 Minutos (M15) | 128.448 candles | `BTCUSDT_FUTURES_M15_2023_2026.json` (SHA-256 Validado) |

### Partição Temporal Estrita:
- **In-Sample (Discovery):** 2023-01-01T00:00:00Z $\rightarrow$ 2024-12-31T23:59:59Z (70% dos dados).
- **Out-of-Sample (Confirmation):** 2025-01-01T00:00:00Z $\rightarrow$ 2026-08-30T23:59:59Z (**100% Congelado**).

---

## 3. FORMULAÇÃO MATEMÁTICA & FEATURES

### 3.1 Nível 1: Observáveis Primários Point-in-Time (Alinhamento $t$)
1. **Funding Rate Atual ($F_t$):**
   Último funding rate liquidado e conhecido no fechamento da barra H1 ($t$), garantindo zero lookahead bias.
2. **Funding Z-Score ($Z_{F, t}$):**
   $$Z_{F, t} = \frac{F_t - \mu_{F, [t-90d, t-1]}}{\sigma_{F, [t-90d, t-1]}} \quad (\text{Janela rolante de 90 dias / 270 eventos de 8h})$$
3. **Macro Volatility Regime ($V_t$):**
   $$V_t = \frac{ATR(14)_t}{\text{Median}(ATR(14)_{[t-720h, t-1]})}$$
   - $V_t > 1.20 \implies \text{EXPANDED\_VOL}$
   - $V_t < 0.80 \implies \text{COMPRESSED\_VOL}$
   - $0.80 \le V_t \le 1.20 \implies \text{NORMAL\_VOL}$

4. **Retornos Futuros em Horizontes Macroscópicos ($H+8h, H+24h, H+48h, H+72h$):**
   $$R_{t+k} = \frac{Close_{t+k} - Close_t}{Close_t} \quad \text{para } k \in \{8, 24, 48, 72\} \text{ horas}$$

---

## 4. FORMULAÇÃO DO GATE G3 (AVALIAÇÃO TRIPLA INDEPENDENTE)

O Gate $G_3$ é executado estritamente sobre a amostra **In-Sample (2023–2024)**:

### 4.1 Teste G3a: Efeito Linear Isolado do Funding Rate
$$R_{t+k} = \alpha + \beta_1 \cdot Z_{F, t} + \eta_{t+k}$$
- **Hipótese:** $H_0: \beta_1 = 0$ vs $H_1: \beta_1 \ne 0$
- **Erros-Padrão:** Newey-West (HAC) com defasagem $L = k + 1$.
- **Critério Ex-Ante:** $|t\text{-stat}_{HAC}(\beta_1)| > 3.0$ e $|IC| > 0.03$.

### 4.2 Teste G3b: Interação Não-Linear Funding $\times$ Regime de Volatilidade
$$R_{t+k} = \alpha + \beta_1 \cdot Z_{F, t} + \beta_2 \cdot V_t + \beta_3 \cdot (Z_{F, t} \times V_t) + \eta_{t+k}$$
- **Hipótese:** $H_0: \beta_3 = 0$ (o regime de volatilidade não condiciona o efeito do funding).
- **Critério Ex-Ante:** $|t\text{-stat}_{HAC}(\beta_3)| > 3.0$ e acréscimo estatisticamente significativo de $R^2$.

### 4.3 Teste G3c: Edge Econômico Líquido Real ($Edge_{net}$)
Para eventos extremos ($|Z_{F, t}| \ge 2.0$):
- **Retorno Médio Condicional:** $E[R_{t+k} \cdot (-\text{sign}(Z_{F, t})) \mid |Z_{F, t}| \ge 2.0]$
- **Margem de Atrito Líquida:**
  $$Edge_{net} = E[R_{t+k, \text{direcional}}] - \text{FrictionCost} \quad (\text{Friction} = 0.08\%)$$
- **Critério Ex-Ante:** $Edge_{net} \ge +0.20\%$ (garantindo viabilidade institucional robusta para horizontes de 24h+).

---

## 5. REGRAS DE FALSIFICAÇÃO & POLÍTICA DE ARQUIVAMENTO

```text
                       [BATCH 036 DISCOVERY]
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
       Passou em G3a, G3b E G3c?          Falhou em G3a/G3b/G3c?
                 │                               │
                 ▼                               ▼
        [AVANÇAR G4 → G10]             [REJECT BATCH 036 — ARCHIVE]
                 │                     (Sem ajuste de threshold)
                 ▼                               │
        [INSTITUTIONAL PROVIDER]                 ▼
                                       [CONCLUIR EXPLORAÇÃO DE FUNDING]
```

---

## 6. DECLARAÇÃO DE CONGELAMENTO EX-ANTE

Eu, **Senior CTO & Executive Engineering Director**, certifico que este documento estabelece o **contrato imutável para o Batch 036**. 

Nenhuma linha de código de feature ou teste de hipótese será executada sem estar em estrita conformidade com este mandato.

**Documento Registrado e Congelado em:** `research/BATCH_036_PRE_REGISTRATION.md` @ 2026-08-31T23:45:00Z
