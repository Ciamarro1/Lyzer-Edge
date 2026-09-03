# 🏛️ LYZER LABS — CARTA CONSTITUCIONAL CONFIRMATÓRIA: HIPÓTESE H012
## Protocolo Pré-Registrado & Congelamento Criptográfico para Validação em Holdout

**Identificador da Hipótese:** `H012`  
**Origem Epistemológica:** Descoberta em `AD004` (Célula `AD004_SS_Z25_H24`)  
**Família Conceitual:** Microestrutura de Derivativos Perpétuos & Desbalanceamento de Funding Rate  
**Status Atual:** **PRE-REGISTERED / FROZEN / AWAITING EXECUTIVE UNLOCK**  
**População de Descoberta:** `2023-01-01` a `2024-12-31` (**SELADA**)  
**População Confirmatória Autorizada:** **Holdout Temporal Virgem** (`2025-01-01T00:00:00.000Z` a `2026-08-31T23:59:59.999Z`)  
**Cesta de Ativos Confirmatória:** `BTCUSDT`, `ETHUSDT`, `SOLUSDT`, `AVAXUSDT`, `LINKUSDT`, `DOGEUSDT` (6 ativos core)  
**Invariante de Produção (Motor V8):** SHA-256 `fc19e807255b3ecfb8351e82d7dc9d244c1e511d9aa007ac8b67b12d584b4db1` (**INTOCÁVEL**)  
**Data UTC de Formalização:** `2026-09-03T08:10:00.000Z`  

---

## 🔬 1. O Mecanismo Causal & Racional Econômico

Nos contratos perpétuos de criptoativos, a taxa de financiamento (*Funding Rate* - $FR$) atua como mecanismo de precificação da liquidez de margem.
1. **Exaustão de Venda & Assimetria de Carregamento**:
   Quando investidores especulativos e algoritmos de momentum vendem agressivamente durante quedas de mercado, o funding rate desaba para valores profundamente negativos ($Z_{FR} \le -2,50$). Isso significa que as posições vendidas estão pagando juros massivos (frequentemente $> 50\%$ a $> 100\%$ a.a.) para manter suas posições abertas.
2. **O Gatilho do Short Squeeze**:
   Posições vendidas alavancadas operam com margens estreitas. À medida que o fluxo vendedor se esgota, qualquer absorção passiva força ordens de stop-loss a mercado e liquidações compulsórias, gerando uma espiral compradora rápida.
3. **Fluxo de Caixa Positivo**:
   Ao assumir uma posição comprada (*Long*) em ambiente de funding negativo extremo, a estratégia atua como provedora de liquidez contrária e **recebe diretamente o pagamento do funding** a cada 8 horas, somando um fluxo de caixa positivo que reduz o risco da operação e supera os custos de transação.

---

## 🔒 2. Especificação Paramétrica Congelada ($M = 1$)

A hipótese `H012` é submetida como **hipótese unitária não-adaptativa** ($M = 1$, penalidade de multiplicidade $c(1) = 1,0$). Não é permitida qualquer otimização, busca em grade ou alteração paramétrica durante ou após o teste confirmatório.

### Parâmetros Estritamente Congelados:
- **Janela de Normalização ($L$)**: 90 períodos de 8h (30 dias exatos), calculada estritamente sobre $[t-90, t-1]$.
- **Média Móvel de Funding**: $\bar{FR}_{90} = \frac{1}{90} \sum_{k=1}^{90} FR_{t-k}$.
- **Desvio Padrão de Funding**: $\sigma_{FR, 90} = \sqrt{\frac{1}{90} \sum_{k=1}^{90} (FR_{t-k} - \bar{FR}_{90})^2}$.
- **Gatilho de Entrada**:
  $$Z_{FR, t} = \frac{FR_t - \bar{FR}_{90}}{\sigma_{FR, 90}} \le -2,50$$
- **Lado da Operação**: LONG ($\text{side} = +1$).
- **Timing de Entrada**: Preço de abertura da vela de 8h em $t+1$, com derrapagem aplicada:
  $$P_{\text{entry}} = \text{Open}_{t+1} \times (1 + \text{slippageRate})$$
