# 🏛️ BATCH 037 — ECONOMIC HYPOTHESIS PRE-REGISTRATION & FALSIFICATION MANDATE

**Batch Identifier:** `BATCH-037`  
**Study Title:** `CONDITIONAL REGIME STATE PERSISTENCE & MULTI-HORIZON ASYMMETRY`  
**Registration Date:** 2026-09-01T08:25:00Z  
**Epistemic Authority:** Senior CTO & Executive Engineering Director  
**Status:** 🔒 **FROZEN & IMMUTABLE (PRE-EXECUTION REGISTRATION)**  
**Dataset Reference:** Multi-Year Point-in-Time Binance Futures Dataset (2023–2026, 32.112 H1 Candles & Funding Stream)  
**Sha256 Hashes:**
- Dataset H1: `5da8350f0546641485d33abe23414ac12deb88cc7721647d7fed9c1223f2dfaf`
- Funding Stream: `061d4b684cb3229b45668e2193b2a2656911c4e7f8e815617a26f631a0841bf7`

---

## 🔬 1. ECONOMIC THESIS & CAUSAL MECHANISM

### 1.1 O Fenômeno Econômico
Nos Batches 034 e 035, falsificamos que fluxos pontuais de agressão/absorção em horizontes curtos (M5) contenham poder preditivo isolado. No Batch 036, demonstramos que o desequilíbrio de funding isolado também é ruído, mas a sua **interação com a volatilidade macro e a persistência temporal** revelou uma anomalia estrutural assimétrica em horizontes mais longos ($H+168$).

### 1.2 O Mecanismo Causal Proposto
A ineficiência de mercado não reside em ticks microscópicos de fluxo, mas no **aprisionamento e acúmulo de risco estrutural** de participantes alavancados durante estados de estresse macro.

Definimos o **Estado Conjunto de Mercado** $S_t$:
$$S_t = (F_t,\; V_t,\; P_t)$$
onde:
1. $F_t$ (Funding Positioning): Desequilíbrio do custo de carrego (funding rate negativo persistente $F_t < Q_{10\%}$).
2. $V_t$ (Volatility Regime): Regime de volatilidade macro (expansão de volatilidade realizada $V_t > \mu_V + 0.5\sigma_V$).
3. $P_t$ (Price Structure): Absorção estrutural de mínimas de 30h / Wyckoff Spring ($P_t = \text{SPRING}$).

### 1.3 Pergunta Científica Central
> **"A persistência de um estado condicional conjunto $S_t$ por uma duração mínima $D_{\min}$ produz uma distribuição de retornos futuros $P(R_{t+k} \mid S_t)$ economicamente e estatisticamente superior à distribuição incondicional $P(R_{t+k})$, sobrevivendo a todos os atritos institucionais em Out-Of-Sample?"**

---

## 🛡️ 2. HORIZONTES DE AVALIAÇÃO PRÉ-REGISTRADOS (EX-ANTE)

Para eliminar qualquer risco de *p-hacking* ou seleção *post-hoc*, os horizontes de avaliação $k$ e os limiares de persistência $D$ são congelados **antes** da execução de qualquer teste:

### 2.1 Horizontes de Retorno Futuro ($k$)
1. $H+24$ (1 Dia / Curto Prazo Causal)
2. $H+72$ (3 Dias / Médio Prazo Estrutural)
3. $H+168$ (7 Dias / Ciclo Semanal de Funding & Rebalanceamento — **Pré-registrado formalmente como hipótese confirmatória**)

### 2.2 Requisitos de Persistência Mínima do Estado ($D_{\min}$)
- $D = 8\text{h}$ (1 época de funding persistente)
- $D = 24\text{h}$ (3 épocas de funding persistente)

---

## ⚖️ 3. NULL HYPOTHESIS & FALSIFICATION CRITERIA (GATE $G_3$)

### 3.1 Hipóteses Nula e Alternativa
$$\begin{aligned}
H_0 &: E[R_{t+k} \mid S_t] - E[R_{t+k}] \le \text{Friction} \\
H_1 &: E[R_{t+k} \mid S_t] - E[R_{t+k}] > \text{Friction} + 0.20\%
\end{aligned}$$

### 3.2 Critérios Estritos de Aprovação no Gate $G_3$
Para ser considerado aprovado, o Batch 037 deve satisfazer simultaneamente:

1. **$G_{3a}$ — Significância Estatística HAC (Newey-West):**
   - $t\text{-stat} > 3.00$
   - $p\text{-value} < 0.0027$
   - Information Coefficient $IC > +0.035$ com $t_{IC} > 3.00$.

2. **$G_{3b}$ — Borda Econômica Líquida Pós-Fricção (OOS):**
   - Fricção institucional modelada: $0.08\%$ (taxas taker + slippage modelado).
   - Borda líquida mínima requerida em Out-Of-Sample ($2025–2026$):
     $$\text{Edge}_{\text{net}} = \text{Retorno Médio Condicional} - \text{Fricção} \ge +0.20\%$$

3. **$G_{3c}$ — Robustez à Penalidade FWER (Bonferroni / Holm):**
   - Sobrevivência à correção por múltiplos horizontes ($k=24, 72, 168$).

---

## 🔒 4. REGRAS DE ISOLAMENTO DAS TRILHAS (TWO-TRACK GOVERNANCE)

1. **PRODUÇÃO INTOCÁVEL:** O motor de produção (`REC_COMP_INSTITUTIONAL_v1`) no Railway permanece **100% inalterado e isolado**.
2. **ZERO PATCHES EM PRODUÇÃO:** Nenhum resultado intermediário ou final do Batch 037 poderá alterar os parâmetros ou código de produção.
3. **AMBIENTE ISOLADO:** Todos os testes serão executados exclusivamente em scripts na pasta `research/experiments/batch037/`.
