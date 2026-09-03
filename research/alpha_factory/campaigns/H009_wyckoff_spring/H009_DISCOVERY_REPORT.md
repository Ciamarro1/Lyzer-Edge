# RELATÓRIO DE DESCOBERTA QUANTITATIVA — CAMPANHA H009
## Wyckoff Spring / Liquidity Trap (Alpha Factory v1.0)

**Campanha:** `H009_WYCKOFF_SPRING_ALPHA_FACTORY`  
**Hipótese Master Ledger:** `H009` (Family G — Failed Breakouts / Liquidity Trap)  
**Período de Descoberta:** `2023-01-01` a `2024-12-31` (2 anos fechados)  
**Universo de Ativos:** `BTCUSDT`, `ETHUSDT`, `SOLUSDT`, `AVAXUSDT`, `LINKUSDT`, `DOGEUSDT` (6 ativos)  
**Timeframe:** `1h`  
**Controle de Fricção:** $12\text{ bps}$ all-in ($10\text{ bps}$ fee $+ 2\text{ bps}$ slippage por perna)  
**Inferência Estatística:** 14-Day Calendar Block Bootstrap ($B = 10.000$, seed $888888$, Hall centered, trade-weighted)  
**Procedimento de Multiplicidade:** **Benjamini–Yekutieli (BY, 2001)** ($M = 14$)  
**Motor V8 SHA-256:** `fc19e807255b3ecfb8351e82d7dc9d244c1e511d9aa007ac8b67b12d584b4db1` (**100% INTACTO**)  
**Data UTC de Execução:** `2026-09-03T07:28:11.697Z`  

---

## 🔬 1. Teste de Ablação Causal & Controles Negativos

| Modo de Teste | Papel Epistemológico | $N$ Trades | $E[R]_{\text{net}}$ | Profit Factor | $p_{\text{block}}$ | $q_{\text{BY}}$ | Status BY |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **REAL_SPRING** ($Z \ge 2,5$) | **Candidato Core H009** | **158** | **+-0.247R** | **0.76** | **0.8640** | **1.0000** | 🔴 FAIL |
| **PRICE_ONLY** ($Z < 1,0$) | Ablação: Rejeição sem Volume | 4 | -0.663R | 0 | 1.0000 | 1.0000 | 🔴 FAIL |
| **VOL_ONLY** (Sem Pierce) | Ablação: Volume sem Rompimento | 1043 | +0.149R | 1.11 | 0.2106 | 1.0000 | 🔴 FAIL |
| **CONTINUATION** | Controle Negativo: Rompimento Real | 18 | +0.329R | 1.31 | 0.3075 | 1.0000 | 🔴 FAIL |

---

## 📊 2. Grade de Estabilidade Local (Robustez de Bacia)

