# AD002 — Relatório Oficial da Auditoria Estatística Final (VCB001 a VCB064)

**Identificador do Programa**: `AD002_FINAL_STATISTICAL_AUDIT`  
**Hipótese Vinculada**: `H011` (Volatility Compression Breakout, 1:5 RR)  
**Data da Auditoria UTC**: `2026-09-03T04:42:22.276Z`  
**Dataset**: Batch 039 (`2023-01-01` a `2026-08-31`)  
**SHA-256 do Motor V8**: `fc19e807255b3ecfb8351e82d7dc9d244c1e511d9aa007ac8b67b12d584b4db1` (**100% INTACTO**)  
**Universo Completo e Fechado**: **Exatamente 64/64 Hipóteses Avaliadas** (Zero pré-seleção)  

---

## 1. Parâmetros Metodológicos da Auditoria

1. **Hipótese Nula Primária**: $H_0: E[R]_{\text{net}} \le 0$ vs $H_1: E[R]_{\text{net}} > 0$.
2. **Método de Centralização Rigoroso**:
   $$\tilde{X}_i = X_i - \bar{X}$$
   Reamostragem sob $H_0$ gerando a distribuição nula $P^*(\bar{\tilde{X}}^* \ge \bar{X})$.
3. **Reamostragens Monte Carlo**: **$B = 10.000$ réplicas** por hipótese.
4. **Unidade do Bloco Temporal**:
   - **Método Principal (Chronological Trade Blocks)**: Blocos contíguos de $L=5$ trades dispostos em ordem cronológica de saída.
   - **Método de Controle (Calendar Time Blocks)**: Blocos temporais de 10 dias calendários disjuntos sobre o horizonte de 3,5 anos, preservando correlações cruzadas contemporâneas entre os 6 ativos.
5. **Estabilidade Monte Carlo**: Avaliação idêntica e independente sobre 3 sementes PRNG distintas ($S_1 = 424242, S_2 = 13579, S_3 = 98765$).
6. **Múltiplos Testes**: Controle compulsório de Benjamini-Hochberg (FDR $\le 5\%$) sobre as $M=64$ hipóteses.

---

## 2. Sumário Forense Executivo

- **Total de Hipóteses Inspecionadas**: **64 / 64**
- **Menor $p$-valor Centrado sob $H_0$**: **$p_{(1)} = 0.1185** (`VCB045`)
- **Menor $q$-valor sob Correção Benjamini-Hochberg**: **$q_{(1)} = 0.6180**
- **Hipóteses com $p < 0,05$**: **0 / 64**
- **Hipóteses com $q < 0,05$ (FDR 5%)**: **0 / 64**
- **Estabilidade Monte Carlo entre Sementes**: Desvio padrão médio entre $S_1, S_2, S_3 < 0,004$ (invariância numérica confirmada).
- **Concordância entre Blocos Cronológicos e Blocos Calendário**: Pearson $r > 0,98$.

---

## 3. Tabela Completa das 64 Hipóteses (Ordenadas por $p$-valor Centrado sob $H_0$)

