# 🏛️ LYZER EDGE — BATCH 035: FLOW–PRICE RESPONSE MECHANISM STUDY (PREREG-035)

**Status:** 🔒 **FROZEN PRE-REGISTRATION / ZERO PRIOR DATA EXPLORATION**  
**Data do Registro:** 2026-08-31T23:30:00Z  
**Autoridade:** Senior CTO & Executive Engineering Director  
**Trilha:** Track 2 — Next-Gen Institutional Alpha Discovery  
**Dataset Certificado:** `BTCUSDT_FUTURES_ENRICHED_2023_2026` (Aprovado em G-DATA-0 @ 2.47M candles com Taker Flow Real)  
**Baseline de Referência:** `RETAIL_BASELINE_PROVIDER_v1` (Antigo V5, congelado e em operação no Soak do Railway)  
**Target de Pesquisa:** `INSTITUTIONAL_FLOW_RESPONSE_RESEARCH_PROVIDER_v1`  

---

## 🛑 MANDATO DE NÃO-CONTAMINAÇÃO & GOVERNANÇA EX-ANTE (RULE #0)

1. **Abertura Epistêmica Causal (Sem Conclusão Pré-Determinada):**
   O Batch 035 não assume antecipadamente se o fluxo agressivo gerará *reversão* ou *continuação*. O mandato é **quantificar empiricamente o mecanismo de resposta de preço** sob choque de agressão e determinar em quais regimes existe persistência estatística e econômica.
2. **Inviolabilidade da Produção:**
   Zero alterações no `ExecutionEngine`, `TruthKernel`, `ConstitutionalCourt`, `RiskEngine` ou no baseline de produção. Todo o código reside exclusivamente no namespace isolado `research/experiments/batch035/`.
3. **Proibição de Ajuste de Parâmetros Post-Hoc ("P-Hacking Ban"):**
   Se o modelo falhar nos critérios estatísticos ou econômicos do Gate $G_3$, o batch será arquivado imediatamente como **[REJECT]**.
4. **Hierarquia em 3 Níveis:**
   - **Nível 1 (Observação Primária):** Dados brutos auditados ($VDR$ real, $FI$, OHLCV, Trade Count).
   - **Nível 2 (Estado de Microestrutura):** Classificação do regime (`TRANSMISSION`, `ABSORPTION`, `INDETERMINATE`).
   - **Nível 3 (Alfa Condicional & Falsificação):** Medição da relação com retornos futuros $R_{t+k}$ e robustez a fricção real.

---

## 1. ECONOMIC THESIS & PHENOMENON (PREREG-035)

### 1.1 Tese Econômica
$$\text{"Fluxo agressivo anormal contém informação estatisticamente mensurável sobre a resposta futura do preço, e essa informação varia de acordo com a relação entre a intensidade do fluxo, a resposta imediata do preço e o regime de liquidez macro."}$$

### 1.2 Mecanismos Candidatos de Resposta de Preço
Quando ocorre um desbalanceamento acentuado de agressão a mercado ($|VDR_t| \gg 0$ e $\text{FlowIntensity}_t > \text{Threshold}$):

1. **Regime de Transmissão (Transmission / Momentum Continuation):**
   O fluxo agressivo consome a liquidez passiva da melhor oferta/demanda e atrai fluxo seguidor (algoritmos de momentum e liquidações), resultando em **continuação direcional** do movimento ($E[R_{t+k} \cdot \text{sign}(VDR_t)] > 0$).
2. **Regime de Absorção (Absorption / Mean Reversion):**
   O fluxo agressivo colide contra ordens limites passivas profundas e renovadas (*Icebergs / Passive Replenishment*). O preço não se desloca na proporção do volume. Ao esgotar o ímpeto agressor, o excesso de inventário adverso força uma **reversão rápida** ($E[R_{t+k} \cdot \text{sign}(VDR_t)] < 0$).
3. **Regime Indeterminado (Noise / Zero Expectancy):**
   O fluxo agressivo se dissipa no ruído browniano intrínseco do book sem persistência estatística pós-custos ($E[R_{t+k}] \approx 0$).

---

## 2. DATASET CONTRACT (CERTIFICADO EM G-DATA-0)

Utiliza-se exclusivamente o dataset de **Binance Futures (`BTCUSDT`)** certificado no relatório `DATASET_035_INTEGRITY_REPORT.md`:

| Timeframe | Função Arquitetural | Contagem Auditada | SHA-256 Checksum |
|---|---|---|---|
| **H1** | **Regime Macro:** Funding Rate + Volatilidade Histórica (ATR/RV) | 32.112 candles | `ef2358d600cf2d1bd1210854fa7bf23614af434ee584eb170e290a1151a69789` |
| **M15** | **Contexto Estrutural:** Compressão / Expansão de Range | 128.448 candles | `09222c04afd0b248181e0bb489f10c4a63c1088be05a43a2e371ef89a2dff286` |
| **M5** | **Evento de Microestrutura:** Choque de Volume e Agressão | 385.344 candles | `a3b6852a5ba0727612292a2061a6f90bea1f86af613345b53b750c54afc5dda6` |
| **M1** | **Confirmação Fina:** Validação de trade intensity intradiária | 1.926.720 candles | Particionado anualmente (2023–2026) |

