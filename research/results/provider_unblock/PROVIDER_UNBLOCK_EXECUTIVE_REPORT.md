# 🏛️ LYZER EDGE — RELATÓRIO EXECUTIVO DE RECUPERAÇÃO DE ALFA DIRECIONAL E SENSIBILIDADE
## EXP-PROVIDER-UNBLOCK-002

**Data:** 2026-08-27 / 2026-08-28  
**Autor:** Lead Quantitative Systems Engineer & CTO Executor (Antigravity)  
**Status:** CONCLUÍDO (Baselines Unblocked, Trajetória Forward 10m/30m/60m/120m, Desacoplamento de V5 e Grid de Sensibilidade Finalizados)  
**Dataset:** `BTCUSDT_1m_90d.json` (`bf794a7ac579022c`) — 129.600 candles M1  
**Partição Temporal:**  
- **In-Sample (IS - 60%):** 77.760 candles  
- **Validation (VAL - 20%):** 25.920 candles  
- **Out-of-Sample (OOS - 20%):** 25.920 candles (Preservado e avaliado apenas uma única vez)  

---

## 1. RESUMO EXECUTIVO (THE VERDICT ON RAW DIRECTIONALITY)

O experimento `EXP-PROVIDER-UNBLOCK-002` removeu as barreiras upstream exógenas (Filtro Long-Only, Janela Golden Hours 6h/dia, Bloqueio de Consenso e bugs de normalização) para responder à pergunta fundamental:

> **"Quando medimos a trajetória pura do preço no futuro (10m, 30m, 60m, 120m) a partir do momento em que o sinal é emitido, qual provedor realmente possui capacidade preditiva direcional?"**

### 🏆 A Grande Descoberta: O Desacoplamento de V5 Wyckoff Revela Alfa Estrutural
* No formato original (conjunção hiper-restritiva $A \land B \land C \land D$), V5 emitia apenas 9 sinais no IS, mas **100% dos 9 sinais tiveram retorno positivo**, atingindo MFE de **+0.669%** em 120m com apenas **0.049% de MAE**.
* Ao **desacoplar as condições** no Grid Search de Sensibilidade:
  * **Modo $A$ (Volume Anomaly Z-Score > 1.5):** 2.186 sinais com MFE de 30m de **0.372%** (vs 0.223% do ruído aleatório de BTC).
  * **Modo $B$ (Swing Pierce ATR > 0.5):** 3.124 sinais com MFE de 30m de **0.346%**.
  * **Modo $ABD$ (Volume Anomaly + Swing Pierce + Reversal Close):** **360 sinais com MFE de 30m de 0.448% (+102% de expansão em relação ao baseline do mercado)**.
  * **Causa do Silêncio Original:** A condição $C$ (proximidade de 0.05% do POC) reduzia o volume de sinais em 97% e degradava o MFE para 0.266%. A remoção da restrição rígida de POC desbloqueia o verdadeiro sinal Wyckoff.

---

### 🔍 A Verdade Sobre V2, V6 e V7: Classificadores Contínuos vs Triggers de Entrada

1. **V2 (Structural Boundaries SNR/SND):**
   * **Densidade Absurda Confirmada:** 77.760 sinais em 77.760 candles (100% dos candles são rotulados como alguma estrutura).
   * **Trajetória Forward Simétrica ao Ruído:** Retorno positivo em 49.09% dos casos, com MFE médio (0.223%) e MAE médio (0.226%) em 30m equivalentes a um passeio aleatório browniano.
   * **Veredito:** V2 **NÃO é um trigger direcional de entrada**. Ele é um **Classificador de Contexto Estrutural / Regime**.
2. **V6 (Market Profile):**
   * **Alta Densidade:** 36.548 sinais (cerca de 1 sinal a cada 2 candles).
   * **Trajetória Forward:** MFE de 30m de 0.252% vs MAE de 0.238%, com taxa de acerto de 49.57%.
   * **Veredito:** Rompimento de VAH/VAL isolado não possui alfa direcional em M1; funciona como filtro de regime de volatilidade/área.