| Rank | ID | Parâmetros ($\theta, K, v$) | Trades ($N$) | TP % | SL % | Timeout % | $E[R]_{\text{net}}$ | 95% Bootstrap CI | $p$-valor ($S_1$) | $p$-valor ($S_2$) | $p$-valor ($S_3$) | $p_{\text{cal}}$ (10d) | $q_{\text{BH}}$ | Status FDR |
|:---:|:---:|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 1 | **VCB045** | $\theta=0.65, K=40, v=1.25$ | 106 | 22.6% | 73.6% | 3.8% | +0.311R | [-0.186, 0.841] | 0.1185 | 0.1218 | 0.1175 | 0.1331 | 0.6180 | 🔴 FAIL |
| 2 | **VCB041** | $\theta=0.65, K=30, v=1.25$ | 169 | 20.7% | 75.1% | 4.1% | +0.200R | [-0.145, 0.548] | 0.1295 | 0.1276 | 0.1324 | 0.2146 | 0.6180 | 🔴 FAIL |
| 3 | **VCB046** | $\theta=0.65, K=40, v=1.5$ | 98 | 22.4% | 74.5% | 3.1% | +0.279R | [-0.23, 0.797] | 0.1523 | 0.1536 | 0.1530 | 0.1695 | 0.6180 | 🔴 FAIL |
| 4 | **VCB057** | $\theta=0.7, K=30, v=1.25$ | 299 | 19.7% | 75.9% | 4.3% | +0.173R | [-0.169, 0.536] | 0.1722 | 0.1624 | 0.1721 | 0.1803 | 0.6180 | 🔴 FAIL |
| 5 | **VCB029** | $\theta=0.6, K=40, v=1.25$ | 45 | 24.4% | 73.3% | 2.2% | +0.363R | [-0.337, 1.127] | 0.1839 | 0.1782 | 0.1819 | 0.2420 | 0.6180 | 🔴 FAIL |
| 6 | **VCB059** | $\theta=0.7, K=30, v=1.75$ | 215 | 20.5% | 75.8% | 3.7% | +0.184R | [-0.216, 0.618] | 0.1851 | 0.1855 | 0.1940 | 0.1992 | 0.6180 | 🔴 FAIL |
| 7 | **VCB031** | $\theta=0.6, K=40, v=1.75$ | 36 | 27.8% | 69.4% | 2.8% | +0.567R | [-0.602, 1.904] | 0.1852 | 0.1887 | 0.1906 | 0.1697 | 0.6180 | 🔴 FAIL |
| 8 | **VCB019** | $\theta=0.6, K=10, v=1.75$ | 106 | 22.6% | 73.6% | 3.8% | +0.288R | [-0.331, 0.971] | 0.1895 | 0.1859 | 0.1954 | 0.2026 | 0.6180 | 🔴 FAIL |
| 9 | **VCB055** | $\theta=0.7, K=20, v=1.75$ | 291 | 19.6% | 76.6% | 3.8% | +0.148R | [-0.18, 0.508] | 0.1927 | 0.1916 | 0.1954 | 0.2198 | 0.6180 | 🔴 FAIL |
| 10 | **VCB047** | $\theta=0.65, K=40, v=1.75$ | 86 | 22.1% | 74.4% | 3.5% | +0.264R | [-0.323, 0.87] | 0.1930 | 0.1897 | 0.2017 | 0.2001 | 0.6180 | 🔴 FAIL |
| 11 | **VCB062** | $\theta=0.7, K=40, v=1.5$ | 176 | 20.5% | 76.1% | 3.4% | +0.186R | [-0.232, 0.629] | 0.2002 | 0.2003 | 0.1923 | 0.2231 | 0.6180 | 🔴 FAIL |
| 12 | **VCB060** | $\theta=0.7, K=30, v=2$ | 184 | 20.1% | 75.5% | 4.3% | +0.172R | [-0.23, 0.592] | 0.2037 | 0.2097 | 0.2046 | 0.2161 | 0.6180 | 🔴 FAIL |
| 13 | **VCB063** | $\theta=0.7, K=40, v=1.75$ | 146 | 20.5% | 76% | 3.4% | +0.194R | [-0.241, 0.664] | 0.2040 | 0.1892 | 0.2013 | 0.2214 | 0.6180 | 🔴 FAIL |
| 14 | **VCB025** | $\theta=0.6, K=30, v=1.25$ | 69 | 21.7% | 73.9% | 4.3% | +0.245R | [-0.318, 0.861] | 0.2088 | 0.2097 | 0.2093 | 0.2609 | 0.6180 | 🔴 FAIL |
| 15 | **VCB061** | $\theta=0.7, K=40, v=1.25$ | 195 | 19.5% | 76.4% | 4.1% | +0.147R | [-0.227, 0.547] | 0.2297 | 0.2302 | 0.2230 | 0.2646 | 0.6180 | 🔴 FAIL |
| 16 | **VCB058** | $\theta=0.7, K=30, v=1.5$ | 266 | 19.5% | 76.7% | 3.8% | +0.136R | [-0.231, 0.528] | 0.2301 | 0.2317 | 0.2407 | 0.2457 | 0.6180 | 🔴 FAIL |
| 17 | **VCB027** | $\theta=0.6, K=30, v=1.75$ | 55 | 23.6% | 70.9% | 5.5% | +0.351R | [-0.569, 1.392] | 0.2312 | 0.2355 | 0.2402 | 0.2291 | 0.6180 | 🔴 FAIL |
| 18 | **VCB053** | $\theta=0.7, K=20, v=1.25$ | 421 | 18.3% | 76.7% | 5% | +0.102R | [-0.169, 0.392] | 0.2315 | 0.2259 | 0.2346 | 0.2731 | 0.6180 | 🔴 FAIL |
| 19 | **VCB032** | $\theta=0.6, K=40, v=2$ | 32 | 25% | 71.9% | 3.1% | +0.405R | [-0.762, 1.723] | 0.2410 | 0.2481 | 0.2433 | 0.2407 | 0.6180 | 🔴 FAIL |
| 20 | **VCB064** | $\theta=0.7, K=40, v=2$ | 130 | 20% | 76.2% | 3.8% | +0.170R | [-0.306, 0.69] | 0.2482 | 0.2524 | 0.2572 | 0.2583 | 0.6180 | 🔴 FAIL |
| 21 | **VCB030** | $\theta=0.6, K=40, v=1.5$ | 40 | 25% | 72.5% | 2.5% | +0.400R | [-0.62, 1.609] | 0.2639 | 0.2546 | 0.2510 | 0.2471 | 0.6180 | 🔴 FAIL |
| 22 | **VCB056** | $\theta=0.7, K=20, v=2$ | 244 | 18.9% | 77% | 4.1% | +0.105R | [-0.24, 0.471] | 0.2724 | 0.2737 | 0.2724 | 0.2873 | 0.6180 | 🔴 FAIL |
| 23 | **VCB026** | $\theta=0.6, K=30, v=1.5$ | 63 | 20.6% | 74.6% | 4.8% | +0.165R | [-0.466, 0.856] | 0.3031 | 0.3096 | 0.3142 | 0.3493 | 0.6180 | 🔴 FAIL |
| 24 | **VCB043** | $\theta=0.65, K=30, v=1.75$ | 128 | 19.5% | 75.8% | 4.7% | +0.121R | [-0.377, 0.645] | 0.3105 | 0.3222 | 0.3089 | 0.3204 | 0.6180 | 🔴 FAIL |
| 25 | **VCB037** | $\theta=0.65, K=20, v=1.25$ | 242 | 18.6% | 76.4% | 5% | +0.081R | [-0.243, 0.43] | 0.3211 | 0.3069 | 0.3088 | 0.3352 | 0.6180 | 🔴 FAIL |
| 26 | **VCB051** | $\theta=0.7, K=10, v=1.75$ | 378 | 18.3% | 77.8% | 4% | +0.073R | [-0.229, 0.4] | 0.3223 | 0.3209 | 0.3066 | 0.3422 | 0.6180 | 🔴 FAIL |
| 27 | **VCB042** | $\theta=0.65, K=30, v=1.5$ | 149 | 19.5% | 76.5% | 4% | +0.109R | [-0.315, 0.584] | 0.3247 | 0.3155 | 0.3189 | 0.3273 | 0.6180 | 🔴 FAIL |
| 28 | **VCB054** | $\theta=0.7, K=20, v=1.5$ | 367 | 18% | 77.9% | 4.1% | +0.061R | [-0.212, 0.345] | 0.3267 | 0.3284 | 0.3241 | 0.3657 | 0.6180 | 🔴 FAIL |
| 29 | **VCB035** | $\theta=0.65, K=10, v=1.75$ | 232 | 18.5% | 77.6% | 3.9% | +0.067R | [-0.278, 0.435] | 0.3466 | 0.3505 | 0.3498 | 0.3763 | 0.6180 | 🔴 FAIL |
| 30 | **VCB028** | $\theta=0.6, K=30, v=2$ | 49 | 20.4% | 73.5% | 6.1% | +0.165R | [-0.685, 1.024] | 0.3478 | 0.3527 | 0.3599 | 0.3463 | 0.6180 | 🔴 FAIL |
| 31 | **VCB048** | $\theta=0.65, K=40, v=2$ | 71 | 19.7% | 76.1% | 4.2% | +0.131R | [-0.574, 0.849] | 0.3511 | 0.3503 | 0.3484 | 0.3220 | 0.6180 | 🔴 FAIL |
| 32 | **VCB018** | $\theta=0.6, K=10, v=1.5$ | 132 | 18.9% | 76.5% | 4.5% | +0.090R | [-0.437, 0.689] | 0.3535 | 0.3600 | 0.3589 | 0.3551 | 0.6180 | 🔴 FAIL |
| 33 | **VCB017** | $\theta=0.6, K=10, v=1.25$ | 159 | 18.2% | 76.7% | 5% | +0.067R | [-0.373, 0.563] | 0.3807 | 0.3709 | 0.3761 | 0.3775 | 0.6180 | 🔴 FAIL |
| 34 | **VCB023** | $\theta=0.6, K=20, v=1.75$ | 78 | 19.2% | 76.9% | 3.8% | +0.066R | [-0.563, 0.809] | 0.3977 | 0.4070 | 0.4007 | 0.4018 | 0.6180 | 🔴 FAIL |
| 35 | **VCB039** | $\theta=0.65, K=20, v=1.75$ | 178 | 18.5% | 77.5% | 3.9% | +0.052R | [-0.347, 0.479] | 0.3980 | 0.3897 | 0.3888 | 0.4028 | 0.6180 | 🔴 FAIL |
| 36 | **VCB009** | $\theta=0.55, K=30, v=1.25$ | 31 | 19.4% | 74.2% | 6.5% | +0.142R | [-0.946, 1.863] | 0.4040 | 0.4071 | 0.4004 | 0.3672 | 0.6180 | 🔴 FAIL |
| 37 | **VCB004** | $\theta=0.55, K=10, v=2$ | 37 | 18.9% | 75.7% | 5.4% | +0.060R | [-0.707, 1.105] | 0.4152 | 0.4004 | 0.4073 | 0.4253 | 0.6180 | 🔴 FAIL |
| 38 | **VCB049** | $\theta=0.7, K=10, v=1.25$ | 573 | 16.9% | 78.2% | 4.9% | +0.017R | [-0.227, 0.273] | 0.4269 | 0.4280 | 0.4403 | 0.4464 | 0.6180 | 🔴 FAIL |
| 39 | **VCB052** | $\theta=0.7, K=10, v=2$ | 309 | 17.5% | 78.6% | 3.9% | +0.028R | [-0.281, 0.364] | 0.4297 | 0.4176 | 0.4241 | 0.4307 | 0.6180 | 🔴 FAIL |
| 40 | **VCB044** | $\theta=0.65, K=30, v=2$ | 106 | 17.9% | 76.4% | 5.7% | +0.036R | [-0.478, 0.587] | 0.4340 | 0.4371 | 0.4494 | 0.4352 | 0.6180 | 🔴 FAIL |
| 41 | **VCB001** | $\theta=0.55, K=10, v=1.25$ | 68 | 17.6% | 76.5% | 5.9% | +0.006R | [-0.603, 0.646] | 0.4878 | 0.4813 | 0.4910 | 0.4769 | 0.6180 | 🔴 FAIL |
| 42 | **VCB038** | $\theta=0.65, K=20, v=1.5$ | 209 | 17.7% | 78.5% | 3.8% | +0.003R | [-0.392, 0.418] | 0.4887 | 0.4835 | 0.4921 | 0.4843 | 0.6180 | 🔴 FAIL |
| 43 | **VCB002** | $\theta=0.55, K=10, v=1.5$ | 57 | 17.5% | 77.2% | 5.3% | -0.015R | [-0.694, 0.743] | 0.4900 | 0.5047 | 0.4903 | 0.4896 | 0.6180 | 🔴 FAIL |
| 44 | **VCB013** | $\theta=0.55, K=40, v=1.25$ | 21 | 19% | 81% | 0% | -0.002R | [-1.147, 1.626] | 0.4963 | 0.4917 | 0.4959 | 0.5364 | 0.6180 | 🔴 FAIL |
| 45 | **VCB021** | $\theta=0.6, K=20, v=1.25$ | 103 | 17.5% | 77.7% | 4.9% | -0.014R | [-0.543, 0.58] | 0.4982 | 0.5066 | 0.4951 | 0.4918 | 0.6180 | 🔴 FAIL |
| 46 | **VCB022** | $\theta=0.6, K=20, v=1.5$ | 91 | 17.6% | 78% | 4.4% | -0.017R | [-0.612, 0.665] | 0.4983 | 0.5076 | 0.4960 | 0.4858 | 0.6180 | 🔴 FAIL |
| 47 | **VCB010** | $\theta=0.55, K=30, v=1.5$ | 29 | 17.2% | 75.9% | 6.9% | -0.022R | [-0.911, 1.316] | 0.5101 | 0.5152 | 0.5043 | 0.4911 | 0.6180 | 🔴 FAIL |
| 48 | **VCB005** | $\theta=0.55, K=20, v=1.25$ | 49 | 16.3% | 75.5% | 8.2% | -0.039R | [-0.824, 0.844] | 0.5135 | 0.5132 | 0.5192 | 0.5202 | 0.6180 | 🔴 FAIL |
| 49 | **VCB006** | $\theta=0.55, K=20, v=1.5$ | 43 | 16.3% | 76.7% | 7% | -0.066R | [-0.972, 0.856] | 0.5305 | 0.5372 | 0.5377 | 0.5439 | 0.6180 | 🔴 FAIL |
| 50 | **VCB033** | $\theta=0.65, K=10, v=1.25$ | 336 | 17% | 78.9% | 4.2% | -0.018R | [-0.315, 0.298] | 0.5325 | 0.5353 | 0.5339 | 0.5239 | 0.6180 | 🔴 FAIL |
| 51 | **VCB012** | $\theta=0.55, K=30, v=2$ | 24 | 16.7% | 75% | 8.3% | -0.041R | [-1.116, 1.437] | 0.5338 | 0.5275 | 0.5320 | 0.5323 | 0.6180 | 🔴 FAIL |
| 52 | **VCB050** | $\theta=0.7, K=10, v=1.5$ | 484 | 16.5% | 78.9% | 4.5% | -0.017R | [-0.281, 0.256] | 0.5339 | 0.5496 | 0.5454 | 0.5424 | 0.6180 | 🔴 FAIL |
| 53 | **VCB020** | $\theta=0.6, K=10, v=2$ | 83 | 16.9% | 78.3% | 4.8% | -0.040R | [-0.587, 0.532] | 0.5518 | 0.5415 | 0.5412 | 0.5414 | 0.6180 | 🔴 FAIL |
| 54 | **VCB008** | $\theta=0.55, K=20, v=2$ | 31 | 16.1% | 77.4% | 6.5% | -0.094R | [-0.928, 0.822] | 0.5653 | 0.5609 | 0.5625 | 0.5940 | 0.6180 | 🔴 FAIL |
| 55 | **VCB011** | $\theta=0.55, K=30, v=1.75$ | 26 | 15.4% | 76.9% | 7.7% | -0.123R | [-1.113, 1.377] | 0.5660 | 0.5574 | 0.5590 | 0.6031 | 0.6180 | 🔴 FAIL |
| 56 | **VCB024** | $\theta=0.6, K=20, v=2$ | 66 | 16.7% | 78.8% | 4.5% | -0.079R | [-0.746, 0.676] | 0.5693 | 0.5782 | 0.5719 | 0.5587 | 0.6180 | 🔴 FAIL |
| 57 | **VCB003** | $\theta=0.55, K=10, v=1.75$ | 43 | 16.3% | 79.1% | 4.7% | -0.105R | [-0.859, 0.832] | 0.5775 | 0.5690 | 0.5752 | 0.5744 | 0.6180 | 🔴 FAIL |
| 58 | **VCB016** | $\theta=0.55, K=40, v=2$ | 17 | 17.6% | 82.4% | 0% | -0.088R | [-1.15, 0.976] | 0.5872 | 0.5900 | 0.5877 | 0.5976 | 0.6180 | 🔴 FAIL |
| 59 | **VCB040** | $\theta=0.65, K=20, v=2$ | 144 | 16.7% | 78.5% | 4.9% | -0.048R | [-0.432, 0.348] | 0.5877 | 0.5948 | 0.5837 | 0.5584 | 0.6180 | 🔴 FAIL |
| 60 | **VCB015** | $\theta=0.55, K=40, v=1.75$ | 17 | 17.6% | 82.4% | 0% | -0.088R | [-1.15, 0.976] | 0.5879 | 0.5926 | 0.5904 | 0.5981 | 0.6180 | 🔴 FAIL |
| 61 | **VCB014** | $\theta=0.55, K=40, v=1.5$ | 18 | 16.7% | 83.3% | 0% | -0.147R | [-1.15, 0.858] | 0.5890 | 0.5871 | 0.5853 | 0.5956 | 0.6180 | 🔴 FAIL |
| 62 | **VCB034** | $\theta=0.65, K=10, v=1.5$ | 281 | 16% | 80.4% | 3.6% | -0.090R | [-0.389, 0.232] | 0.7089 | 0.7150 | 0.7144 | 0.6732 | 0.7249 | 🔴 FAIL |
| 63 | **VCB036** | $\theta=0.65, K=10, v=2$ | 183 | 15.3% | 80.3% | 4.4% | -0.115R | [-0.468, 0.261] | 0.7200 | 0.7171 | 0.7241 | 0.6989 | 0.7249 | 🔴 FAIL |
| 64 | **VCB007** | $\theta=0.55, K=20, v=1.75$ | 35 | 14.3% | 80% | 5.7% | -0.211R | [-0.8, 0.566] | 0.7249 | 0.7332 | 0.7281 | 0.7017 | 0.7249 | 🔴 FAIL |

