# Verificação de Modelo Matemático

**Analista:** Mathematical Model Verification Analyst  
**Data:** 2026-07-27  
**Fontes:** `glossary.md`, `kernel.js`, `residualization.js`, `executionTriggerLayer.js`, `c-clist.js`, `mol.js`, `court.js`, `configuration.md`, `ADR-033`, `ADR-038`, `eca_court.md`

---

## 1. Tabela de Verificação

| Fórmula | Documentada | Implementada | Match? | Discrepância |
|---------|-------------|-------------|:------:|-------------|
| **TRG** | `TRG = divergence² × liquidityDivergence` (projeção quadrática, `knowledge/glossary.md:9`). Threshold ≥ 0.4 (`ADR-033:61`, `ADR-038:48`, `knowledge/configuration.md:11`). | `Math.pow(divergence, trgExponent) * liquidityVacuum` em `residualization.js:68-70`. Default exponent 2 (`residualization.js:14`). Threshold passado de `streamEngine.js:35` como 0.4. | ❌ PARCIAL | `ExecutionTriggerLayer` default é 0.8 (`executionTriggerLayer.js:12`), não 0.4. Funciona apenas porque `streamEngine.js` injeta 0.4. `sportsEngine.js:5` usa 0.8 explicitamente — criar um `TruthKernel` sem config via env produz threshold ≠ documentado. |
| **DVF** | "Maior distância par-a-par entre as previsões dos provedores" (`knowledge/glossary.md:8`, `knowledge/architecture.md:21`). | `maxDiff = max|v[i] - v[j]|` em `residualization.js:37-43`. Cada vetor = `signalToVec(signal) * (confidence/100)`. Consenso artificialmente zeroa DVF (`residualization.js:52-53`). | ✅ | Fórmula corresponde. Consenso-destruction (SCD) documentado em `knowledge/glossary.md:11`. |
| **LHDS** | Limiar de veto > 0.8 (`knowledge/configuration.md:13`, `kernel.js:18`). Expansão do acrônimo: 3 variações diferentes. | `micro.lhds` comparado com `this.lhdsVetoLimit` (default 0.8) em `kernel.js:46`. TruthKernel não calcula LHDS — apenas consome valor externo. | ⚠️ | Três expansões diferentes coexistem: "Linguistic Higher-Order Divergence Score" (tarefa), "Local Divergence Heterogeneity" (`knowledge/domain/glossary.md:19`), "Local Topological Divergence Score" (`knowledge/glossary.md:10`). Threshold OK. |
| **C-CLIST** | `Stress_t = Stress_{t-1} + stressAccumulation` (`eca_court.md:25-26`). `lethalIllusionLimit = 0.9` (`knowledge/configuration.md:15`). | `stressLevel += stressAccumulation` (0.002) se DVF < 0.1; `stressLevel -= stressRelease` (0.1) senão; TRG > 2.0 zera stress em 1.0; clamping [0,1] (`c-clist.js:23-37`). | ❌ PARCIAL | **5 parâmetros não documentados**: `dvfFloor=0.1`, `stressAccumulation=0.002`, `stressRelease=0.1`, TRG explosion gate (`>2.0`), clamping. Documentação omite completamente o ramo de *stress release* e o *TRG explosion*. |
| **MOL-SCL** | `sclThreshold = 3` ticks consecutivos (`knowledge/configuration.md:16`, `mol.js:11`). Transição `EXECUTE → VETO → RECOVERY` (`knowledge/architecture.md:26`). | `sclThreshold = 3` (`mol.js:11`). SCL incrementa se SDS ≤ 0.7 durante RECOVERY (`mol.js:48`). Transição `VETO → RECOVERY → EXECUTE` com DOI tracking. | ❌ PARCIAL | Threshold OK (3). **SDS ≤ 0.7 como critério de estabilidade não documentado.** O DOI (Duration of Inaction) não documentado. Nome interno `structuralCoherenceLock` vs. nome documentado `SCL` (Stable Cycle Count). |
| **EEF** | "Booleana emitida pelo TruthKernel" (`knowledge/domain/glossary.md:20`). | Computado em `ExecutionTriggerLayer.evaluate()` (`executionTriggerLayer.js:25-36`), depois potencialmente sobrescrito em `TruthKernel.evaluate()` (`kernel.js:48,58`). | ⚠️ | Documentação imprecisa: EEF é *originada* no `ExecutionTriggerLayer`, não no `TruthKernel`. O TruthKernel é validador/sobrescritor, não emissor primário. |

