# 🏛️ LYZER EDGE — RELATÓRIO OFICIAL BATCH 007: PRÉ-REGISTRO E WFA DO CANDIDATO V8.0
## BATCH_007_V8_WFA_REPORT

**Data de Execução:** 2026-08-28T08:53:45.120Z  
**Tempo Total de Processamento:** 15.8 s  
**Hardware:** 12 Cores (12th Gen Intel(R) Core(TM) i5-12400F) | RAM: 6.00 GB  
**Dataset SHA-256:** `5da8350f0546641485d33abe23414ac12deb88cc7721647d7fed9c1223f2dfaf`  
**Candidato sob Auditoria:** `V8.0-DISPLACEMENT-FVG-LONG` (Especificação Pré-Registrada Congelada)  
**Mandato da Governança:** Zero otimização de TP/SL; Walk-Forward de 10 janelas, incrementalidade de FVG via OLS, 10k permutações nulas.

---

## 1. RESUMO DOS 8 GATES FORENSES

```text
========================================================================================================================
GATE AUDITADO                         CRITÉRIO INSTITUCIONAL              RESULTADO OBSERVADO             STATUS
========================================================================================================================
[Gate 0] Forensic Integrity           Dataset e Track A Blindados         SHA-256 100% Intactos           🟢 PASS
[Gate 1 & 2] 10-Window WFA            >= 7/10 OOS > 0 & OOS PF >= 1.20    6/10 OOS > 0 | OOS PF = 2.7    🔴 FAILED
[Gate 3] Threshold Stability Band     Viabilidade em >= 3 limiares        4/5 Limiares Viáveis            🟢 PASS
[Gate 4] Incremental FVG OLS          β_interação > 0 e p < 0.05          β = +0.2494% (t=1.13, p=0.25845)  🔴 FAILED
[Gate 5] 10k Null Permutation Test    p_perm < 0.01 vs H0 em Bull Trend   p_perm = 0.0096 (PF Real: 2.7)   🟢 PASS
[Gate 6] Multi-Tier Friction Ladder   PF >= 1.20 a 0.08% e piso >= 25bps  PF = 2.7 | Piso = 0.9815% (38bps)   🟢 PASS
[Gate 7] Economic Viability Profile   Expectativa e Drawdown Controlados  Net +0.9015%/trade | MaxDD 8.1% 🟢 INSTITUCIONAL
[Gate 8] Track A Forensic Check       Blindagem SHA-256 e Replay N=25     Net +$78.42 / PF 1.90 Intacto   🟢 100% INTOCADO
========================================================================================================================
```

---

## 2. [GATE 1 & 2] 10-WINDOW WALK-FORWARD ANALYSIS (WFA)

| Janela WFA | Período Temporal | $N$ | Ret. Bruto | Ret. Líquido (0.08%) | Win Rate | Profit Factor | Status OOS |
|:---|:---|:---:|:---:|:---:|:---:|:---:|:---|
| WFA Window 1   | 2023-01-03 to 2023-05-15  | 10   | 3.5442%    | 3.4642%    | 90%     | 10.45  | 🟢 PROFITABLE |
| WFA Window 2   | 2023-05-15 to 2023-09-25  | 5    | 0.5376%    | 0.4576%    | 60%     | 1.61   | 🟢 PROFITABLE |
| WFA Window 3   | 2023-09-25 to 2024-02-05  | 6    | 0.5993%    | 0.5193%    | 33.3%   | 1.98   | 🟢 PROFITABLE |
| WFA Window 4   | 2024-02-05 to 2024-06-17  | 12   | 1.5252%    | 1.4452%    | 83.3%   | 31.2   | 🟢 PROFITABLE |
| WFA Window 5   | 2024-06-17 to 2024-10-28  | 4    | -0.9929%   | -1.0729%   | 25%     | 0.16   | 🔴 DRAWDOWN |
| WFA Window 6   | 2024-10-28 to 2025-03-10  | 4    | -0.6121%   | -0.6921%   | 25%     | 0.45   | 🔴 DRAWDOWN |
| WFA Window 7   | 2025-03-10 to 2025-07-21  | 2    | 3.1846%    | 3.1046%    | 100%    | 10     | 🟢 PROFITABLE |
| WFA Window 8   | 2025-07-21 to 2025-12-01  | 5    | 0.0072%    | -0.0728%   | 60%     | 0.88   | 🔴 DRAWDOWN |
| WFA Window 9   | 2025-12-01 to 2026-04-12  | 7    | -0.8231%   | -0.9031%   | 28.6%   | 0.06   | 🔴 DRAWDOWN |
| WFA Window 10  | 2026-04-12 to 2026-08-23  | 8    | 0.9482%    | 0.8682%    | 50%     | 4.24   | 🟢 PROFITABLE |

```text
MÉTRICAS AGREGADAS WFA:
- Janelas OOS Positivas     : 6 / 10 (60%)
- Profit Factor OOS Agregado: 2.7
- Profit Factor OOS Mediano : 1.79
- Janelas Catastróficas     : 0
- Veredito da Validação WFA : 🔴 FAILED
```

---

## 3. [GATE 3] FAIXA DE ESTABILIDADE DO LIMIAR (ROBUSTNESS BAND)

