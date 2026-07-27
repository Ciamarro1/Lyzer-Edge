# 🧬 LYZER EDGE V4 — ALPHA GENOME ENGINE & TRUTHKERNEL 2.0 SPECIFICATION

> **Paradigma Arquitetural V4:** De *Signal Prediction* para *Alpha Preservation & Trade Genealogy*  
> **Autor da Visão:** CTO & Lead Quant Architect  
> **Status:** Aprovado para Implementação V4  

---

## 1. 🏛️ A MUDANÇA FILOSÓFICA FUNDAMENTAL

A auditoria empírica de 463 trades provou conclusivamente que o Lyzer Edge **não precisa de mais modelos preditivos, novos indicadores ou LLMs generativas**. O sistema já gera Alpha expressivo em micro-contextos específicos:

- `GBP/USD (LONG)` → **PF 1.71**
- `ETH/USD (LONG)` → **PF 1.59**
- `SOL/USD (LONG)` → **PF 1.38**
- `BTC/USD (SHORT)` → **PF 1.20**

A degradação de performance não é uma falha na geração de sinal, mas sim a **ausência de memória genética e genealogia de falhas**.

```
                   ARQUITETURA ANTERIOR (V3)
                   
  Mercado ──► TruthKernel ──► Trade ──► Ganhou/Perdeu (CICLO MORRE AQUI)


                   ARQUITETURA V4 (ALPHA GENOME)
                   
  Mercado ──► TruthKernel 2.0 ──► Trade ──► Ganhou/Perdeu
                                                 │
                                                 ▼
                                          Trade Genealogy
                                                 │
                                                 ▼
                                     Failure & Success Engines
                                                 │
                                                 ▼
                                         Market DNA Engine
                                                 │
                                                 ▼
                                        Alpha Score (0-100)
                                                 │
                                                 ▼
                                         Trading Memory
                                                 │
                                                 ▼
                                      Re-alimenta TruthKernel
```

---

## 2. 🧬 ESTRUTURA DO TRADE DNA & MERCADO DNA

### A. Trade DNA Schema (12-Dimensional Vector)

Cada trade executado gera um genoma estruturado contendo:

```json
{
  "dnaVersion": "1.0",
  "tradeId": "trade_101",
  "genealogyFamilyId": "FAM_ETH_LONG_NY_SWEEP",
  "temporal": {
    "timeOfDay": "14:30",
    "dayOfWeek": "Tuesday",
    "marketSession": "New York Open"
  },
  "microstructure": {
    "asset": "ETH/USD",
    "direction": "LONG",
    "spreadBucket": "LOW",
    "atrVolatility": 0.71,
    "liquiditySweep": true
  },
  "confluence": {
    "h4Trend": "BULLISH",
    "m15State": "NEUTRAL",
    "trgScore": 0.58,
    "lhdsScore": 0.12
  },
  "outcome": {
    "pnl": 5.99,
    "result": "win",
    "rMultiple": 2.0
  }
}
```

---

## 🧮 3. ALPHA SCORE ENGINE (0 - 100)

Em vez de perguntar *"O trade parece bom?"*, o TruthKernel 2.0 pergunta *"Este trade pertence a uma família genética historicamente lucrativa sob este Market DNA?"*.

### Fórmula do Alpha Score:

$$\text{AlphaScore} = 100 \times \left( \prod_{k=1}^{10} w_k \cdot S_k \right)$$

Onde os sub-scores calibrados em tempo real são:

1. **$S_{\text{AssetDir}}$**: Profit Factor Histórico do par `(Asset, Direction)` ex: `ETH LONG = 1.59 -> 0.95`.
2. **$S_{\text{Regime}}$**: Alinhamento com o Market DNA de volatilidade e tendência H4.
3. **$S_{\text{Failure}}$**: Inverso da distância Euclidiana para Assinaturas Tóxicas conhecidas.
4. **$S_{\text{Feature}}$**: Relevância do vetor de confluência (SMC Order Block + TRG).
5. **$S_{\text{Volatility}}$**: Adequação ao regime de ATR atual.
6. **$S_{\text{Liquidity}}$**: Confirmação de *Liquidity Sweep* prévio.
7. **$S_{\text{Spread}}$**: Custo operacional de spread vs meta de recompensa.
8. **$S_{\text{Session}}$**: Desempenho histórico na sessão temporal ativa (LND / NY / ASIA).
9. **$S_{\text{TRG}}$**: Asimetria geométrica de risco de cauda ($\text{TRG} \ge 0.50$).
10. **$S_{\text{History}}$**: Wilson 95% Confidence Interval do agrupamento genealógico.

### Matriz de Decisão do TruthKernel 2.0:

- **Alpha Score < 50**: **VETO ABSOLUTO** (Assinatura Tóxica Detectada)
- **50 ≤ Alpha Score < 65**: **EMERGENT / EXPERIMENTAL** (Sizing reduzido a 25%)
- **Alpha Score ≥ 65**: **AUTHORIZE EXECUTION** (Full Position Sizing)

---

## 🧪 4. PLATAFORMA DE EXPERIMENTOS MULTIVERSO (EXP-001 A EXP-005)

Para determinar a alocação de portfólio ótima (em vez de proibir `SHORT` arbitrariamente), serão implantados 5 espaços isolados no Hugging Face:

- **`EXP-001 (Pure Long)`**: Somente posições `LONG` em todas as altcoins e crypto.
- **`EXP-002 (Long + BTC Short)`**: Posições `LONG` + `BTC/USD SHORT` (PF 1.20).
- **`EXP-003 (Baseline All Shorts)`**: Todos os `SHORTS` habilitados.
- **`EXP-004 (Filtered ETH Short)`**: `ETH/USD SHORT` condicionado a `AlphaScore >= 75`.
- **`EXP-005 (Filtered SOL Short)`**: `SOL/USD SHORT` condicionado a `AlphaScore >= 75`.

---

## 🛠️ 5. ROADMAP DE IMPLEMENTAÇÃO DO CORE V4

1. **`TradeGenealogyEngine.js`**: Extrator de Trade DNA e agrupador de famílias cromossômicas.
2. **`MarketDNAEngine.js`**: Vectorizer de estado de mercado e regime.
3. **`FailureIntelligenceEngine.js`**: Catalogador de assinaturas tóxicas e vetos dinâmicos.
4. **`AlphaScoreEngine.js`**: Calculador do score escalar composto 0-100.
5. **`TruthKernelV2.js`**: Motor de portfólio constitucional reescrito.
