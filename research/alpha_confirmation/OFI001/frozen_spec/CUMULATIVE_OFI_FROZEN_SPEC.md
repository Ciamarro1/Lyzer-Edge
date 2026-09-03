# OFI-CONFIRMATION-SETUP-001 — Protocolo Congelado & Especificação Constitucional

**Protocolo**: `CUMULATIVE_OFI_FROZEN_SPEC`  
**Identificador Constitucional**: `OFI-CONFIRMATION-SETUP-001`  
**Status**: **CONGELADO ANTES DO ACESSO A DADOS NÃO OBSERVADOS**  
**Timestamp de Congelamento UTC**: `2026-09-03T03:30:00.000Z`  
**Ativo Primário**: `BTCUSDT`  
**Ativo de Replicação Primária**: `ETHUSDT`  
**Ativos de Replicação Secundária**: `SOLUSDT`, `DOGEUSDT`  
**Motor Legado V8 SHA-256**: `fc19e807255b3ecfb8351e82d7dc9d244c1e511d9aa007ac8b67b12d584b4db1` (Intacto)  

---

## 1. Declaração de Linhagem Epistêmica e Não-Ingenuidade

1. **Reconhecimento da Origem Exploratória**:
   O espaço de parâmetros candidatos ($L=6h, H=24h$ para BTC; $L=3h, H=12h$ para ETH) foi derivado da análise exploratória da superfície 2D em `ALPHA_DISCOVERY_001` sobre os dados minerados de 2023–2026.
2. **Proibição de Reutilização**:
   Os dados de 2023–2026 pertencem irrevogavelmente ao espaço de mineração. Qualquer teste confirmatório executado nesses mesmos dados é expressamente nulo e sem valor confirmatório.
3. **Controle de Seleção Post-Hoc**:
   Este protocolo congela a especificação **antes** que qualquer dado Out-of-Sample não observado seja coletado, processado ou inspecionado. É estritamente proibido alterar $L$, $H$, fórmulas ou regras após a abertura do novo período.

---

## 2. Definições Matemáticas Formais

### A. Order-Flow Imbalance Horário ($OFI_t$)
Para cada barra horária $t$ correspondente ao intervalo $[t-1, t)$:
- $V_t$: Volume total executado no período.
- $V^{\text{taker\_buy}}_t$: Volume agressor comprador (ordens a mercado de compra consumindo liquidez do ask).
- $V^{\text{taker\_sell}}_t = \max(0, V_t - V^{\text{taker\_buy}}_t)$: Volume agressor vendedor.
- Desequilíbrio de Fluxo de Ordens ($OFI_t$):
  $$OFI_t = \begin{cases} \frac{V^{\text{taker\_buy}}_t - V^{\text{taker\_sell}}_t}{V^{\text{taker\_buy}}_t + V^{\text{taker\_sell}}_t} \in [-1, +1] & \text{se } V_t > 10^{-8} \\ 0 & \text{caso contrário} \end{cases}$$

### B. Cumulative Order-Flow Imbalance ($\text{CumOFI}_t(L)$)
Dado o lookback pré-registrado $L$:
$$\text{CumOFI}_t(L) = \frac{1}{L} \sum_{k=0}^{L-1} OFI_{t-k}$$

### C. Sinal Direcional Discreto ($s_t$)
Para o teste de execução econômica:
$$s_t = \begin{cases} +1 & \text{se } \text{CumOFI}_t(L) > +0.05 \\ -1 & \text{se } \text{CumOFI}_t(L) < -0.05 \\ 0 & \text{se } |\text{CumOFI}_t(L)| \le 0.05 \quad (\text{Zona Neutra de Filtro}) \end{cases}$$

### D. Retorno Forward e Retorno do Trade
Para o horizonte forward $H$:
$$R_{t, t+H} = \ln \left( \frac{C_{t+H}}{C_t} \right)$$
Retorno líquido do trade após fricção:
$$r_{\text{trade}, t} = s_t \cdot R_{t, t+H} - \text{Fricção}$$
Onde $\text{Fricção} = 0.0010$ (10 bps por round-trip).

---

## 3. Especificação dos Ativos e Horizontes Pré-Registrados

| Papel Experimental | Ativo | Lookback ($L$) | Horizonte ($H$) | Justificativa Teórica |
|---|:---:|:---:|:---:|---|
| **Teste Primário (Hipótese Central)** | **BTCUSDT** | **6 horas** | **24 horas** | Maior liquidez do livro, menor ruído de spread, acúmulo direcional em $24h$. |
| **Replicação Cruzada Direta** | **ETHUSDT** | **6 horas** | **24 horas** | Teste da mesma especificação exata do BTC em ativo independente. |
| **Replicação Local de Descoberta** | **ETHUSDT** | **3 horas** | **12 horas** | Ponto ótimo observado no discovery em ETH. |
| **Replicação Secundária de Generalização** | **SOLUSDT** | **12 horas** | **8 horas** | Ativo de alto beta para testar se a dinâmica se transfere fora do par BTC/ETH. |