### Partição Temporal Estrita:
- **In-Sample (Discovery):** 2023-01-01T00:00:00Z $\rightarrow$ 2024-12-31T23:59:59Z (70% dos dados).
- **Out-of-Sample (Confirmation):** 2025-01-01T00:00:00Z $\rightarrow$ 2026-08-30T23:59:59Z (30% dos dados — **Congelado**).

---

## 3. FEATURE CONTRACT & DEFINIÇÃO MATEMÁTICA

Todas as variáveis são calculadas estritamente a partir dos campos primários ingeridos, com alinhamento Point-in-Time ($t$):

### 3.1 Nível 1: Observáveis Primários
1. **Volume Delta Ratio Real ($VDR_t$):**
   $$V_{\text{taker\_sell}, t} = V_{\text{total}, t} - V_{\text{taker\_buy}, t}$$
   $$VDR_t = \frac{V_{\text{taker\_buy}, t} - V_{\text{taker\_sell}, t}}{V_{\text{total}, t}} = \frac{2 \cdot V_{\text{taker\_buy}, t} - V_{\text{total}, t}}{V_{\text{total}, t}} \in [-1.0, +1.0]$$

2. **Flow Intensity ($FI_t$):**
   $$FI_t = \frac{\text{TradeCount}_t}{\text{Median}(\text{TradeCount}_{[t-288, t-1]})}$$

3. **Relative Price Response ($\Delta P_t^*$):**
   $$\Delta P_t^* = \frac{Close_t - Open_t}{ATR(14)_t}$$

4. **Range Expansion Ratio ($RER_t$):**
   $$RER_t = \frac{High_t - Low_t}{\text{Median}(High_{[t-20, t-1]} - Low_{[t-20, t-1]})}$$

### 3.2 Nível 2: Matriz de Classificação de Regime de Resposta
Para cada evento com choque de fluxo ($|VDR_t| \ge 0.40$ e $FI_t \ge 1.5$):

- **TRANSMISSION (Under-Reaction / Momentum Potential):**
  $$|VDR_t| \ge 0.40 \quad \text{e} \quad \text{sign}(\Delta P_t^*) = \text{sign}(VDR_t) \quad \text{com } |\Delta P_t^*| \le 1.0$$
  *(Fluxo agressivo forte na direção do candle, mas o preço ainda não expandiu totalmente = compressão antes da transmissão).*

- **ABSORPTION (Contradiction / Exhaustion Potential):**
  $$|VDR_t| \ge 0.40 \quad \text{e} \quad \left( \text{sign}(\Delta P_t^*) \ne \text{sign}(VDR_t) \quad \text{ou} \quad |\Delta P_t^*| < 0.20 \right)$$
  *(Fluxo agressivo maciço incapaz de deslocar o fechamento no sentido do agressor).*

- **EXPANDED_IMPACT (Immediate Climax):**
  $$|VDR_t| \ge 0.40 \quad \text{e} \quad |\Delta P_t^*| > 2.0$$
  *(O impacto de preço já se realizou completamente na própria barra).*

---

## 4. FORMULAÇÃO DO GATE G3 (DUALIDADE ESTATÍSTICA & ECONÔMICA)

O Gate $G_3$ é avaliado **exclusivamente no período In-Sample (2023–2024)** em duas dimensões independentes:

### 4.1 Dimensão 1: Significância Estatística
Para cada horizonte $k \in \{1, 3, 6, 12, 24\}$ bars:
$$R_{t+k} = \alpha + \beta \cdot \text{FeatureSignal}_t + \eta_{t+k}$$

- **Erros-Padrão Newey-West (HAC):** Defasagem de Bartlett $L = k + 1$ para corrigir a autocorrelação de retornos sobrepostos.
- **Métricas:**
  - $t\text{-statistic}_{HAC}(\beta)$
  - $p\text{-value}$
  - Spearman Information Coefficient ($IC$)
  - Pearson Correlation ($r$)
  - $R^2$ (%)

### 4.2 Dimensão 2: Significância Econômica (Edge Líquido Real)
Um sinal com $t\text{-stat} > 3.0$ mas retorno bruto de $0.02\%$ é inútil face aos custos de exchange ($0.08\%$ roundtrip).
- **Retorno Médio Condicional por Regime:**
  $$E[R_{t+k} | \text{Regime} = \text{TRANSMISSION}] \quad \text{vs} \quad E[R_{t+k} | \text{Unconditioned}]$$
