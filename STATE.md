# 🏛️ LYZER EDGE — RESEARCH STATE & EXECUTIVE HANDOFF

**Data do Registro:** 2026-08-28T08:55:00Z  
**Autoridade:** Senior CTO & Executive Engineering Director  
**Status do Repositório:** Track A Blindado / Track B Batch 007 Concluído  
**Dataset Base:** 32.016 Hourly Candles BTCUSDT (2023–2026) | SHA-256: `5da8350f0546641485d33abe23414ac12deb88cc7721647d7fed9c1223f2dfaf`

---

## 1. ESTADO DOS TRACKS DE GOVERNANÇA

### 🔒 Track A — Confirmatório V5 (Shadow Lockbox)
- **Status:** **FROZEN, LOCKED, HASHED, 100% UNTOUCHED**.
- **Configuração:** `FROZEN_V5_CONFIG` em [`research/orchestrator/frozenConfig.js`](file:///c:/Users/WDAGUtilityAccount/Documents/Nova%20pasta/Lyzer-Edge/research/orchestrator/frozenConfig.js).
- **Shadow Lockbox:** [`research/results/v5_confirmatory/V5_SHADOW_LOCKBOX.json`](file:///c:/Users/WDAGUtilityAccount/Documents/Nova%20pasta/Lyzer-Edge/research/results/v5_confirmatory/V5_SHADOW_LOCKBOX.json).
- **Reconciliação Contábil:** $N=25$ trades, Net +\$78,42, Profit Factor 1.90, Accounting Tolerance $< 10^{-6}$.
- **Próximo Milestone:** Aguardando $N=50$ para liberação de micro-alocação de capital real.

### 🔬 Track B — Fábrica de Descoberta & Pesquisa Causal
- **Status:** Batches 001 a 007 concluídos com relatórios markdown e manifestos JSON formais.
- **Candidato Líder:** `V8.0-DISPLACEMENT-FVG-LONG` (Pré-registrado e auditado no Batch 007).

---

## 2. TRAJETÓRIA CIENTÍFICA CONSOLIDADA (BATCH 001 → BATCH 007)

```text
========================================================================================================================
BATCH        OBJETIVO FORENSE                    RESULTADO CHAVE                            STATUS DE GOVERNANÇA
========================================================================================================================
Batch 001    Busca ampla (3.000 hipóteses)       IS alto (PF 1.90) colapsou no OOS          🔴 100% ILUSÕES DESCARTADAS
Batch 002    Busca estrutural (3.000 hipóteses)  Cluster BRK-FAIL (PF 1.15) emergiu         🟡 PROMOVIDO A AUDITORIA
Track C      Auditoria Adversarial do BRK-FAIL   POC deslocado ±10% não afetou os trades    🔴 ILUSÃO C5 DESMASCARADA
Batch 003    Causal-First Discovery (5 Famílias) Stage 0 destruiu 4 famílias em 16s;         🟡 P3 ESTRUTURAL IDENTIFICADO
                                                 P3 (Disp+BOS+FVG) teve deriva positiva (+0.10%)
Batch 004    Replicação Causal de P3             Decomposição de 7 estados: BOS é antagônico;🔴 P3 ARQUIVADO / D+FVG ISOLADO
                                                 Sinergia real reside em A+C (Disp+FVG)
Batch 005    Causalidade do Displacement         Regressão OLS: β_disp = +0.1568% (p=0.007) 🟢 INFORMAÇÃO CAUSAL COMPROVADA
                                                 Dose-resposta monotônica: Spearman ρ = 0.943
Batch 006    Operacionalização do Displacement   Market-on-Close > Pullback; D+FVG: PF 1.86 🟢 CADEIA OPERACIONAL MAPEADA
                                                 Bifurcação: Bull Continuação vs Bear Dip-Buy
Batch 007    Pré-registro & WFA 10 Janelas V8.0  WFA: 6/10 positivas (PF 2.70, mediano 1.79) 🟢 CANDIDATO V8.0 PRÉ-REGISTRADO
                                                 Permutação Nula 10k: p = 0.0096 (< 0.01)
========================================================================================================================
```

---

## 3. AS DESCOBERTAS CIENTÍFICAS DEFINITIVAS

### ❌ 1. O que foi Formalmente Rejeitado e Arquivado:
1. **Reversão ao POC em Falhas de Leilão:** Testado em 2.537 eventos no Batch 003. Apenas 37,5% dos preços convergiram para o POC (62,5% divergiram).
2. **SMC BOS de Swing Pivot:** Introduz 5 candles de latência obrigatória, fazendo a entrada ocorrer no topo da expansão e destruindo a relação risco/retorno.
3. **Ordens Limite de Pullback (25% / 50% / Reteste FVG):** Sofrem de **seleção adversa** severa. Os melhores impulsos nunca recuam, enquanto os que recuam são trades fracos ou em falha.
4. **Continuação de Queda em Bitcoin:** Displacements de baixa não sustentam momentum além de 4h; a partir de 6h sofrem forte absorção e reversão para cima.

### 💎 2. O que foi Empiricamente Comprovado:
1. **Displacement Carrega Informação Causal Residual:** Mesmo após controlar volatilidade (ATR), alinhamento de tendência (EMA) e sessões de negociação, o Displacement adiciona $+0,1568\%$ por evento com significância estatística ($p = 0,00709$).
2. **Monotonicidade Perfeita ($\rho = 0,943$):** O retorno futuro cresce monotonicamente com a magnitude do corpo da vela até atingir saturação em $3,0\text{ ATR}$.
3. **Sinergia Causal $D + \text{FVG}$:** O FVG atua como validador de desequilíbrio de liquidez imediato, elevando a expectativa líquida para **$+0,9015\%$ por trade** e o **Profit Factor para $2,70$** sob custos de 0,08% taker.
4. **Resistência à Fricção:** Tolera até **$98\text{ bps}$ ($+0,9815\%$)** de slippage/taxas roundtrip antes de atingir breakeven.
5. **Significância contra o Acaso ($p < 0.01$):** O teste de permutação de Monte Carlo em 10.000 iterações obteve $p = 0,0096$.

---

## 4. ESPECIFICAÇÃO CONGELADA DO CANDIDATO V8.0

```text
========================================================================================================================
PARÂMETRO OPERACIONAL                 VALOR PRÉ-REGISTRADO                 RATIONALE CAUSAL
========================================================================================================================
Identificador                         V8.0-DISPLACEMENT-FVG-LONG           Isolamento da hipótese de continuação bullish
Direção                               LONG ONLY                            Assimetria direcional comprovada no BTC
Gatilho de Entrada                    Body / ATR >= 2.0 & Body/Range >= 0.65 Expansão limpa de momentum (sem pavios gigantes)
Filtro Estrutural                     Bullish FVG no mesmo evento          Desequilíbrio volumétrico e de liquidez ativo
Filtro de Regime                      EMA20 > EMA50 (1.002)                Elimina o drawdown observado em CHOPPY_RANGE
Modelo de Execução                    Market on Close (Next Bar Open)      Elimina a seleção adversa de ordens limite
Horizonte Base                        12 Barras (12 Horas)                 Pico de expansão antes da saturação
Taxa Padrão Taker                     0.08% por rodada (0.0008)            Custo realista de exchange institucional
========================================================================================================================
```

---

## 5. MAPA DE ARTEFATOS E ARQUIVOS DO PROJETO

### 📁 Códigos de Pesquisa & Engines
- [`research/orchestrator/causalSignalEngine.js`](file:///c:/Users/WDAGUtilityAccount/Documents/Nova%20pasta/Lyzer-Edge/research/orchestrator/causalSignalEngine.js) — Engine modular multivariada (OpenMobius + MarketProfile V6 + TapeReading V7).
- [`research/orchestrator/causalDiscoveryBatch003.js`](file:///c:/Users/WDAGUtilityAccount/Documents/Nova%20pasta/Lyzer-Edge/research/orchestrator/causalDiscoveryBatch003.js) — Orquestrador de 6 estágios do Batch 003.
- [`research/orchestrator/batch004StructuralReplication.js`](file:///c:/Users/WDAGUtilityAccount/Documents/Nova%20pasta/Lyzer-Edge/research/orchestrator/batch004StructuralReplication.js) — Suite de 10 Gates do Batch 004.
- [`research/orchestrator/batch005DisplacementCausality.js`](file:///c:/Users/WDAGUtilityAccount/Documents/Nova%20pasta/Lyzer-Edge/research/orchestrator/batch005DisplacementCausality.js) — Econometria residual OLS e curva de dose-resposta do Batch 005.
- [`research/orchestrator/batch006OperationalDisplacement.js`](file:///c:/Users/WDAGUtilityAccount/Documents/Nova%20pasta/Lyzer-Edge/research/orchestrator/batch006OperationalDisplacement.js) — Modelos de execução e bifurcação direcional do Batch 006.
- [`research/orchestrator/batch007V8PreRegistrationWFA.js`](file:///c:/Users/WDAGUtilityAccount/Documents/Nova%20pasta/Lyzer-Edge/research/orchestrator/batch007V8PreRegistrationWFA.js) — WFA de 10 janelas, estabilidade de limiar e teste de permutação 10k do Batch 007.

### 📄 Relatórios Oficiais e Manifestos Forenses
- [`research/results/v5_confirmatory/BATCH_003_CAUSAL_DISCOVERY_REPORT.md`](file:///c:/Users/WDAGUtilityAccount/Documents/Nova%20pasta/Lyzer-Edge/research/results/v5_confirmatory/BATCH_003_CAUSAL_DISCOVERY_REPORT.md)
- [`research/results/v5_confirmatory/BATCH_004_STRUCTURAL_REPLICATION_REPORT.md`](file:///c:/Users/WDAGUtilityAccount/Documents/Nova%20pasta/Lyzer-Edge/research/results/v5_confirmatory/BATCH_004_STRUCTURAL_REPLICATION_REPORT.md)
- [`research/results/v5_confirmatory/BATCH_005_DISPLACEMENT_CAUSALITY_REPORT.md`](file:///c:/Users/WDAGUtilityAccount/Documents/Nova%20pasta/Lyzer-Edge/research/results/v5_confirmatory/BATCH_005_DISPLACEMENT_CAUSALITY_REPORT.md)
- [`research/results/v5_confirmatory/BATCH_006_OPERATIONAL_DISPLACEMENT_REPORT.md`](file:///c:/Users/WDAGUtilityAccount/Documents/Nova%20pasta/Lyzer-Edge/research/results/v5_confirmatory/BATCH_006_OPERATIONAL_DISPLACEMENT_REPORT.md)
- [`research/results/v5_confirmatory/BATCH_007_V8_WFA_REPORT.md`](file:///c:/Users/WDAGUtilityAccount/Documents/Nova%20pasta/Lyzer-Edge/research/results/v5_confirmatory/BATCH_007_V8_WFA_REPORT.md)

---

## 6. DIRETRIZES IMEDIATAS PARA A PRÓXIMA SESSÃO

Quando o próximo agente assumir o contexto, ele deve escolher ou aguardar a diretriz executiva para:

1. **Frente A (Batch 008 — Regras de Saída Estruturais para V8.0):**
   - Investigar saídas com base em tempo/volatilidade (ex: saída antecipada se após 4h o candle estiver negativo, protegendo as 4 janelas de drawdown do WFA) **sem fazer grid search de TP/SL**.
2. **Frente B (Batch 008 — Formalização do Candidato V8.1-DIPBUY):**
   - Isolar e pré-registrar o mecanismo de compra de fundo após Bearish Displacement ($t+6 \to t+72$), que demonstrou $60,3\%$ de taxa de acerto no Batch 006.
3. **Frente C (Monitoramento de Track A):**
   - Continuar a gravação a frio do Shadow V5 rumo a $N=50$.