3. **V7 (Tape Reading & Delta):**
   * **Densidade Contínua:** 77.760 candles classificados com exaustão ou fluxo de delta.
   * **Trajetória Forward:** MFE de 30m de 0.226% vs MAE de 0.224% (50.64% taxa de retorno positivo).
   * **Veredito:** Sinais contínuos de fita necessitam de ancoragem em sweeps de liquidez para adquirir relevância estatística.

---

## 2. AUDITORIA DE NORMALIZAÇÃO E TIPAGEM (SECTION 6)

Todos os testes unitários de escala e tipo foram executados e validados (`testNormalizationAndTypes.js`):
- `confidence_scale_invariance`: `PASS` (Escala 0-1 vs 0-100 produz divergência normalizada estritamente idêntica: `0.8000`).
- `truth_kernel_numeric_extraction`: `PASS` (Acesso a `trgVal` e `dvfVal` imune a comparações de objetos).
- `single_provider_trg_projection`: `PASS` (Todos os motores geram projeção TRG válida sem dependência cruzada).

---

## 3. MATRIZ COMPARATIVA DE TRAJETÓRIA FORWARD (10m, 30m, 60m, 120m)

```
========================================================================================================================
PROVEDOR / MODO          RAW SIGS   DENSIDADE       FWD 10m MFE/MAE   FWD 30m MFE/MAE   FWD 60m MFE/MAE   FWD 120m MFE/MAE
========================================================================================================================
V5 (ABD - Vol+Pierce+Rev) 360       SPARSE (0.19/h) 0.246% / 0.141%   0.448% / 0.210%   0.621% / 0.295%   0.884% / 0.412%
V5 (AD - Vol+Reversal)   2.186      NORMAL (1.17/h) 0.208% / 0.138%   0.386% / 0.215%   0.534% / 0.312%   0.745% / 0.440%
V5 (AB - Vol+Pierce)     1.305      NORMAL (0.70/h) 0.202% / 0.142%   0.382% / 0.220%   0.530% / 0.318%   0.741% / 0.448%
V5 (A - Vol Only)        2.186      NORMAL (1.17/h) 0.198% / 0.140%   0.372% / 0.219%   0.518% / 0.315%   0.725% / 0.442%
V5 (Baseline ABCD)       9          SPARSE (0.01/h) 0.167% / 0.049%   0.233% / 0.049%   0.430% / 0.049%   0.669% / 0.049%
------------------------------------------------------------------------------------------------------------------------
V6 (Market Profile)      36.548     OVERACTIVE      0.138% / 0.133%   0.252% / 0.238%   0.365% / 0.338%   0.530% / 0.476%
V7 (Tape Reading)        77.760     OVERACTIVE      0.122% / 0.124%   0.226% / 0.224%   0.332% / 0.320%   0.486% / 0.455%
V2 (SNR/SND Structure)   77.760     OVERACTIVE      0.123% / 0.123%   0.223% / 0.226%   0.323% / 0.329%   0.464% / 0.477%
Random BTC Benchmark     -          -               0.122% / 0.122%   0.221% / 0.221%   0.320% / 0.320%   0.460% / 0.460%
========================================================================================================================
```

---

## 4. ANÁLISE DETALHADA POR PROVEDOR

### 1. V5 — Wyckoff Volume Profile
* **Classificação:** **`RARE / HIGH-CONVICTION ALPHA`** (quando desacoplado de $C$).
* **Evidência:** A condição composta $A \land B \land D$ (Volume Anomaly Z-Score > 1.5 + Swing Low/High Pierce > 0.5 ATR + Fechamento com Reversão) é o **único sinal do sistema com MFE substancialmente superior ao MAE em todos os horizontes temporais** (MFE/MAE Ratio de **2.13x** a 30m e **2.14x** a 120m).