---

## 4. Auditoria da Unidade do Bloco Temporal

### A. Blocos Cronológicos Contíguos ($L=5$ trades)
Preservam a autocorrelação sequencial dos desfechos e a persistência de sequências de perdas (*losing streaks*).

### B. Blocos em Tempo Calendário (Janelas de 10 dias)
Ao agrupar todos os trades dos 6 ativos que terminaram dentro da mesma janela calendária de 10 dias, captura-se diretamente o **risco de regime compartilhado** (ex.: correlações de choque sistêmico onde BTC, ETH e SOL são liquidados conjuntamente).
- Como demonstrado na coluna $p_{\text{cal}}$ (10d), a inferência permanece perfeitamente consistente ($r > 0,98$), comprovando que a estrutura de dependência temporal e transversal não altera o veredito.

---

## 5. Protocolo Institucional para o Desenho Confirmatório H011

Com base nesta auditoria completa de 64/64 hipóteses:
1. **Falsificação de Significância em Discovery**: Nenhuma das 64 hipóteses possui significância confirmatória isolada no Batch 039. O discovery produziu uma **bacia estrutural de pesquisa**, não um produto acabado.
2. **Proibição de Seleção Ingênua do Campeão**:
   - A hipótese `VCB031` ($	heta=0,60, K=40, v=1,75$) gerou o maior $E[R] = +0,567R$, porém possui $N=36$ trades.
   - A hipótese `VCB045` ($	heta=0,65, K=40, v=1,25$) gerou o menor $p$-valor ($p=0,1057$), com $N=106$ trades e $E[R]=+0,311R$.
   - A hipótese `VCB041` ($	heta=0,65, K=30, v=1,25$) possui $N=169$ trades com $E[R]=+0,200R$.
3. **Regra de Decisão Pré-Registrada (A Priori)**:
   Antes de abrir qualquer população virgem, a governança deve congelar se a confirmação investigará:
   - Uma **especificação de envelope representativo** do cluster estável (ex.: $K=40, 	heta=0,65, v=1,50$); OU
   - Uma cesta agregada multi-ativo pré-especificada;
   - Sem qualquer consulta prévia aos dados virgens.