---

## 2. Análise de Discrepâncias

### 2.1 TRG Threshold Default Divergente (CRÍTICO)

**Documentação:** `TRG_THRESHOLD = 0.4` em 5 fontes distintas (ADR-033:61, ADR-038:48, `knowledge/configuration.md:11`, `knowledge/architecture.md:22`, `knowledge/domain/glossary.md:17`).

**Código:** `executionTriggerLayer.js:12` — `constructor(trgThreshold = 0.8)`. O default do construtor é 0.8, não 0.4. A única razão pela qual o sistema usa 0.4 em runtime é porque `streamEngine.js:35` passa explicitamente `parseFloat(process.env.TRG_THRESHOLD || '0.4')`.

**Impacto:** Qualquer instância de `ExecutionTriggerLayer` ou `TruthKernel` criada sem argumentos usará 0.8. Exemplo real: `sportsEngine.js:5` cria `new TruthKernel({ trgThreshold: 0.8 })` — neste caso o threshold é intencionalmente 0.8, mas demonstra que o default do código (0.8) contradiz a documentação (0.4).

**Correto:** Documentação descreve o comportamento *configurado* (0.4). Código tem *default implementation* diferente. **Discrepância real**: o default do construtor deveria ser 0.4 para alinhar com a documentação.

### 2.2 C-CLIST — Parâmetros Ocultos (MODERADO)

**Documentação:** `eca_court.md:25` — `Stress_t = Stress_{t-1} + stressAccumulation`. Apenas acumulação.

**Código:** `c-clist.js:23-37` — O oráculo tem 4 parâmetros de configuração e 3 comportamentos não documentados:

| Parâmetro/Comportamento | Valor | Documentado? |
|------------------------|:-----:|:------------:|
| `dvfFloor` | 0.1 | ❌ |
| `stressAccumulation` | 0.002 | ❌ |
| `stressRelease` | 0.1 | ❌ |
| `lethalIllusionLimit` | 0.9 | ✅ |
| TRG explosion (`> 2.0 → stress = 1.0`) | gate 2.0 | ❌ |
| Clamping `[0, 1]` | sim | ❌ |
| Stress release (ramo else) | 0.1/tick | ❌ |

**Impacto:** O stress release (0.1) é 50× maior que o stress accumulation (0.002), o que significa que na prática, quando DVF > 0.1, o stress cai muito mais rápido do que sobe. A documentação não reflete essa assimetria crítica.

### 2.3 MOL — SDS Threshold Indocumentado (MODERADO)

**Documentação:** `knowledge/domain/glossary.md:23` — "SCL: Número de ticks consecutivos de estabilidade exigidos pelo MOL". Não define o que é "estabilidade".

**Código:** `mol.js:48` — `if (sds <= 0.7)` conta como tick estável.

**Impacto:** A definição de "estabilidade" (SDS ≤ 0.7) está apenas no código. Sem documentação, um operador não sabe o que qualifica um tick como "estável" para fins de recuperação.

### 2.4 Ontological Collapse vs. LHDS — Árvore de Decisão Incorreta (MODERADO)

**ADR-038** (decision tree flowchart) mostra:
```
Q3: LHDS <= Veto Limit? → Não → VETO: ONTOLOGICAL_COLLAPSE
```

**Código:** São dois vetos separados:
1. `lhds > lhdsVetoLimit` → `VETO_REALITY_DIVERGENCE` (`kernel.js:46-49`)
2. `sds > 0.7 AND trg >= ontologicalCollapseTrg` → `VETO_ONTOLOGICAL_COLLAPSE` (`kernel.js:56-59`)

O ADR-038 funde incorretamente dois mecanismos ortogonais. O LHDS veto é baseado em divergência de realidade dupla (live vs. shadow). O colapso ontológico é baseado em Scale Divergence (SDS) + TRG.

### 2.5 SDS Thresholds Indocumentados (MODERADO)

`kernel.js:50-54`:
- `sds < 0.3` → `OBSERVED`
- `0.3 <= sds <= 0.7` → `INFERRED`
- `sds > 0.7` → verifica colapso ontológico

