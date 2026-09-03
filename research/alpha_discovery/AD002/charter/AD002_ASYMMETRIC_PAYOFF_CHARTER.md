# AD002 — Carta Constitucional de Pesquisa: Payoff Assimétrico & Convexidade (1:5 RR)

**Identificador de Pesquisa**: `ALPHA_DISCOVERY_002` (`AD002`)  
**Novo ID no Master Ledger**: `H011`  
**Tema Central**: **Asymmetric Payoff & Regime-Conditioned Convexity ($1:5$ Risk-to-Reward Ratio)**  
**Status**: **PROPOSTA DE CHARTER — EXECUÇÃO BLOQUEADA AGUARDANDO REVISÃO EXECUTIVA**  
**Timestamp UTC**: `2026-09-03T04:20:00.000Z`  
**Linhagem Epistêmica**: `AD001 (Closed)` $\to$ `OFI001 (Archived/Falsified)` $\to$ **`AD002 (Novo Mecanismo Autônomo)`**  
**Invariante de Produção**: `InstitutionalQuantSignalEngine` V8 SHA-256 `fc19e807255b3ecfb8351e82d7dc9d244c1e511d9aa007ac8b67b12d584b4db1` (**100% INTACTO**).  

---

## 0. Premissa Epistêmica e Declaração de Ruptura com H010

1. **Separação Categórica de H010 (OFI)**:
   A hipótese `H010` foi formalmente encerrada como `ARCHIVED / REJECTED`. É terminantemente proibido reutilizar o Order Flow Imbalance como recurso primário ou tentar calibrar stop/alvo sobre sinais derivados de OFI. O programa `AD002` investiga um **mecanismo econômico inteiramente novo**.
2. **Mudança Fundamental do Paradigma de Previsão**:
   - O paradigma tradicional busca maximizar a correlação linear ($IC$) ou a taxa de acerto ($p > 50\%$) em horizontes fixos ($H$), sofrendo erosão severa por fricção de mercado.
   - O paradigma de **Convexidade Assimétrica (1:5 RR)** abandona a exigência de alta acurácia direcional. A pergunta científica central não é *"para onde o preço vai no próximo período?"*, mas sim:
     $$\mathbf{\text{“Existem estados de mercado nos quais a distribuição condicional de retornos apresenta assimetria suficientemente favorável para sustentar um payoff com risco 1R e alvo 5R após custos reais?”}}$$

---

## 1. Definição Matemática Rigorosa de $1R$

O risco unitário $1R_t$ não pode ser fixado arbitrariamente em dólares ou percentuais nominais estáticos, sob pena de distorcer a geometria de risco entre regimes de alta e baixa volatilidade.

Adotamos a **Unidade de Volatilidade Realizada Local com Piso Mínimo Estrutural**:
$$\text{ATR}_t(K) = \frac{1}{K} \sum_{i=0}^{K-1} \max\left( H_{t-i} - L_{t-i}, |H_{t-i} - C_{t-i-1}|, |L_{t-i} - C_{t-i-1}| \right)$$
$$1R_t = \max\left( k_{\text{vol}} \cdot \text{ATR}_t(24), \ \text{Floor}_{\text{cost}} \cdot C_t \right)$$

Onde:
- $k_{\text{vol}} = 1.5$ (garante que $1R$ esteja confortavelmente além do ruído intradiário de microestrutura);
- $\text{Floor}_{\text{cost}} = 0.0080$ ($80\text{ bps}$): **Piso Mínimo de Risco**. Esse piso assegura que os custos de corretagem e slippage ($12\text{ bps}$) não consumam mais do que $15\%$ do risco $1R$.

---

## 2. Mecanismo Econômico Investigado: Volatility Compression Breakout (VCB)

### Fundamentação Teórica (Mandelbrot, 1963; Engle, 1982)
Séries financeiras exibem **agrupamento de volatilidade** (*volatility clustering*) e dinâmica de regimes alternantes entre fases de **acumulação/compressão sub-difusiva** e fases de **expansão super-difusiva**.

Em fases de compressão extrema de volatilidade:
1. Os livros de ofertas se adensam localmente em faixas estreitas de preço;
2. O risco geométrico ($1R$) é mecanicamente comprimido em termos de variação percentual;
3. Quando ocorre a ruptura desse estado de equilíbrio (ignição por desbalanço de liquidez macro ou rompimento estrutural), a transição para o regime de alta volatilidade gera movimentos direcionais rápidos e desproporcionais;
4. **Hipótese Econômica:** A expansão de volatilidade pós-compressão possui assimetria direcional suficiente para atingir o alvo de $5R$ com frequência estatística estritamente superior ao break-even teórico ($p > 16.67\%$).