- **Horizonte de Manutenção ($H$)**: 3 períodos de 8h (24 horas exatas).
- **Timing de Saída**: Preço de fechamento da vela de 8h em $t+3$, com derrapagem aplicada:
  $$P_{\text{exit}} = \text{Close}_{t+3} \times (1 - \text{slippageRate})$$
- **Retorno Composto Líquido**:
  $$R_{\text{gross, pct}} = \frac{P_{\text{exit}} - P_{\text{entry}}}{P_{\text{entry}}} + \sum_{k=1}^3 (-FR_{t+k})$$
  $$R_{\text{net, pct}} = R_{\text{gross, pct}} - (2 \times \text{feeRate})$$
- **Normalização em Unidades de Risco ($1R$)**:
  $$1R = \frac{ATR_{21, t}}{C_t} \implies R_{\text{net}} = \frac{R_{\text{net, pct}}}{1R}$$
- **Controle de Fricção**:
  - Taxa de Corretagem ($\text{feeRate}$): $0,05\%$ por perna ($5\text{ bps}$).
  - Derrapagem ($\text{slippageRate}$): $0,01\%$ por perna ($1\text{ bps}$).
  - Atrito Total Roundtrip: **$12\text{ bps}$ all-in**.
- **Gestão de Capital**: Posição única por ativo (se um novo gatilho ocorrer durante as 24h de holding, ele é descartado para evitar sobreposição artificial de capital).

---

## 🏛️ 3. Gates Constitucionais de Homologação Confirmatória

Para que `H012` seja confirmada e declarada **Alpha Institucional Produzível**, ela deverá passar simultaneamente por **TODOS** os gates a seguir na População Virgem de Holdout:

```text
┌──────────────────────────────────────────────┬────────────────────────┬──────────────────────┐
│ Gate Constitucional                          │ Métrica Exigida        │ Ação se Falhar       │
├──────────────────────────────────────────────┼────────────────────────┼──────────────────────┤
│ Gate 1: Significância Estatística Primária   │ p_block < 0.0500       │ REJEIÇÃO CONFIRMATÓRIA│
│ Gate 2: Potência Amostral Mínima             │ N_confirmatory >= 100  │ REJEIÇÃO CONFIRMATÓRIA│
│ Gate 3: Expectativa Econômica Líquida        │ E[R]_net >= +0.150R    │ REJEIÇÃO CONFIRMATÓRIA│
│ Gate 4: Amplitude Transversal Mínima          │ >= 4/6 ativos com E>0  │ REJEIÇÃO CONFIRMATÓRIA│
│ Gate 5: Limite Máximo de Drawdown            │ MaxDD <= 15.0R         │ REJEIÇÃO CONFIRMATÓRIA│
└──────────────────────────────────────────────┴────────────────────────┴──────────────────────┘
```

### Protocolo de Inferência:
- **14-Day Calendar Block Bootstrap**: $B = 10.000$ réplicas com reposição, blocos de 14 dias UTC para preservar dependência cruzada e temporal.
- **Centragem sob H0**: Fórmula exata de Hall (1992): $Y_i = X_i - \bar{X}_{\text{obs}}$.
- **Estimador Ponderado**: Trade-weighted mean para evitar viés de agregação de blocos desiguais.
- **Controle de Multiplicidade**: Como $M = 1$, $q_{\text{BY}} = p_{\text{block}}$.

---

## 🔒 4. Salvaguarda Criptográfica & Protocolo de Desbloqueio

1. **Firewall de Holdout**: Os dados de 2025–2026 estão blindados em isolamento e nenhum script de backtest ou inferência pode acessá-los sem que a presente Carta esteja formalmente lacrada e assinada.
2. **Confirmatory Execution Lock**: É gerado o arquivo [`H012_PREREGISTRATION_LOCK.json`](file:///c:/Users/WDAGUtilityAccount/.gemini/antigravity/scratch/Lyzer-Edge/research/alpha_confirmation/H012_FUNDING_SQUEEZE/preregistration/H012_PREREGISTRATION_LOCK.json) contendo os hashes SHA-256 de todos os arquivos de especificação e de código.
3. **Irreversibilidade**: A execução confirmatória é executada uma única vez (*one-shot*). O resultado — seja aprovação definitiva ou falsificação — será imediatamente lavrado no Master Hypothesis Ledger.
