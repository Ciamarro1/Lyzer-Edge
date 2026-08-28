# 🏛️ LYZER EDGE — PROTOCOLO INSTITUCIONAL DE DESCOBERTA & VALIDAÇÃO
## DISCOVERY_VALIDATION_PROTOCOL (FIREWALL & MULTIPLE-TESTING SPECIFICATION)

---

## 1. O PRINCÍPIO FUNDAMENTAL DO FIREWALL

> **"A velocidade computacional de geração de hipóteses jamais deve aumentar a taxa de falsas descobertas."**

Para cada nova hipótese testada em alta velocidade, o risco cumulativo de Tipo I (falso positivo) cresce exponencialmente:
$$\alpha_{\text{global}} = 1 - (1 - \alpha)^M \xrightarrow[M \to 1000]{} 100\%$$

O **Discovery / Validation Firewall** desacopla a exploração quantitativa da validação confirmatória, garantindo que nenhum resultado preliminar seja promovido a produção ou shadow sem passar por testes independentes Out-Of-Sample (OOS) com penalidades estatísticas formais.

---

## 2. AS 3 TRILHAS CAUSAIS DESACOPLADAS

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ TRACK A: CONFIRMATORY PROSPECTIVE SHADOW (V5 ABD + NEGATIVE FUNDING)                             │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ • Estado: CONGELADO no Cold Lockbox.                                                             │
│ • Cardinalidade: Baseline histórico N = 25.                                                      │
│ • Operação: Registro estrito dos eventos #26 → #50.                                              │
│ • Regra: Proibido qualquer tuning ou adição de filtros retrospectivos.                          │
│ • Checkpoint: Exclusivamente quando N = 50 for completado.                                       │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                ▲
                                                │ (Isolamento Causal Criptográfico)
                                                ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ TRACK B: HIGH-THROUGHPUT DISCOVERY FACTORY (EXPLORAÇÃO CONTROLADA)                               │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ • Estado: Pesquisa em alta velocidade gerenciada pelo MultiExperimentScheduler.                 │
│ • Famílias de Pesquisa: VOL_EXPANSION, LIQUIDATION_SPIKE, ORDER_FLOW_DELTA.                      │
│ • Regra de Classificação: Todo resultado da Track B é classificado como DISCOVERY_ONLY.          │
│ • Gate G: Pré-registro ex-ante obrigatório.                                                      │
│ • Family-Wise Accounting: Nenhuma hipótese falha pode ser removida da contagem da família.       │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                ▲
                                                │ (Firewall de Validação OOS)
                                                ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ TRACK C: INDEPENDENT OUT-OF-SAMPLE VALIDATION & PROMOTION GATE                                   │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ • Entrada: Apenas candidatas formalmente aprovadas como DISCOVERY_RESULT.                        │
│ • Dataset: Exige partição de dados Out-Of-Sample independente (SHA-256 diferente).              │
│ • Penalidade Estatística: Avaliação sob limiares de Bonferroni, Holm e Benjamini-Hochberg (FDR).│
│ • Veredito: Apenas hipóteses aprovadas em OOS e Gates A–G entram na fila de Shadow Tracking.     │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. MÁQUINA DE ESTADOS DO CICLO DE VIDA DA HIPÓTESE

```text
       [1. REGISTERED]
              │
              ▼ (Scheduler Start)
        [2. RUNNING]
              │
              ▼ (In-Sample Execution)
    [3. DISCOVERY_RESULT]
              │
              ├─── (Rejeitado) ─────────────► [FAILED (Immutable)]
              │
              ▼ (Seleção Formal)
        [4. CANDIDATE]
              │
              ▼ (Pré-registro OOS com Dataset Hash Independente)
 [5. CONFIRMATORY_PREREGISTERED]
              │
              ▼ (Execução OOS)
      [6. OOS_VALIDATION]
              │
              ├─── (Aprovado em OOS + Gates A-G) ───► [7. PASSED (Pronto p/ Shadow)]
              │
              └─── (Falha em OOS / Bonferroni) ─────► [FAILED (Immutable)]
```

### 🚫 Transições Estritamente Proibidas (Violam o Firewall):
1. $\text{DISCOVERY\_RESULT} \to \text{PASSED}$ (Pular a validação OOS).
2. $\text{RUNNING} \to \text{MUTATE\_CONFIG} \to \text{RUNNING}$ (P-Hacking por loopback).
3. $\text{FAILED} \to \text{DELETE\_FROM\_FAMILY}$ (Ocultação de variantes perdedoras).
4. $\text{CONFIRMATORY} \to \text{REUSE\_IN\_SAMPLE\_DATASET}$ (Validação OOS circular).

---

## 4. CONTROLE DE PENALIDADES MULTI-TESTES (MATEMÁTICA FORMAL)

Dada uma família de hipóteses $\mathcal{F}$ com $M$ testes executados:

1. **Bonferroni Single-Step (FWER Conservador):**
   $$\alpha_{\text{bonf}} = \frac{\alpha_{\text{nominal}}}{M}$$
   Rejeita $H_0$ se $p_i \le \alpha_{\text{bonf}}$.

2. **Holm-Bonferroni Step-Down (FWER Uniformemente Mais Poderoso):**
   Ordena os $p$-values: $p_{(1)} \le p_{(2)} \le \dots \le p_{(M)}$.  
   Para cada rank $k \in \{1, \dots, M\}$, o limiar é:
   $$\alpha_k = \frac{\alpha_{\text{nominal}}}{M - k + 1}$$
   O procedimento rejeita até o primeiro $k$ onde $p_{(k)} > \alpha_k$, interrompendo as rejeições subsequentes.

3. **Benjamini-Hochberg (Controle de False Discovery Rate — FDR):**
   Garante que a proporção esperada de falsas descobertas seja $\le q = 0.05$:
   $$p_{(k)} \le \frac{k}{M} q$$
   Encontra o maior $k$ que satisfaz a desigualdade e rejeita todas as hipóteses com $i \le k$.

---

## 5. PROCEDIMENTO DE AUDITORIA OPERACIONAL

Antes de iniciar qualquer nova família de pesquisa (V6, V7, V8...):
1. Registrar a família e as hipóteses candidatas no `MULTIPLE_TESTING_REGISTRY.json`.
2. Rodar a exploração na **Track B** sob o `MultiExperimentScheduler`.
3. Para candidatas que apresentarem sinal estatístico ($p \le 0.05$ bruto), avançar o ciclo de vida para `CANDIDATE`.
4. Definir formalmente a partição OOS e pré-registrar como `CONFIRMATORY_PREREGISTERED`.
5. Executar o teste OOS na **Track C** e aplicar a penalidade familiar de Bonferroni.
6. Apenas hipóteses `PASSED` são admitidas para criação de um novo Lockbox de Shadow Tracking.