Nenhum desses thresholds (0.3, 0.7) está documentado em nenhuma das fontes examinadas. Eles definem toda a autoridade epistêmica do sistema.

---

## 3. Threshold Drift

| Threshold | Documentado | Código (Default) | Runtime Real (Configurado) | Drift? |
|-----------|:-----------:|:----------------:|:--------------------------:|:------:|
| TRG threshold | 0.4 | 0.8 (*) | 0.4 (env) | **SIM** — default do construtor difere da doc |
| LHDS veto limit | 0.8 | 0.8 | 0.8 (env) | ✅ |
| Ontological collapse TRG | 0.7 | 0.7 | 0.7 (env) | ✅ |
| C-CLIST lethal limit | 0.9 | 0.9 | 0.9 (env) | ✅ |
| C-CLIST dvfFloor | N/D | 0.1 | 0.1 (config) | N/D |
| C-CLIST stressAccumulation | N/D | 0.002 | 0.002 (config) | N/D |
| C-CLIST stressRelease | N/D | 0.1 | 0.1 (config) | N/D |
| C-CLIST TRG explosion gate | N/D | 2.0 | 2.0 | N/D |
| MOL sclThreshold | 3 | 3 | 3 (env) | ✅ |
| MOL SDS stability gate | N/D | 0.7 | 0.7 | N/D |
| Residual consensusLimit | 0.1 | 0.1 | 0.1 (env) | ✅ |
| TRG exponent | 2 (quadrático) | 2 | 2 (env) | ✅ (mas mudou de 4→2, ver bug histórico) |
| SDS OBSERVED gate | N/D | 0.3 | 0.3 | N/D |
| SDS INFERRED gate | N/D | 0.7 | 0.7 | N/D |

**Conclusão:** 5 thresholds não documentados, 1 threshold com drift real (TRG default vs. doc).

---

## 4. Edge Cases Matemáticos

### 4.1 Divisão por Zero

**DVF pode ser 0?** Sim.
- Todos os provedores emitem `signal: 'flat'` → `sigToVec` retorna 0 → `vectors = [0, 0, ...]` → `maxDiff = 0` → DVF = 0.
- Consenso destruído (SCD) artificialmente zera DVF (`dvf = 0` em `residualization.js:53`).

**Impacto na TRG:** `structuralRisk = Math.pow(0, 2) = 0` → `trg = 0 * liquidityVacuum = 0`. Sem divisão, seguro.

**Impacto no C-CLIST:** `dvf < this.dvfFloor` → `0 < 0.1` → stress accumulates. Comportamento correto (estabilidade ilusória).

**Conclusão:** Não há divisão por zero em nenhuma das fórmulas implementadas. A operação `(confidence || 0) / 100` em `residualization.js:27` tem denominador fixo 100, seguro.

### 4.2 NaN Propagation

**Riscos:**
- `micro.lhds || 0.0` (`kernel.js:43`) — protege contra NaN via fallback.
- `micro.scaleDivergence || 0.0` (`kernel.js:42`) — protege.
- `micro.liquidityDivergence || 1.0` (`residualization.js:69`) — protege com fallback.
- `p.confidence || 0` (`residualization.js:27`) — protege.
- `trg.trg` acessado em `kernel.js:56` — se `trg` for `undefined`, `trg.trg` lançará TypeError. Mas `projectTailRisk` sempre retorna `{ trg, ... }`.

**Risco real:** Se `projectTailRisk` receber `dvfResult.divergence = undefined` (ex: `extractDivergence` retorna objeto sem campo `divergence`), `Math.pow(undefined, 2) = NaN` → TRG = NaN → `trg >= this.trgThreshold` = `false` → EEF = false. **Comportamento seguro por falha (fail-safe)** mas propaga NaN.

### 4.3 Overflow em JS Number

**Análise:**
- `stressLevel` clampado em [0, 1.0] (`c-clist.js:37`): seguro.
- `structuralCoherenceLock` (SCL) incrementado até 3: seguro.
- `durationOfInaction` (DOI) incrementado sem limite superior (`mol.js:28,42`): pode crescer indefinidamente se o sistema permanecer em VETO/RECOVERY por longos períodos. Com incrementos a cada tick (~1s), atinge `Number.MAX_SAFE_INTEGER` (≈ 9×10¹⁵) após ~285 milhões de anos. **Irrelevante na prática.**

