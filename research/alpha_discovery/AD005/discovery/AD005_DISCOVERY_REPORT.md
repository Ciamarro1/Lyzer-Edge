# RELATÓRIO DE DESCOBERTA QUANTITATIVA — PROGRAMA AD005
## Cross-Sectional Momentum & Market-Neutral Relative Strength Spread (Alpha Factory v1.0)

**Programa de Pesquisa:** `AD005`  
**Família:** Arbitragem Estatística Transversal & Portfólio Market-Neutral  
**Período de Descoberta:** `2023-01-01` a `2024-12-31` (2 anos fechados no Data Lake Discovery)  
**Universo de Ativos:** `BTCUSDT`, `ETHUSDT`, `SOLUSDT`, `AVAXUSDT`, `LINKUSDT`, `DOGEUSDT` (6 ativos core)  
**Total de Barras Processadas:** $105.264$ barras horárias ($17.544$ por ativo)  
**Controle de Fricção:** $24\text{ bps}$ all-in por par ($12\text{ bps}$ no Long $+ 12\text{ bps}$ no Short)  
**Inferência Estatística:** 14-Day Calendar Block Bootstrap ($B = 10.000$, seed $888888$, Hall centered, trade-weighted)  
**Procedimento de Multiplicidade:** **Benjamini–Yekutieli (BY, 2001)** ($M = 12$, $c(12) = 3.1032$, multiplicador global = $37.24$)  
**Motor V8 SHA-256:** `fc19e807255b3ecfb8351e82d7dc9d244c1e511d9aa007ac8b67b12d584b4db1` (**100% INTACTO**)  
**Data UTC de Execução:** `2026-09-03T08:26:00.000Z`  

---

## 📊 1. Resultados da Matriz de 12 Células Market-Neutral

| ID da Célula | Estratégia | Lookback ($L$) | Rebalanceamento ($H$) | $N$ Trades | $E[R]_{\text{net}}$ | IC95% | PF | $p_{\text{block}}$ | $q_{\text{BY}}$ | Status BY |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **AD005_CSM_L24_H24** | `MOMENTUM` | 24h | 24h | 729 | -0.016R | [-0.103, 0.071] | 0.97 | 0.6245 | 1.0000 | 🔴 FAIL |
| **AD005_CSM_L24_H72** | `MOMENTUM` | 24h | 72h | 243 | -0.048R | [-0.222, 0.126] | 0.95 | 0.6165 | 1.0000 | 🔴 FAIL |
| **AD005_CSM_L72_H24** | `MOMENTUM` | 72h | 24h | 727 | -0.054R | [-0.145, 0.038] | 0.89 | 0.8481 | 1.0000 | 🔴 FAIL |
| **AD005_CSM_L72_H72** | `MOMENTUM` | 72h | 72h | 242 | -0.087R | [-0.259, 0.086] | 0.91 | 0.6582 | 1.0000 | 🔴 FAIL |
| **AD005_CSM_L168_H24** | `MOMENTUM` | 168h | 24h | 723 | +0.023R | [-0.076, 0.122] | 1.05 | 0.3420 | 1.0000 | 🔴 FAIL |
| **AD005_CSM_L168_H72** | `MOMENTUM` | 168h | 72h | 241 | +0.111R | [-0.078, 0.301] | 1.15 | 0.2507 | 1.0000 | 🔴 FAIL |
| **AD005_CSR_L24_H24** | `MEAN_REVERSION` | 24h | 24h | 729 | -0.144R | [-0.231, -0.057] | 0.73 | 0.9982 | 1.0000 | 🔴 FAIL |
| **AD005_CSR_L24_H72** | `MEAN_REVERSION` | 24h | 72h | 243 | -0.112R | [-0.286, 0.062] | 0.88 | 0.7473 | 1.0000 | 🔴 FAIL |
| **AD005_CSR_L72_H24** | `MEAN_REVERSION` | 72h | 24h | 727 | -0.107R | [-0.198, -0.015] | 0.80 | 0.9800 | 1.0000 | 🔴 FAIL |
| **AD005_CSR_L72_H72** | `MEAN_REVERSION` | 72h | 72h | 242 | -0.074R | [-0.247, 0.099] | 0.93 | 0.6342 | 1.0000 | 🔴 FAIL |
| **AD005_CSR_L168_H24** | `MEAN_REVERSION` | 168h | 24h | 723 | -0.183R | [-0.282, -0.084] | 0.69 | 0.9980 | 1.0000 | 🔴 FAIL |
| **AD005_CSR_L168_H72** | `MEAN_REVERSION` | 168h | 72h | 241 | -0.272R | [-0.461, -0.082] | 0.71 | 0.9349 | 1.0000 | 🔴 FAIL |

---

## 🔬 2. Análise Estrutural & Diagnóstico Microeconômico

A exploração empírica de arbitragem transversal gerou achados definitivos sobre a dinâmica relativa de criptoativos:

### A. Falsificação Completa da Reversão à Média Transversal (`CSR`):
- Em todas as combinações de lookback e rebalanceamento ($L \in \{24\text{h}, 72\text{h}, 168\text{h}\}$, $H \in \{24\text{h}, 72\text{h}\}$), a estratégia de comprar o retardatário (*Bottom 1*) e vender o líder (*Top 1*) gerou **retornos negativos severos** (de $-0,074R$ a $-0,272R$, com $\text{PF} = 0,69\text{--}0,93$ e $p > 0,63$).
- *Mecanismo Causal:* Em criptoativos, a dispersão relativa reflete assimetrias fundamentais de fluxo e adoção institucional. Moedas fracas continuam perdendo participação de mercado por períodos prolongados, destruindo qualquer tese ingênua de "fechamento de spread".

### B. O Atrito do Momentum Transversal em Curto Prazo (`CSM`):
- Embora o Momentum supere expressivamente a Reversão à Média (confirmando que a persistência relativa existe), em horizontes de $24\text{h}$ a $72\text{h}$ o spread médio capturado ($20\text{--}30\text{ bps}$) é **quase inteiramente consumido pelo atrito institucional de $24\text{ bps}$ roundtrip**.
- Ao expandir o lookback para $168\text{h}$ (1 semana) com rebalanceamento a cada $72\text{h}$ (`AD005_CSM_L168_H72`), a expectativa líquida torna-se positiva ($+0,111R, \text{PF} = 1,15$), mas com $p_{\text{block}} = 0,2507$, o sinal não atinge significância estatística nem antes nem depois do controle de multiplicidade.

---

## 🏛️ 3. Conclusão Científica & Veredito Final

1. **Veredito de AD005**:
   `DISCOVERY_FAILURE / NO_CANDIDATE_PROMOTED`
   - **0 de 12 hipóteses** atenderam conjuntamente aos critérios de significância estatística ($q_{\text{BY}} < 0,05$) e expectativa mínima ($E[R] \ge +0,150R$).
   - A Reversão à Média Transversal está cientificamente descartada.
   - O Momentum Transversal possui viés estrutural correto, mas é comprimido pelo atrito de negociação no horizonte de $1\text{H}$ em ativos altamente correlacionados.
2. **Preservação Constitucional**:
   - Nenhum candidato foi qualificado para confirmação.
   - O Holdout Temporal virgem de 2025–2026 permanece protegido.
   - O motor V8 de produção mantém seu SHA-256 inalterado (`fc19e807...b4db1`).