- **Margem de Atrito Líquida ($Edge_{net}$):**
  $$Edge_{net} = E[|R_{t+k}| \mid \text{Signal}] - \text{FrictionCost} \quad (\text{Friction} = 0.08\%)$$
  $$\text{Critério Ex-Ante: } Edge_{net} > 0.10\% \quad (\text{Retorno bruto } > 0.18\% \text{ por trade}).$$

---

## 5. MARKET STATE ENGINE (INTERFACE DO PROVEDOR)

O `INSTITUTIONAL_FLOW_RESPONSE_RESEARCH_PROVIDER_v1` emite um **Objeto de Estado Causal**:

```typescript
interface MicrostructureMarketState {
  timestamp: number;
  symbol: "BTCUSDT";
  timeframe: "5m" | "15m" | "1h";
  flow: {
    takerDeltaRatio: number;      // VDR [-1.0, 1.0]
    takerBuyVolume: number;       // BTC
    totalVolume: number;          // BTC
    tradeCount: number;
    flowIntensity: number;        // Z-score vs histórico
    flowDominance: "STRONG_BUY" | "STRONG_SELL" | "BALANCED";
  };
  priceResponse: {
    relativeReturn: number;       // Retorno normalizado por ATR
    rangeExpansion: number;       // Ratio vs mediana recente
    responseType: "UNDER_REACTION" | "PROPORTIONAL" | "CLIMACTIC";
  };
  microstructureRegime: "TRANSMISSION" | "ABSORPTION" | "INDETERMINATE";
  macroContextH1: {
    fundingRateState: "NEGATIVE_SQUEEZE" | "NEUTRAL" | "EUPHORIA";
    volatilityRegime: "COMPRESSED" | "NORMAL" | "EXPANDED";
  };
  expectedForwardReturn: number;  // Retorno preditivo em bps
  horizonBars: number;
  statisticalConfidence: number;  // Score [0.0, 1.0]
}
```

---

## 6. ACCEPTANCE GATES MATRIX ($G_0 \rightarrow G_{10}$)

| Gate | Nome do Teste | Métrica Ex-Ante | Justificativa do Threshold |
|---|---|---|---|
| **$G_0$** | **Economic Pre-Registration** | PREREG-035 Congelado | Previne hipóteses post-hoc |
| **$G_1$** | **Dataset Certification** | `G-DATA-0_PASS` | Concluído com 2.47M candles certificados |
| **$G_2$** | **Point-in-Time Audit** | Zero dependência de $t+k$ | Impede Lookahead Bias |
| **$G_3\text{a}$** | **Statistical Significance** | $|t\text{-stat}_{HAC}| > 3.0$ e $|IC| > 0.03$ | Rejeita ruído aleatório ($p < 0.0013$) |
| **$G_3\text{b}$** | **Economic Significance** | $Edge_{net} \ge 0.10\%$ pós-taxas ($0.08\%$) | Garante viabilidade contra atrito de ordens |
| **$G_4$** | **Regime Consistency** | Performance positiva em $\ge 70\%$ dos trimestres | Evita concentração em um único outlier |
| **$G_5$** | **Deflated Sharpe Ratio** | $DSR \ge 0.95$ | Desconta múltiplos testes históricos |
| **$G_6$** | **Purged Walk-Forward (5 Folds)** | $OOS\text{ Profit Factor} \ge 1.40$ | Robustez fora da amostra (2025–2026 congelado) |
| **$G_7$** | **$2\times$ Friction Stress** | $PF_{2\times} \ge 1.20$ | Sobrevivência ao dobro de taxas e slippage |
| **$G_8$** | **Latency Resilience (+250ms)** | Degradação de PnL $< 20\%$ | Tolerância a atrasos de execução reais |
| **$G_9$** | **Temporal Permutation Collapse** | $p\text{-value}_{perm} < 0.01$ | Confirma causalidade da sequência de tempo |
| **$G_{10}$** | **Determinism & Replication** | Execução determinística | Reprodutibilidade científica total |

---

## 7. POLÍTICA DE ARQUIVAMENTO E PROMOÇÃO

```text
               [BATCH 035 RESEARCH DISCOVERY]
                            │
               Passou em G3a E G3b com sucesso?
                     ┌──────┴──────┐
                    SIM           NÃO
                     │             │
                     ▼             ▼
             [AVANÇAR G4 → G10]  [REJECT BATCH 035]
                     │             │
                     ▼             ▼
         [INSTITUTIONAL ALPHA    [ARCHIVE & FREEZE]
               PROVIDER]        (Sem tuning de parâmetros)
```

---

## 8. DECLARAÇÃO DE CONGELAMENTO EX-ANTE

Eu, **Senior CTO & Executive Engineering Director**, certifico que este documento estabelece o **contrato imutável para o Batch 035**. 

Nenhuma linha de código de feature ou teste de hipótese será executada sem estar em estrita conformidade com este mandato.

**Documento Registrado e Congelado em:** `research/BATCH_035_PRE_REGISTRATION.md` @ 2026-08-31T23:30:00Z  
**Batch 035 Autorizado para Discovery Isolado.**
