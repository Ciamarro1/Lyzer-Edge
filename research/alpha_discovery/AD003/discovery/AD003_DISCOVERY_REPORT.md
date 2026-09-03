# RELATÓRIO EXECUTIVO DE DESCOBERTA — PROGRAMA AD003
## Temporal Scale Dependence of Volatility Compression Breakouts

**Identificador**: `AD003`  
**Período de Descoberta**: `2023-01-01T00:00:00.000Z` a `2024-12-31T23:59:59.999Z` (2 anos fechados)  
**Universo de Ativos**: `BTCUSDT`, `ETHUSDT`, `SOLUSDT`, `AVAXUSDT`, `LINKUSDT`, `DOGEUSDT`  
**Timeframes**: `15m`, `30m`, `2h`, `4h` (1H terminantemente excluído)  
**Procedimento de Multiplicidade**: **Benjamini–Yekutieli (BY, 2001)** ($c(M) = 4,2785$, penalidade global $171,1417$)  
**Motor V8 SHA-256**: `fc19e807255b3ecfb8351e82d7dc9d244c1e511d9aa007ac8b67b12d584b4db1` (**100% INTACTO**)  
**Data UTC de Execução**: `2026-09-03T06:10:00.168Z`  

---

## 1. Tabela Consolidada das 40 Hipóteses (TSD001 a TSD040)

