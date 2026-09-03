# OFI-CONFIRMATION-SETUP-001 — Protocolo Congelado & Especificação Constitucional (v2.1)

**Protocolo**: `CUMULATIVE_OFI_FROZEN_SPEC` (v2.1 — Historical Untouched Replication Set)  
**Identificador Constitucional**: `OFI-CONFIRMATION-SETUP-001`  
**Status**: **CONGELADO ANTES DA INGESTÃO DE DADOS CIENTÍFICOS**  
**Timestamp de Congelamento UTC**: `2026-09-03T03:45:00.000Z`  
**Classificação do Holdout**: **Historical Untouched Replication Set** (*Reverse-Temporal Historical Holdout*)  
**Janela Temporal Fechada**:  
- **$T_{\text{start}}$**: `1577836800000` (**2020-01-01 00:00:00 UTC**)  
- **$T_{\text{end}}$**: `1672527600000` (**2022-12-31 23:00:00 UTC**)  
- **Total de Dias Calendários**: 1.096 dias (2020 bissexto: $366 + 365 + 365$)  
- **Total de Barras Horárias de Origem**: 26.304 barras  
**Ativo Primário Central**: `BTCUSDT` ($L=6\text{h}, H=24\text{h}$)  
**Ativo de Replicação Direta**: `ETHUSDT` ($L=6\text{h}, H=24\text{h}$)  
**Ativo de Replicação Secundária / Exploratória**: `SOLUSDT` ($L=12\text{h}, H=8\text{h}$) — *Puramente Diagnóstico*  
**Motor Legado V8 SHA-256**: `fc19e807255b3ecfb8351e82d7dc9d244c1e511d9aa007ac8b67b12d584b4db1` (Intacto)  

---

## 1. Declaração de Linhagem Epistêmica e Registro da Sonda Técnica

1. **Reconhecimento da Origem Exploratória**:
   O ponto paramétrico central ($L=6\text{h}, H=24\text{h}$) foi selecionado a partir da análise topológica em `ALPHA_DISCOVERY_001` sobre os dados minerados de 2023–2026. Ele é declarado formalmente como um **candidate-set derivado da exploração**.
2. **Definição do Holdout (Historical Untouched Replication Set)**:
   O período de 2020-01-01 a 2022-12-31 é formalmente classificado como **Historical Untouched Replication Set** (Holdout Histórico Reverso), pois antecede cronologicamente o período minerado pelo `AD001` e jamais foi consultado ou utilizado na seleção do candidato.
3. **Registro da Sonda Técnica Prévia**:
   A sonda preliminar realizada via API em `2026-09-03T03:41:26Z` teve a finalidade exclusiva de verificar a disponibilidade técnica de dados na exchange:
   ```text
   TECHNICAL AVAILABILITY PROBE
   Purpose: verify historical data existence
   No statistical inspection performed
   No candidate selection performed
   No confirmatory metrics generated
   ```
4. **Cláusula de Não-Substituição de Janela (Anti-Window-Shopping)**:
   A janela 2020–2022 é congelada de forma definitiva e irrevogável. Se o teste confirmatório falhar, a hipótese será declarada **FALSIFICADA / REJEITADA** neste holdout. É expressamente proibido descartar 2020–2022 para buscar outro período histórico post-hoc.

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
   - **Zero sobreposição mecânica** de retornos entre avaliações sucessivas.
2. **Tratamento de Gaps e Faltas**:
   - Qualquer gap $> 1\text{h}$ invalida o trade correspondente. Zero preenchimento sintético.

---

## 5. Inferência Não-Paramétrica em Blocos (Regra Exclusiva de Decisão)

- **Estatística Primária**: **Block Permutation Test** com $M_{\text{perm}} = 1.000$ replicações.
- **Bloco Primário ($B = 10$)**: **A conclusão primária do teste confirmatório é determinada EXCLUSIVAMENTE pelo bloco primário $B = 10$ dias** ($240\text{h}$ contínuas).
- **Análise de Sensibilidade Pré-Registrada ($B \in \{5, 10, 20, 30\}$)**:
  - Os blocos de 5, 20 e 30 dias servem unicamente para **diagnóstico de estabilidade**. É vedado utilizar qualquer outro valor de $B$ para substituir ou redefinir a decisão do bloco primário $B=10$.
- **Tratamento de Blocos Incompletos**: O último bloco residual $r = N \pmod B$ é permutado preservando seu tamanho natural sem descarte.
- **Estatística Secundária**: Newey-West HAC ($L_{\text{lag}} = 5$).

---

## 6. Teste de Informação Incremental (Model 0 vs Model 1 — Mandatório)

O teste deve comprovar se o OFI contém informação preditiva **além do momentum passado de preço**:
- **Model 0 (Preço Apenas)**:
  $$R_{t, t+24\text{h}} = \alpha_0 + \beta_{\text{price}} R_{t-6\text{h}, t} + \epsilon_t$$
- **Model 1 (Preço + Cumulative OFI)**:
  $$R_{t, t+24\text{h}} = \alpha_1 + \beta_{\text{price}} R_{t-6\text{h}, t} + \beta_{\text{OFI}} \text{CumOFI}_t(6\text{h}) + \eta_t$$
- **Condição Mandatória**: $\beta_{\text{OFI}} > 0$ com Newey-West $t > 1.96$ ($p < 0.05$). Se $\beta_{\text{OFI}}$ não for significante, a hipótese é falsificada por redundância em relação ao momentum de preço.

---

## 7. Dimensionamento Amostral e Potência Estatística

1. **Amostra da População**: $N = 1.096$ observações diárias independentes.
2. **Correção Formal de Potência**:
   - $N = 1.096$ fornece potência aproximada de **$80\%$ a $84\%$ exclusivamente para um efeito da ordem de $IC \approx 0.025$** sob as premissas nominais (VIF=1.0).
   - **Não constitui garantia de 80% de poder para o limiar primário de $IC = 0.020$** (o qual requereria $N \approx 2.012$ sob VIF=1.3).
3. **Regra de Interpretação**:
   - Se $IC \ge +0.020$ com $p_{\text{block}} < 0.05$: **PASS Confirmado**.
   - Se $0 < IC < 0.020$ e $p_{\text{block}} \ge 0.05$: Classificado com rigor como **`INCONCLUSIVE_INSUFFICIENT_POWER`** se a direção for positiva, ou **`FAIL`** se o sinal for invertido ou o modelo incremental rejeitado.

---

## 8. Critérios Inegociáveis de PASS / FAIL

O experimento será declarado **PASS** se e somente se cumprir simultaneamente:
1. **$IC_{\text{BTC, 24h}} \ge +0.020$** no teste primário.
2. **$p_{\text{block}} < 0.05$** no teste de permutação em blocos ($B=10$).
3. **$t_{\text{HAC}} > 1.96$** ($p < 0.05$).
4. **$\bar{r}_{\text{net}} \ge +5.0\text{ bps}$ por trade** após 10 bps de fricção.
5. **$\beta_{\text{OFI}} > 0$ com $p < 0.05$** no Modelo Incremental.
6. **$IC_{\text{ETH, 24h}} > 0$** (direção positiva na replicação direta).

Qualquer violação dos itens 1 a 5 resulta em **FAIL / FALSIFICADO**.
