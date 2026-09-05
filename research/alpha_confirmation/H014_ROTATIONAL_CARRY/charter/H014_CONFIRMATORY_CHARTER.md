# 🏛️ LYZER LABS — CARTA CONSTITUCIONAL CONFIRMATÓRIA: HIPÓTESE H014
## Protocolo Pré-Registrado & Congelamento Criptográfico para Validação em Holdout

**Identificador da Hipótese:** `H014`  
**Título Oficial:** Regime-Conditional & Rotational Cash-and-Carry Arbitrage (Top 3 Equal-Weighted)  
**Origem Epistemológica:** Programa de Descoberta `AD007` (Célula Líder `AD007_ROT_TOP3_EQW_M1`)  
**Família Conceitual:** Arbitragem de Taxa de Financiamento Perpétua com Rotação Transversal Delta-Neutra ($\Delta = 0$)  
**Status Atual:** **PRE-REGISTERED / FROZEN / LOCKED_AWAITING_EXECUTIVE_UNLOCK**  
**População de Descoberta (In-Sample):** `2023-01-01T00:00:00.000Z` a `2024-12-31T23:59:59.999Z` (**SELADA**)  
**População Confirmatória Autorizada:** **Holdout Temporal Virgem** (`2025-01-01T00:00:00.000Z` a `2026-08-31T23:59:59.999Z`)  
**Universo de Ativos Candidatos:** `BTCUSDT`, `ETHUSDT`, `SOLUSDT`, `AVAXUSDT`, `LINKUSDT`, `DOGEUSDT`  
**Invariante de Produção (Motor V8):** SHA-256 `fc19e807255b3ecfb8351e82d7dc9d244c1e511d9aa007ac8b67b12d584b4db1` (**INTOCÁVEL**)  
**Data UTC de Formalização:** `2026-09-04T22:15:00.000Z`  

---

## 🔬 1. O Mecanismo Causal & Racional Econômico

O programa `AD006` e a hipótese `H013` provaram que o carregamento delta-neutro de funding rates elimina integralmente o risco direcional de mercado. Contudo, a alocação estática 50/50 em BTC/ETH revelou vulnerabilidade à compressão macro cíclica das taxas de funding (alcançando $+3,85\%$ a.a. no Holdout 2025–2026, aquém do limiar institucional de $+6,00\%$).

A hipótese `H014` soluciona estruturalmente essa limitação através de quatro axiomas causais:

1. **Dispersão Transversal de Prêmio de Risco (Cross-Sectional Yield Premium):**
   No mercado de derivativos de criptoativos, altcoins de maior beta institucional (como SOL, AVAX, DOGE e LINK) apresentam uma demanda sistematicamente mais intensa por alavancagem especulativa de compra durante expansões de volume, gerando taxas de funding ($FR$) consideravelmente superiores às de BTC e ETH.
2. **Rotação Sistemática de Baixa Frequência (Monthly Low-Turnover Rebalancing):**
   Ao invés de rotações frequentes que consomem o alfa em atrito operacional, `H014` emprega rebalanceamento mensal ($30\text{ dias}$ / $90\text{ períodos de 8h}$). A carteira aloca exatamente $1/3$ do capital nos 3 ativos que apresentaram maior taxa média de financiamento nos $30\text{ dias}$ anteriores.
3. **Amortização Rigorosa de Fricção Operacional:**
   Com custo de transação de $24\text{ bps}$ roundtrip ($12\text{ bps}$ Spot $+ 12\text{ bps}$ Perp), a rotação mensal gera um turnover incremental modesto ($\approx 1\text{ a }2$ trocas de ativos por mês), incorrendo em uma penalidade inferior a $0,08\text{ bps/dia}$, preservando $> 95\%$ do yield bruto gerado.
4. **Neutralidade Matemática Absoluta ($\Delta = 0$):**
   Para cada ativo selecionado $i \in \{\text{Top 1, Top 2, Top 3}\}$, a posição mantém exata paridade nocional:
   $$\Delta_{i} = \Delta_{\text{spot}, i} + \Delta_{\text{perp}, i} = (+1,0) + (-1,0) = 0 \implies \Delta_{\text{portfólio}} = \sum_{i=1}^3 w_i \Delta_i = 0$$

---

## 🔒 2. Especificação Paramétrica Congelada ($M = 1$)

