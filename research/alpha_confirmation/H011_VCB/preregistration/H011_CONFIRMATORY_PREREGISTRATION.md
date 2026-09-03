# PRÉ-REGISTRO CONFIRMATÓRIO INSTITUCIONAL — `H011` (v2.0 HOMOLOGADO)
## Volatility Compression Breakout (VCB) — Payoff Assimétrico 1:5 RR

**Identificador de Programa**: `ALPHA_CONFIRMATION_H011`  
**Identificador no Master Hypothesis Ledger**: `H011`  
**Status**: **CONTRATO PRÉ-REGISTRADO CONGELADO — EXECUÇÃO E DADOS 100% BLOQUEADOS**  
**Data de Registro UTC**: `2026-09-03T04:56:00.000Z`  
**Linhagem Epistêmica**: `AD001 (Closed)` $\to$ `OFI001 / H010 (Archived/Falsified)` $\to$ `AD002 (Discovery Concluído, 0/64 FDR)` $\to$ **`H011 Confirmatory Preregistration v2.0`**  
**Invariante de Produção**: `InstitutionalQuantSignalEngine` V8 SHA-256 `fc19e807255b3ecfb8351e82d7dc9d244c1e511d9aa007ac8b67b12d584b4db1` (**100% INTACTO**).  

---

## 0. Cláusula Constitucional de Separação e Formulação Epistêmica

1. **Vedação ao Data Snooping & Proibição de Cherry-Picking**:
   A hipótese `VCB031` ($E[R] = +0,567R$) **NÃO** foi selecionada para a confirmação. Escolher o vencedor numérico isolado de uma grade de 64 testes violaria frontalmente os princípios de honestidade científica institucional, selecionando o outlier estocástico de menor tamanho amostral ($N=36$).
2. **Formulação Epistêmica da Parametrização Confirmatória**:
   Em estrito alinhamento com a diretriz executiva, a configuração pré-registrada é formalmente declarada como:
   > **“Configuração candidata pré-especificada para avaliação confirmatória, derivada exclusivamente da estrutura observada no discovery e congelada antes do acesso à população confirmatória.”**
   $$\mathbf{\theta_{\text{compress}} = 0,65 \quad | \quad K_{\text{lookback}} = 40 \text{ barras} \quad | \quad v_{\text{mult}} = 1,50 \times \bar{V}_{24}}$$
3. **Bloqueio Irreversível de Discovery**:
   O dataset de mineração `Batch 039` nos 6 ativos de descoberta está permanentemente selado. É vedado retornar ao Batch 039 para testar variações, recalibrar parâmetros ou minerar novos filtros.

---

## 1. População Confirmatória Virgem Homologada (Opção C)

### 1.1. Definição Conceitual Exata:
> **“População confirmatória independente da seleção de hipóteses no nível de ativo, com possível dependência temporal/regime compartilhada com o período de discovery.”**

### 1.2. Ativos Constituintes do Holdout:
- **`BNBUSDT`** (32.136 candles horárias: `2023-01-01` a `2026-08-31`)
- **`XRPUSDT`** (32.136 candles horárias: `2023-01-01` a `2026-08-31`)
- **`ADAUSDT`** (32.136 candles horárias: `2023-01-01` a `2026-08-31`)
- **`SUIUSDT`** (29.192 candles horárias: `2023-05-03` a `2026-08-31`)
- **Volume Total**: **125.600 candles horárias virgens** sob a perspectiva de ativo.

