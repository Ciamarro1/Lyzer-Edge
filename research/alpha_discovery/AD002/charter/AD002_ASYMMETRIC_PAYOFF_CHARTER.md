# AD002 — Carta Constitucional de Pesquisa: Payoff Assimétrico & Convexidade (1:5 RR) — v2.0 Auditada

**Identificador de Pesquisa**: `ALPHA_DISCOVERY_002` (`AD002`)  
**Novo ID Reservado no Master Ledger**: `H011`  
**Tema Central**: **Asymmetric Payoff & Regime-Conditioned Convexity ($1:5$ Risk-to-Reward Ratio)**  
**Status**: **PROPOSTA DE CHARTER v2.0 (REVISADA COM AUDITORIA METODOLÓGICA) — EXECUÇÃO BLOQUEADA**  
**Timestamp UTC**: `2026-09-03T04:26:00.000Z`  
**Linhagem Epistêmica**: `AD001 (Closed)` $\to$ `OFI001 (Archived/Falsified)` $\to$ **`AD002 (Novo Mecanismo Autônomo)`**  
**Invariante de Produção**: `InstitutionalQuantSignalEngine` V8 SHA-256 `fc19e807255b3ecfb8351e82d7dc9d244c1e511d9aa007ac8b67b12d584b4db1` (**100% INTACTO**).  

---

## 0. Premissa Epistêmica e Declaração de Ruptura com H010

1. **Separação Categórica de H010 (OFI)**:
   A hipótese `H010` foi formalmente encerrada como `ARCHIVED / REJECTED`. É terminantemente proibido reutilizar o Order Flow Imbalance como recurso primário ou tentar calibrar stop/alvo sobre sinais derivados de OFI. O programa `AD002` investiga um **mecanismo econômico inteiramente novo**.
2. **Mudança Fundamental do Paradigma de Previsão**:
   - O paradigma tradicional busca maximizar a correlação linear ($IC$) ou a taxa de acerto ($p > 50\%$) em horizontes fixos ($H$), sofrendo severa erosão por fricção de mercado.
   - O paradigma de **Convexidade Assimétrica (1:5 RR)** abandona a exigência de alta acurácia direcional. A pergunta científica central não é *"para onde o preço vai no próximo período?"*, mas sim:
     $$\mathbf{\text{“Existem estados de mercado nos quais a distribuição condicional de retornos apresenta assimetria suficientemente favorável para sustentar um payoff com risco 1R e alvo 5R após custos reais?”}}$$

---

## 1. Definição Matemática Rigorosa de $1R$

O risco unitário $1R_t$ não pode ser fixado arbitrariamente em dólares ou percentuais estáticos, sob pena de distorcer a geometria de risco entre regimes de alta e baixa volatilidade.

Adotamos a **Unidade de Volatilidade Realizada Local com Piso Mínimo Estrutural**:
$$1R_t = \max\left( 1.5 \cdot \text{ATR}_t(24), \ 0.0080 \cdot C_t \right)$$

Onde:
- **Piso Mínimo de Risco**: $\text{Floor}_{\text{cost}} = 0.0080 \cdot C_t$ ($80\text{ bps}$). Esse piso assegura que os custos totais de execução ($12\text{ bps}$) não consumam mais do que $15\%$ do risco unitário $1R$.

---

## 2. Definição Matemática Exata do ATR (Wilder RMA)

Para eliminar qualquer ambiguidade semântica, todas as métricas de volatilidade utilizam o **Wilder's Smoothing (RMA)** sobre o True Range:

### A. True Range ($TR_t$):
$$TR_t = \max\left( H_t - L_t, \ |H_t - C_{t-1}|, \ |L_t - C_{t-1}| \right)$$

### B. Wilder ATR para qualquer período $K \in \{12, 24, 72\}$:
$$\text{ATR}_t(K) = \frac{(K - 1) \cdot \text{ATR}_{t-1}(K) + TR_t}{K}$$
*(Inicializado pela média aritmética simples dos primeiros $K$ períodos).*

---

## 3. Hipótese Econômica: Volatility Compression Breakout (VCB)

### Formulação Falseável:
> **Hipótese VCB:** Períodos de compressão relativa de volatilidade ($\text{ATR}_{12}/\text{ATR}_{72} \le \theta$), seguidos de rompimento direcional de preços com expansão de volume negociado, podem apresentar uma distribuição de retornos futuros com cauda positiva suficientemente assimétrica para sustentar um payoff com risco de $1R$ e alvo de $5R$ com expectativa matemática líquida positiva ($E[R]_{\text{net}} > 0$) após todos os custos de fricção e execução.

