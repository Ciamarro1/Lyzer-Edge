# OFI-CONFIRMATION-SETUP-001 — Protocolo Congelado & Especificação Constitucional (v2.0)

**Protocolo**: `CUMULATIVE_OFI_FROZEN_SPEC` (v2.0 Revisada e Auditada)  
**Identificador Constitucional**: `OFI-CONFIRMATION-SETUP-001`  
**Status**: **CONGELADO ANTES DA ADMISSÃO DE DADOS CONFIRMATÓRIOS**  
**Timestamp de Congelamento UTC**: `2026-09-03T03:40:00.000Z`  
**Data Cutoff Inicial ($T_0$)**: `1788220800000` (**2026-09-01 00:00:00 UTC**)  
**Ativo Primário Central**: `BTCUSDT` ($L=6\text{h}, H=24\text{h}$)  
**Ativo de Replicação Direta**: `ETHUSDT` ($L=6\text{h}, H=24\text{h}$)  
**Ativo de Replicação Secundária / Exploratória**: `SOLUSDT` ($L=12\text{h}, H=8\text{h}$)  
**Motor Legado V8 SHA-256**: `fc19e807255b3ecfb8351e82d7dc9d244c1e511d9aa007ac8b67b12d584b4db1` (Intacto)  

---

## 1. Declaração de Linhagem Epistêmica e Não-Ingenuidade

1. **Reconhecimento da Origem Exploratória**:
   O ponto paramétrico central ($L=6\text{h}, H=24\text{h}$) foi selecionado a partir da análise topológica em `ALPHA_DISCOVERY_001` sobre os dados minerados de 2023–2026. Ele é declarado formalmente como um **candidate-set derivado da exploração**.
2. **Proibição de Reutilização**:
   Os dados do Batch 039 (anteriores a $T_0$) pertencem ao espaço de mineração. Nenhuma observação anterior a $T_0$ entrará no teste confirmatório.
3. **Proibição de Busca Posterior**:
   Não será permitida qualquer varredura ou otimização de $(L, H)$ sobre os dados confirmatórios. O teste central é única e exclusivamente **BTC L6/H24**.

---

## 2. Definições Matemáticas Formais

### A. Order-Flow Imbalance Horário ($OFI_t$)
Para cada barra horária $t$ no intervalo $[t-1, t)$:
- $V_t$: Volume total executado.
- $V^{\text{taker\_buy}}_t$: Volume agressor comprador.
- $V^{\text{taker\_sell}}_t = \max(0, V_t - V^{\text{taker\_buy}}_t)$: Volume agressor vendedor.
- Desequilíbrio de Fluxo de Ordens ($OFI_t$):
  $$OFI_t = \begin{cases} \frac{V^{\text{taker\_buy}}_t - V^{\text{taker\_sell}}_t}{V^{\text{taker\_buy}}_t + V^{\text{taker\_sell}}_t} \in [-1, +1] & \text{se } V_t > 10^{-8} \\ 0 & \text{caso contrário} \end{cases}$$

### B. Cumulative Order-Flow Imbalance ($\text{CumOFI}_t(L)$)
Para o lookback fixo $L=6\text{h}$:
$$\text{CumOFI}_t(6\text{h}) = \frac{1}{6} \sum_{k=0}^{5} OFI_{t-k}$$

### C. Sinal Direcional Discreto ($s_t$)
$$s_t = \begin{cases} +1 & \text{se } \text{CumOFI}_t(6\text{h}) > +0.05 \\ -1 & \text{se } \text{CumOFI}_t(6\text{h}) < -0.05 \\ 0 & \text{se } |\text{CumOFI}_t(6\text{h})| \le 0.05 \quad (\text{Zona Neutra}) \end{cases}$$

### D. Retorno Forward e Retorno do Trade
Para $H=24\text{h}$:
$$R_{t, t+24\text{h}} = \ln \left( \frac{C_{t+24\text{h}}}{C_t} \right)$$
Retorno líquido do trade:
$$r_{\text{trade}, t} = s_t \cdot R_{t, t+24\text{h}} - 0.0010 \quad (10\text{ bps round-trip})$$

---

## 3. Especificação Rigorosa do Critério Econômico (+5 bps)

O requisito de retorno econômico é definido matematicamente como a **Média Aritmética Amostral do Retorno Logarítmico Líquido por Trade**:
$$\bar{r}_{\text{net}} = \frac{1}{N_{\text{trades}}} \sum_{i=1}^{N_{\text{trades}}} r_{\text{trade}, i} \ge +0.00050 \quad (+5.0\text{ bps por trade})$$

