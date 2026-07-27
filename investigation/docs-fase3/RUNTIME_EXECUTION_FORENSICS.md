# RUNTIME EXECUTION FORENSICS: `processCandle()`

**Analyst**: Runtime Execution Forensic Analyst
**Date**: 2026-07-27
**Target**: `streamEngine.js:483-915` (432 lines)

---

## 1. EXECUTION MAP — Árvore de Chamadas Completa

```
processCandle(candle, index)                             [483-915]
│
├── 1. RECONSTRUCT REALITY (4 provedores heterogêneos)   [487-490]
│   ├── this.v1.reconstruct(this.mtfCandles)             [487] → v1_smc_ict.js
│   ├── this.v2.reconstruct(this.mtfCandles)             [488] → v2_snd_snr.js
│   ├── this.v3.reconstruct(this.mtfCandles)             [489] → v3_momentum_rsi.js
│   └── this.v4.reconstruct(this.mtfCandles)             [490] → v4_imce.js
│
├── 1b. SMC LIQUIDITY + STRUCTURE                        [493-495]
│   └── this.smcFacade.evaluate(this.mtfCandles)         [493]
│       ├── → smcResult.structure                        [494] (não usado depois de [829]?)
│       └── → smcResult.liquidity                        [495] (zones usado em [828])
│
├── 1c. S/R LEVELS (V2 fallback)                         [498-510]
│   └── loop local max/min sobre v2Candles[-10:-1]       [501-505]
│       → srLevels = [{RESISTANCE, localMax}, {SUPPORT, localMin}]
│
├── 2. CSRL PHASE                                         [513-527]
│   ├── this.scaleNormalizer.alignScales(mtfCandles)     [514]
│   ├── this.cstg.buildTopology(alignedTensors)           [515]
│   ├── this.invariantExtractor.extract(topology)         [516]
│   └── this.divergenceDetector.calculateDivergence(topo, inv) [519-526]
│       │   └── fallback: .detect(topology) se .calculateDivergence não for fn [521-522]
│       └── SDS → sds (escalar)                           [520]
│
├── 2a. DISABLED PROVIDERS MASK                           [529-532]
│   └── providers = { v1, v2, v3, v4 } com signal='flat'/confidence=0 para disabled
│
├── 2b. DUAL REALITY DIVERGENCE (LHDS)                   [542-545]
│   ├── if (this.dualMonitor && candle.timestamp)         [543] → SEMPRE true
│   └── await this.dualMonitor.calculateDivergence(symbol, ts, mtfCandles) [544]
│       └── lhds = número (0.0-1.0)
│
├── 3. TRUTH KERNEL EVALUATION                            [548]
│   └── this.truthKernel.evaluate(providers, micro)      [548]
│       ├── this.rl.evaluate(v1, v2, v3, v4, micro)      [kernel.js:36]
│       │   ├── extractDivergence(v1..v4)                 [residualization.js:95]
│       │   │   → dvf = { divergence, tension, isConsensus }
│       │   └── projectTailRisk(dvf, micro)               [residualization.js:96]
│       │       → trg = { trg, divergenceRaw, destroyedConsensus }
│       ├── this.ett.evaluate(trg)                        [kernel.js:39]
│       │   → eef = false (se consensus destroyed ou trg < threshold)
│       │   → eef = true  (se trg >= threshold)
│       ├── OCL: lhds > lhdsVetoLimit? → VETO + eef=false [kernel.js:46-49]
│       └── OCL: sds > 0.7 && trg >= ontologicalCollapseTrg? → VETO [kernel.js:56-59]
│       → kernelResult = { dvf, tension, isConsensus, trg, eef, reason_codes,
│                          epistemic_authority, raw_metrics }
│
├── 4. COURT UPDATE (TODO TICK)                           [551-554]
│   ├── this.court.cclist.evaluateStress(trg, dvf)       [552]
│   │   → se dvf < dvfFloor, stress += stressAccumulation
│   │   → se trg > 2.0, stress = 1.0
│   │   → se isLethalIllusion (stress >= lethalIllusionLimit)
│   └── this.court.mol.evaluateState(kernelResult, { eef }) [553]
│       (MOL VETO/RECOVERY logic — ver §2 Dead Branches)
│
├── 5. SPECTROGRAM UI UPDATE (LIVE/TESTNET only)          [557-560]
│   └── this.ui.render(lhds, epistemic_authority, reason) [559]
│
├── 6. BASE SIGNAL CONSTRUCTION                           [563-592]
│   └── combinedSignal = v4 > v1 > v2 > v3 (priority)    [563-572]
│   → baseSignal = { signal, confidence, regime, reasons, explanationText,
│                    tradeDna, Z_t }
│
├── 7. ACTIVE POSITION CHECK & CLOSE                      [599-702]
│   if (this.activePosition)                              [599]
│   ├── LONG: SL (candle.low ≤ SL) → TP (high ≥ TP) → signal=no-go → conf<50 [606-621]
│   │   └── BRANCH MORTO: kernelResult.signal === 'no-go'     [614] ← SEMPRE false
│   │   └── BRANCH MORTO: kernelResult.confidence < 50        [618] ← SEMPRE false
│   ├── SHORT: SL (high ≥ SL) → TP (low ≤ TP) → signal=go → conf<50 [624-640]
│   │   └── BRANCH MORTO: kernelResult.signal === 'go'        [632] ← SEMPRE false
│   │   └── BRANCH MORTO: kernelResult.confidence < 50        [636] ← SEMPRE false
│   ├── if (closed)                                         [643]
│   │   ├── computeTradeEV(resolvedTrade, ...)              [668]
│   │   ├── this.tradeHistory.push(tradeWithEv)             [670]
│   │   ├── sendTelegramAlert(...) (fire-and-forget)        [674-675]
│   │   ├── if (shadowTrading && realityGapMonitor) log     [677-679]
│   │   ├── if (this.execution) placeOrder(SELL/BUY)        [682-697]
│   │   ├── this.activePosition = null                      [699]
│   │   └── this.emit('state_changed')                      [700]
│   └── if (!closed) → continua para §8
│
├── 8. NEW TRADE CHECK                                      [705-813]
│   ├── isStabilized = (now - bootTime) >= stabilizationWindowMs [705]
│   ├── if (!isStabilized && eef && !activePosition)        [707]
│   │   └── log stabilization message (throttled 30s)        [709-711]
│   ├── else if (isStabilized && eef && !activePosition)    [713]
│   │   ├── direction = LONG se signal='go'/'long' senão SHORT [714]
│   │   ├── court.requestPermission('EXECUTE_TRADE', ...)   [716]
│   │   │   └── Court flow (court.js:39-94):
│   │   │       ├── Confidence/Prediction check (SEMPRE passa) [41-45]
│   │   │       ├── MOL evaluateState (SEMPRE canExecute)   [49] ← BUG
│   │   │       ├── C-CLIST evaluateStress                  [66]
│   │   │       │   └── if isLethalIllusion → VETO          [68-73]
│   │   │       ├── EEF check                               [76-82]
│   │   │       │   └── VETO_NO_SURVIVAL_NECESSITY ← NUNCA atinge (caller já filtr) [79]
│   │   │       ├── ConstraintEngine.evaluate               [85]
│   │   │       │   └── MAX_DRAWDOWN/SIZE/EDGE_RIDING
│   │   │       └── PermissionToken                         [88]
│   │   ├── if (granted) → activePosition criado            [721-798]
│   │   │   └── quantidade = baseQty * (1-stress) * diversity * confidence [729]
│   │   │   └── microAtr = ATR-14 das últimas velas         [734-743]
│   │   │   └── SL = 0.25% (fallback), TP = 0.50% (1:2)    [746-747]
│   │   │   └── Se ATR > 0: SL = max(0.15%, min(0.4%, atrPct*1.5)) [751]
│   │   │   └── Se SCALP_SL_PCT/SCALP_TP_PCT: override     [755-756]
│   │   │   → simulatedTrade = open                         [782-795]
│   │   └── if (!granted)                                   [799-812]
│   │       → simulatedTrade = rejected                      [801-811]
│   └── (nenhum else: se eef=false, skip)
│
├── 9. ECO ENGINE STEP                                      [816]
│   └── this.ecoEngine.step(this.candles, baseSignal)       [816]
│       → arlReport
│
├── 10. PAYLOAD CONSTRUCTION                                [819-895]
│   └── payload = { type, symbol, index, mode, ..., trade, arl }
│   └── Nota: trade usa TERNÁRIO ANINHADO [870-893]
│       → activePosition ? open : closedTradePayload ? closed : simulatedTrade.rejected ? rejected : null
│
├── 11. this.emit('arl', payload)                           [897]
│
├── 12. LIVE ORDER EXECUTION                                [901-914]
│   └── if (execution && simulatedTrade?.governanceDecision==='ALLOW' && activePosition) [901]
│       ├── if (LIVE && dailyCapitalUsed + cost > maxDailyCapital) → RESET position + return [902-908]
│       └── this.handleExecution(direction, candle, qty)    [913]
│           └── async: placeOrder(BUY/SELL)                  [919-920]
│
└── recordTickDuration(...)                                 [898]
```

