# PRÉ-REGISTRO CONFIRMATÓRIO INSTITUCIONAL — `H011`
## Volatility Compression Breakout (VCB) — Payoff Assimétrico 1:5 RR

**Identificador de Programa**: `ALPHA_CONFIRMATION_H011`  
**Identificador no Master Hypothesis Ledger**: `H011`  
**Status**: **CONTRATO PRÉ-REGISTRADO EM HOMOLOGAÇÃO — EXECUÇÃO E DADOS 100% BLOQUEADOS**  
**Data de Registro UTC**: `2026-09-03T04:52:00.000Z`  
**Linhagem Epistêmica**: `AD001 (Closed)` $\to$ `OFI001 / H010 (Archived/Falsified)` $\to$ `AD002 (Discovery Concluído, 0/64 FDR)` $\to$ **`H011 Confirmatory Preregistration`**  
**Invariante de Produção**: `InstitutionalQuantSignalEngine` V8 SHA-256 `fc19e807255b3ecfb8351e82d7dc9d244c1e511d9aa007ac8b67b12d584b4db1` (**100% INTACTO**).  

---

## 0. Cláusula Constitucional de Separação (Chinese Wall)

1. **Vedação ao Data Snooping & Cherry-Picking**:
   A hipótese `VCB031` ($E[R] = +0,567R$) **NÃO** foi selecionada para a confirmação. Escolher o vencedor isolado de uma grade de 64 testes violaria frontalmente os princípios de honestidade científica institucional, selecionando o outlier estocástico de menor tamanho amostral ($N=36$).
2. **Seleção Pelo Medoide Topológico da Bacia Estável**:
   A especificação confirmatória foi estabelecida com base na estabilidade da superfície paramétrica descoberta:
   $$\theta_{\text{compress}} = 0,65, \quad K_{\text{lookback}} = 40 \text{ barras}, \quad v_{\text{mult}} = 1,50 \times \bar{V}_{24}$$
   Essa parametrização é ancorada em:
   - Consistência transversal de taxa de acerto ($22,4\% - 22,6\%$) acima do break-even real;
   - Volume de trades balanceado ($N \approx 100$ a $170$ trades no discovery);
   - Menor dispersão de $p$-valor centrado em todo o universo ($p = 0,1185$ em `VCB045` e $p = 0,1523$ em `VCB046`).
3. **Bloqueio Irreversível de Discovery**:
   O dataset de mineração `Batch 039` está permanentemente selado. É vedado retornar ao Batch 039 para testar variações, recalibrar parâmetros ou minerar novos filtros.

---

## 1. Hipótese Científica e Modelo Estatístico

### 1.1. Formulação Falseável:
> **Hipótese Confirmatória H011:** Em uma população virgem independente, o sinal de rompimento direcional pós-compressão de volatilidade ($\theta = 0,65, K = 40, v = 1,50$) produz uma distribuição de retornos com esperança matemática líquida estritamente positiva ($E[R]_{\text{net}} \ge +0,150R$) sob payoff $1:5$ após custos reais de execução e fricção.

### 1.2. Par de Hipóteses Nula e Alternativa:
$$H_0: E[R]_{\text{net}} \le 0,000R \quad \text{vs} \quad H_1: E[R]_{\text{net}} > 0,000R$$

---

## 2. Contabilidade Limpa de Custos (Resolução do Bug de Double-Counting)

A auditoria forense do discovery detectou que $2\text{ bps}$ adicionais de slippage estavam sendo aplicados sobre saídas de gap e timeout (totalizando $14\text{ bps}$).  
Na fase confirmatória, os custos são formalmente desacoplados e padronizados para **exatamente 12 bps all-in**:
- **Taxas da Exchange (Taker Fees)**: $10\text{ bps}$ ($0,0010$ nocional round-trip).
- **Slippage Base**: $2\text{ bps}$ ($0,0002$ nocional por trade).
- **Regra de GAP**: Para saídas em gap de abertura além de SL ou TP, a saída ocorre no preço de abertura da barra com o slippage aplicado ($P_{\text{exit}} = O_k \mp 0,0002 \cdot O_k$), e deduz-se exclusivamente a taxa da exchange ($\frac{0,0010 \cdot C_t}{1R_t}$).
- **Regra de Timeout (72h)**: Saída no fechamento da 72ª barra ($P_{\text{exit}} = C_{t+72} \mp 0,0002 \cdot C_{t+72}$) com dedução exclusiva da taxa da exchange.
- **Zero double counting.**

---

## 3. Matriz de Gates Confirmatórios de Decisão (Pass/Fail)

Para que a hipótese `H011` seja promovida do status de pesquisa para elegibilidade institucional, **TODOS** os quatro gates abaixo devem ser satisfeitos simultaneamente na população virgem:

| Gate | Métrica Avaliada | Critério Inegociável | Função Constitucional |
|---|---|:---:|---|
| **GATE-1 (Estatístico Primário)** | $p$-valor de Block Bootstrap sob $H_0$ Centrada ($B=10.000$) | **$p_{\text{block}} < 0,0500$** | Refutar a hipótese nula de retorno líquido nulo/negativo. |
| **GATE-2 (Econômico Primário)** | Esperança Matemática Líquida Amostral ($E[R]_{\text{net}}$) | **$E[R]_{\text{net}} \ge +0,150R$** | Assegurar edge econômico material além do break-even. |
| **GATE-3 (Rentabilidade / Qualidade)** | Profit Factor Líquido ($\text{PF}$) | **$\text{PF} \ge 1,25$** | Garantir que o payoff compense as perdas acumuladas. |
| **GATE-4 (Tamanho Amostral Mínimo)** | Número de Trades Independentes | **$N_{\text{trades}} \ge 100$** | Assegurar poder estatístico mínimo contra flutuação de pequena amostra. |
| **GATE-5 (Controle de Cauda e Risco)** | Drawdown Máximo em Unidades de R | **$MDD_R \le 25,0R$** | Proteger contra clusters anômalos de perdas consecutivas. |

Se qualquer um desses gates falhar $\implies$ **O CANDIDATO É DECLARADO FALSIFICADO / REJEITADO (FAIL)**.

---

## 4. Análise de Poder Estatístico & Requisitos Amostrais

Sob o modelo de payoff $1:5$ com desvio padrão empírico dos retornos em unidades de R estimado em $\sigma_R \approx 1,9R$:
- Para detectar um efeito conservador de $E[R] = +0,15R$ com poder de $80\%$ ($\alpha = 0,05$ unilateral):
  $$N^* \approx \left(\frac{z_{\alpha} + z_{\beta}}{E[R] / \sigma_R}\right)^2 = \left(\frac{1,645 + 0,842}{0,15 / 1,9}\right)^2 \approx \left(\frac{2,487}{0,0789}\right)^2 \approx 990 \text{ trades}$$
- Para detectar o efeito médio observado na bacia estável ($E[R] \approx +0,28R$):
  $$N^* \approx \left(\frac{2,487}{0,28 / 1,9}\right)^2 \approx \left(\frac{2,487}{0,1474}\right)^2 \approx 285 \text{ trades}$$
- O piso operacional do protocolo é fixado em **$N_{\min} = 100$ trades independentes**, sendo recomendado atingir $N \ge 250$ trades para conferir alto poder confirmatório.

---

## 5. Delimitação da População Confirmatória Virgem

Em atendimento estrito à regra executiva de isolamento:
- **Batch 039 (`2023-01-01` a `2026-08-31`)**: **SELADO E PROIBIDO**.
- **Holdout 2020–2022 de OFI001**: **SELADO E PROIBIDO**.

### Opções Metodológicas para Deliberação Executiva:
1. **Opção 1 (População Prospectiva / Walk-Forward Forward Holdout)**:
   Coleta prospectiva contínua a partir de `2026-09-01 UTC` até que o número mínimo de trades $N \ge 100$ seja atingido (holdout estritamente temporal futuro).
2. **Opção 2 (População Histórica Virgem Pré-2020 — 2018 a 2019)**:
   Utilização do período histórico virgem `2018-01-01` a `2019-12-31` em BTC e ETH (caso os livros e liquidez suportem a geometria de 1h).
3. **Opção 3 (População Cruzada de Ativos Não-Minerados em Batch 039)**:
   Avaliação confirmatória estrita sobre os ativos de alta liquidez que estavam em Batch 039 mas foram **completamente excluídos da exploração do core-universe** (`BNBUSDT`, `XRPUSDT`, `ADAUSDT`, `SUIUSDT`).

> **CLÁUSULA DE BLOQUEIO DE DADOS:**  
> Nenhuma dessas opções será baixada, acessada ou processada até que a autoridade executiva aprove este Pré-Registro e determine formalmente a população escolhida.

---

## 6. Estado Operacional Atual

```text
H011 PREREGISTRATION CONTRACT    = CONCLUÍDO (AGUARDANDO HOMOLOGAÇÃO)
FROZEN SPECIFICATION (v1.0)      = CONGELADA (θ=0.65, K=40, v=1.50)
DOUBLE COUNTING DE CUSTOS        = CORRIGIDO NA ESPECIFICAÇÃO
DECISION GATES                   = PRÉ-REGISTRADOS (p < 0.05, E[R] >= 0.15R)
DATA FIREWALL                    = 100% FECHADO
DATA ACQUISITION                 = 100% BLOQUEADA
CONFIRMATORY RUNNER              = 100% BLOQUEADO
MOTOR DE PRODUÇÃO V8             = 🔒 UNTOUCHED (fc19e807...b4db1)
```

Este documento é submetido à apreciação da Governança Executiva para auditoria de pré-requisitos e deliberação quanto à população virgem a ser lacrada sob Data Firewall.