### 1.3. Certificação Forense de Não-Contaminação:
Ficou documentalmente comprovado em [`H011_PREREGISTRATION_CONSTITUTIONAL_AUDIT.md`](file:///c:/Users/WDAGUtilityAccount/.gemini/antigravity/scratch/Lyzer-Edge/research/alpha_confirmation/H011_VCB/preregistration/H011_PREREGISTRATION_CONSTITUTIONAL_AUDIT.md) que os dados de `BNB`, `XRP`, `ADA` e `SUI` **nunca foram abertos, lidos, parseados, filtrados ou utilizados para nenhuma decisão durante o discovery AD002 ou a formulação de H011**.

---

## 2. Hipótese Científica e Teste Estatístico Formal

### 2.1. Formulação Falseável:
$$H_0: E[R]_{\text{net}} \le 0,000R \quad \text{vs} \quad H_1: E[R]_{\text{net}} > 0,000R$$

### 2.2. Protocolo Matemático do Block Bootstrap sob $H_0$ Centrada:
1. **Série Temporal de Retornos**:
   Sejam $r_{\text{net}, i}$ os retornos líquidos das $N$ operações geradas nos 4 ativos virgens, ordenadas por timestamp de saída $t_{\text{exit}, 1} \le \dots \le t_{\text{exit}, N}$.
2. **Unidade de Bloco Calendário (14 Dias)**:
   Para capturar regimes compartilhados de volatilidade e liquidação transversal entre os 4 ativos:
   $$\mathcal{W}_k = [T_{\text{start}} + (k-1) \cdot 14\text{d}, \ T_{\text{start}} + k \cdot 14\text{d})$$
   Cada bloco $\mathcal{B}_k = \{ r_{\text{net}, i} \mid t_{\text{exit}, i} \in \mathcal{W}_k \}$ agrupa todos os trades dos 4 ativos encerrados dentro da mesma janela de 14 dias calendários.
3. **Centralização Estrita sob $H_0$ (Hall, 1992)**:
   $$\bar{X} = \frac{1}{N} \sum_{i=1}^N r_{\text{net}, i}$$
   $$\tilde{X}_i = r_{\text{net}, i} - \bar{X}$$
   Os blocos centrados $\tilde{\mathcal{B}}_k = \{ \tilde{X}_i \mid t_{\text{exit}, i} \in \mathcal{W}_k \}$ são reamostrados com reposição ($B = 10.000$ réplicas) sob a semente pré-registrada fixa `Mulberry32(seed = 777777)`.
4. **$p$-valor Empírico**:
   $$p_{\text{block}} = \frac{1 + \sum_{b=1}^B \mathbb{I}(\bar{\tilde{X}}_b^* \ge \bar{X})}{1 + B}$$

---

## 3. Contabilidade Rigorosa de Custos (12 bps All-In)

- **Corretagem (Taker Fees)**: $10\text{ bps}$ ($0,0010$ nocional round-trip).
- **Slippage Base**: $2\text{ bps}$ ($0,0002$ nocional por trade).
- **Saída Normal em TP/SL**: $r_{\text{net}} = r_{\text{gross}} - \frac{(0,0010 + 0,0002) \cdot C_t}{1R_t}$.
- **Saídas com Gap ou Timeout (72h)**: O slippage de 2 bps é aplicado diretamente no preço de execução real ($P_{\text{exit}} = O_k \mp 0,0002 \cdot O_k$), deduzindo-se unicamente a corretagem da exchange ($\frac{0,0010 \cdot C_t}{1R_t}$).
- **Fim do double counting:** Total exato de $12\text{ bps}$ para todas as saídas.

---

## 4. Matriz de Gates Confirmatórios de Decisão (Pass/Fail) — THRESHOLDS RESTAURADOS

Para que a hipótese `H011` seja promovida, **TODOS** os cinco gates originais congelados no Charter v2.0 devem ser satisfeitos simultaneamente:

| Gate | Métrica Avaliada | Critério Inegociável | Fonte Histórica do Threshold |
|---|---|:---:|---|
| **GATE-1 (Estatístico Primário)** | $p$-valor de Block Bootstrap Calendário 14d ($B=10.000$) | **$p_{\text{block}} < 0,0500$** | Charter v2.0 §10.A.2 |
| **GATE-2 (Econômico Primário)** | Esperança Matemática Líquida Amostral ($E[R]_{\text{net}}$) | **$E[R]_{\text{net}} \ge +0,150R$** | Charter v2.0 §10.A.2 |
| **GATE-3 (Qualidade / Profit Factor)** | Profit Factor Líquido ($\text{PF}$) | **$\text{PF} \ge 1,30$** | **RESTAURADO** de Charter v2.0 §10.A.2 (Zero Drift) |
| **GATE-4 (Amostra Independente Mínima)** | Número de Trades no Universo dos 4 Ativos | **$N_{\text{trades}} \ge 150$** | **RESTAURADO** de Charter v2.0 §13.2 (Zero Drift) |
| **GATE-5 (Controle de Cauda e Risco)** | Drawdown Máximo em Unidades de R | **$MDD_R \le 30,0R$** | **RESTAURADO** de Charter v2.0 §13.3 (Zero Drift) |

*Se qualquer gate falhar $\implies$ DECLARAÇÃO DE FAIL CONFIRMATÓRIO SUMÁRIO.*

---

## 5. Cláusula de Bloqueio Operacional

```text
H011 PREREGISTRATION v2.0        = HOMOLOGADO COM THRESHOLDS RESTAURADOS
FROZEN SPECIFICATION (v1.0)      = CONGELADA (θ=0.65, K=40, v=1.50)
POPUlAÇÃO CONFIRMATÓRIA          = OPÇÃO C (BNB, XRP, ADA, SUI) ISOLADA
DATA FIREWALL                    = 100% ATIVO & FECHADO
DATA ACQUISITION                 = BLOQUEADA
CONFIRMATORY RUNNER              = BLOQUEADO
PRODUÇÃO                         = BLOQUEADA
MOTOR V8                         = 🔒 UNTOUCHED (fc19e807...b4db1)
```

Nenhum arquivo de dados da População C foi carregado ou analisado. O contrato está constituído com integridade matemática e epistemológica completa.