---

## 2. BRANCHES MORTOS

### 2.1 `kernelResult.signal` — Linhas 614 e 632 (**NUNCA executam**)

O objeto retornado por `truthKernel.evaluate()` (kernel.js:66-80) **não possui** campo `signal`:

```javascript
// kernel.js:66-80 — return real
{
  dvf, tension, isConsensus, trg, eef,
  reason_codes: [reason],
  epistemic_authority,
  raw_metrics: { ... }
}
// NÃO TEM: signal, confidence
```

Portanto:
- `streamEngine.js:614`: `kernelResult.signal === 'no-go'` → `undefined === 'no-go'` → **sempre `false`**
- `streamEngine.js:632`: `kernelResult.signal === 'go'` → `undefined === 'go'` → **sempre `false`**

Estes dois branches de saída de posição (REVERSAL_TO_SHORT e REVERSAL_TO_LONG) são **estruturalmente inalcançáveis**.

### 2.2 `kernelResult.confidence` — Linhas 618 e 636 (**NUNCA executam**)

Mesmo problema: `kernelResult` não tem campo `confidence`:
- `streamEngine.js:618`: `kernelResult.confidence < 50` → `undefined < 50` → **sempre `false`**
- `streamEngine.js:636`: idem

Os branches LOW_CONFIDENCE são **estruturalmente inalcançáveis**.

