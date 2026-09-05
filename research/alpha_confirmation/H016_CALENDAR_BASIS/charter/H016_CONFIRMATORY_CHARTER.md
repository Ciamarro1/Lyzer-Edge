# 🏛️ LYZER LABS — CARTA CONSTITUCIONAL CONFIRMATÓRIA: HIPÓTESE H016
## Protocolo Pré-Registrado & Congelamento Criptográfico para Validação em Holdout

**Identificador da Hipótese:** `H016`  
**Título Oficial:** Calendar Delivery Basis Arbitrage (ETHUSD Current Quarter, 1.0x, 0% Borrow Cost, $\Delta = 0$)  
**Origem Epistemológica:** Programa de Descoberta `AD009` (Célula Líder `AD009_ETH_CURRENT_Q_10X`)  
**Família Conceitual:** Arbitragem de Base a Termo com Entrega Trimestral e Margem em Moeda (*Coin-Margined Synthetic Dollar*)  
**Status Atual:** **PRE-REGISTERED / FROZEN / LOCKED_AWAITING_EXECUTIVE_UNLOCK**  
**População de Descoberta (In-Sample):** `2023-01-01T00:00:00.000Z` a `2024-12-31T23:59:59.999Z` (**731 DIAS SELADOS**)  
**População Confirmatória Autorizada:** **Holdout Temporal Virgem** (`2025-01-01T00:00:00.000Z` a `2026-08-31T23:59:59.999Z`)  
**Ativo Subjacente:** `ETHUSD` (Spot ETH + Short Futuro Trimestral Binance COIN-M)  
**Invariante de Produção (Motor V8):** SHA-256 `fc19e807255b3ecfb8351e82d7dc9d244c1e511d9aa007ac8b67b12d584b4db1` (**INTACTO**)  
**Data UTC de Formalização:** `2026-09-04T22:55:00.000Z`  

---

## 🔬 1. O Mecanismo Causal & Racional Econômico

As hipóteses de arbitragem perpétua `H013`, `H014` e `H015` demonstraram que:
1. Em regimes de funding rates comprimidos ($3,0\%\text{--}3,8\%$ nominais), estratégias sem alavancagem ($1,0\times$) ficam limitadas pelo teto macro do mercado.
2. Na alavancagem com Portfolio Margin USDT/USDC ($2,0\times$), o custo de empréstimo de margem de $3,0\%$ a.a. absorve $38,9\%$ de todo o rendimento bruto gerado.

A hipótese **H016** resolve ambos os problemas simultaneamente através de uma mudança de microestrutura contratual:
1. **Convergência Contratual Garantida ($F_T \to S_T$):**  
   Ao negociar o contrato futuro trimestral com data fixa de entrega (`CURRENT_QUARTER`), a base é travada na montagem e converge obrigatoriamente a zero na data de expiração, eliminando a dependência de taxas de funding voláteis a cada 8 horas.
2. **Custo de Financiamento Nulo ($r_{\text{borrow}} = 0,00\%$ a.a.):**  
   No mercado COIN-M (Contratos Inversos), o investidor compra Spot ETH e o deposita como garantia direta para vender o futuro `ETHUSD_CQ`. O valor em dólares fica congelado de forma sintética ($\Delta = 0$), sem requerer qualquer empréstimo de moedas fiduciárias ou stablecoins. O custo de borrow é matematicamente zero.
3. **Rolagem Trimestral Estruturada:**  
   Aproximadamente 7 dias antes da data de liquidação de cada trimestre, a posição é rolada para o novo contrato trimestral, amortizando o custo de rolagem ($10\text{ bps}$) ao longo de 90 dias de carregamento.

---

## 🔒 2. Especificação Paramétrica Congelada ($M = 1$)

A hipótese `H016` é pré-registrada sob regime confirmatório estrito de hipótese unitária ($M = 1$, penalidade Benjamini–Yekutieli $c(1) = 1,0$). Qualquer calibração *post-hoc* invalidará o protocolo.

### Parâmetros Estritamente Congelados:
- **Par Negociado:** `ETHUSD`.
- **Tipo de Contrato:** `CURRENT_QUARTER` (Entrega Trimestral COIN-M Binance).
- **Alavancagem Nocional ($L$):** $1,0\times$ exato (sem alavancagem de margem cruzada).
- **Taxa de Juros de Empréstimo ($r_{\text{borrow}}$):** $0,00\%$ a.a. (Margem em moeda).
- **Fricção de Mercado:**
  - Entrada: $14\text{ bps}$ ($5\text{ bps}$ Spot $+ 5\text{ bps}$ Futuro $+ 2 \times 2\text{ bps}$ slippage).
  - Saída: $10\text{ bps}$ ($5\text{ bps}$ Spot $+ 5\text{ bps}$ Futuro).
  - Rolagem Trimestral: $10\text{ bps}$ por rolagem a cada trimestre.
- **Janela de Holdout Autorizada:** Estritamente `2025-01-01T00:00:00.000Z` a `2026-08-31T23:59:59.999Z`.

---

## 🏛️ 3. Gates Constitucionais de Homologação Confirmatória

Para que `H016` seja confirmada para produção, a execução no Holdout 2025–2026 deverá satisfazer simultaneamente a todos os 5 gates:

```text
┌──────────────────────────────────────────────┬────────────────────────┬──────────────────────┐
│ Gate Constitucional                          │ Métrica Exigida        │ Ação se Falhar       │
├──────────────────────────────────────────────┼────────────────────────┼──────────────────────┤
│ Gate 1: Retorno Anualizado Líquido           │ E_ann >= +6.00% a.a.   │ REJEIÇÃO CONFIRMATÓRIA│
│ Gate 2: Eficiência Ajustada ao Risco (Sharpe)│ Sharpe >= 1.50         │ REJEIÇÃO CONFIRMATÓRIA│
│ Gate 3: Preservação de Capital (Max Drawdown)│ MaxDD <= 2.00%         │ REJEIÇÃO CONFIRMATÓRIA│
│ Gate 4: Significância Robusta (Block Boot)   │ p_block < 0.0500       │ REJEIÇÃO CONFIRMATÓRIA│
│ Gate 5: Neutralidade Direcional Residual     │ |rho_Delta| < 0.0500   │ REJEIÇÃO CONFIRMATÓRIA│
└──────────────────────────────────────────────┴────────────────────────┴──────────────────────┘
```

---

## 🔐 4. Protocolo de Bloqueio Criptográfico (Fail-Closed Barrier)

1. A execução do script confirmatório `run_h016_confirmatory.js` é protegida pelo lacre criptográfico:
   `research/alpha_confirmation/H016_CALENDAR_BASIS/preregistration/H016_PREREGISTRATION_LOCK.json`
2. Enquanto o campo `locked` for `true` e `unlockToken` for nulo, a execução é terminada com erro imediato `EXECUTION_LOCK_ACTIVE_EXCEPTION`.
3. Nenhum dado do Holdout 2025–2026 será processado antes da autorização expressa da Governança Executiva.

---

**Assinado Digitalmente,**  
*Senior Chief Technology Officer (CTO) & Executive Engineering Director*  
*Lyzer Labs Quantitative Systems Group*  
