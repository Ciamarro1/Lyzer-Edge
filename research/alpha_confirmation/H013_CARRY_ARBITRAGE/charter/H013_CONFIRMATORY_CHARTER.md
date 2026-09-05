# 🏛️ LYZER LABS — CARTA CONSTITUCIONAL CONFIRMATÓRIA: HIPÓTESE H013
## Protocolo Pré-Registrado & Congelamento Criptográfico para Validação em Holdout

**Identificador da Hipótese:** `H013`  
**Título Oficial:** Structural Cash-and-Carry Arbitrage via Multi-Asset Perpetual Funding Harvest  
**Origem Epistemológica:** Programa de Descoberta `AD006` (Célula Líder `AD006_STATIC_BTC_ETH`)  
**Família Conceitual:** Arbitragem de Base e Taxa de Financiamento Perpétua Delta-Neutra ($\Delta = 0$)  
**Status Atual:** **PRE-REGISTERED / FROZEN / LOCKED_AWAITING_EXECUTIVE_UNLOCK**  
**População de Descoberta (In-Sample):** `2023-01-01T00:00:00.000Z` a `2024-12-31T23:59:59.999Z` (**SELADA**)  
**População Confirmatória Autorizada:** **Holdout Temporal Virgem** (`2025-01-01T00:00:00.000Z` a `2026-08-31T23:59:59.999Z`)  
**Cesta de Ativos Confirmatória:** `BTCUSDT` (50%), `ETHUSDT` (50%)  
**Invariante de Produção (Motor V8):** SHA-256 `fc19e807255b3ecfb8351e82d7dc9d244c1e511d9aa007ac8b67b12d584b4db1` (**INTOCÁVEL**)  
**Data UTC de Formalização:** `2026-09-04T18:55:00.000Z`  

---

## 🔬 1. O Mecanismo Causal & Racional Econômico

O ecossistema cripto de derivativos é caracterizado por um viés estrutural de demanda por alavancagem compradora (Long Bias). Investidores de varejo e fundos direcionais pagam juros recorrentes de financiamento (*Funding Rates* - $FR$) a cada 8 horas aos vendedores de contratos perpétuos.

1. **Exata Neutralidade de Mercado ($\Delta = 0$):**
   Ao assumir uma posição comprada no mercado à vista (*Spot Long*) e simultaneamente uma posição vendida de mesmo valor nocional no contrato perpétuo (*Perpetual Short*), a exposição líquida direcional ao preço do ativo é reduzida exatamente a zero:
   $$\Delta_{\text{portfólio}} = \Delta_{\text{spot}} + \Delta_{\text{perp}} = (+1,0) + (-1,0) = 0$$
   Assim, flutuações de mercado (sejam altas violentas ou quedas catastróficas) têm efeito líquido financeiro nulo.

2. **Fluxo de Caixa Contínuo (Funding Rate Harvest):**
   Como vendedor no mercado perpétuo, a estratégia atua como contraparte da demanda especulativa de alavancagem. Sempre que a taxa de funding for positiva ($FR_t > 0$), a posição perpétua recebe o pagamento direto de juros:
   $$\text{CashFlow}_t = - (-1,0) \times FR_t = +FR_t$$
   Historicamente, em ativos de alta liquidez como BTC e ETH, a taxa de funding permaneceu positiva em mais de $85\%\text{--}93\%$ dos períodos.

3. **Amortização Temporal de Fricção:**
   Estratégias direcionais falham no atrito porque giram carteira repetidamente pagando $12\text{ bps}$ a cada poucas horas ou dias. Em contrapartida, a estratégia `H013` adota o modelo estático de carregamento contínuo: a taxa total de entrada e saída ($24\text{ bps}$ roundtrip: $12\text{ bps}$ Spot $+ 12\text{ bps}$ Perp) é paga uma única vez no início e amortizada ao longo dos 20 meses de operação, resultando em um custo de fricção diário inferior a $0,04\text{ bps/dia}$, totalmente superado pelo rendimento médio anualizado de $+10\%\text{ a }+12\%$.

