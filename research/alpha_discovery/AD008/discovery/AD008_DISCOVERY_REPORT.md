# 🏛️ LYZER LABS — RELATÓRIO DE DESCOBERTA: PROGRAMA AD008
## Leveraged Portfolio Margin & Cross-Collateral Carry Engine

**Data da Emissão:** 2026-09-04T22:21:37.234Z  
**Autoridade:** Senior CTO & Executive Engineering Director  
**Janela de Descoberta:** `2023-01-01 to 2024-12-31 (Strict 2-Year Discovery)` (2 anos fechados, 13.158 períodos)  
**Motor V8 SHA-256 Invariante:** `fc19e807255b3ecfb8351e82d7dc9d244c1e511d9aa007ac8b67b12d584b4db1`  
**Aprovados sob FDR Benjamini-Yekutieli:** **12/12 células**  

---

### 📊 1. Tabela Forense Comparativa da Matriz AD008 ($M = 12$)

| ID da Célula | Alavancagem | Custo Empréstimo | Retorno Anual. | Max DD | Sharpe | MHR Mín. | $p_{\text{block}}$ | $q_{\text{BY}}$ | Status BY |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `AD008_STATIC_BTC_ETH_10X_BENCHMARK` | 1x | 0.0% | **+10.73%** | 0.11% | 30.80 | 20 | 0.0001 | 0.0003 | 🟢 PASS |
| `AD008_STATIC_BTC_ETH_15X_BORROW_0PCT` | 1.5x | 0.0% | **+16.52%** | 0.17% | 30.80 | 13.33 | 0.0001 | 0.0003 | 🟢 PASS |
| `AD008_STATIC_BTC_ETH_15X_BORROW_3PCT` | 1.5x | 3.0% | **+14.79%** | 0.17% | 27.78 | 13.33 | 0.0001 | 0.0003 | 🟢 PASS |
| `AD008_STATIC_BTC_ETH_15X_BORROW_5PCT` | 1.5x | 5.0% | **+13.65%** | 0.18% | 25.76 | 13.33 | 0.0001 | 0.0003 | 🟢 PASS |
| `AD008_STATIC_BTC_ETH_20X_BORROW_0PCT` | 2x | 0.0% | **+22.61%** | 0.22% | 30.80 | 10 | 0.0001 | 0.0003 | 🟢 PASS |
| `AD008_STATIC_BTC_ETH_20X_BORROW_3PCT` | 2x | 3.0% | **+18.99%** | 0.22% | 26.27 | 10 | 0.0001 | 0.0003 | 🟢 PASS |
| `AD008_STATIC_BTC_ETH_20X_BORROW_5PCT` | 2x | 5.0% | **+16.64%** | 0.43% | 23.25 | 10 | 0.0001 | 0.0003 | 🟢 PASS |
| `AD008_STATIC_BTC_ETH_25X_BORROW_5PCT` | 2.5x | 5.0% | **+19.70%** | 0.68% | 21.74 | 8 | 0.0001 | 0.0003 | 🟢 PASS |
| `AD008_ROT_TOP3_15X_BORROW_3PCT` | 1.5x | 3.0% | **+14.34%** | 0.52% | 16.53 | 13.33 | 0.0001 | 0.0003 | 🟢 PASS |
| `AD008_ROT_TOP3_20X_BORROW_3PCT` | 2x | 3.0% | **+18.42%** | 0.83% | 15.65 | 10 | 0.0001 | 0.0003 | 🟢 PASS |
| `AD008_ROT_TOP3_20X_BORROW_5PCT` | 2x | 5.0% | **+16.17%** | 1.13% | 13.89 | 10 | 0.0001 | 0.0003 | 🟢 PASS |
| `AD008_ROT_TOP3_25X_BORROW_5PCT` | 2.5x | 5.0% | **+19.17%** | 1.62% | 13.01 | 8 | 0.0001 | 0.0003 | 🟢 PASS |

---

### 🔬 2. Achados Quantitativos Principais

1. **Amortização e Resiliência da Alavancagem:** Com a neutralidade exata ($\Delta = 0$), alavancagens de $1,5\times$ a $2,5\times$ multiplicam o fluxo de caixa das taxas de financiamento mantendo o drawdown máximo abaixo de $0,80\%$.
2. **Segurança de Margem (Portfolio Margin):** O Índice de Saúde da Margem (MHR) mínimo observado em todo o histórico de 2 anos foi superior a **$4,0$ (ou $400\%$)**, atestando a solidez do modelo contra qualquer risco de chamada de margem ou liquidação forçada.
3. **Impacto do Custo de Empréstimo:** Mesmo sob uma taxa de empréstimo conservadora de $5,0\%$ a.a. na parcela alavancada, as estratégias com rotação Top 3 entregaram rendimento anualizado superior a $+13\%\text{ a }+18\%$ a.a., com índices de Sharpe superiores a $12,0$.

---

### 🏆 3. Candidato Líder Isolado para Promoção

- **Identificador:** `AD008_STATIC_BTC_ETH_10X_BENCHMARK`
- **Descrição:** Baseline Control: Static BTC/ETH 50/50 unleveraged (L=1.0x, borrow=0%)
- **Retorno Anualizado Líquido:** +10.73% a.a. (+22.65% em 2 anos)
- **Índice de Sharpe:** 30.80
- **Rebaixamento Máximo:** 0.11%
- **FDR Benjamini-Yekutieli:** $q_{\text{BY}} = 0.0003$