---

## 3. Universo de Ativos

| Papel Experimental | Ativos Elegíveis | Justificativa de Liquidez e Beta |
|---|:---:|---|
| **Universo Primário (Alta Liquidez)** | `BTCUSDT`, `ETHUSDT` | Livros profundos, menor slippage institucional, referência de regime de mercado. |
| **Universo Secundário (Alto Beta)** | `SOLUSDT`, `AVAXUSDT`, `LINKUSDT`, `DOGEUSDT` | Ativos de maior elasticidade de cauda para testar se a expansão atinge $5R$ com maior amplitude. |

---

## 4. Timeframe e Resolução Temporal

- **Timeframe de Detecção de Regime & Sinal**: **1 hora (1h)** (fechamento de vela).
- **Timeframe de Monitoramento de Execução**: Avaliação intradiária contínua para captura de stops e metas.

---

## 5. Definição Precisa de Entrada

Uma ordem de entrada a mercado é executada exatamente no fechamento $C_t$ da barra horária se:
1. **Filtro de Compressão de Volatilidade**:
   $$\text{Ratio}_{\text{vol}} = \frac{\text{ATR}_t(12)}{\text{ATR}_t(72)} < \theta_{\text{compress}} \quad (\text{ex.: } \theta \le 0.65)$$
2. **Ignição de Ruptura Direcional**:
   - **Para Compra (Long)**: Fechamento rompe a máxima das últimas 20 barras ($C_t > \max_{k=1}^{20} H_{t-k}$) acompanhado de volume acima da média ($V_t > 1.5 \cdot \bar{V}_{24}$).
   - **Para Venda (Short)**: Fechamento rompe a mínima das últimas 20 barras ($C_t < \min_{k=1}^{20} L_{t-k}$) com volume acima da média ($V_t > 1.5 \cdot \bar{V}_{24}$).

---

## 6. Stop Loss ($1R$)
- **Long**: $SL = C_t - 1R_t$
- **Short**: $SL = C_t + 1R_t$

---

## 7. Take Profit ($5R$)
- **Long**: $TP = C_t + 5 \cdot 1R_t$
- **Short**: $TP = C_t - 5 \cdot 1R_t$

---

## 8. Timeout (Tempo Máximo de Retenção de Posição)

Para evitar que posições estagnadas permaneçam indefinidamente no mercado quando a ignição de volatilidade falha:
- **Tempo Máximo ($T_{\max}$)**: **72 barras horárias (3 dias calendários)**.
- **Regra de Liquidação**: Se após 72 horas nem o $SL$ nem o $TP$ foram acionados, a posição é compulsoriamente liquidada a mercado no fechamento da 72ª barra.
- O resultado normalizado em $R$ da saída por timeout entra integralmente na distribuição:
  $$r_{\text{trade}} = \frac{C_{\text{exit}} - C_{\text{entry}}}{1R_t}$$

---

## 9. Modelo de Custos, Taxas e Slippage em Unidades de $R$

A cada trade é imputada fricção realista de execução:
- Taxas de Corretagem (Taker Fees): $5\text{ bps}$ entrada $+ 5\text{ bps}$ saída $= 10\text{ bps}$;
- Slippage Médio Estimado: $2\text{ bps}$;
- **Custo Total Fixo de Mercado**: $\text{Fricção} = 12\text{ bps}$ ($0.0012$).
- **Impacto Normalizado no Payoff em $R$**:
  $$\text{Custo em R} = \frac{0.0012 \cdot C_t}{1R_t}$$
  Se $1R_t = 1.2\%$ ($120\text{ bps}$), o custo representa exatamente $0.10R$.
  - Um trade perdedor custa $-1.10R$.
  - Um trade vencedor entrega $+4.90R$.

---

## 10. Tratamento Intrabar: Convenção do Pior Caso (Worst-Case Tie-Breaking)

Em backtests de payoffs assimétricos, a maior armadilha metodológica é a ambiguidade intrabar:
- Se na mesma barra horária a máxima tocar o $TP$ e a mínima tocar o $SL$ ($H_t \ge TP$ e $L_t \le SL$):
  - **CONVENÇÃO OBRIGATÓRIA**: **O Stop Loss é considerado executado primeiro.**
  - O trade é contabilizado como **PERDA (-1R)**.
  - Essa convenção erradica completamente qualquer viés otimista de backtest.

