# PATCH DE CLARIFICAÇÃO CONSTITUCIONAL — `AD003` (v1.0)
## Homologação de Benjamini-Yekutieli (BY), Formalização Algorítmica do Bootstrap e Correção Amostral

**Programa Institucional**: `ALPHA_DISCOVERY_AD003`  
**Identificador**: `AD003_CONSTITUTIONAL_CLARIFICATION_PATCH_v1.0`  
**Data UTC de Emissão**: `2026-09-03T05:55:00.000Z`  
**Status**: **PATCH CONSTITUCIONAL HOMOLOGADO — PRÉ-EXECUÇÃO (FIREWALL 100% BLOQUEADO)**  
**Motor V8 SHA-256**: `fc19e807255b3ecfb8351e82d7dc9d244c1e511d9aa007ac8b67b12d584b4db1` (**100% INTACTO**).  

---

## 🏛️ 1. Correção Conceitual do Tamanho Amostral Mínimo ($N_{\text{min\_discovery}}$)

Fica revogada terminantemente a expressão "trades independentes".  
A formulação constitucional passa a vigorar com a seguinte redação verbatim:

```text
N_min_discovery = 60 observed eligible trades.

This threshold is a minimum observed sample-size criterion,
not an assumption of statistical independence.

No claim of independent trades is made.
Temporal and cross-asset dependence is handled by the
pre-specified 14-day calendar-block bootstrap.
```

- **Racional Epistemológico**: Reconhece-se que operações simultâneas ou defasadas entre `BTC`, `ETH`, `SOL`, `AVAX`, `LINK` e `DOGE` compartilham regimes macroeconômicos e de liquidez. O critério $N \ge 60$ assegura exclusivamente uma massa crítica observacional mínima nos 2 anos de discovery ($2023–2024$), sem presumir independência estocástica entre os trades.

---

## ⚖️ 2. Adoção Constitucional do Procedimento de Benjamini–Yekutieli (BY)

Em resposta à deliberação executiva sobre controle de taxa de falsa descoberta sob dependência transversal e temporal arbitrária, **adota-se compulsoriamente o procedimento de Benjamini–Yekutieli (BY, 2001) em substituição ao BH convencional**.

### 2.1. Formulação Matemática do BY:
Para $M = 40$ hipóteses, a penalidade harmônica de dependência arbitrária é calculada exatamente como:
$$c(M) = \sum_{i=1}^{M} \frac{1}{i} = 1 + \frac{1}{2} + \frac{1}{3} + \dots + \frac{1}{40} \approx 4,278543$$

### 2.2. Algoritmo de Decisão BY:
1. Ordenam-se os $p$-valores empíricos das 40 hipóteses:
   $$p_{(1)} \le p_{(2)} \le \dots \le p_{(40)}$$
2. O limiar crítico de rejeição sob nível nominal $\alpha = 0,05$ é:
   $$\alpha_i^{\text{BY}} = \frac{i \cdot \alpha}{M \cdot c(M)} = \frac{i \cdot 0,05}{40 \times 4,278543} = \frac{i \cdot 0,05}{171,1417} \approx i \times 0,00029215$$
3. O $q$-valor ajustado por Benjamini–Yekutieli ($q_{\text{BY}}$) de cada hipótese é:
   $$q_{\text{BY}, (i)} = \min_{k \ge i} \left( \frac{M \cdot c(M) \cdot p_{(k)}}{k} \right) = \min_{k \ge i} \left( \frac{171,1417 \cdot p_{(k)}}{k} \right)$$
4. **Critério de Rejeição e Elegibilidade**:
   Uma hipótese $h$ é considerada estatisticamente significante se e somente se **$q_{\text{BY}, h} < 0,0500$**.

### 2.3. Delimitação Epistemológica de Benjamini–Yekutieli:
Benjamini–Yekutieli is used as the multiplicity-control procedure because it controls FDR under arbitrary dependence among valid individual hypothesis tests.

The validity of each individual bootstrap p-value remains dependent on the pre-specified block-bootstrap approximation being appropriate for the temporal and cross-asset dependence structure.