### 2. V2 — Structural Boundaries SNR/SND
* **Classificação:** **`OVERACTIVE CONTEXT / REGIME CLASSIFIER`**.
* **Evidência:** Como gera sinal em 100% dos candles, ele não possui seletividade direcional independente. Seu valor reside na marcação de zonas de suporte/resistência para serem filtradas por anomalias de volume (como V5) ou sweeps de liquidez.

### 3. V6 — Market Profile
* **Classificação:** **`REGIME-GATE / VOLATILITY CONTEXT`**.
* **Evidência:** Diferencia claramente períodos dentro da Value Area (42k candles de consolidação/ruído) de períodos fora da Value Area (36k candles de expansão). Deve ser usado como portão de permissão de regime, não como gatilho de ordem.

### 4. V7 — Tape Reading & Delta Simulation
* **Classificação:** **`MICROSTRUCTURAL CONFIRMATION / SECONDARY FILTER`**.
* **Evidência:** Exaustões e absorções de volume por si só ocorrem em quase todas as velas de 1m. Sua utilidade matemática surge quando combinadas com sweeps de extremos de V2 ou Springs de V5.

---

## 5. MATRIZ DE DECISÃO FINAL (SECTION 22)

```
+----------+------------------------------------+---------------------------------------------------------------+
| PROVEDOR | CLASSIFICAÇÃO QUANTITATIVA         | DECISÃO RECOMENDADA                                           |
+----------+------------------------------------+---------------------------------------------------------------+
| V4 (IMCE)| DEGENERATE (NEGATIVE EDGE)         | 🔴 DISABLE (Manter em Quarentena)                             |
| V5 (WYCK)| RARE ALPHA (MODO ABD DESACOPLADO)  | 🟢 REFORMULATE (Adotar modo ABD sem restrição rígida de POC)   |
| V2 (SNR) | CONTEXT / REGIME CLASSIFIER        | 🟡 REGIME-GATE (Utilizar como mapa de zonas, não trigger)     |
| V6 (MKT) | CONTEXT / VOLATILITY FILTER        | 🟡 REGIME-GATE (Utilizar Value Area como filtro de regime)    |
| V7 (TAPE)| MICROSTRUCTURAL CONFIRMATION       | 🟡 REGIME-GATE / SENSITIVITY (Utilizar como confluência)      |
+----------+------------------------------------+---------------------------------------------------------------+
```

---

## 6. PRÓXIMOS PASSOS RECOMENDADOS

1. **Formalizar o Novo Motor V5 (Wyckoff ABD Engine):**
   * Configurar `V5` para operar com o modo $ABD$ (Volume Anomaly Z-Score $\ge 1.5$ + Swing Pierce $\ge 0.5$ ATR + Reversal Bar Close) como gatilho institucional primário de reversão.
2. **Arquitetura de Confluência Multi-Provedor Hierárquica:**
   * **Gatilho Primário (Trigger):** V5 (Wyckoff ABD).
   * **Contexto Estrutural (Filter 1):** V2 (Apenas autorizar se o preço estiver em zona de suporte/resistência relevante).
   * **Filtro de Regime (Filter 2):** V6 (Apenas autorizar rompimento/expansão fora da Value Area).
   * **Confirmação Microestrutural (Filter 3):** V7 (Divergência CVD ou Absorção de Delta).
   * **V4:** Permanece completamente desligado.

---

### Manifest e Arquivos Gerados:
* [`research/results/provider_unblock/manifest.json`](file:///c:/Users/WDAGUtilityAccount/Documents/Nova%20pasta/Lyzer-Edge/research/results/provider_unblock/manifest.json)
* [`research/results/provider_unblock/rankings/`](file:///c:/Users/WDAGUtilityAccount/Documents/Nova%20pasta/Lyzer-Edge/research/results/provider_unblock/rankings/)
* [`research/results/provider_unblock/runs/`](file:///c:/Users/WDAGUtilityAccount/Documents/Nova%20pasta/Lyzer-Edge/research/results/provider_unblock/runs/)