---

## 4. Cadência Temporal e Prevenção de Overlap Mecânico

1. **Cadência de Avaliação Primária Não-Sobreposta**:
   - Avaliações estritamente sequenciais com passo $\Delta t = H = 24\text{h}$ (ex.: 00:00 UTC diariamente).
   - Nenhuma sobreposição de retornos futuros entre trades sucessivos ($[t_i, t_i + 24h]$ e $[t_{i+1}, t_{i+1} + 24h]$ são disjuntos).
2. **Tratamento de Gaps e Dados Ausentes**:
   - Se houver gap temporal $> 1\text{h}$ em qualquer candle dentro de $[t-L, t+H]$, o trade é classificado como `INVALID_GAP` e excluído da amostra estatística.
   - Nenhuma interpolação sintética de preços futuros é permitida.

---

## 5. Teste de Informação Incremental (Model 0 vs Model 1)

O teste estatístico deve provar que o Cumulative OFI agrega informação **além do retorno passado de preço**:

### Modelo Restrito (Model 0 — Dinâmica Pura de Preço):
$$R_{t, t+H} = \alpha_0 + \beta_{\text{price}} \cdot R_{t-L, t} + \epsilon_t$$

### Modelo Irrestrito (Model 1 — Preço + Cumulative OFI):
$$R_{t, t+H} = \alpha_1 + \beta_{\text{price}} \cdot R_{t-L, t} + \beta_{\text{OFI}} \cdot \text{CumOFI}_t(L) + \eta_t$$

### Teste de Hipótese Incremental:
$$H_0: \beta_{\text{OFI}} \le 0 \quad \text{vs} \quad H_1: \beta_{\text{OFI}} > 0$$
- $\beta_{\text{OFI}}$ deve apresentar $t_{\text{HAC}} > 1.96$ ($p < 0.05$).
- O aumento de $R^2$ ($\Delta R^2 = R^2_{\text{Model 1}} - R^2_{\text{Model 0}}$) deve ser positivo e estatisticamente significante.

---

## 6. Framework de Inferência Estatística

1. **Estatística Primária**: **Block Permutation Test**
   - Número de permutações: **$1.000$ replicações**.
   - Tamanho do bloco: **$B = 10$ observações** ($240\text{h}$ de mercado), preservando regimes e autocorrelação.
   - Critério: $p_{\text{block}} < 0.05$.
2. **Estatística Secundária**: **Newey-West HAC**
   - Lags: $L_{\text{lag}} = 5$.
   - Critério: $t_{\text{HAC}} > 1.96$ ($p_{\text{HAC}} < 0.05$).
3. **Curva de Custos**:
   - Avaliação compulsória em $0, 5, 10, 15, 20\text{ bps}$.
   - Ponto de break-even deve ser $\ge 20.0\text{ bps}$.

---

## 7. Critérios Inegociáveis de PASS / FAIL

Para o experimento confirmatório ser declarado **PASS**:

| Critério | Métrica Requerida | Tolerância de Falha |
|---|:---:|:---:|
| **1. Correlação Linear Primária** | Pearson $IC_{\text{BTC, 24h}} \ge +0.020$ | Zero tolerância ($IC < 0.020 \implies \text{FAIL}$) |
| **2. Significância Não-Paramétrica** | Block Permutation $p_{\text{block}} < 0.05$ | Zero tolerância ($p \ge 0.05 \implies \text{FAIL}$) |
| **3. Significância HAC** | Newey-West $t_{\text{HAC}} > 1.96$ ($p < 0.05$) | Zero tolerância ($t \le 1.96 \implies \text{FAIL}$) |
| **4. Retorno Econômico Líquido** | Expectativa Líquida a 10 bps $\ge +5.0\text{ bps/trade}$ | Zero tolerância ($\text{Net} < 5.0\text{ bps} \implies \text{FAIL}$) |
| **5. Informação Incremental** | $\beta_{\text{OFI}} > 0$ com $p_{\text{HAC}} < 0.05$ sobre Model 0 | Zero tolerância |
| **6. Replicação Direta em ETH** | $IC_{\text{ETH, 24h}} > 0$ e Direção Consistente | Zero tolerância (Inversão de sinal $\implies \text{FAIL}$) |
| **7. Tamanho Amostral Mínimo** | Amostra $N \ge 365$ observações não-sobrepostas | Amostras menores são classificadas como `INCONCLUSIVE` |

Se qualquer um dos 7 critérios falhar, a hipótese é classificada como **FAIL / FALSIFICADA**.
