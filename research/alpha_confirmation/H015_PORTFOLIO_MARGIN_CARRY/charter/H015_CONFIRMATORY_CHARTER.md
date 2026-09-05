# 🏛️ LYZER LABS — CARTA CONSTITUCIONAL CONFIRMATÓRIA: HIPÓTESE H015
## Protocolo Pré-Registrado & Congelamento Criptográfico para Validação em Holdout

**Identificador da Hipótese:** `H015`  
**Título Oficial:** Institutional Portfolio Margin & Leveraged Cash-and-Carry Arbitrage (BTC/ETH 50/50, 2.0x Gearing, 3% Borrow Cost)  
**Origem Epistemológica:** Programa de Descoberta `AD008` (Célula Líder `AD008_STATIC_BTC_ETH_20X_BORROW_3PCT`)  
**Família Conceitual:** Arbitragem de Taxa de Financiamento Delta-Neutra com Alavancagem Institucional via Portfolio Margin ($\Delta = 0$)  
**Status Atual:** **PRE-REGISTERED / FROZEN / LOCKED_AWAITING_EXECUTIVE_UNLOCK**  
**População de Descoberta (In-Sample):** `2023-01-01T00:00:00.000Z` a `2024-12-31T23:59:59.999Z` (**SELADA**)  
**População Confirmatória Autorizada:** **Holdout Temporal Virgem** (`2025-01-01T00:00:00.000Z` a `2026-08-31T23:59:59.999Z`)  
**Cesta de Ativos Confirmatória:** `BTCUSDT` (50%), `ETHUSDT` (50%)  
**Invariante de Produção (Motor V8):** SHA-256 `fc19e807255b3ecfb8351e82d7dc9d244c1e511d9aa007ac8b67b12d584b4db1` (**INTOCÁVEL**)  
**Data UTC de Formalização:** `2026-09-04T22:35:00.000Z`  

---

## 🔬 1. O Mecanismo Causal & Racional Econômico

As hipóteses anteriores `H013` e `H014` demonstraram que estratégias cash-and-carry puras possuem drawdown ínfimo ($< 0,50\%$) e Sharpe elevado ($> 11,0$), mas não atingem o piso de $+6,00\%$ a.a. sob alavancagem $1,0\times$ durante fases macro de compressão de funding (onde as taxas médias de mercado caem para $3,0\%\text{ a }3,5\%$ a.a.).

A hipótese **H015** implementa a modelagem da **mecânica real de Portfolio Margin (PM)** utilizada por fundos quantitativos e prime brokers institucionais:

1. **Eficiência de Colateral Cruzado (Cross-Margin Collateralization):**
   No modelo de Portfolio Margin (Binance PM, OKX Unified Account), os ativos comprados no mercado à vista (Spot BTC e ETH) servem diretamente como colateral com haircut conservador de $10\%$. A perna vendida no contrato perpétuo atua como hedge direto do colateral, reduzindo a Margem de Manutenção Requerida (MMR) para $5\%$.
2. **Gearing Controlado ($L = 2,0\times$):**
   Com um multiplicador de exposição nocional de $2,0\times$ sobre o patrimônio líquido, a estratégia mantém um Índice de Saúde da Margem (Margin Health Ratio - MHR) de $10,0$ ($1000\%$ de cobertura sobre a margem de manutenção), garantindo imunidade total contra liquidação forçada.
3. **Dedução Realista de Custo de Empréstimo:**
   A parcela alavancada $(L - 1 = 1,0\times)$ é submetida a uma taxa contínua de empréstimo de margem de **$3,0\%$ a.a.** ($r_{\text{borrow}} = 0,03$), debitada a cada período de 8 horas.
4. **Equação Líquida de Rentabilidade:**
   $$R_{\text{net}, t} = 2,0 \times \left(0,5 \times FR_{\text{BTC}, t} + 0,5 \times FR_{\text{ETH}, t}\right) - (2,0 - 1,0) \times r_{\text{borrow}, t} - \text{TurnoverCost}_t$$
5. **Neutralidade Direcional Rigorosa ($\Delta = 0$):**
   A relação de nocional entre Spot Long e Perp Short é mantida em $1:1$ para cada par, garantindo delta zero absoluto:
   $$\Delta_{\text{portfólio}} = 2,0 \times [(+0,5 - 0,5)_{\text{BTC}} + (+0,5 - 0,5)_{\text{ETH}}] = 0$$

---

## 🔒 2. Especificação Paramétrica Congelada ($M = 1$)

A hipótese `H015` é pré-registrada sob **regime confirmatório estrito de hipótese unitária** ($M = 1$, penalidade Benjamini–Yekutieli $c(1) = 1,0$). Qualquer ajuste paramétrico post-hoc invalidará o protocolo.

### Parâmetros Estritamente Congelados:
- **Universo de Ativos:** `BTCUSDT` (50%) e `ETHUSDT` (50%).
- **Modo Operacional:** `STATIC_BENCHMARK` (Alocação estática de longo prazo, minimizando turnover).
- **Gearing de Portfolio Margin ($L$):** $2,0\times$ exato.
- **Taxa de Empréstimo de Margem ($r_{\text{borrow}}$):** $3,0\%$ a.a. ($0,000027397$ por período de 8h).
- **Neutralidade Direcional:** $\Delta = 0$ absoluto.
- **Fricção de Mercado (All-In):**
  - Custo Total Roundtrip: **$24\text{ bps}$ por ciclo**, ponderado por $L = 2,0\times$ na entrada e saída ($48\text{ bps}$ nominais sobre o patrimônio inicial amortizados em 20 meses).
- **População de Holdout:** Estritamente `2025-01-01T00:00:00.000Z` a `2026-08-31T23:59:59.999Z` ($1.824$ períodos de 8 horas sincronizados).

---

## 🏛️ 3. Gates Constitucionais de Homologação Confirmatória

Para que `H015` seja homologada como **Alpha Institucional Produzível de Nível 1 (Tier 1 Production Alpha)**, a execução no Holdout 2025–2026 deverá satisfazer simultaneamente a todos os 5 gates:

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

### Metodologia Estatística:
- **14-Day Calendar Block Bootstrap**: $B = 10.000$ iterações com reposição sobre blocos contíguos de 14 dias (42 períodos de 8 horas), preservando dependências temporais.
- **Centragem de Hall sob Hipótese Nula ($H_0$)**: $Y_i = X_i - \bar{X}_{\text{obs}}$, avaliando se a média de retorno do bloco supera estritamente zero contra o custo de oportunidade.
- **Multiplicidade**: $M = 1 \implies q_{\text{BY}} = p_{\text{block}}$.

---

## 🔒 4. Salvaguarda Criptográfica & Protocolo de Desbloqueio

1. **Barreira Fail-Closed:** O runner `run_h015_confirmatory.js` abortará imediatamente caso o lacre `H015_PREREGISTRATION_LOCK.json` não apresente o status `UNLOCKED` acompanhado de um token formal de governança executiva.
2. **Invariância do Motor V8:** O script validará o SHA-256 de `institutional_quant_signal_engine.js` antes de processar qualquer dado.
3. **Execução One-Shot:** Uma única execução sobre o Holdout virgem é autorizada.
