# AD002 — Matriz Fechada das 64 Hipóteses Pré-Registradas (VCB001 a VCB064)

**Identificador do Universo**: `VCB_64_CLOSED_HYPOTHESIS_MATRIX`  
**Programa**: `ALPHA_DISCOVERY_002` (`AD002`)  
**Tamanho do Universo ($M$)**: **64 hipóteses exatas** ($4 \times 4 \times 4$ ortogonal)  
**Status**: **CATALOGADO E CONGELADO ANTES DE QUALQUER EXECUÇÃO**  
**Timestamp UTC**: `2026-09-03T04:25:32.883Z`  

---

## 1. Parâmetros Ortogonais da Grade

- **Filtro de Compressão de Volatilidade ($\theta_{\text{compress}}$)**: $\{0.55, 0.60, 0.65, 0.70\}$
- **Lookback de Rompimento de Preço ($K_{\text{lookback}}$)**: $\{10, 20, 30, 40\}$ barras horárias
- **Multiplicador de Volume de Ignição ($v_{\text{mult}}$)**: $\{1.25, 1.50, 1.75, 2.00\}$

---

## 2. Tabela Completa das 64 Hipóteses Pré-Registradas

| ID | Limiar de Compressão ($\theta$) | Lookback Rompimento ($K$) | Multiplicador Volume ($v$) | Risco ($1R$) | Alvo ($5R$) | Timeout |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **VCB001** | $\text{Ratio} \le 0.55$ | 10 barras | $\ge 1.25 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB002** | $\text{Ratio} \le 0.55$ | 10 barras | $\ge 1.50 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB003** | $\text{Ratio} \le 0.55$ | 10 barras | $\ge 1.75 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB004** | $\text{Ratio} \le 0.55$ | 10 barras | $\ge 2.00 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB005** | $\text{Ratio} \le 0.55$ | 20 barras | $\ge 1.25 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB006** | $\text{Ratio} \le 0.55$ | 20 barras | $\ge 1.50 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB007** | $\text{Ratio} \le 0.55$ | 20 barras | $\ge 1.75 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB008** | $\text{Ratio} \le 0.55$ | 20 barras | $\ge 2.00 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB009** | $\text{Ratio} \le 0.55$ | 30 barras | $\ge 1.25 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB010** | $\text{Ratio} \le 0.55$ | 30 barras | $\ge 1.50 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB011** | $\text{Ratio} \le 0.55$ | 30 barras | $\ge 1.75 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB012** | $\text{Ratio} \le 0.55$ | 30 barras | $\ge 2.00 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB013** | $\text{Ratio} \le 0.55$ | 40 barras | $\ge 1.25 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB014** | $\text{Ratio} \le 0.55$ | 40 barras | $\ge 1.50 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB015** | $\text{Ratio} \le 0.55$ | 40 barras | $\ge 1.75 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB016** | $\text{Ratio} \le 0.55$ | 40 barras | $\ge 2.00 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB017** | $\text{Ratio} \le 0.60$ | 10 barras | $\ge 1.25 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB018** | $\text{Ratio} \le 0.60$ | 10 barras | $\ge 1.50 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB019** | $\text{Ratio} \le 0.60$ | 10 barras | $\ge 1.75 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB020** | $\text{Ratio} \le 0.60$ | 10 barras | $\ge 2.00 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB021** | $\text{Ratio} \le 0.60$ | 20 barras | $\ge 1.25 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB022** | $\text{Ratio} \le 0.60$ | 20 barras | $\ge 1.50 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB023** | $\text{Ratio} \le 0.60$ | 20 barras | $\ge 1.75 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB024** | $\text{Ratio} \le 0.60$ | 20 barras | $\ge 2.00 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB025** | $\text{Ratio} \le 0.60$ | 30 barras | $\ge 1.25 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB026** | $\text{Ratio} \le 0.60$ | 30 barras | $\ge 1.50 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB027** | $\text{Ratio} \le 0.60$ | 30 barras | $\ge 1.75 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB028** | $\text{Ratio} \le 0.60$ | 30 barras | $\ge 2.00 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB029** | $\text{Ratio} \le 0.60$ | 40 barras | $\ge 1.25 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB030** | $\text{Ratio} \le 0.60$ | 40 barras | $\ge 1.50 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB031** | $\text{Ratio} \le 0.60$ | 40 barras | $\ge 1.75 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB032** | $\text{Ratio} \le 0.60$ | 40 barras | $\ge 2.00 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB033** | $\text{Ratio} \le 0.65$ | 10 barras | $\ge 1.25 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB034** | $\text{Ratio} \le 0.65$ | 10 barras | $\ge 1.50 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB035** | $\text{Ratio} \le 0.65$ | 10 barras | $\ge 1.75 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB036** | $\text{Ratio} \le 0.65$ | 10 barras | $\ge 2.00 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB037** | $\text{Ratio} \le 0.65$ | 20 barras | $\ge 1.25 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB038** | $\text{Ratio} \le 0.65$ | 20 barras | $\ge 1.50 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB039** | $\text{Ratio} \le 0.65$ | 20 barras | $\ge 1.75 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB040** | $\text{Ratio} \le 0.65$ | 20 barras | $\ge 2.00 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB041** | $\text{Ratio} \le 0.65$ | 30 barras | $\ge 1.25 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB042** | $\text{Ratio} \le 0.65$ | 30 barras | $\ge 1.50 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB043** | $\text{Ratio} \le 0.65$ | 30 barras | $\ge 1.75 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB044** | $\text{Ratio} \le 0.65$ | 30 barras | $\ge 2.00 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB045** | $\text{Ratio} \le 0.65$ | 40 barras | $\ge 1.25 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB046** | $\text{Ratio} \le 0.65$ | 40 barras | $\ge 1.50 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB047** | $\text{Ratio} \le 0.65$ | 40 barras | $\ge 1.75 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB048** | $\text{Ratio} \le 0.65$ | 40 barras | $\ge 2.00 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB049** | $\text{Ratio} \le 0.70$ | 10 barras | $\ge 1.25 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB050** | $\text{Ratio} \le 0.70$ | 10 barras | $\ge 1.50 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB051** | $\text{Ratio} \le 0.70$ | 10 barras | $\ge 1.75 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB052** | $\text{Ratio} \le 0.70$ | 10 barras | $\ge 2.00 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB053** | $\text{Ratio} \le 0.70$ | 20 barras | $\ge 1.25 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB054** | $\text{Ratio} \le 0.70$ | 20 barras | $\ge 1.50 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB055** | $\text{Ratio} \le 0.70$ | 20 barras | $\ge 1.75 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB056** | $\text{Ratio} \le 0.70$ | 20 barras | $\ge 2.00 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB057** | $\text{Ratio} \le 0.70$ | 30 barras | $\ge 1.25 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB058** | $\text{Ratio} \le 0.70$ | 30 barras | $\ge 1.50 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB059** | $\text{Ratio} \le 0.70$ | 30 barras | $\ge 1.75 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB060** | $\text{Ratio} \le 0.70$ | 30 barras | $\ge 2.00 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB061** | $\text{Ratio} \le 0.70$ | 40 barras | $\ge 1.25 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB062** | $\text{Ratio} \le 0.70$ | 40 barras | $\ge 1.50 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB063** | $\text{Ratio} \le 0.70$ | 40 barras | $\ge 1.75 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |
| **VCB064** | $\text{Ratio} \le 0.70$ | 40 barras | $\ge 2.00 \times \text{Vol}_{24}$ | $\max(1,5\text{ATR}_{24}, 80\text{bps})$ | $+5R$ | 72h |

---

## 3. Cláusula Anti-Data-Snooping

Nenhuma hipótese poderá ser adicionada, removida ou alterada retrospectivamente após o início do processamento de dados do Batch 039.
O teste de múltiplos testes aplicará correção de Benjamini-Hochberg (FDR $\le 5\%$) estritamente sobre essas $M=64$ hipóteses pré-enumeradas.
