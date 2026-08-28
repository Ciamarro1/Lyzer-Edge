# 🏛️ LYZER EDGE — LAUDO DE CAPACIDADE & STRESS TEST DO RESEARCH SCHEDULER
## RESEARCH_THROUGHPUT_STRESS_REPORT (INSTITUTIONAL QUANTITATIVE FACTORY)

**Data de Execução:** 2026-08-28T04:48:26.579Z  
**Ambiente de Hardware:** 12 Cores (12th Gen Intel(R) Core(TM) i5-12400F) | RAM: 6.00 GB  
**Configuração Congelada Hash:** `ba943e5f0a98701e04b863d8d86b745154a0fd2e344b66dd44cd52edb6a371fc`  
**Dataset 1H:** SHA-256 `5da8350f0546641485d33abe23414ac12deb88cc7721647d7fed9c1223f2dfaf`  

---

## 1. TABELA DE CAPACIDADE DA RESEARCH FACTORY (MATRIZ DE CENÁRIOS MEDIDOS)

```text
============================================================================================================================================
CENÁRIO                  JOBS   ITERS     WALL TIME MEDIDO   THROUGHPUT REAL      VELOCIDADE   SCHED. EFF   PEAK RSS    STATUS FORENSE
============================================================================================================================================
SCENARIO A (4×500k)       4      2,0 M        2,86 s           699.468 iters/s    1,4 jobs/s   29,1%        499,0 MB    🟢 100% PASS
SCENARIO B (8×500k)       8      4,0 M        4,57 s           875.813 iters/s    1,8 jobs/s   36,5%        661,9 MB    🟢 100% PASS
SCENARIO C (12×500k)     12      6,0 M        6,59 s           909.936 iters/s    1,8 jobs/s   37,9%        789,6 MB    🟢 100% PASS
SCENARIO D (4×2.0M)       4      8,0 M        4,85 s         1.651.075 iters/s    0,8 jobs/s   68,8%      1.180,0 MB    🟢 100% PASS
SCENARIO E (8×2.0M)       8     16,0 M        8,99 s         1.779.935 iters/s    0,9 jobs/s   74,2% 🏆   1.460,5 MB    🟢 100% PASS
SCENARIO F (12×2.0M)     12     24,0 M       13,66 s         1.757.214 iters/s    0,9 jobs/s   73,2%      1.723,5 MB    🟢 100% PASS
SCENARIO G (Mixed Batch) 12     10,4 M        8,01 s         1.297.707 iters/s    1,5 jobs/s   54,1%      1.560,5 MB    🟢 100% PASS
SCENARIO H (100M Marathon)10   100,0 M      140,90 s           709.736 iters/s    0,1 jobs/s   29,6%      2.821,8 MB    🟢 100% PASS
============================================================================================================================================
TOTAL CUMULATIVO         70    170,4 M      192,26 s (3,20 m)  886.296 iters/s    1.310 hyp/h  36,9%      2.821,8 MB    🟢 100% APROVADO
============================================================================================================================================
```

---

## 2. AUDITORIA DE RECONCILIAÇÃO TEMPORAL: MEDIDO vs DERIVADO

Para eliminar qualquer ambiguidade científica entre tempo medido em execução isolada e projeções agregadas:

```text
========================================================================================================================
MÉTRICA TEMPORAL                     VALOR OFICIAL MEDIDO    BASE DE CÁLCULO E ORIGEM DO DADO
========================================================================================================================
1. Tempo Medido (100M Marathon)      140,90 s (2,35 min)     Execução real do Cenário H (10 jobs × 10M) @ 709.736 it/s
2. Tempo Médio Composto da Suite     112,82 s (1,88 min)     Tempo derivado para 100M sob a média da suite (886.296 it/s)
3. Tempo Teórico sob Pico Máximo     56,18 s (0,94 min)      Tempo derivado para 100M sob o pico do Cenário E (1.779.935 it/s)
4. Tempo Total da Bateria Completa   192,26 s (3,20 min)     Tempo cronometrado para os 8 cenários (170,4M iterações)
5. Velocidade de Pesquisa Homologada 1.310 hipóteses / hora  Throughput de jobs sustentado em regime contínuo
========================================================================================================================
```

---

## 3. DASHBOARD DE CAPACIDADE DA RESEARCH FACTORY

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ LYZER RESEARCH FACTORY — DASHBOARD DE CAPACIDADE HOMOLOGADA                                      │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ CPU & Concorrência          : 12 Logical Cores (Teto Global: 12 Workers)                         │
│ Gerenciamento de Memória    : Orçamento 4.5 GB (Pico Real Atingido: 2.821,8 MB — Headroom 1.68GB)│
│ Volume Total Executado      : 170,4 Milhões de Iterações Estatísticas                            │
│ Throughput Médio da Suite   : 886.296 iterações / segundo                                        │
│ Throughput Máximo Medido    : 1.779.935 iterações / segundo (Cenário E: 8×2M)                    │
│ Throughput Medido 100M      : 709.736 iterações / segundo (140,90 s no Cenário H)                │
│ Velocidade de Pesquisa      : 🏆 1.310 Hipóteses Pré-Registradas / Hora                          │
│ Tempo Real para 100M        : 140,90 segundos (2,35 minutos medidos em carga real)               │
│ Tempo Estimado para 1B Iters: ~18,8 minutos (Sob média de 886k it/s)                             │
│ Deadlocks / OOM / Leaks     : ZERO (0 Falhas em 70 jobs pesados)                                │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. AUDITORIA FORENSE DE ISOLAMENTO CAUSAL (TRACK A vs TRACK B)

```text
========================================================================================================================
ITEM AUDITADO                        ESTADO PRÉ-STRESS               ESTADO PÓS-STRESS              VEREDITO FORENSE
========================================================================================================================
1. Frozen V5 Config SHA-256          ba943e5f0a98701e...             ba943e5f0a98701e...            🟢 100% INTOCADO
2. Shadow Lockbox SHA-256            14afc5c97a67d400...             14afc5c97a67d400...            🟢 100% INTOCADO
3. V5 Baseline Replay (Cell A)       N=25 (Net +$78.42 / PF 1.90)    N=25 (Net +$78.42 / PF 1.90)   🟢 RECONCILIADO
4. Teto Global de Workers (Max 12)   12 Máximo Ativo                 12 Máximo Ativo                🟢 RESPEITADO
5. Pré-Registro Gate G               Ex-Ante Obrigatório             100% dos Jobs Registrados      🟢 CONFORME
========================================================================================================================
```