Essa formulação não postula a priori verdades ontológicas sobre "sub-difusão" ou "compressão de liquidez", tratando a assimetria como uma hipótese puramente empírica sujeita a testes nulos e refutação.

---

## 4. Universo Fechado das 64 Hipóteses Pré-Registradas (VCB001 a VCB064)

Para evitar qualquer exploração post-hoc de parâmetros, o universo de discovery é rigorosamente delimitado por uma **grade ortogonal fechada de 64 hipóteses ($4 \times 4 \times 4$)**, catalogada em [`VCB_64_HYPOTHESIS_MATRIX.md`](file:///c:/Users/WDAGUtilityAccount/.gemini/antigravity/scratch/Lyzer-Edge/research/alpha_discovery/AD002/spec/VCB_64_HYPOTHESIS_MATRIX.md):

- **Filtro de Compressão de Volatilidade ($\\theta_{\\text{compress}}$)**: $\theta \in \{0.55, 0.60, 0.65, 0.70\}$ (4 valores)
- **Lookback de Rompimento ($K_{\\text{lookback}}$)**: $K \in \{10, 20, 30, 40\}$ barras horárias (4 valores)
- **Multiplicador de Volume de Ignição ($v_{\\text{mult}}$)**: $v \in \{1.25, 1.50, 1.75, 2.00\} \times \bar{V}_{24}$ (4 valores)

Total: $4 \times 4 \times 4 = 64$ hipóteses fixas pré-enumeradas (`VCB001` a `VCB064`). Nenhuma outra combinação poderá ser inserida retrospectivamente.

---

## 5. Universo de Ativos e Regra de Posição Única Concorrente

### A. Ativos Admitidos
- **Primários (Alta Liquidez):** `BTCUSDT`, `ETHUSDT`
- **Secundários (Alto Beta):** `SOLUSDT`, `AVAXUSDT`, `LINKUSDT`, `DOGEUSDT`

### B. Regra de Posição Única por Ativo (Single Concurrent Position Rule):
Enquanto uma posição estiver aberta em determinado ativo (aguardando $SL$, $TP$ ou o timeout de 72h), **novos sinais gerados nesse mesmo ativo são estritamente ignorados**. Isso elimina dependência mecânica entre trades sobrepostos (*cluster pyramiding*) e assegura a independência dos eventos avaliados.

---

## 6. Blindagem Temporal e Protocolo de Execução

1. **Geração do Sinal e Entrada**:
   - A barra $t$ fecha em $C_t$.
   - O sinal direcional $s_t \in \{-1, +1\}$ é computado exclusivamente com dados disponíveis até o fechamento da barra $t$.
   - A ordem a mercado é executada ao preço de entrada $P_{\text{entry}} = C_t$.
2. **Inviolabilidade Temporal**:
   - **A avaliação de $SL$ e $TP$ tem início ESTRITAMENTE a partir da barra $t+1$.**
   - É terminantemente proibido utilizar as máximas ($H_t$) ou mínimas ($L_t$) da própria barra de entrada para acionar paradas ou metas.

---

## 7. Stop Loss, Take Profit e Regras de Gap

Dado o preço de entrada $P_{\text{entry}} = C_t$ e o risco $R_t$:
- **Long**: $SL = P_{\text{entry}} - R_t \quad | \quad TP = P_{\text{entry}} + 5R_t$
- **Short**: $SL = P_{\text{entry}} + R_t \quad | \quad TP = P_{\text{entry}} - 5R_t$

### A. Tratamento Intrabar na Barra Normal:
Se dentro da mesma barra $k \ge t+1$ ocorrer tanto $H_k \ge TP$ quanto $L_k \le SL$:
- **Convenção do Pior Caso (Worst-Case Tie-Breaking):** O Stop Loss é considerado acionado primeiro. O trade é registrado como **PERDA ($-1R$)**.

### B. Execução Rigorosa de Gaps de Abertura:
Se o mercado abrir na barra $k$ já além do nível pré-estabelecido ($O_k$ além de $SL$ ou $TP$):
1. **Gap além do Stop Loss (Slippage Adverso)**:
   - Long: Saída executada em $P_{\text{exit}} = O_k - \text{Slippage}$ (resultando em perda $> 1R$);
   - Short: Saída executada em $P_{\text{exit}} = O_k + \text{Slippage}$ (perda $> 1R$).
2. **Gap além do Take Profit (Execução Realista de Meta)**:
   - Long: Saída executada no preço de abertura $P_{\text{exit}} = O_k - \text{Slippage}$;
   - Short: Saída executada no preço de abertura $P_{\text{exit}} = O_k + \text{Slippage}$.
3. **Barra sem Gap**: Se o nível estiver contido no intervalo $[L_k, H_k]$, a saída ocorre no preço nominal do nível com o slippage base aplicado.

---

## 8. Mecânica Exata do Timeout de 72 Horas

Se nas barras $t+1, t+2, \dots, t+71$ nem o $SL$ nem o $TP$ forem acionados:
- Na barra **$t+72$**, a posição é compulsoriamente liquidada a mercado no preço de fechamento $C_{t+72}$.
- O retorno normalizado realizado entra no cômputo da esperança matemática real:
  $$r_{\text{gross}} = \frac{s_t \cdot (C_{t+72} - P_{\text{entry}})}{R_t}$$

---

## 9. Contabilidade Individual e Exata de Custos em $R$

Elimina-se qualquer aproximação estática. Para cada trade $i$ aberto ao preço $C_t$ com risco $R_t$:

### A. Custo em Unidades de $R$ ($CostR_i$):
Com taxa de corretagem total de $10\text{ bps}$ ($0.0010$) e slippage base de $2\text{ bps}$ ($0.0002$):
$$CostR_i = \frac{0.0012 \cdot C_t}{R_t}$$

### B. Retorno Líquido Realizado por Trade ($r_{\text{net}, i}$):
- **Se Take Profit atingido (sem gap)**:
  $$r_{\text{net}, i} = +5.0 - CostR_i$$
- **Se Stop Loss atingido (sem gap)**:
  $$r_{\text{net}, i} = -1.0 - CostR_i$$
- **Se Saída por Timeout ou Gap**:
  $$r_{\text{net}, i} = \frac{s_t \cdot (P_{\text{exit}} - P_{\text{entry}})}{R_t} - CostR_i$$

---

## 10. Métrica Primária & Critérios de Avaliação

A métrica primária é a **Média Aritmética Amostral dos Retornos Líquidos em Unidades de R por Trade**:
$$E[R]_{\text{net}} = \frac{1}{N_{\text{trades}}} \sum_{i=1}^{N_{\text{trades}}} r_{\text{net}, i}$$

### A. Distinção entre Break-even e Promoção:
1. **Viabilidade Econômica Mínima (Break-even Líquido)**:
   $$E[R]_{\text{net}} > 0.00R$$
2. **Critério Institucional de Promoção**:
   $$E[R]_{\text{net}} \ge +0.15R \quad \text{com } p_{\text{FDR}} < 0.05 \text{ e } \text{Profit Factor} \ge 1.30$$

### B. Métricas de Cauda e Risco Obrigatórias:
- **Profit Factor Líquido**: $\frac{\sum \max(0, r_{\text{net}, i})}{|\sum \min(0, r_{\text{net}, i})|}$;
- **Intervalo de Confiança de 95% de $E[R]$ via Block Bootstrap**;
- **Sequência Máxima de Perdas Consecutivas (*Max Losing Streak*)**;
- **Drawdown Máximo de Pico a Fundo em Unidades de R ($MDD_R$)**.

---

## 11. Controle de Múltiplos Testes (FDR)

O processo de discovery testará as $M=64$ hipóteses sobre o dataset Batch 039.
Aplicar-se-á compulsoriamente a **Correção de Benjamini-Hochberg (FDR $\le 5\%$)** sobre os $p$-valores empíricos de $E[R]_{\text{net}}$, calculados contra distribuições nulas geradas por embaralhamento de regimes.

---

## 12. Chinese Wall & População Confirmatória

- **Ambiente de Descoberta**: `research/alpha_discovery/AD002/` operando sobre `Batch 039` (2023–2026).
- **Ambiente Confirmatório**: `research/alpha_confirmation/AD002/` lacrado sob Data Firewall. A população confirmatória será formalmente definida e congelada somente após a auditoria do discovery.
- **Isolamento de Produção**: O motor de execução em produção permanece 100% isolado.

---

## 13. Critérios Inegociáveis de Rejeição de Candidato

Qualquer candidato será **FALSIFICADO / REJEITADO** se apresentar:
1. $E[R]_{\text{net}} \le 0.00R$ após custos reais;
2. Número de trades independentes $N_{\text{trades}} < 150$ no universo combinado;
3. Drawdown acumulado em $R$ superior a $30R$;
4. Taxa de acerto inferior à zona de segurança econômica ($p < 17.5\%$);
5. Dependência de mais de $50\%$ do resultado em um único evento outlier.

---

## 🛑 Estado do Laboratório

**EXECUÇÃO: 100% BLOQUEADA.**  
Nenhum teste numérico ou mineração foi iniciado. O charter v2.0 incorpora integralmente as correções metodológicas P0 e P1, aguardando aprovação final para selamento antes da fase de discovery.