**Impacto**: Um ativo position (LONG ou SHORT) só pode ser fechado via SL/TP. Os mecanismos de "reversal" e "low confidence" são letra morta. Isto também significa que o `if (closed)` na linha 643 **nunca** é ativado por reversal ou low confidence, apenas por SL/TP. Se o SL/TP não for atingido, a posição permanece aberta **indefinidamente**, mesmo que o kernel mude de sinal.

### 2.3 MOL — `epistemic_authority` Silenciosamente Perdido (**VETO/RECOVERY NUNCA ocorrem**)

Em `court.js:49`:
```javascript
const molStatus = this.mol.evaluateState(rawState, requestPayload);
```

A assinatura de `mol.evaluateState(rawState, kernelResult)` (mol.js:21):
- `rawState` (MOL param1) = `rawState` (court var) = o `kernelResult` completo
- `kernelResult` (MOL param2) = `requestPayload` (court var) = `{ eef, reason }`

Em mol.js:22:
```javascript
const authority = kernelResult.epistemic_authority; // ← kernelResult é o requestPayload!
```

`requestPayload` = `{ eef: kernelResult.eef, reason: kernelResult.reason_codes[0] }` **não tem** `epistemic_authority`. Resultado:
- `authority` = `undefined`
- `isKernelVetoing = (undefined === 'VETO')` = **sempre `false`**

A MOL **sempre** retorna o path default (mol.js:79-80):
```javascript
return { canExecute: true, molState: this.state, doi: 0, scl: 0 };
```

**Impacto**: Todo o estado VETO/RECOVERY da MOL (mol.js:25-77) é **código morto** nesta cadeia de chamadas. A MOL nunca bloqueia execução. Os parâmetros `MOL_SCL_THRESHOLD` e `MOL_STABILIZATION_WINDOW_MS` relacionados à lógica de recovery são ignorados.