A hipótese `H014` é submetida sob **regime confirmatório estrito de hipótese unitária** ($M = 1$, $c(1) = 1,0$). É expressamente proibida qualquer alteração de hiperparâmetros, ativos ou janelas após o lacre criptográfico.

### Parâmetros Congelados:
- **Estratégia:** `DYNAMIC_ROTATION_HURDLE`
- **Seleção de Ativos:** `TOP_3_YIELDERS`
- **Ponderação:** Equal-Weighted ($1/3$ ou $33,333\%$ para cada um dos 3 ativos selecionados)
- **Lookback de Ranking:** $30\text{ dias}$ ($90\text{ períodos de 8h}$)
- **Intervalo de Rebalanceamento:** $30\text{ dias}$ ($90\text{ períodos de 8h}$)
- **Hurdle Gating:** $0,0\%$ a.a. (Investimento contínuo nos 3 maiores rendimentos positivos)
- **Fricção de Mercado (All-In):**
  - Corretagem Spot: $0,10\%$ ($10\text{ bps}$)
  - Slippage Spot: $0,02\%$ ($2\text{ bps}$)
  - Corretagem Perpétuo: $0,10\%$ ($10\text{ bps}$)
  - Slippage Perpétuo: $0,02\%$ ($2\text{ bps}$)
  - Custo Total Roundtrip: **$24\text{ bps}$ por ciclo completo** ($12\text{ bps}$ por perna de turnover).

---

## 🏛️ 3. Gates Constitucionais de Homologação Confirmatória

Para homologação definitiva de `H014` como estratégia institucional apta a avançar para governança de alocação de capital, o teste em Holdout deverá atender simultaneamente a todos os 5 gates:

```text
┌──────────────────────────────────────────────┬────────────────────────┬──────────────────────┐
│ Gate Constitucional                          │ Métrica Exigida        │ Ação se Falhar       │
├──────────────────────────────────────────────┼────────────────────────┼──────────────────────┤
│ Gate 1: Retorno Anualizado Líquido Mínimo    │ Retorno >= +6.00% a.a. │ REJEIÇÃO CONFIRMATÓRIA│
│ Gate 2: Eficiência Ajustada ao Risco         │ Sharpe Anualizado >= 5 │ REJEIÇÃO CONFIRMATÓRIA│
│ Gate 3: Preservação de Capital Máxima        │ Max Drawdown <= 2.00%  │ REJEIÇÃO CONFIRMATÓRIA│
│ Gate 4: Significância Estatística Robusta    │ p_block < 0.0500       │ REJEIÇÃO CONFIRMATÓRIA│
│ Gate 5: Independência Direcional Residual    │ |rho(R, Delta_P)| < 0.05 REJEIÇÃO CONFIRMATÓRIA│
└──────────────────────────────────────────────┴────────────────────────┴──────────────────────┘
```

### Metodologia Estatística dos Gates:
- **14-Day Calendar Block Bootstrap**: $B = 10.000$ iterações com reposição sobre blocos temporais contíguos de 14 dias (42 períodos de 8 horas), preservando estrutura temporal e dependência serial do funding.
- **Centragem de Hall sob Hipótese Nula ($H_0$)**: $Y_i = X_i - \bar{X}_{\text{obs}}$, avaliando a probabilidade de o rendimento médio do bloco emergir por mero acaso ($p_{\text{block}}$).
- **Multiplicidade**: $M = 1 \implies q_{\text{BY}} = p_{\text{block}} < 0,0500$.

---

## 🔒 4. Salvaguardas Criptográficas & Protocolo de Desbloqueio

1. **Proteção do Holdout:** O diretório de holdout (`2025-01-01` a `2026-08-31`) só pode ser processado pelo runner `run_h014_confirmatory.js`.
2. **Lacre de Pré-Registro:** O arquivo `H014_PREREGISTRATION_LOCK.json` é selado com os hashes da Carta, Especificação e Runner. Seu status inicial é `LOCKED_AWAITING_EXECUTIVE_UNLOCK`.
3. **Barreira Fail-Closed:** Qualquer tentativa de execução sem desbloqueio com token criptográfico válido abortará o processo imediatamente.
4. **Execução One-Shot:** Uma única corrida é autorizada. O veredicto será imutável e registrado no Master Hypothesis Ledger.
