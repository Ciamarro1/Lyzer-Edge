# H011 — ESPECIFICAÇÃO CONGELADA DE PRODUÇÃO CIENTÍFICA (v1.0)
## Volatility Compression Breakout (VCB) — Payoff Assimétrico 1:5 RR

**Identificador de Hipótese**: `H011`  
**Programa**: `ALPHA_CONFIRMATION_H011`  
**Status**: **ESPECIFICAÇÃO CONGELADA (FROZEN SPEC) — EXECUÇÃO BLOQUEADA**  
**Timestamp UTC**: `2026-09-03T04:50:00.000Z`  
**Invariante de Produção**: `InstitutionalQuantSignalEngine` V8 SHA-256 `fc19e807255b3ecfb8351e82d7dc9d244c1e511d9aa007ac8b67b12d584b4db1` (**100% INTACTO**).  

---

## 0. Justificativa Epistêmica da Parametrização Confirmatória

Em cumprimento estrito à diretriz executiva anti-data-snooping:
> **A especificação confirmatória NÃO foi escolhida por seleção pós-hoc do campeão numérico isolado (VCB031).**

### Matriz de Decisão da Bacia Topológica:
Na mineração das 64 hipóteses sobre o Batch 039:
- `VCB031` gerou o maior retorno nominal ($E[R] = +0,567R$), porém com amostra insuficiente ($N=36$ trades em 3,5 anos) e intervalo de confiança excessivamente amplo ($[-0,602R, \ +1,904R]$).
- A região em torno de $K=40$ barras horárias demonstrou estabilidade transversal consistente em todos os multiplicadores de volume.
- O limiar de compressão $\theta = 0,65$ constitui o **medoide topológico** (barycenter) da bacia de estabilidade:
  - Mantém amostragem estatisticamente tratável ($N \approx 100$ a $170$ trades);
  - Produziu o menor $p$-valor centrado de toda a grade ($p = 0,1185$ em `VCB045`);
  - Preserva taxa de acerto consistente de $22,4\% - 22,6\%$, confortavelmente acima do break-even real (~$18,5\%$).
- O multiplicador de volume $v = 1,50 \times \bar{V}_{24}$ representa o padrão institucional equilibrado de expansão de liquidez (50% acima da média móvel de 24h), evitando o ruído de $v=1,25$ e o sub-dimensionamento de $v=2,00$.

Portanto, a especificação congelada unívoca é:
$$\mathbf{\theta_{\text{compress}} = 0,65 \quad | \quad K_{\text{lookback}} = 40 \text{ barras} \quad | \quad v_{\text{mult}} = 1,50 \times \bar{V}_{24}}$$

---

## 1. Definições Matemáticas Exatas

### 1.1. Volatilidade Realizada (Wilder RMA ATR)
Para qualquer período $K \in \{12, 24, 72\}$:
$$TR_t = \max\left( H_t - L_t, \ |H_t - C_{t-1}|, \ |L_t - C_{t-1}| \right)$$
$$\text{ATR}_t(K) = \frac{(K - 1) \cdot \text{ATR}_{t-1}(K) + TR_t}{K}$$

### 1.2. Média Móvel de Volume de 24 Horas:
$$\bar{V}_{24, t} = \frac{1}{24} \sum_{i=0}^{23} V_{t-i}$$

### 1.3. Extremos de Rompimento Estrutural ($K=40$ barras):
$$H^{\max}_{40, t} = \max_{k=1}^{40} H_{t-k}, \qquad L^{\min}_{40, t} = \min_{k=1}^{40} L_{t-k}$$
*(Calculados estritamente sobre as 40 barras anteriores, excluindo a barra $t$).*

---

## 2. Geometria de Risco e Payoff ($1:5$ RR)

Para cada entrada executada ao fechamento $C_t$:
### 2.1. Risco Unitário com Piso Estrutural:
$$1R_t = \max\left( 1,5 \cdot \text{ATR}_t(24), \ 0,0080 \cdot C_t \right)$$
*(Piso de $80\text{ bps}$ anti-corrosão por custos).*

### 2.2. Paradas e Metas Nominais:
- **Long ($s_t = +1$)**:
  $$SL = C_t - 1R_t, \qquad TP = C_t + 5,0 \cdot 1R_t$$
- **Short ($s_t = -1$)**:
  $$SL = C_t + 1R_t, \qquad TP = C_t - 5,0 \cdot 1R_t$$

---

## 3. Protocolo de Execução Temporal & Solução do Bug de Custos

### 3.1. Inviolabilidade Temporal ($t+1$):
- O sinal é verificado no fechamento da barra $t$, com entrada a mercado a $P_{\text{entry}} = C_t$.
- **A avaliação de ordens $SL$ e $TP$ inicia-se estritamente na barra $t+1$.** É terminantemente proibido utilizar $H_t$ ou $L_t$ para acionar saídas.