**Correção sugerida**: `court.js:49` deveria ser `this.mol.evaluateState(rawState, rawState)` (passando `kernelResult` como segundo argumento).

### 2.4 Court — `VETO_NO_SURVIVAL_NECESSITY` (court.js:76-82) (**NUNCA atinge do caller**)

Em court.js:76:
```javascript
if (!requestPayload.eef) {
```

Na linha 716 do streamEngine, o court só é chamado quando `kernelResult.eef` é `true`:
```javascript
} else if (isStabilized && kernelResult.eef && !this.activePosition) {
    const permissionToken = this.court.requestPermission(...);
```

Portanto `requestPayload.eef` é sempre `true` quando chega ao court vindo de `processCandle()`. O branch `VETO_NO_SURVIVAL_NECESSITY` é **estruturalmente inalcançável** deste call site.

### 2.5 Court — Confidence/Prediction Check (court.js:41-45) (**SEMPRE passa**)

```javascript
if (rawState.confidence !== undefined || requestPayload.prediction !== undefined) {
```

- `kernelResult.confidence` não existe → `undefined !== undefined` → `false`
- `requestPayload.prediction` não existe → `undefined !== undefined` → `false`

Esta guarda é estruturalmente inerte. Só seria ativada se chamassem o court com dados diferentes.

### 2.6 ConstraintEngine — `currentDrawdown` e `requestedPositionSize` (**SEMPRE passam**)

Em constraintEngine.js:29-35:
```javascript
if (state.currentDrawdown >= this.CONSTRAINTS.HARD.MAX_DAILY_DRAWDOWN) { ... }
if (state.requestedPositionSize > this.CONSTRAINTS.HARD.MAX_POSITION_SIZE) { ... }
```

`state` = `kernelResult`, que **não tem** `currentDrawdown` nem `requestedPositionSize`:
- `undefined >= 0.05` → `false`
- `undefined > 1.0` → `false`

Os únicos checks que podem falhar são:
1. Edge Riding (`ledger.getNearMissCount('drawdown') >= 5`)
2. Parameter Mutation (sempre passa porque ninguém muta o frozen object)

### 2.7 `if (this.dualMonitor && candle.timestamp)` — Linha 543 (**SEMPRE true**)

- `this.dualMonitor = new DualRealityMonitor()` no construtor (linha 87) → sempre truthy
- `candle.timestamp` é sempre setado (synthetic: `Date.now()`, live: timestamp do WS)

O branch `else` implícito (`lhds` permanece 0.0) nunca ocorre.

### 2.8 `shadowTradingEnabled && this.realityGapMonitor` (linhas 677 e 464)

`this.realityGapMonitor` só é instanciado se `shadowTradingEnabled === true` (linha 90-92). Como a condição do `if` verifica ambos, o `realityGapMonitor` sempre existe quando `shadowTradingEnabled` é true. A segunda condição é redundante.

---

## 3. FLUXO DE DADOS — O Objeto `reality` Entre Camadas

### 3.1 Entrada do `processCandle()`

```
{ open, high, low, close, volume, timestamp, datetime, closed? }
```

### 3.2 Narrativas dos Provedores (linhas 487-490)

Cada `v*.reconstruct()` retorna:
```
v1Narrative: { signal, confidence, narrative, source }
v2Narrative: { signal, confidence, narrative, source }
v3Narrative: { signal, confidence, narrative, source }
v4Narrative: { signal, confidence, narrative, causalAnswers, explanationText, tradeDna, source }
```

### 3.3 SMC Facade (linhas 493-495)

```
smcResult: { structure: { markers }, liquidity: { zones } }
```

### 3.4 SR Levels (linhas 498-510)

```
srLevels: [{ type: 'RESISTANCE'|'SUPPORT', price }]
```

### 3.5 CSRL (linhas 513-527)

- `alignedTensors` → `topology` → `invariants` → `sds` (escalar)

### 3.6 Providers Mask (linhas 529-539)