---

## 11. Métrica Primária & Tabela de Expectativa em $R$

A métrica primária inegociável de avaliação é a **Esperança Matemática Amostral Líquida em Unidades de R por Trade**:
$$E[R] = \frac{1}{N_{\text{trades}}} \sum_{i=1}^{N_{\text{trades}}} r_{\text{líquido}, i}^{(R)}$$

### Relação Teórica Payoff $1:5$ vs Taxa de Acerto ($p$):
$$E[R] \approx 6p - 1 - \text{Custos}$$

| Taxa de Acerto ($p$) | Payoff Bruto Teórico | Payoff Líquido Estimado (~0.1R custos) | Classificação Econômica |
|:---:|:---:|:---:|:---:|
| **$15.0\%$** | $-0.10R$ | **$-0.20R$** | 🔴 Inviável |
| **$16.67\%$ (Break-even)** | $0.00R$ | **$-0.10R$** | 🔴 Destruição por Custos |
| **$18.5\%$** | $+0.11R$ | **$+0.01R$** | 🟡 Break-even Líquido Real |
| **$20.0\%$** | $+0.20R$ | **$+0.10R$** | 🟢 Borda Marginal Viável |
| **$25.0\%$** | $+0.50R$ | **$+0.40R$** | 🟢 Borda Institucional Sólida |
| **$30.0\%$** | $+0.80R$ | **$+0.70R$** | 💎 Borda Excepcional |

### Métricas de Cauda e Risco Obrigatórias:
1. **Profit Factor Líquido**: $\frac{\sum \text{Ganhos em R}}{|\sum \text{Perdas em R}|} \ge 1.30$.
2. **Sequência Máxima de Perdas Consecutivas (*Max Losing Streak*)**: Monitoramento estrito de cauda (para $p=20\%$, sequências de 15 a 25 perdas consecutivas são matematicamente esperadas).
3. **Ulcer Index / Drawdown Máximo em R**.

---

## 12. População de Discovery

- **Intervalo de Exploração**: `2023-01-01 00:00:00 UTC` a `2026-08-31 23:59:59 UTC` (Batch 039 catalogado).
- Nenhum dado confirmatório fora desse intervalo será acessado durante a calibragem dos parâmetros de compressão.

---

## 13. População Confirmatória Intocada

- A confirmação só será realizada sobre dados virgens através de **Data Firewall**:
  - Uma nova partição temporal estritamente não utilizada para esta hipótese específica (ou período prospectivo pós-2026);
  - Nenhum trade de confirmação será executado antes do congelamento prévio do protocolo.

---

## 14. Controle de Múltiplos Testes (FDR)

- Número de hipóteses exploratórias pré-delimitado em matriz restrita (máximo de 50 a 100 variações de compressão e ativos).
- Correção compulsória de **Benjamini-Hochberg (FDR $\le 5\%$)** sobre a distribuição de $p$-valores da esperança matemática $E[R]$.

---

## 15. Critérios Inegociáveis de Rejeição / Falsificação

O candidato `H011` será **FALSIFICADO / REJEITADO** sumariamente se:
1. A taxa de acerto líquida $p < 17.5\%$ após custos reais;
2. A esperança matemática líquida $E[R] < +0.15R$ por trade;
3. O Profit Factor for $< 1.25$;
4. O resultado for gerado por menos de $N_{\text{trades}} < 150$ trades independentes no universo combinado;
5. O drawdown máximo em $R$ exceder $30R$.

---

## 16. Chinese Wall & Separação de Diretórios

```text
research/
├── alpha_discovery/
│   └── AD002/
│       ├── charter/
│       │   └── AD002_ASYMMETRIC_PAYOFF_CHARTER.md
│       ├── spec/
│       └── discovery/
│
└── alpha_confirmation/
    └── AD002/  ← BLOQUEADO E VEDADO ATÉ AUTORIZAÇÃO EXECUTIVA
```

---

## 17. Registro Institucional no Master Hypothesis Ledger

O ID **`H011`** fica reservado no `HYPOTHESIS_LEDGER` sob a classificação **EXPLORATÓRIA / PROPOSTA DE CHARTER**.

---

## 18. Estado Operacional Atual

**EXECUÇÃO: BLOQUEADA.**  
Nenhum código de mineração ou backtest foi disparado. Este documento aguarda a chancela e os ajustes da autoridade executiva de governança antes de qualquer passo técnico.
