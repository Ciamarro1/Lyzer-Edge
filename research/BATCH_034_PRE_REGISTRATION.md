# 🏛️ LYZER EDGE — BATCH 034: INSTITUTIONAL MICROSTRUCTURE RESEARCH & FALSIFICATION MANDATE (PREREG-034)

**Status:** 🔒 **FROZEN PRE-REGISTRATION / ZERO PRIOR DATA EXPLORATION**  
**Data do Registro:** 2026-08-31T22:30:00Z  
**Autoridade:** Senior CTO & Executive Engineering Director  
**Trilha:** Track 2 — Next-Gen Institutional Alpha Discovery  
**Baseline de Referência:** `RETAIL_BASELINE_PROVIDER_v1` (Antigo V5 `REC_COMP_INSTITUTIONAL_v1`, congelado e operando no Soak do Railway)  
**Novo Target de Pesquisa:** `INSTITUTIONAL_RESEARCH_PROVIDER_v1` (Microstructure Research Engine — Zero Execução de Ordens)  

---

## 🛑 MANDATO DE NÃO-CONTAMINAÇÃO & ISOLAMENTO ESTRITO (RULE #0)

1. **Inviolabilidade da Infraestrutura em Produção:**
   O Batch 034 **NÃO PODE** alterar o `ExecutionEngine`, o `TruthKernel`, a `ConstitutionalCourt`, o `RiskEngine` ou o provedor aprovado em produção (`REC_COMP_INSTITUTIONAL_v1`). Todo o código, testes e dados deste batch residem exclusivamente no namespace isolado `research/` e `research/experiments/batch034/`.
2. **Imutabilidade da Tese Ex-Ante:**
   Fica expressamente proibido alterar hipóteses, fórmulas de features, horizontes de previsão ou gates de aceitação após a execução dos primeiros testes confirmatórios.
3. **Proibição de Ajuste de Parâmetros Post-Hoc ("P-Hacking Ban"):**
   Se uma hipótese falhar em qualquer gate crítico ($G_3 \dots G_{10}$), o resultado é arquivado imediatamente como **[REJECT]**. É vedado "ajustar o threshold um pouquinho" para tentar forçar a passagem.
4. **Honestidade Epistêmica dos Dados (Proxy vs Observação Direta de Order Book):**
   Este estudo utiliza dados OHLCV agregados com Taker Buy/Sell Volume e Trade Count da Binance. Declaramos explicitamente que $VDR$ e $\Lambda$ são **proxies macroscópicos de microestrutura de fluxo agressor e resposta de preço**. Não alegamos observação direta de pacotes Level-3 (profundidade de fila, iceberg ou reposição de inventário de market makers). Testamos se os dados são **consistentes com a hipótese de absorção passiva**.

---

## 1. ECONOMIC THESIS & PHENOMENON (PREREG-034)

### 1.1 O Fenômeno Econômico Observado
**Desbalanceamento entre Agressão de Fluxo, Liquidez Passiva e Resposta de Preço (Proxy de Absorção Institucional).**

No mercado financeiro, ordens a mercado (*Aggressive Flow*) cruzam o spread consumindo ordens limite (*Passive Liquidity*). Em condições normais de liquidez homogênea, um choque positivo de agressão compradora desloca o preço para cima na proporção direta da função de impacto de mercado de Kyle/Almgren-Chriss:
$$\Delta P_t \propto \lambda \cdot \text{AggressiveDelta}_t$$

Contudo, quando participantes institucionais posicionam grandes blocos de ordens limite passivas ou alimentam o livro continuamente via algoritmos de reposição de inventário (*Iceberg/Passive Replenishment Proxy*), ocorre a **Absorção**:
$$\text{AggressiveDelta}_t \gg 0 \quad \text{mas} \quad \Delta P_t \approx 0 \implies \text{Resíduo de Resposta } \varepsilon_t < 0$$

### 1.2 Mecanismo Causal
1. Traders impacientes (varejo perseguindo rompimento ou liquidações forçadas) executam ordens agressivas a mercado.
2. A liquidez passiva absorve o volume sem permitir a expansão proporcional do preço.
3. Ao esgotar o poder de compra do fluxo agressivo, cria-se um **excesso de inventário adverso** para os compradores a mercado.
4. Os compradores entram em pânico ou têm seus stops ativados logo abaixo do ponto de absorção, desencadeando uma **reversão rápida e mecânica de preços**.

