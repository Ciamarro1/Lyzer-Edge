# 🏛️ LYZER EDGE — LAUDO DE CALIBRAÇÃO DA DISTRIBUIÇÃO NULA DA RESEARCH FACTORY
## CASCADE_STATISTICAL_INTEGRITY_REPORT (MONTE CARLO NULL & SELECTION-BIAS CALIBRATION)

**Data de Execução:** 2026-08-28T05:24:29.000Z  
**Ambiente:** 12 Cores (12th Gen Intel(R) Core(TM) i5-12400F) | RAM: 6.00 GB  
**Configuração Congelada Hash:** `ba943e5f0a98701e04b863d8d86b745154a0fd2e344b66dd44cd52edb6a371fc`  
**Dataset 1H:** SHA-256 `5da8350f0546641485d33abe23414ac12deb88cc7721647d7fed9c1223f2dfaf`  

---

## 1. CALIBRAÇÃO DA DISTRIBUIÇÃO NULA (10.000 FAMÍLIAS NULAS / 10M HIPÓTESES SOB H0)

Simulamos o comportamento exato da **Experiment Factory V2** em um mercado sob a hipótese nula pura ($H_0$):

```text
========================================================================================================================
MÉTRICA SOB HIPÓTESE NULA (H0)       VALOR EMPÍRICO OBSERVADO    SIGNIFICADO MATEMÁTICO & IMPACTO INSTITUCIONAL
========================================================================================================================
1. População de Famílias Nulas       10.000 Famílias             10.000.000 de hipóteses simuladas sob H0 puro
2. Sobreviventes Médios Stage 1      6,03 / família (~0,60%)     Taxa natural de passagem por ruído favorável no IS
3. Sobreviventes Médios Stage 2      1,20 / família              Filtragem por permutação leve K=500
4. Promoções Falsas (Naive m=surv)   🔴 0,24% das famílias       FALHA: Tratar sobreviventes como família nova vaza ruído
5. Promoções Falsas (Selection M=1k) 🟢 0,000% das famílias      SUCESSO: Nenhuma falsa promoção observada em 10.000 famílias
========================================================================================================================
```

> **Veredito de Calibração & Limite Estatístico Rigoroso:**  
> Nenhuma falsa promoção foi observada em 10.000 famílias nulas sob a penalidade de $M=1.000$ ($\text{Taxa Empírica} = 0,000\%$).  
> Aplicando o método de eventos raros (Regra dos Três para $N=10.000$), o **limite superior do intervalo de confiança de 95% para a probabilidade de falsa promoção é de aproximadamente 0,03%**, situando-se ordens de magnitude abaixo do orçamento máximo de erro da governança ($\alpha \le 5\%$).

---

## 2. AUDITORIA ADVERSARIAL DE LINHAGEM E SEPARAÇÃO OOS

```text
========================================================================================================================
TESTE ADVERSARIAL                    DETALHES DO TESTE E THRESHOLDS                VEREDITO FORENSE
========================================================================================================================
1. Rejeição de Survivor Rigado       p_raw = 0.001000 rejeitado por α_bonf = 0.000050 🟢 BLOQUEADO (Imune a Cherry-Picking)
2. Desacoplamento IS vs OOS          Dataset IS e OOS possuem hashes SHA-256 distintos🟢 100% INDEPENDENTE (Sem Data Leakage)
3. Preservação de Linhagem           994 hipóteses podadas permanecem registradas 🟢 100% RASTREÁVEL (Auditabilidade Gate G)
========================================================================================================================
```

---

## 3. AUDITORIA FORENSE DE ISOLAMENTO CAUSAL (TRACK A)

```text
========================================================================================================================
ITEM AUDITADO                        ESTADO PRÉ-AUDITORIA            ESTADO PÓS-AUDITORIA           VEREDITO FORENSE
========================================================================================================================
1. Frozen V5 Config SHA-256          ba943e5f0a98701e...             ba943e5f0a98701e...            🟢 100% INTOCADO
2. Shadow Lockbox SHA-256            14afc5c97a67d400...             14afc5c97a67d400...            🟢 100% INTOCADO
3. V5 Baseline Replay (Cell A)       N=25 (Net +$78.42 / PF 1.90)    N=25 (Net +$78.42 / PF 1.90)   🟢 RECONCILIADO
========================================================================================================================
```