```
providers: {
  v1: { signal, confidence },  // flat se disabled
  v2: { signal, confidence },
  v3: { signal, confidence },
  v4: { signal, confidence }
}
```

### 3.7 Truth Kernel — Entrada/Saída

**Entrada**: `providers` object + `micro` = `{ liquidityDivergence: 1.0, scaleDivergence: sds, lhds, invariants }`

**Saída** (`kernelResult`):
```
{
  dvf:               number (0-1+),       // divergence scalar
  tension:           number (signed),     // directional tension
  isConsensus:       boolean,             // consensus destruction active?
  trg:               number (0-∞),        // tail risk geometry
  eef:               boolean,             // execution eligibility flag
  reason_codes:      [string],            // razão da decisão
  epistemic_authority: 'OBSERVED'|'INFERRED'|'VETO'|'UNKNOWN',
  raw_metrics: {
    v1_confidence, v2_confidence,
    liquidity_vacuum: 1.0,               // SEMPRE 1.0
    scale_divergence: sds
  }
}
```

**Campos do `micro` usados no kernel**:
- `micro.scaleDivergence` (lido em kernel.js:42)
- `micro.lhds` (lido em kernel.js:43)
- `micro.liquidityDivergence` (lido em residualization.js:69)
- `micro.invariants` **NUNCA lido** (passado mas ignorado)

### 3.8 Após Court Update (linhas 551-554)

`kernelResult` não é modificado. O court tem seus próprios estados internos (`cclist.stressLevel`, `mol.state`).

### 3.9 BaseSignal (linhas 574-592)

```
baseSignal: {
  signal:           string ('go'|'no-go'|'flat'|'long'|'short'),
  confidence:       number (max dos 4 providers),
  regime:           string (v4.causalAnswers.whatHappened ou 'MTF_OBSERVATION'),
  reasons:          [v1.narrative, v2.narrative, v3.narrative, v4.narrative],
  explanationText:  string|null (de v4),
  tradeDna:         string|null (de v4),
  Z_t:              number (dvf * 10)
}
```

### 3.10 Payload Final (linhas 819-895)

Fundido de: candle, baseSignal, kernelResult, smcResult, srLevels, narratives, ev, activePosition/closedTradePayload/simulatedTrade, arlReport

---

## 4. ANOMALIAS

### 4.1 Ordem de Execução vs. Documentação

A documentação (AGENTS.md) lista a ordem:
1. Providers
2. ResidualizationLayer
3. ExecutionTriggerLayer
4. TruthKernel
5. C-CLIST
6. MOL
7. Constitutional Court

Mas a ordem **real** é:
1. Providers (v1..v4) ✓
2. SMC Liquidity + Structure (fora da pipeline principal) ✓
3. CSRL (coerência estrutural — NÃO documentado no pipeline principal) ⚠️
4. Dual Reality Divergence (LHDS — NÃO documentado) ⚠️
5. TruthKernel (contém RL + ETT internamente) ✓
6. C-CLIST update (TODO TICK, não apenas em execução) ⚠️
7. MOL update (TODO TICK) ⚠️
8. Spectrogram UI ✓
9. Active position check (pré-execução) ⚠️
10. **Court.requestPermission** (chamado APÓS position check) ⚠️
11. Eco Engine step (fora da pipeline) ⚠️
12. Exchange execution order ✓

**Problema**: O MOL e C-CLIST são executados em todo tick (atualização de estado), mas o Court `requestPermission` só é chamado quando `isStabilized && eef && !activePosition`. Isto significa que o C-CLIST/MOL têm seus estados evoluindo independentemente da decisão do court — o que é esperado, mas não documentado.

### 4.2 `handleExecution` Assíncrono Não Aguardado (linha 913)

```javascript
this.handleExecution(simulatedTrade.direction, candle, this.activePosition.quantity);
```

`handleExecution` retorna uma Promise, mas não é `await`ed. Isto significa que `processCandle` completa antes do `placeOrder` terminar. Isto é aceitável pela natureza fire-and-forget, mas significa que o próximo tick pode chegar **antes** da ordem ser confirmada, potencialmente criando uma race condition se o próximo tick fechar a posição (via SL/TP check em `processCandle` linha 599, ou `checkTickPositionExit` linha 206).