| Limiar de Magnitude | $N$ | Ret. Líquido Médio | Ret. Mediano | Win Rate | Profit Factor | Status de Viabilidade |
|:---|:---:|:---:|:---:|:---:|:---:|:---|
| >= 1.75 ATR        | 96   | 0.8663%    | 0.405%     | 62.5%   | 2.82   | 🟢 VIABLE |
| >= 2.00 ATR        | 63   | 0.9015%    | 0.8368%    | 58.7%   | 2.7    | 🟢 VIABLE |
| >= 2.25 ATR        | 46   | 0.3197%    | -0.0384%   | 50%     | 1.48   | 🟢 VIABLE |
| >= 2.50 ATR        | 30   | 0.7802%    | 0.2199%    | 60%     | 2.65   | 🟢 VIABLE |
| >= 2.75 ATR        | 20   | 0.3191%    | -0.0232%   | 50%     | 1.49   | 🔴 SUB-ECONOMIC |

---

## 4. [GATE 4] INFORMAÇÃO INCREMENTAL CONDICIONAL DO FVG (OLS)

$$	ext{Return}_{t+12} = eta_0 + eta_{	ext{Vol}} cdot 	ext{ATR} + eta_{	ext{Trend}} cdot 	ext{Trend} + eta_{	ext{Mag}} cdot (	ext{Body}/	ext{ATR}) + eta_{	ext{Disp}} cdot I(	ext{Disp}) + eta_{	ext{FVG}} cdot I(	ext{FVG}) + eta_{	ext{Interaction}} cdot (I(	ext{Disp}) 	imes I(	ext{FVG})) + epsilon$$

| Variável | Coeficiente ($eta$) | Erro Padrão | $t$-Statistic | $p$-Value | Significância |
|:---|:---:|:---:|:---:|:---:|:---:|
| Intercept                            | 0.0119%    | 0.0259%    | 0.459    | 0.64599  | — |
| Volatility (ATR)                     | 0.014%     | 0.0147%    | 0.948    | 0.3431   | — |
| Bull Trend Alignment                 | 0.1054%    | 0.0203%    | 5.2      | 0        | 🟢 |
| Candle Magnitude (Body/ATR)          | 0.0158%    | 0.0306%    | 0.517    | 0.60514  | — |
| Body/Range Ratio                     | -0.0199%   | 0.0537%    | -0.371   | 0.7107   | — |
| Displacement Indicator (I_disp)      | 0.1565%    | 0.1435%    | 1.09     | 0.27568  | — |
| FVG Indicator (I_fvg)                | 0.0661%    | 0.0282%    | 2.343    | 0.01911  | 🟢 |
| Interaction Term (I_disp × I_fvg)    | 0.2494%    | 0.2207%    | 1.13     | 0.25845  | — |

---

## 5. [GATE 5] TESTE DE PERMUTAÇÃO NULA (10.000 ITERAÇÕES)

```text
- Profit Factor Observado da Estratégia V8.0 : 2.7
- Média da Distribuição Nula em Bull Trend    : 1.19
- Percentil 95 da Distribuição Nula           : 2.03
- Percentil 99 da Distribuição Nula           : 2.67
- p-value de Monte Carlo (10.000 iterações)   : p = 0.0096
- Veredito da Permutação                      : 🟢 PASSED (Significância p < 0.01)
```

---

## 6. [GATE 6, 7 & 8] FRICÇÃO, PERFIL ECONÔMICO E AUDITORIA DO TRACK A

| Nível de Fricção | Custo Rodada | Ret. Líquido Médio | Win Rate | Profit Factor | Status |
|:---|:---:|:---:|:---:|:---:|:---:|
| Tier 0: Gross (0.00%)               | 0%       | 0.9815%    | 58.7%   | 2.98 | 🟢 VIÁVEL |
| Tier 1: Low Friction (0.05%)        | 0.05%    | 0.9315%    | 58.7%   | 2.8 | 🟢 VIÁVEL |
| Tier 2: Normal Exchange (0.08%)     | 0.08%    | 0.9015%    | 58.7%   | 2.7 | 🟢 VIÁVEL |
| Tier 3: High Slippage (0.10%)       | 0.1%     | 0.8815%    | 58.7%   | 2.64 | 🟢 VIÁVEL |
| Tier 4: Adversarial Stress (0.15%)  | 0.15%    | 0.8315%    | 55.6%   | 2.49 | 🟢 VIÁVEL |
| Tier 5: Extreme Stress (0.25%)      | 0.25%    | 0.7315%    | 52.4%   | 2.21 | 🟢 VIÁVEL |

```text
PERFIL ECONÔMICO INSTITUCIONAL (V8.0):
- Total de Trades Válidos  : 63 (1.4 trades/mês)
- Expectativa Líquida/Trade: +0.9015% (após 0.08% taker fee)
- Retorno Composto 3 Anos  : +72.47%
- Drawdown Máximo          : 8.1%
- MFE / MAE Médio (12h)    : MFE = +2.4473% | MAE = -1.254% (Razão: 1.95)

ISOLAMENTO FORENSE DO TRACK A:
- Frozen V5 Config SHA-256 : ba943e5f0a98701e... 🟢 100% INTOCADO
- Shadow Lockbox SHA-256   : ba943e5f0a98701e... 🟢 100% INTOCADO
- Replay Confirmatório V5  : N=25, Net +$78.42, PF 1.90 🟢 RECONCILIAÇÃO EXATA
```