| ID da Célula | Parâmetros ($Z$, Horizon, Pierce) | $N$ Trades | Inviáveis (< 80 bps) | $E[R]_{\text{net}}$ | IC95% | PF | $p_{\text{block}}$ | $q_{\text{BY}}$ | Status BY |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **H009_REAL_CORE_Z25_H24** | $Z=2.5, H=24\text{h}, P=1$ | 158 | 43 | -0.247R | [-0.691, 0.21] | 0.76 | 0.8640 | 1.0000 | 🔴 FAIL |
| **H009_ABL_PRICE_ONLY** | $Z=1, H=24\text{h}, P=1$ | 4 | 1 | -0.663R | [-0.999, -0.25] | 0 | 1.0000 | 1.0000 | ⚠️ Degenerado |
| **H009_ABL_VOL_ONLY** | $Z=2.5, H=24\text{h}, P=1$ | 1043 | 1465 | +0.149R | [-0.232, 0.53] | 1.11 | 0.2106 | 1.0000 | 🔴 FAIL |
| **H009_NEG_CONTROL_CONT** | $Z=1, H=24\text{h}, P=1$ | 18 | 0 | +0.329R | [-0.994, 1.372] | 1.31 | 0.3075 | 1.0000 | 🔴 FAIL |
| **H009_BASIN_Z20_H18** | $Z=2, H=18\text{h}, P=1$ | 181 | 52 | -0.143R | [-0.57, 0.267] | 0.83 | 0.7573 | 1.0000 | 🔴 FAIL |
| **H009_BASIN_Z20_H24** | $Z=2, H=24\text{h}, P=1$ | 174 | 52 | -0.15R | [-0.613, 0.316] | 0.85 | 0.7489 | 1.0000 | 🔴 FAIL |
| **H009_BASIN_Z20_H30** | $Z=2, H=30\text{h}, P=1$ | 171 | 51 | -0.065R | [-0.622, 0.516] | 0.94 | 0.6010 | 1.0000 | 🔴 FAIL |
| **H009_BASIN_Z25_H18** | $Z=2.5, H=18\text{h}, P=1$ | 164 | 43 | -0.231R | [-0.67, 0.198] | 0.74 | 0.8549 | 1.0000 | 🔴 FAIL |
| **H009_BASIN_Z25_H30** | $Z=2.5, H=30\text{h}, P=1$ | 155 | 42 | -0.208R | [-0.786, 0.391] | 0.82 | 0.7632 | 1.0000 | 🔴 FAIL |
| **H009_BASIN_Z30_H18** | $Z=3, H=18\text{h}, P=1$ | 147 | 36 | -0.199R | [-0.633, 0.225] | 0.77 | 0.8127 | 1.0000 | 🔴 FAIL |
| **H009_BASIN_Z30_H24** | $Z=3, H=24\text{h}, P=1$ | 143 | 36 | -0.266R | [-0.759, 0.234] | 0.75 | 0.8498 | 1.0000 | 🔴 FAIL |
| **H009_BASIN_Z30_H30** | $Z=3, H=30\text{h}, P=1$ | 140 | 36 | -0.212R | [-0.81, 0.393] | 0.82 | 0.7512 | 1.0000 | 🔴 FAIL |
| **H009_PIERCE_075_Z25_H24** | $Z=2.5, H=24\text{h}, P=0.75$ | 192 | 63 | -0.053R | [-0.538, 0.465] | 0.95 | 0.5731 | 1.0000 | 🔴 FAIL |
| **H009_PIERCE_125_Z25_H24** | $Z=2.5, H=24\text{h}, P=1.25$ | 127 | 24 | -0.149R | [-0.571, 0.283] | 0.83 | 0.7543 | 1.0000 | 🔴 FAIL |

---

## 🏛️ 3. Decomposição Transversal por Ativo (Candidato Core)

| Ativo | $N$ Trades | $E[R]_{\text{net}}$ | Win Rate | Diagnóstico |
|---|:---:|:---:|:---:|---|
| **BTCUSDT** | 18 | -0.034R | 44.4% | 🔴 Retorno Negativo |
| **ETHUSDT** | 25 | -0.335R | 44.0% | 🔴 Retorno Negativo |
| **SOLUSDT** | 32 | -0.222R | 46.9% | 🔴 Retorno Negativo |
| **AVAXUSDT** | 27 | -0.046R | 48.1% | 🔴 Retorno Negativo |
| **LINKUSDT** | 30 | -0.315R | 40.0% | 🔴 Retorno Negativo |
| **DOGEUSDT** | 26 | -0.469R | 50.0% | 🔴 Retorno Negativo |
| **TOTAL POOLED** | **158** | **-0.247R** | **45.6%** | 🔴 **6/6 ATIVOS NEGATIVOS (FALSIFICAÇÃO TRANSVERSAL)** |

---

## 🏛️ 4. Conclusão Científica & Encerramento de H009

### Veredito Institucional:
1. **Falsificação da Generalização Transversal**: O sinal do Wyckoff Spring observado em BTC no Batch 013 não sobreviveu à replicação transversal nem à aplicação de fricção realista (12 bps). **6 de 6 ativos apresentaram retorno médio líquido negativo** ($E[R] = -0,247R$, $\text{PF} = 0,76$).
2. **Inversão da Premissa Causal**: O controle negativo de rompimento com continuação (`CONTINUATION`) gerou retorno positivo ($E[R] = +0,329R$), evidenciando que rompimentos de suportes de 60 barras no mercado de criptoativos tendem à **continuação da tendência vendedora**, e não ao squeeze de reversão.
3. **Classificação no Master Hypothesis Ledger**: A hipótese `H009` é formalmente reclassificada de `PROMISING` para **`ARCHIVED / REJECTED (FALSIFIED IN CROSS-ASSET VALIDATION)`**.
4. **Holdout Preservado**: Nenhuma vela virgem de 2025–2026 foi consumida. O processo encerra-se em fase exploratória da Alpha Factory.