### 4.3 `dailyCapitalUsed` Incrementado Mas Nunca Decrementado (linha 909)

```javascript
this.dailyCapitalUsed += estimatedCost;
```

Quando uma posição é fechada, `dailyCapitalUsed` **nunca é deduzido**. Isto significa que, ao longo do dia, `dailyCapitalUsed` só cresce, independentemente de posições serem abertas e fechadas com lucro. Eventualmente o limite será atingido mesmo com operações saudáveis. Após o reset (`this.activePosition = null` na linha 906 quando o limite é excedido), o `dailyCapitalUsed` permanece alto, bloqueando trades subsequentes pelo resto do dia (ou até o processo reiniciar).

### 4.4 `liquidityDivergence` Hardcoded para `1.0` (linha 548)

```javascript
this.truthKernel.evaluate(providers, { liquidityDivergence: 1.0, ... });
```

O campo `liquidityVacuum` no TRG calculation (residualization.js:69) é sempre calculado como `1.0` (pois `liquidityDivergence` é sempre 1.0). Isto significa que:

```
trg = divergence^exponent * 1.0 = divergence^exponent
```

O parâmetro de liquidez **não tem efeito** no TRG. É um placeholder morto.

### 4.5 Todas as Chamadas de Rede São Fire-and-Forget

- `sendTelegramAlert()` — linhas 461, 674, 343 — `.catch()` mas sem `await`
- `this.execution.placeOrder()` — linhas 469-470, 686-696 — `.then().catch()` mas sem `await`
- `this.handleExecution()` — linha 913 — sem `await`

Isto é uma anomalia arquitetural: o sistema trata ordens de exchange e alertas como assíncronos não-bloqueantes, o que é aceitável para alto desempenho, mas arriscado se a confirmação da ordem for necessária para consistência de estado.

### 4.6 `kernelResult.eef` Checado Duas Vezes

Na linha 707/713 (streamEngine) e na linha 76 (court.js). Como o caller já filtra `eef=true` antes de chamar o court, o check no court é redundante (dead from this call chain, §2.4).

### 4.7 `Z_t: kernelResult.dvf * 10` (linha 591)

O campo `Z_t` no payload é `dvf * 10`. Se `dvf` é 0 (consensus destruction), `Z_t` = 0. Se `dvf` = 0.5, `Z_t` = 5. Este campo é usado no frontend como `zState.z_t`, mas é um escalar puro sem normalização.

---

## 5. COBERTURA DE CÓDIGO ESTIMADA (Tick Típico)

### Típico (sem posição ativa, eef=false):

| Bloco | Linhas | Executa? |
|-------|--------|----------|
| V1-V4 reconstruct | 487-490 | ✅ Sempre |
| SMC Facade | 493-495 | ✅ Sempre |
| SR Levels | 498-510 | ✅ Sempre (>10 candles) |
| CSRL alignScales | 514 | ✅ Sempre |
| CSRL buildTopology | 515 | ✅ Sempre |
| CSRL extract | 516 | ✅ Sempre |
| CSRL divDetect | 519-526 | ✅ Sempre |
| DisabledProviders mask | 529-532 | ✅ Sempre |
| DualMonitor LHDS | 543-545 | ✅ Sempre |
| TruthKernel.evaluate | 548 | ✅ Sempre |
| C-CLIST stress | 552 | ✅ Sempre |
| MOL state | 553 | ✅ Sempre |
| UI render (LIVE/TESTNET) | 557-560 | ❌ (SIMULAÇÃO) |
| BaseSignal construction | 563-592 | ✅ Sempre |
| Active position check | 599-702 | ❌ (sem posição) |
| Stabilization check | 707-712 | ❌ (eef=false) |
| New trade (isStabilized+eef) | 713-813 | ❌ (eef=false) |
| Eco engine step | 816 | ✅ Sempre |
| Payload construction | 819-895 | ✅ Sempre |
| Emit | 897 | ✅ Sempre |
| Live order | 901-914 | ❌ (eef=false) |

**Cobertura estimada: ~40-50%** das 432 linhas.