| ID | TF | Modelo | K | $\theta$ | N ($N_{\ge 60}$) | Inviáveis | $E[R]_{\text{net}}$ | IC95% | $p_{\text{block}}$ | $q_{\text{BY}}$ | Status BY |
|---|:---:|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **TSD001** | 15m | E24h (24h Market Time) | 96 | 0.60 | 0 | 4 | +0R | [0, 0] | 1.0000 | 1.0000 | 🔴 FAIL |
| **TSD002** | 15m | E24h (24h Market Time) | 96 | 0.65 | 5 | 15 | +1.275R | [-1.144, 4.885] | 0.2573 | 1.0000 | 🔴 FAIL |
| **TSD003** | 15m | E48h (48h Market Time) | 192 | 0.60 | 0 | 0 | +0R | [0, 0] | 1.0000 | 1.0000 | 🔴 FAIL |
| **TSD004** | 15m | E48h (48h Market Time) | 192 | 0.65 | 1 | 2 | +4.869R | [4.869, 4.869] | 0.0001 | 0.0043 | 🟢 PASS |
| **TSD005** | 15m | I20 (20 Bars) | 20 | 0.60 | 2 | 201 | -1.124R | [-1.144, -1.105] | 1.0000 | 1.0000 | 🔴 FAIL |
| **TSD006** | 15m | I20 (20 Bars) | 20 | 0.65 | 25 | 415 | +0.078R | [-1.125, 1.324] | 0.4244 | 1.0000 | 🔴 FAIL |
| **TSD007** | 15m | I40 (40 Bars) | 40 | 0.60 | 0 | 82 | +0R | [0, 0] | 1.0000 | 1.0000 | 🔴 FAIL |
| **TSD008** | 15m | I40 (40 Bars) | 40 | 0.65 | 12 | 185 | +0.876R | [-1.131, 2.881] | 0.2188 | 1.0000 | 🔴 FAIL |
| **TSD009** | 15m | I80 (80 Bars) | 80 | 0.60 | 0 | 9 | +0R | [0, 0] | 1.0000 | 1.0000 | 🔴 FAIL |
| **TSD010** | 15m | I80 (80 Bars) | 80 | 0.65 | 5 | 26 | +1.276R | [-1.144, 4.887] | 0.2573 | 1.0000 | 🔴 FAIL |
| **TSD011** | 30m | E24h (24h Market Time) | 48 | 0.60 | 2 | 17 | -1.133R | [-1.134, -1.131] | 1.0000 | 1.0000 | 🔴 FAIL |
| **TSD012** | 30m | E24h (24h Market Time) | 48 | 0.65 | 8 | 42 | -1.133R | [-1.141, -1.129] | 1.0000 | 1.0000 | 🔴 FAIL |
| **TSD013** | 30m | E48h (48h Market Time) | 96 | 0.60 | 0 | 1 | +0R | [0, 0] | 1.0000 | 1.0000 | 🔴 FAIL |
| **TSD014** | 30m | E48h (48h Market Time) | 96 | 0.65 | 0 | 4 | +0R | [0, 0] | 1.0000 | 1.0000 | 🔴 FAIL |
| **TSD015** | 30m | I20 (20 Bars) | 20 | 0.60 | 11 | 93 | +0.518R | [-1.119, 2.484] | 0.3127 | 1.0000 | 🔴 FAIL |
| **TSD016** | 30m | I20 (20 Bars) | 20 | 0.65 | 36 | 177 | -0.121R | [-0.779, 0.66] | 0.6252 | 1.0000 | 🔴 FAIL |
| **TSD017** | 30m | I40 (40 Bars) | 40 | 0.60 | 4 | 32 | +1.884R | [-1.133, 4.9] | 0.0611 | 1.0000 | 🔴 FAIL |
| **TSD018** | 30m | I40 (40 Bars) | 40 | 0.65 | 14 | 68 | -0.265R | [-1.129, 1.026] | 0.6157 | 1.0000 | 🔴 FAIL |
| **TSD019** | 30m | I80 (80 Bars) | 80 | 0.60 | 0 | 4 | +0R | [0, 0] | 1.0000 | 1.0000 | 🔴 FAIL |
| **TSD020** | 30m | I80 (80 Bars) | 80 | 0.65 | 2 | 12 | -1.141R | [-1.149, -1.134] | 1.0000 | 1.0000 | 🔴 FAIL |
| **TSD021** | 2h | E24h (24h Market Time) | 12 | 0.60 | 14 | 6 | +0.061R | [-1.065, 1.298] | 0.4463 | 1.0000 | 🔴 FAIL |
| **TSD022** | 2h | E24h (24h Market Time) | 12 | 0.65 | 40 | 14 | +0.156R | [-0.641, 1.075] | 0.3501 | 1.0000 | 🔴 FAIL |
| **TSD023** | 2h | E48h (48h Market Time) | 24 | 0.60 | 7 | 3 | -0.238R | [-1.113, 1.476] | 0.6605 | 1.0000 | 🔴 FAIL |
| **TSD024** | 2h | E48h (48h Market Time) | 24 | 0.65 | 21 | 8 | +0.053R | [-1.081, 1.351] | 0.4442 | 1.0000 | 🔴 FAIL |
| **TSD025** | 2h | I20 (20 Bars) | 20 | 0.60 | 8 | 4 | -0.342R | [-1.108, 1.159] | 0.6517 | 1.0000 | 🔴 FAIL |
| **TSD026** | 2h | I20 (20 Bars) | 20 | 0.65 | 26 | 10 | -0.163R | [-1.08, 0.905] | 0.5832 | 1.0000 | 🔴 FAIL |
| **TSD027** | 2h | I40 (40 Bars) | 40 | 0.60 | 2 | 0 | -1.047R | [-1.051, -1.044] | 1.0000 | 1.0000 | 🔴 FAIL |
| **TSD028** | 2h | I40 (40 Bars) | 40 | 0.65 | 7 | 0 | -0.226R | [-1.088, 1.886] | 0.6570 | 1.0000 | 🔴 FAIL |
| **TSD029** | 2h | I80 (80 Bars) | 80 | 0.60 | 0 | 0 | +0R | [0, 0] | 1.0000 | 1.0000 | 🔴 FAIL |
| **TSD030** | 2h | I80 (80 Bars) | 80 | 0.65 | 1 | 0 | +4.851R | [4.851, 4.851] | 0.0001 | 0.0043 | 🟢 PASS |
| **TSD031** | 4h | E24h (24h Market Time) | 6 | 0.60 | 4 | 1 | +2R | [-0.209, 4.128] | 0.0384 | 1.0000 | 🔴 FAIL |
| **TSD032** | 4h | E24h (24h Market Time) | 6 | 0.65 | 12 | 1 | +1.024R | [-0.375, 2.552] | 0.0970 | 1.0000 | 🔴 FAIL |
| **TSD033** | 4h | E48h (48h Market Time) | 12 | 0.60 | 3 | 1 | +1.026R | [-1.086, 2.422] | 0.1493 | 1.0000 | 🔴 FAIL |
| **TSD034** | 4h | E48h (48h Market Time) | 12 | 0.65 | 11 | 1 | +0.786R | [-0.563, 2.276] | 0.1509 | 1.0000 | 🔴 FAIL |
| **TSD035** | 4h | I20 (20 Bars) | 20 | 0.60 | 2 | 0 | +0.328R | [-1.086, 1.741] | 0.2559 | 1.0000 | 🔴 FAIL |
| **TSD036** | 4h | I20 (20 Bars) | 20 | 0.65 | 7 | 0 | +0.953R | [-0.195, 2.13] | 0.0573 | 1.0000 | 🔴 FAIL |
| **TSD037** | 4h | I40 (40 Bars) | 40 | 0.60 | 1 | 0 | +1.741R | [1.741, 1.741] | 0.0001 | 0.0043 | 🟢 PASS |
| **TSD038** | 4h | I40 (40 Bars) | 40 | 0.65 | 4 | 0 | +1.35R | [0.575, 2.126] | 0.0001 | 0.0043 | 🟢 PASS |
| **TSD039** | 4h | I80 (80 Bars) | 80 | 0.60 | 0 | 0 | +0R | [0, 0] | 1.0000 | 1.0000 | 🔴 FAIL |
| **TSD040** | 4h | I80 (80 Bars) | 80 | 0.65 | 0 | 0 | +0R | [0, 0] | 1.0000 | 1.0000 | 🔴 FAIL |

---

## 2. Análise Topológica de Bacias e Seleção de Candidato

- **Nós Elegíveis ($q_{\text{BY}} < 0,0500 \land N \ge 60 \land E[R] \ge +0,150$)**: 0 de 40.
- **Bacias Conexas Identificadas**: 0.

### 🔴 Veredito de Descoberta: NENHUMA BACIA SIGNIFICATIVA
Nenhuma hipótese superou simultaneamente o critério de significância Benjamini–Yekutieli ($q_{\text{BY}} < 0,0500$) e o piso amostral ($N \ge 60$).

> **STATUS DO PROGRAMA AD003**: 🔴 **FAIL EM DISCOVERY**  
> O programa AD003 encerra-se sem promoção de hipóteses confirmatórias. Holdout 2025–2026 permanece 100% lacrado e intocado.
