# 🏛️ LYZER EDGE — ESPECIFICAÇÃO TÉCNICA DA EXPERIMENT FACTORY V2
## CASCADE_PIPELINE_SPECIFICATION (5-STAGE PRUNING & DUAL-POOL RESOURCE GOVERNOR)

---

## 1. ARQUITETURA DE HARDWARE & GOVERNANÇA DUAL-POOL

Para maximizar a eficiência computacional de 12 núcleos sem gerar contenção de IPC ou bloquear tarefas interativas de auditoria:

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ LYZER DUAL-POOL RESOURCE GOVERNOR (TETO GLOBAL: 12 WORKERS PERSISTENTES)                         │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│   ┌────────────────────────────────────────┐     ┌────────────────────────────────────────┐      │
│   │ POOL A: LOW-LATENCY & INTERACTIVE      │     │ POOL B: COMPUTE & MONTE CARLO          │      │
│   │ 4 Workers Persistentes                 │     │ 8 Workers Persistentes                 │      │
│   │ • Stage 0 (Sanity / Parameter Bounds)  │     │ • Stage 3 (50k Bootstrap Chunks)       │      │
│   │ • Stage 1 (Fast Replay & Signal Check) │     │ • Stage 3 (20k Permutation Chunks)     │      │
│   │ • Stage 2 (Light 500-iter Permutation) │     │ • Heavy OOS Stress Runs                │      │
│   │ • Ledger & Reconciliation Audits       │     │ • Large Grid Parameter Sweeps          │      │
│   └───────────────────┬────────────────────┘     └───────────────────┬────────────────────┘      │
│                       │                                              │                           │
│                       └──────────────────────┬───────────────────────┘                           │
│                                              ▼                                                   │
│                 ┌──────────────────────────────────────────────────────────┐                     │
│                 │ PROTOCOLO DE BALANCEAMENTO ELÁSTICO:                     │                     │
│                 │ • Se Pool A está Ocioso ──► Pool B pode expandir p/ 12W  │                     │
│                 │ • Se Tarefa Interativa Chega ──► Pool A reassume 4W      │                     │
│                 └──────────────────────────────────────────────────────────┘                     │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. O FUNIL DE CASCATA DE 5 ESTÁGIOS (*EARLY REJECTION*)

O princípio de Pareto rege a pesquisa quantitativa: **>95% das variações arbitrárias de parâmetros falham em gerar alfa após custos de execução**.  
O funil de cascata evita gastar 70.000 iterações de Monte Carlo em hipóteses que sequer sobrevivem à fricção básica.

```text
       [1.000 HIPÓTESES DE ENTRADA]
                   │
                   ▼ (100% de Plausibilidade Estrutural)
       [STAGE 0: SANITY & BOUNDS] ──────────► (Descarta Limites Absurdos / Lookback Inválido)
                   │
                   ▼ (Sobreviventes: 1.000)
       [STAGE 1: FAST DISCOVERY SCREEN] ────► (Replay Causal Rápido com Taxas 0.20% e Slip 0.04%)
                   │                          (Exige N >= 15, Net Expectancy > $0, Net PF >= 1.05)
                   ▼ (Sobreviventes: 6 — Poda 99.4% do Ruído!)
       [STAGE 2: LIGHT PERMUTATION] ────────► (Permutação Rápida K=500 no Pool A)
                   │                          (Exige p_light <= 0.15 para descartar ruído puro)
                   ▼ (Sobreviventes: 6)
       [STAGE 3: DEEP STATISTICAL MATH] ────► (50.000 Bootstrap + 20.000 Permutações no Pool B)
                   │                          (Exige p_raw <= 0.05 e IC 95% Positivo)
                   ▼ (Sobreviventes: 3 — Poda 50% das Frágeis)
       [STAGE 4: INDEPENDENT OOS REPLAY] ───► (Replay Cego em Partição OOS Desconexa)
                   │                          (Exige significância sob Bonferroni Familiar M=1000)
                   ▼ (Sobreviventes: 3)
       [STAGE 5: SHADOW LOCKBOX CERT.] ─────► (Certificação Gates A–G: Admissão no Lockbox Prospectivo)
```

---

## 3. COMPARAÇÃO RIGOROSA: BRUTE-FORCE vs CASCATA

```text
========================================================================================================================
METODOLOGIA DE PROCESSAMENTO         ITERAÇÕES ESTATÍSTICAS   TEMPO DE EXECUÇÃO    EFICIÊNCIA MATEMÁTICA
========================================================================================================================
1. Brute-Force Tradicional           70.000.000 iterações     ~1,5 a 2,0 horas     0,0% (Desperdiça 99% em ruído)
2. Experiment Factory V2 (Cascata)      423.000 iterações     ~6,7 minutos         🏆 99,4% DE REDUÇÃO DE ITERAÇÕES
========================================================================================================================
```

---

## 4. ISOLAMENTO CAUSAL & SELECTION-AWARE MULTIPLE TESTING

1. **Family Lineage Accounting:** Mesmo que apenas 6 hipóteses sobrevivam ao Stage 1, a correção de múltiplos testes no Stage 3 e Stage 4 utiliza a família completa $M = 1.000$ como denominador ($\alpha_{\text{bonf}} = \alpha / 1.000 = 0.00005$).
2. **Track A (V5 Frozen Baseline):** Inviolável. SHA-256 `ba943e5f0a98701e...` e Lockbox `14afc5c97a67d400...` permanecem blindados.
3. **Track B (Discovery Cascata):** Exploração massiva via `HypothesisCascadeEngine`.
4. **Track C (Validação OOS):** As candidatas aprovadas são submetidas a partições OOS com hashes SHA-256 independentes.