### Típico (com posição ativa, eef=false):

| Bloco | Linhas | Executa? |
|-------|--------|----------|
| V1-V4 reconstruct | 487-490 | ✅ |
| SMC Facade | 493-495 | ✅ |
| SR Levels | 498-510 | ✅ |
| CSRL | 514-526 | ✅ |
| DisabledProviders | 529-532 | ✅ |
| DualMonitor | 543-545 | ✅ |
| Kernel | 548 | ✅ |
| C-CLIST + MOL | 551-554 | ✅ |
| UI render | 557-560 | ❌ (SIMULAÇÃO) |
| BaseSignal | 563-592 | ✅ |
| Active position check | 599-702 | ✅ |
| ├── SL/TP check | 606-640 | ✅ (brancos: signal/confidence mortos) |
| └── if(closed) | 643-701 | Depende |
| Stabilization + New trade | 707-813 | ❌ (activePosition existe) |
| Eco engine | 816 | ✅ |
| Payload | 819-895 | ✅ |
| Emit | 897 | ✅ |
| Live order | 901-914 | ✅ (se activePosition) |

**Cobertura estimada: ~55-65%**, dependendo se SL/TP é atingido.

### No Cenário de Execução (com posição + eef=true + court permite):

Atinge-se o bloco mais denso: court flow, position sizing, SL/TP calculation, simulatedTrade. **Cobertura máxima: ~75%**.

### Código Estruturalmente Inalcançável (NUNCA executado):

| Arquivo | Linhas | Razão |
|---------|--------|-------|
| streamEngine.js:614 | `kernelResult.signal === 'no-go'` | Campo inexistente |
| streamEngine.js:618 | `kernelResult.confidence < 50` | Campo inexistente |
| streamEngine.js:632 | `kernelResult.signal === 'go'` | Campo inexistente |
| streamEngine.js:636 | `kernelResult.confidence < 50` | Campo inexistente |
| court.js:76-82 | `if (!requestPayload.eef)` → VETO | Caller já filtrou eef=true |
| court.js:41-45 | `if (rawState.confidence ...)` → VETO | Campos nunca existem |
| mol.js:25-77 | Todo VETO/RECOVERY logic | `epistemic_authority` nunca chega |
| constraintEngine.js:29-35 | drawdown + position size checks | Campos nunca existem no state |
| constraintEngine.js:44-46 | Parameter mutation check | Frozen object nunca muda |

---

## 6. RESUMO DOS ACHADOS CRÍTICOS

### 🔴 Crítico

1. **MOL quebrado**: `epistemic_authority` perdido entre court.js e mol.js (parâmetro trocado). MOL nunca bloqueia execução. A MOL é uma camada fantasma.

2. **4 branches de saída de posição mortos**: LINHA 614, 618, 632, 636 — `kernelResult.signal` e `kernelResult.confidence` não existem no objeto retornado pelo TruthKernel. Posições só fecham por SL/TP.

3. **dailyCapitalUsed monotônico**: nunca decrementado no fechamento; eventualmente trava o sistema permanentemente.

### 🟡 Alto

4. **`liquidityDivergence` hardcoded em 1.0** (linha 548): parâmetro de liquidez no TRG é sempre neutro.

5. **`handleExecution` não aguardado** (linha 913): race condition potencial entre confirmação de ordem e próximo tick.

6. **ConstraintEngine desdentado**: `currentDrawdown` e `requestedPositionSize` nunca existem no `rawState`; os únicos checks funcionais são edge riding (ledger) e parameter mutation (sempre passa).

### 🟢 Baixo

7. **Court VETO_NO_SURVIVAL_NECESSITY redundante**: caller já filtrou.

8. **LHDS sempre calculado**: condição `this.dualMonitor && candle.timestamp` é sempre verdadeira.

9. **V4 ausente do payload overlays**: v4 deliberadamente excluído de `payload.overlays` (linhas 827-848).

---

*Fim do relatório. 432 linhas analisadas, 3 bugs de lógica identificados, 6 branches estruturalmente mortos, 1 camada inteira (MOL) inoperante na cadeia de chamadas.*