O BY resolve rigorosamente o controle de multiplicidade sob qualquer estrutura de correlação entre os 40 testes, sem assumir independência ou dependência positiva (PRDS). No entanto, não substitui nem valida por si só a premissa de aproximação não-paramétrica do bootstrap para cada teste individual, cuja adequação permanece vinculada à pertinência dos blocos em tempo calendário de 14 dias para capturar a estrutura de agrupamento temporal e dependência entre ativos.

---

## 📐 3. Mecanismo Exato e Literal de Reamostragem do Bootstrap

Fica congelado o pseudocódigo algorítmico verbatim do teste primário de cada hipótese:

```text
ALGORITMO LITERAL: 14-DAY CALENDAR BLOCK BOOTSTRAP SOB H0 CENTRADA

1. PARTIÇÃO CALENDÁRIA OBSERVADA:
   - Fixar época T_start = 1672531200000 ms (2023-01-01T00:00:00.000Z).
   - Passo de janela: Delta = 14 * 86.400.000 ms (1.209.600.000 ms).
   - Para cada trade observado i in {1, ..., N_h}:
       Janela k = floor((t_exit,i - T_start) / Delta).
       Atribuir trade i ao bloco calendário B_k.

2. CENTRALIZAÇÃO ESTRITA SOB H0 (HALL, 1992):
   - Média amostral observada: X_bar = (1 / N_h) * sum_{i=1}^{N_h} r_{net,i}.
   - Valor centrado: Y_i = r_{net,i} - X_bar.
   - Bloco centrado B_tilde_k contém { Y_i | t_exit,i in W_k }.

3. REAMOSTRAGEM COM REPOSIÇÃO:
   - Sejam K_windows o número total de blocos calendários não-vazios observados.
   - Para cada réplica b de 1 até B = 10.000:
       a) Sortear K_windows índices de blocos uniformemente COM REPOSIÇÃO
          usando Mulberry32(seed = 888888).
       b) Preservar integralmente todos os trades dos blocos sorteados
          (preservando a correlação cruzada e o agrupamento temporal de choque).
       c) Concatenar os trades sorteados.
       d) Calcular a estatística de teste ponderada por trades (TRADE-WEIGHTED):
          T_b* = ( sum_{j=1}^{K_windows} sum_{i in B_tilde_{w_j}^*} Y_i )
                 -------------------------------------------------------
                 ( sum_{j=1}^{K_windows} |B_tilde_{w_j}^*| )

4. CÁLCULO DO P-VALOR EMPÍRICO:
   - p_h = ( 1 + sum_{b=1}^{B} I( T_b* >= X_bar ) ) / ( B + 1 ).
```

---

## 🔒 Matriz Consolidada de Governança

```text
AD003 CHARTER v1.0               = HOMOLOGADO CONDICIONALMENTE
AD003 CONSTITUTIONAL ADDENDUM    = HOMOLOGADO CONDICIONALMENTE
AD003 CLARIFICATION PATCH v1.0   = PROTOCOLADO & SELADO
CONTROLE DE MULTIPLICIDADE       = BENJAMINI–YEKUTIELI (BY 2001, c(M)=4.2785, q_BY < 0.05)
AMOSTRA MÍNIMA DISCOVERY         = N >= 60 OBSERVED ELIGIBLE TRADES (SEM ALEGAÇÃO DE INDEPENDÊNCIA)
ALGORITMO BOOTSTRAP              = RESAMPLING DE BLOCOS 14D INTEIROS + ESTIMADOR TRADE-WEIGHTED
POPULAÇÃO DE DISCOVERY           = 2023-01-01 A 2024-12-31 (BLOQUEADA)
HOLDOUT CONFIRMATÓRIO            = 2025-01-01 A 2026-08-31 (100% LACRADA SOB FIREWALL)
TIMEFRAME 1H                     = 100% EXCLUÍDO
MOTOR V8                         = 🔒 UNTOUCHED (fc19e807...b4db1)
```

Este Patch resolve definitivamente os 3 pontos residuais.  
Submetemos à Governança Executiva para homologação final e autorização de abertura estrita do Discovery Firewall (2023–2024).