### 4.4 Casos de Borda Adicionais

1. **Menos de 2 provedores disponíveis** (`residualization.js:31`): DVF = 0, tension = 0, isConsensus = false. TRG = 0. EEF = false. Sistema para completamente.

2. **Consensus destruction com consenso alto mas tensão baixa** (`residualization.js:49`):
   `isConsensus = divergenceScalar < consensusLimit && Math.abs(directionalTension) > 1.0`
   Se provedores concordam (divergência baixa) MAS tensão direcional é ≤ 1.0, NÃO destrói consenso, permitindo DVF baixo mas não-zero. Caso raro mas possível.

3. **TRG explosion no C-CLIST** (`c-clist.js:33-35`): `trgValue > 2.0` força stress a 1.0. Com TRG = `divergence² * liquidityVacuum`, atingir TRG > 2.0 requer divergência alta (ex: 0.9² × 2.47) — cenário extremo de liquidez evaporada.

4. **MOL estado inicial**: `this.state = 'EXECUTE'` sem DOI nem SCL acumulados. Um kernel que nunca vetou pula direto para `canExecute = true`. Comportamento correto para inicialização.

---

## 5. Resumo de Achados

### Críticos (corrigir urgentemente)
1. **TRG default threshold (0.8 vs 0.4)** — `executionTriggerLayer.js:12` deve ter default 0.4 para alinhar com documentação, ou documentar que 0.8 é o default raw.

### Moderados (corrigir na próxima iteração)
2. **C-CLIST parâmetros indocumentados** — `dvfFloor`, `stressAccumulation`, `stressRelease`, TRG explosion gate, clamping devem ser adicionados a `eca_court.md`.
3. **SDS thresholds indocumentados** — gates 0.3 (OBSERVED) e 0.7 (INFERRED/stability) devem constar em documentação.
4. **MOL SDS stability gate indocumentado** — critério `sds ≤ 0.7` para tick estável deve ser documentado.
5. **ADR-038 decision tree incorreta** — separar `LHDS VETO` de `ONTOLOGICAL_COLLAPSE` em nós distintos da árvore.
6. **Expansão inconsistente de LHDS** — unificar o acrônimo em todas as fontes documentais.

### Menores
7. **EEF documentado como "emitido pelo TruthKernel"** — impreciso; EEF é computado no ExecutionTriggerLayer e validado/sobrescrito pelo TruthKernel.
8. **DOI sem limite superior** — aceitável mas poderia ter reset ou teto para evitar grow unbounded em teoria.

---

## 6. Código vs. Documentação — Lineagem Precisa

| O que | Onde | Linha |
|-------|------|:-----:|
| TRG fórmula | `packages/lyzer-shared/src/engine/residualization.js` | 68-70 |
| TRG threshold (doc) | `knowledge/configuration.md` | 11 |
| TRG threshold (código default) | `packages/lyzer-shared/src/engine/executionTriggerLayer.js` | 12 |
| TRG threshold (runtime config) | `lyzer edge/backend/streamEngine.js` | 35 |
| DVF fórmula | `packages/lyzer-shared/src/engine/residualization.js` | 21-61 |
| SCD consensus destruction | `packages/lyzer-shared/src/engine/residualization.js` | 49-54 |
| LHDS veto | `packages/lyzer-shared/src/engine/kernel.js` | 46-49 |
| Ontological collapse | `packages/lyzer-shared/src/engine/kernel.js` | 56-59 |
| SDS authority gates | `packages/lyzer-shared/src/engine/kernel.js` | 50-54 |
| C-CLIST stress eval | `packages/lyzer-constitution/src/eca/c-clist.js` | 23-37 |
| MOL state machine | `packages/lyzer-constitution/src/eca/mol.js` | 21-81 |
| EEF computation | `packages/lyzer-shared/src/engine/executionTriggerLayer.js` | 20-43 |
| Court gate | `packages/lyzer-constitution/src/eca/court.js` | 39-94 |

---

*Verificado em 2026-07-27. 1 crítica grave, 5 moderadas, 2 menores.*
