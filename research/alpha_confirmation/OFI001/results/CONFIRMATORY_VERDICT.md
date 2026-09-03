# OFI-CONFIRMATION-SETUP-001 — Relatório Constitucional de Veredito Final (Auditado)

**Veredito Oficial**: **🔴 FAIL — SPECIFIC GENERALIZATION CLAIM FALSIFIED**  
**Data da Execução e Auditoria**: `2026-09-03T03:47:11Z`  
**População Avaliada**: Historical Untouched Replication Set (*Reverse-Temporal Historical Holdout*)  
**Janela Temporal**: `2020-01-01 00:00:00 UTC` a `2022-12-31 23:59:59 UTC`  
**Amostra Efetiva Avaliada ($N$)**: **1.094 observações diárias não-sobrepostas**  
*(Nota Metodológica: 1.096 dias calendários de 2020 a 2022 resultam em 1.094 observações diárias disjuntas após a exclusão determinística dos pontos de borda: lookback inicial $L=6\text{h}$ e retorno forward final $H=24\text{h}$).*  
**SHA-256 do Motor V8**: `fc19e807255b3ecfb8351e82d7dc9d244c1e511d9aa007ac8b67b12d584b4db1` (**INTACTO**)  

---

## 1. Tabela Constitucional de Critérios Inegociáveis

| ID | Critério Pré-Registrado | Valor Observado | Limiar Exigido | Veredito |
|:---:|---|:---:|:---:|:---:|
| **CRIT-1** | Correlação Linear Primária (BTC IC) | **$IC = +0,0560$** | $IC \ge +0,020$ | ✅ **PASS** |
| **CRIT-2** | Significância Não-Paramétrica em Blocos ($B=10$) | **$p = 0,0599$** | $p < 0,050$ | ❌ **FAIL** |
| **CRIT-3** | Significância Assintótica Newey-West HAC | **$t = 2,25$** | $t > 1,96$ | ✅ **PASS** |
| **CRIT-4** | Retorno Líquido Médio por Trade (10 bps de fricção) | **$\bar{r}_{\text{net}} = +14,17\text{ bps}$** | $\ge +5,0\text{ bps}$ | ✅ **PASS** |
| **CRIT-5** | Modelo Incremental sobre Preço Passado | **$\beta = 0,1134$ ($t = 3,04$)** | $\beta > 0, t > 1,96$ | ✅ **PASS** |
| **CRIT-6** | Consistência de Replicação Direta (ETH IC) | **$IC = -0,0266$** | $IC > 0$ | ❌ **FAIL** |

---

## 2. Síntese Epistêmica e Interpretação Rigorosa

A formulação formal do veredito é rigorosamente delimitada:

> **Foi falsificada a alegação específica de que esta configuração congelada de Cumulative OFI ($L=6\text{h}, H=24\text{h}$) constitui um sinal generalizável e economicamente robusto nas populações avaliadas.**  
> **Não se afirma que toda e qualquer forma de Order Flow Imbalance seja destituída de conteúdo informacional.**

### A. O Desacordo Epistêmico entre HAC e Permutação em Blocos (BTC)
O ativo primário (BTC) gerou um resultado de elevado interesse metodológico:
- Apresentou correlação positiva substancial ($IC = +0,0560$), significância sob inferência assintótica de Newey-West ($t_{\text{HAC}} = 2,25$) e forte evidência incremental sobre o retorno passado de preço ($\beta_{\text{OFI}} = 0,1134, t = 3,04, \Delta R^2 = +1,016\%$).
- Contudo, sob o teste não-paramétrico primário de **Block Permutation ($B=10$)**, que preserva os regimes de dependência temporal e clustering de volatilidade, o $p$-valor empírico foi **$p = 0,0599$**.
- O efeito observado foi suficientemente forte para superar a inferência assintótica com variância pontual, mas não para superar o teste conservador em blocos contra a hipótese nula de dependência serial. As sensibilidades pré-registradas ($B=5 \implies p=0,0519$; $B=20 \implies p=0,0649$; $B=30 \implies p=0,0619$) confirmam a estabilidade dessa fronteira, validando que a não rejeição não decorreu de um acidente específico na escolha de $B=10$.

### B. O Colapso da Replicação Cruzada em ETH
Na replicação direta da especificação congelada em ETHUSDT:
- O sinal inverteu para **$IC = -0,0266$** ($t_{\text{HAC}} = -1,02, p_{\text{block}} = 0,3566$).
- O retorno médio líquido por trade foi de **$-47,82\text{ bps}$**.
- O modelo incremental não detectou significância ($\beta_{\text{OFI}} = 0,0233, t = 0,51, \Delta R^2 = 0,025\%$).
- A alegação específica de generalização da configuração OFI001 não sobreviveu à replicação histórica pré-registrada.

### C. Conexão com o Discovery AD001
Os resultados são consistentes com seleção múltipla, heterogeneidade de microestrutura ou dependência estrita de regime, não fornecendo evidência empírica suficiente para distinguir essas hipóteses no presente holdout.

---

## 3. Matriz de Status Institucional

| Dimensão | Classificação Constitucional | Justificativa Técnica |
|---|:---:|---|
| **Status Científico** | **🔴 NOT CONFIRMED** | Falha no teste primário de blocos ($p=0,0599$) e inversão em ETH ($IC=-0,0266$). |
| **Status Econômico** | **🔴 NOT PROMOTABLE** | Prejuízo de $-47,82$ bps no ativo de replicação direta; sinal não passível de alocação de risco. |
| **Status de Produção** | **🔴 BLOCKED** | O engine de produção jamais recebeu ou receberá este sinal. |
| **Status da Hipótese Específica** | **🔴 FAILED CONFIRMATORY GATES** | Especificação $L=6\text{h}, H=24\text{h}$ encerrada e rejeitada para promoção. |
| **Status do Fenômeno OFI em Geral** | **🟡 OPEN / UNRESOLVED** | Permanece em aberto na literatura se outras modelagens de fluxo contêm informação preditiva. |

---

## 4. Cláusula de Lacre e Encerramento Definitivo

A campanha `OFI001` está oficialmente **ENCERRADA E ARQUIVADA**:
- É terminantemente vedado substituir o período 2020–2022 por outra janela temporal;
- É vedado alterar parâmetros post-hoc para capitalizar sobre o resultado isolado de BTC;
- O diretório `research/alpha_confirmation/OFI001/` fica lacrado como repositório forense de evidência negativa.
- O motor `InstitutionalQuantSignalEngine` V8 permanece congelado e intocado no SHA-256 `fc19e807255b3ecfb8351e82d7dc9d244c1e511d9aa007ac8b67b12d584b4db1`.