O relatório confirmatório exigirá compulsoriamente a publicação de:
1. **Intervalo de Confiança de 95% Newey-West HAC**: $[\bar{r}_{\text{net}} - 1.96 \cdot \text{SE}_{\text{HAC}}, \bar{r}_{\text{net}} + 1.96 \cdot \text{SE}_{\text{HAC}}]$.
2. **Mediana do Retorno Líquido por Trade**.
3. **Taxa de Acerto (*Hit Rate*)**: Percentual de trades com retorno líquido $> 0$.
4. **Fator de Lucro (*Profit Factor*)**: $\frac{\sum \text{Ganhos Líquidos}}{|\sum \text{Perdas Líquidas}|} \ge 1.25$.
5. **Retorno Acumulado Composto do Portfólio**.

---

## 4. Cadência Temporal e Amostragem Não-Sobreposta

1. **Amostragem Não-Sobreposta**:
   - As avaliações ocorrem às **00:00 UTC diariamente** ($\Delta t = 24\text{h}$).
   - Não há sobreposição mecânica de retornos entre avaliações sucessivas.
2. **Tratamento de Gaps e Faltas**:
   - Qualquer gap $> 1\text{h}$ invalida o trade correspondente. Zero preenchimento sintético.

---

## 5. Inferência Não-Paramétrica em Blocos (Conforme `BLOCK_PERMUTATION_SCHEME.md`)

- **Estatística Primária**: **Block Permutation Test** com $M_{\text{perm}} = 1.000$ replicações.
- **Bloco Primário**: **$B = 10$ dias** ($240\text{h}$), preservando a persistência empírica de regimes de volatilidade em cripto.
- **Análise de Sensibilidade Prévia**: Avaliação pré-registrada em $B \in \{5, 10, 20, 30\}$ dias.
- **Tratamento de Blocos Incompletos**: O último bloco de tamanho $r = N \pmod B$ é permutado preservando seu tamanho original sem descarte nem preenchimento.
- **Critério**: $p_{\text{block}} < 0.05$ no bloco primário $B=10$.
- **Estatística Secundária**: Newey-West HAC ($L_{\text{lag}} = 5$).

---

## 6. Teste de Informação Incremental (Model 0 vs Model 1)

O modelo deve provar formalmente que o fluxo de ordens não é mero proxy de momentum passado de preço:
- **Model 0**: $R_{t, t+24\text{h}} = \alpha_0 + \beta_{\text{price}} R_{t-6\text{h}, t} + \epsilon_t$
- **Model 1**: $R_{t, t+24\text{h}} = \alpha_1 + \beta_{\text{price}} R_{t-6\text{h}, t} + \beta_{\text{OFI}} \text{CumOFI}_t(6\text{h}) + \eta_t$
- **Exigência**: $\beta_{\text{OFI}} > 0$ com Newey-West $t > 1.96$ ($p < 0.05$).

---

## 7. Dimensionamento Amostral Constitucional: Alvo ($N^*$) vs Piso ($N_{\min}$)

Em correção formal à terminologia anterior:

1. **Tamanho Amostral Alvo ($N^*$) para 80% de Poder**:
   - Para o efeito conservador pós-mineração ($IC = 0.025$), a Power Analysis determina:
     $$N^* = 990 \text{ observações diárias agrupadas em painel BTC+ETH} \quad (\approx 495 \text{ dias calendários})$$
     $$N^* = 730 \text{ observações para BTC isolado} \quad (2 \text{ anos completos})$$
2. **Piso Operacional Mínimo de Admissão ($N_{\min} = 365$ observações)**:
   - $N_{\min} = 365$ (1 ano completo de dados diários) é o **piso técnico mínimo para abrir a execução**.
   - Se $N < 365$, o dataset é rejeitado antes da execução.
   - **Cláusula de Salvaguarda de Poder:** Se $365 \le N < N^*$, e o teste obtiver $IC > 0$ mas $p_{\text{block}} > 0.05$, o veredito será classificado como **`INCONCLUSIVE_INSUFFICIENT_POWER`**, sendo terminantemente vedada a classificação leviana de FAIL por subamostragem estatística.

---

## 8. Critérios Inegociáveis de PASS / FAIL

O experimento confirmatório será declarado **PASS** se e somente se:
1. **$IC_{\text{BTC, 24h}} \ge +0.020$** no teste primário.
2. **$p_{\text{block}} < 0.05$** no teste de permutação em blocos ($B=10$).
3. **$t_{\text{HAC}} > 1.96$** ($p < 0.05$).
4. **$\bar{r}_{\text{net}} \ge +5.0\text{ bps}$ por trade** após 10 bps de fricção.
5. **$\beta_{\text{OFI}} > 0$ com $p < 0.05$** no Modelo Incremental.
6. **$IC_{\text{ETH, 24h}} > 0$** (direção positiva confirmada na replicação).
7. **$N \ge N^*$ para PASS definitivo** (ou $N \ge 365$ com todas as métricas superadas com folga).

Qualquer violação dos itens 1 a 6 resulta em **FAIL / FALSIFICADO**.