### 1.3 Mapeamento de Participantes
- **Geradores da Ineficiência:** Compradores/Vendedores a mercado tardios e posições alavancadas sofrendo liquidação.
- **Fornecedores da Absorção:** Market makers e algoritmos de acúmulo/distribuição passiva.
- **Capturador do Alfa (Lyzer Edge):** O `INSTITUTIONAL_RESEARCH_PROVIDER_v1`, que detecta a divergência entre Esforço (Delta de Volume Agressivo) e Resultado (Retorno Realizado) no instante exato da exaustão do agressor.

### 1.4 Horizonte Temporal Esperado
- **Micro-Timing:** Reversão média e alívio de inventário entre **3 a 12 barras** ($k \in [3, 12]$) no timeframe M5 / M15.
- **Condicionamento Macro:** Válido sob confirmação de regime de liquidez e funding no H1.

### 1.5 Condições de Invalidação da Tese (Quando o Fenômeno Desaparece)
- **Regime de Choque Noticioso Extremo (Jumps / Flash Crashes):** Eventos macroeconômicos (CPI, FOMC) onde a liquidez passiva é removida abruptamente do livro (*Liquidity Evaporation*).
- **Rompimento Estrutural com Deslocamento Causal Real:** Quando a agressão supera a liquidez passiva e sustenta volume institucional contínuo (o livro do outro lado quebra).

---

## 2. NULL HYPOTHESIS ($H_0$) & G3 PREDICTIVE FORMULATION

### 2.1 Formulação Estatística Rigorosa do Gate G3
A significância do resíduo de absorção ($\varepsilon_t$) **NÃO É** testada sobre o ajuste in-sample do impacto, mas estritamente sobre a sua **capacidade preditiva de retornos futuros** ($R_{t+k}$):

$$R_{t+k} = \alpha + \beta \cdot \varepsilon_t + \eta_{t+k}$$

onde:
- $\varepsilon_t = \text{Retorno Realizado}_t - \widehat{\Delta P}_t$ (Resíduo de Impacto de Preço).
- $R_{t+k} = \frac{Close_{t+k} - Close_t}{Close_t}$ (Retorno Futuro a $k$ barras à frente).

### 2.2 Hipótese Nula ($H_0$) e Hipótese Alternativa ($H_1$)
$$\mathbf{H_0}: \beta \le 0 \quad (\text{O resíduo de absorção não prevê reversão futura ou tem correlação espúria/negativa})$$
$$\mathbf{H_1}: \beta > 0 \quad \text{com } t\text{-statistic}(\beta) > 3.0 \text{ (ajustado por erros-padrão Newey-West/HAC) e } IC > 0.03$$

> **Nota Epistêmica:** O uso de erros-padrão HAC / Newey-West com defasagem $k-1$ é mandatório para corrigir a autocorrelação induzida por retornos futuros sobrepostos.

### 2.3 Benchmarks de Controle Obrigatórios
Todo resultado do Batch 034 será comparado contra:
1. **Controle 0 (Random Walk):** Entradas aleatórias sob os mesmos custos e modelo de saída.
2. **Controle 1 (Naive Momentum):** Seguir cegamente a direção do maior candle de volume.
3. **Controle 2 (Retail Baseline):** O desempenho do `RETAIL_BASELINE_PROVIDER_v1` nas mesmas janelas.

---

## 3. DATASET & POINT-IN-TIME CONTRACT

| Atributo | Especificação Estrita |
|---|---|
| **Ativo Principal** | BTCUSDT (Binance Futures & Spot) |
| **Ativos Cross-Asset (Validação)** | ETHUSDT, SOLUSDT (Sem vazamento no treinamento) |
| **Timeframes Hierárquicos** | **H1** (Regime & Funding) $\rightarrow$ **M15** (Estrutura) $\rightarrow$ **M5** (Micro-Execução) |
| **Período Histórico** | 2023-01-01T00:00:00Z $\rightarrow$ 2026-08-01T00:00:00Z (3.5 anos) |
| **In-Sample (Discovery)** | 2023-01-01 $\rightarrow$ 2024-12-31 (70% do tempo) |
| **Out-of-Sample (Confirmation)** | 2025-01-01 $\rightarrow$ 2026-08-01 (30% do tempo — **Congelado**) |
| **Alinhamento Temporal** | Estritamente Point-in-Time ($t$). Variáveis de $t$ calculadas apenas com dados até o fechamento da barra $t$. |
| **Tratamento de Missing Data** | Interrupções de WebSocket $> 2$ barras invalidam o episódio. Zero forward-fill de preços. |
| **Latência Simulada Obrigatória** | 50ms de latência de roteamento aplicada em toda ordem simulada. |