---

## 🔒 2. Especificação Paramétrica Congelada ($M = 1$)

A hipótese `H013` é pré-registrada sob **regime de hipótese unitária estrita** ($M = 1$, penalidade Benjamini–Yekutieli $c(1) = 1,0$). Qualquer calibração posterior, introdução de filtros ad-hoc ou teste de variantes alternativas invalidará sumariamente o protocolo confirmatório.

### Parâmetros Estritamente Congelados:
- **Universo de Ativos**: `BTCUSDT` e `ETHUSDT` (Cesta Core de Maior Liquidez).
- **Alocação de Capital**: $50\%$ `BTCUSDT` e $50\%$ `ETHUSDT`.
- **Modo de Execução**: `STATIC_BENCHMARK` (Sem rebalanceamentos de alta frequência).
- **Neutralidade Direcional**: $\Delta = 0$ absoluto em ambos os pares.
- **Horizonte Temporal**: Todo o período do Holdout Virgem (2025-01-01 a 2026-08-31, 608 dias / 1.824 períodos de 8h).
- **Controle de Fricção**:
  - Perna Spot: $0,10\%$ Corretagem $+ 0,02\%$ Slippage ($12\text{ bps}$).
  - Perna Perpétua: $0,10\%$ Corretagem $+ 0,02\%$ Slippage ($12\text{ bps}$).
  - Custo Total de Ciclo Roundtrip: **$24\text{ bps}$ all-in**.
- **Equação de Rentabilidade por Período $t$ (8 horas)**:
  $$R_{t} = 0,5 \times FR_{\text{BTC}, t} + 0,5 \times FR_{\text{ETH}, t}$$
  $$R_{\text{net}, 0} = R_0 - \text{TurnoverCost} \quad (\text{onde TurnoverCost} = 0,0024)$$
  $$R_{\text{net}, t} = R_t \quad (\forall t > 0)$$

---

## 🏛️ 3. Gates Constitucionais de Homologação Confirmatória

Para que `H013` seja confirmada e declarada **Alpha Institucional Produzível de Nível 1 (Tier 1 Production Alpha)**, o teste cego no Holdout 2025–2026 deverá satisfazer simultaneamente a **TODOS** os 5 gates a seguir:

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

### Protocolo de Inferência Estatística:
- **14-Day Calendar Block Bootstrap**: $B = 10.000$ réplicas com reposição geradas sobre blocos contíguos de 14 dias (42 períodos de 8h por bloco) para preservar qualquer autocorrelação serial dos regimes de taxa de juros.
- **Centragem sob Hipótese Nula ($H_0$)**: Metodologia formal de Hall (1992): $Y_i = X_i - \bar{X}_{\text{obs}}$, testando se a média de retorno do bloco é estritamente maior que zero contra o custo de oportunidade.
- **Controle de Multiplicidade**: $M = 1 \implies q_{\text{BY}} = p_{\text{block}}$.

---

## 🔒 4. Salvaguarda Criptográfica & Protocolo de Desbloqueio

1. **Firewall de Holdout**: Os arquivos de dados de funding do período 2025–2026 estão blindados e inacessíveis para qualquer teste até a aprovação formal da governança.
2. **Lacre de Pré-Registro**: É formalmente gerado o arquivo `H013_PREREGISTRATION_LOCK.json` com status `LOCKED_AWAITING_EXECUTIVE_UNLOCK`, contendo os hashes SHA-256 e tamanhos em bytes do presente Charter, da Frozen Spec e do runner script.
3. **Desbloqueio Soberano**: O executor abortará imediatamente caso o status não seja `UNLOCKED` ou caso o token executivo não seja fornecido.
4. **Execução One-Shot**: A validação confirmatória ocorrerá em passagem única e determinística, registrando o resultado final no Master Hypothesis Ledger.