### 3.2. Regra de Posição Única Concorrente:
- Enquanto uma posição estiver ativa em determinado ativo, novos sinais no mesmo ativo são compulsoriamente ignorados.

### 3.3. Correção Rigorosa de Taxas e Slippage (Eliminação do Double-Counting):
A fricção é separada de maneira inequívoca:
- **Taxa de Corretagem da Exchange (Taker Fees)**: $10\text{ bps}$ ($0,0010$ nocional round-trip).
- **Slippage de Mercado**: $2\text{ bps}$ ($0,0002$ nocional por execução a mercado).

**Equação de Custos Normalizada:**
- Para saídas normais de TP ou SL em preço nominal:
  $$CostR_t = \frac{(0,0010 + 0,0002) \cdot C_t}{1R_t} = \frac{0,0012 \cdot C_t}{1R_t}$$
  $$r_{\text{net, TP}} = +5,0 - CostR_t, \qquad r_{\text{net, SL}} = -1,0 - CostR_t$$

- Para saídas com GAP de Abertura na barra $k \ge t+1$:
  - Long Gap Stop ($O_k \le SL$): Saída executada em $P_{\text{exit}} = O_k - 0,0002 \cdot O_k$.
    $$r_{\text{net}} = \frac{P_{\text{exit}} - P_{\text{entry}}}{1R_t} - \frac{0,0010 \cdot C_t}{1R_t}$$
  - Short Gap Stop ($O_k \ge SL$): Saída em $P_{\text{exit}} = O_k + 0,0002 \cdot O_k$.
    $$r_{\text{net}} = \frac{P_{\text{entry}} - P_{\text{exit}}}{1R_t} - \frac{0,0010 \cdot C_t}{1R_t}$$
  *(As taxas de corretagem são debitadas apenas uma vez; o slippage incide sobre o preço de execução real. Fim do double counting).*

- Para Saída Compulsória por Timeout de 72 Horas:
  - Se na barra $t+72$ a posição não atingiu $SL$ nem $TP$, liquidação imediata em $C_{t+72}$:
  - Long: $P_{\text{exit}} = C_{t+72} - 0,0002 \cdot C_{t+72}$;
  - Short: $P_{\text{exit}} = C_{t+72} + 0,0002 \cdot C_{t+72}$;
  - Dedução exclusiva de fees: $\frac{0,0010 \cdot C_t}{1R_t}$.

### 3.4. Convenção do Pior Caso (Worst-Case Intrabar):
- Se dentro da mesma barra horária $H_k \ge TP$ e $L_k \le SL$, **o Stop Loss é considerado acionado primeiro** ($r_{\text{gross}} = -1,0$).

---

## 4. Universo de Ativos e Timeframe

- **Timeframe**: **1 hora (1h)** (fechamento de vela).
- **Universo de Ativos Primário**:
  `BTCUSDT`, `ETHUSDT`, `SOLUSDT`, `AVAXUSDT`, `LINKUSDT`, `DOGEUSDT` (6 ativos).

---

## 5. Métrica Primária e Gates Confirmatórios

### Métrica Primária:
Média Aritmética Amostral dos Retornos Líquidos em Unidades de R:
$$E[R]_{\text{net}} = \frac{1}{N} \sum_{i=1}^N r_{\text{net}, i}$$

### Gates de Decisão Pré-Registrados:
1. **Gate Estatístico Primário (Block Bootstrap sob $H_0$ Centrada)**:
   - Reamostragem com $B = 10.000$ réplicas e semente fixa `Mulberry32(seed = 555555)`;
   - Blocos de $L = 10$ trades cronológicos;
   - **Critério de Aprovação:** **$p_{\text{block}} < 0,0500$**.
2. **Gate Econômico Primário**:
   - **Expectativa Líquida:** **$E[R]_{\text{net}} \ge +0,150R$ por trade**.
   - **Profit Factor Líquido:** **$\text{PF} \ge 1,25$**.
3. **Gate Amostral Mínimo**:
   - **$N_{\text{trades}} \ge 100$ trades independentes** no universo combinado.
4. **Gate de Cauda e Risco**:
   - **Drawdown Máximo:** $MDD_R \le 25,0R$.

---

## 6. Cláusula de Imutabilidade Constitucional

Uma vez congelada esta especificação e homologada pela governança executiva, é **terminantemente vedado**:
- Ajustar $\theta$, $K$, $v$ ou qualquer outro parâmetro;
- Selecionar subperíodos ou subconjuntos de ativos;
- Reabrir o Batch 039;
- Alterar o código do motor de execução V8.