---

## 4. FEATURE CONTRACT & DEFINIÇÃO MATEMÁTICA

Todas as variáveis devem ser computadas sem parâmetros livres calibrados no Out-of-Sample.

### 4.1 Família 1: Aggressive Flow Dynamics (Proxy)
- **Volume Delta Ratio ($VDR_t$):**
  $$VDR_t = \frac{V_{\text{taker\_buy}, t} - V_{\text{taker\_sell}, t}}{V_{\text{total}, t}} = \frac{2 \cdot V_{\text{taker\_buy}, t} - V_{\text{total}, t}}{V_{\text{total}, t}} \in [-1.0, +1.0]$$
- **Flow Intensity ($FI_t$):**
  $$FI_t = \frac{\text{TradeCount}_t}{\text{MedianTradeCount}_{[t-288, t]}}$$

### 4.2 Família 2: Liquidity & Impact Proxy
- **Amihud Illiquidity Ratio ($\Lambda_t$):**
  $$\Lambda_t = \frac{|Close_t - Open_t|}{V_{\text{total}, t} \cdot Close_t}$$
- **Normalized Range Expansion ($RE_t$):**
  $$RE_t = \frac{High_t - Low_t}{ATR(14)_t}$$

### 4.3 Família 3: O Modelo de Absorção e Resíduo
1. **Expected Price Impact Estimator ($\widehat{\Delta P}_t$):**
   Estimado por regressão linear em janela móvel de 500 barras ($In\text{-}Sample$ contínuo):
   $$\widehat{\Delta P}_t = \alpha_t + \beta_t \cdot (VDR_t \times \Lambda_t)$$
2. **Absorption Residual ($\varepsilon_t$):**
   $$\varepsilon_t = \left(\frac{Close_t - Open_t}{Open_t}\right) - \widehat{\Delta P}_t$$
3. **Z-Score do Resíduo ($Z_{\varepsilon, t}$):**
   $$Z_{\varepsilon, t} = \frac{\varepsilon_t - \text{Mean}(\varepsilon_{[t-100, t]})}{\text{Std}(\varepsilon_{[t-100, t]})}$$

> **Condição Ex-Ante de Absorção de Compra (Bullish Absorption / Exaustão Vendedora):**
> $$VDR_t \le -0.60 \quad \text{e} \quad Z_{\varepsilon, t} \ge +2.0$$
> *(Vendedores agrediram massivamente, mas o preço caiu muito menos do que o impacto esperado = Absorção compradora).*

> **Condição Ex-Ante de Absorção de Venda (Bearish Absorption / Exaustão Compradora):**
> $$VDR_t \ge +0.60 \quad \text{e} \quad Z_{\varepsilon, t} \le -2.0$$
> *(Compradores agrediram massivamente, mas o preço subiu muito menos do que o impacto esperado = Absorção vendedora).*

---

## 5. SEPARAÇÃO ARQUITETURAL DA FASE 1

Para garantir isolamento determinístico, a Fase 1 é dividida em dois artefatos independentes:

```text
┌────────────────────────────────────────────────────────┐
│ 1. DATA PIPE (Transformador Determinístico Puro)       │
│    research/experiments/batch034/                      │
│    └── 01_extract_microstructure_features.js           │
│        • Ingestão PIT sem lookahead                    │
│        • Cálculo de VDR, Lambda, DeltaP_hat, eps, Zeps │
│        • Saída: Event Dataset estruturado (.jsonl)     │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ 2. STATISTICAL TEST (Teste de Falsificação G3)         │
│    research/experiments/batch034/                      │
│    └── 02_test_g3_predictive_significance.js           │
│        • Regressão: eps_t → Return_(t+k)               │
│        • Erros-padrão Newey-West / HAC                 │
│        • IC de Spearman e Pearson                      │
│        • Decisão: [PASS G3] ou [REJECT BATCH 034]      │
└────────────────────────────────────────────────────────┘
```

---

## 6. COMITÊ DE FALSIFICAÇÃO ESTATÍSTICA (ADVERSARIAL SUITE)

Para ser aceito no laboratório, o modelo deve sobreviver a 6 testes de estresse independentes:

1. **Deflated Sharpe Ratio (DSR):**
   Cálculo do DSR considerando todas as hipóteses testadas no histórico do Lyzer Labs ($N \ge 200$).
   $$\text{Critério: } DSR \ge 0.95 \quad (\text{Probabilidade de Sharpe falso } < 5\%)$$
2. **Purged & Embargoed Walk-Forward (5 Folds):**
   5 janelas sequenciais com 20% de teste e 24h de embargo temporal entre treino e teste para destruir qualquer vazamento de autocorrelação.
3. **Double Friction Stress ($2\times$ Friction):**
   - Taxa Taker: $0.08\%$ por perna ($0.16\%$ roundtrip).
   - Slippage Adversarial: $0.05\%$ garantido na entrada e saída.
   $$\text{Critério: } ProfitFactor_{2\times} > 1.25$$
4. **Temporal Shuffling (Permutation Test):**
   Embaralhamento dos rótulos de tempo mantendo a volatilidade. O alfa deve colapsar para $Sharpe \approx 0.0$. Se mantiver performance com tempo embaralhado, o modelo é espúrio.
5. **Latency Perturbation (+250ms / +500ms):**
   Simulação de preenchimento com atraso de até meio segundo. O sinal não pode degradar mais de $20\%$ de seu retorno esperado.
6. **Cross-Asset Reality Check:**
   Execução nos pares secundários (ETHUSDT / SOLUSDT) sem reajustar nenhum parâmetro.

---

## 7. ACCEPTANCE GATES MATRIX ($G_0 \rightarrow G_{10}$)

| Gate | Descrição do Teste | Métrica Ex-Ante | Justificativa do Threshold |
|---|---|---|---|
| **$G_0$** | **Economic Rationale** | Documento PREREG aprovado | Garante ausência de data snooping |
| **$G_1$** | **Dataset Integrity** | 100% candles válidos, zero gaps | Base limpa comprovada por SHA-256 |
| **$G_2$** | **Point-in-Time Audit** | Zero dependência de $t+k$ | Impede viés de retrospectiva |
| **$G_3$** | **Predictive Significance** | $t\text{-stat}(\beta_{HAC}) > 3.0$ na regressão $\varepsilon_t \rightarrow R_{t+k}$ | $p < 0.0013$ com correção de autocorrelação |
| **$G_4$** | **In-Sample Information Coeff.** | $IC(\varepsilon_t, R_{t+k}) > 0.03$ | Média observada em microestrutura |
| **$G_5$** | **Deflated Sharpe Ratio** | $DSR \ge 0.95$ | Desconta penalidade de testes múltiplos |
| **$G_6$** | **Purged Walk-Forward** | $OOS\text{ Profit Factor} \ge 1.40$ | Garante robustez fora da amostra (2025–2026) |
| **$G_7$** | **$2\times$ Friction Resilience** | $PF_{2\times} \ge 1.25$ | Proteção contra aumento de taxas e spread |
| **$G_8$** | **Latency Resilience (+250ms)** | Degradação de PnL $< 20\%$ | Tolerância a atrasos de rede reais |
| **$G_9$** | **Permutation Test Collapse** | $p\text{-value}_{perm} < 0.01$ | Confirma que a ordem temporal é a causa |
| **$G_{10}$** | **Independent Replication** | Script roda do zero sem cache | Reprodutibilidade científica total |

---

## 8. POLÍTICA DE PROMOÇÃO & ARQUIVAMENTO

```text
               [BATCH 034 RESEARCH DISCOVERY]
                            │
               Passou em G0 → G3 com sucesso?
                     ┌──────┴──────┐
                    SIM           NÃO
                     │             │
                     ▼             ▼
             [AVANÇAR G4 → G10]  [REJECT BATCH 034]
                     │             │
                     ▼             ▼
       [INSTITUTIONAL PROVIDER   [ARCHIVE & FREEZE]
          CANDIDATE v1]         (Sem tuning de parâmetros)
```

---

## 9. DECLARAÇÃO DE CONGELAMENTO EX-ANTE

Eu, **Senior CTO & Executive Engineering Director**, certifico que este documento estabelece o **contrato definitivo e imutável para o Batch 034**. 

Nenhuma linha de código de pesquisa será executada e nenhum arquivo de dados será processado sem estar em estrita conformidade com os axiomas, formulações matemáticas e portões de falsificação aqui registrados.

**Documento Registrado e Congelado em:** `research/BATCH_034_PRE_REGISTRATION.md` @ 2026-08-31T22:30:00Z  
**Batch 034 Autorizado para Discovery Isolado.**
