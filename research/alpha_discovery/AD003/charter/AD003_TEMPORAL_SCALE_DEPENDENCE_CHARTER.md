# CHARTER INSTITUCIONAL DE PESQUISA — `AD003` (v1.0)
## Temporal Scale Dependence of Volatility Compression Breakouts (TSD)

**Programa Institucional**: `ALPHA_DISCOVERY_AD003`  
**Identificador do Programa**: `AD003`  
**Status**: **CHARTER SUBMETIDO À HOMOLOGAÇÃO EXECUTIVA — PRÉ-EXECUÇÃO**  
**Data UTC de Emissão**: `2026-09-03T05:45:00.000Z`  
**Autoridade Técnica**: Senior CTO & Guardião da Arquitetura / Diretoria de Engenharia Quantitativa  
**Linhagem Epistêmica**: `H010 (Archived)` $\to$ `H011 (Archived / Confirmatory Failure)` $\to$ **`AD003 (New Discovery Program)`**  
**Invariante de Produção**: `InstitutionalQuantSignalEngine` V8 SHA-256 `fc19e807255b3ecfb8351e82d7dc9d244c1e511d9aa007ac8b67b12d584b4db1` (**100% INTACTO**).  

---

## 0. Cláusula Constitucional de Independência Epistêmica

1. **Separação Causal Irreversível de H011**:
   A hipótese `H011` está terminalmente arquivada no Master Hypothesis Ledger como falha confirmatória ($N=50 < 150, p=0,0945$). O programa `AD003` **NÃO** é uma tentativa de recuperação, reparametrização ou salvamento de `H011`. É um programa de pesquisa primária completamente autônomo.
2. **Vedação ao Window-Shopping Pós-H011**:
   É terminantemente proibido selecionar timeframes ou parâmetros ad-hoc após observar dados. Todo o espaço de busca do `AD003` é definido a priori neste Charter.
3. **Exclusão Estrita do Timeframe 1H**:
   O timeframe de **1 hora (1h)** está **proibido de participar como candidato elegível** à promoção dentro do `AD003`. O 1H foi intensamente explorado em AD002/H011 e, portanto, sua virginidade epistemológica está comprometida. Poderá constar em relatórios apenas como linha de base histórica de referência comparativa.

---

## 1. Fundamentação Teórica & Pergunta Científica

### 1.1. Pergunta Científica Central:
> **A relação condicional entre compressão de volatilidade e rompimentos direcionais com payoff assimétrico (1:5) exibe invariância de escala (propriedade fractal intrínseca) ou depende da escala temporal econômica ancorada nos ciclos diurnos de liquidez?**

### 1.2. As Duas Hipóteses Teóricas Concorrentes:
- **Hipótese de Escala Econômica Temporal ($H_{\text{Econ}}$)**:
  A compressão de volatilidade e a subsequente expansão direcional são fenômenos causados por ciclos de acumulação de inventário institucional ligados à rotação de sessões globais (ciclos de 24h a 48h). Logo, a borda estatística depende do tempo cronológico acumulado, e não do número arbitrário de barras geradas pelo relógio da exchange.
- **Hipótese de Escala Intrínseca de Barras ($H_{\text{Intr}}$)**:
  A volatilidade é um processo fractal auto-similar. A compressão de $K$ barras consecutivas representa uma saturação informacional independente do intervalo amostral da barra (15m, 30m, 2h ou 4h).

---

## 2. Pilar 1: Matriz Ortogonal Bidimensional Fechada (40 Hipóteses)

Para investigar rigorosamente ambas as hipóteses teóricas sem viés de seleção, o `AD003` estabelece uma grade finita de **exatamente 40 hipóteses ortogonais** (`TSD001` a `TSD040`), cruzando 4 timeframes, 5 modelos de lookback e 2 níveis de compressão:

### 2.1. Dimensão 1 — Timeframes Elegíveis (4 Níveis):
$$\mathcal{TF} \in \{\text{15m}, \ \text{30m}, \ \text{2h}, \ \text{4h}\}$$

### 2.2. Dimensão 2 — Modelos de Lookback $K$ (5 Níveis):
1. **Escala Econômica 24 Horas ($E_{24h}$)**:
   - 15m: $K = 96$ barras ($96 \times 15\text{m} = 24\text{h}$)
   - 30m: $K = 48$ barras ($48 \times 30\text{m} = 24\text{h}$)
   - 2h: $K = 12$ barras ($12 \times 2\text{h} = 24\text{h}$)
   - 4h: $K = 6$ barras ($6 \times 4\text{h} = 24\text{h}$)
2. **Escala Econômica 48 Horas ($E_{48h}$)**:
   - 15m: $K = 192$ barras ($192 \times 15\text{m} = 48\text{h}$)
   - 30m: $K = 96$ barras ($96 \times 30\text{m} = 48\text{h}$)
   - 2h: $K = 24$ barras ($24 \times 2\text{h} = 48\text{h}$)
   - 4h: $K = 12$ barras ($12 \times 4\text{h} = 48\text{h}$)
3. **Escala Intrínseca Curta ($I_{20}$)**: $K = 20$ barras fixas
4. **Escala Intrínseca Média ($I_{40}$)**: $K = 40$ barras fixas
5. **Escala Intrínseca Longa ($I_{80}$)**: $K = 80$ barras fixas

### 2.3. Dimensão 3 — Níveis de Compressão $\theta$ (2 Níveis):
$$\theta \in \{0,60, \ 0,65\}, \quad \text{com expansão de volume fixa em } v = 1,50 \times \bar{V}_{24}$$

### 2.4. Espaço Amostral Total:
$$M = 4 \text{ timeframes} \times 5 \text{ lookbacks} \times 2 \text{ compressões} = \mathbf{40 \text{ hipóteses catalogadas}}.$$

---

## 3. Pilar 2: Fricção, Feasibility Filter e Preservação do Risco ($1R$)

Em estrito atendimento à determinação executiva, rejeita-se a distorção artificial do stop loss em timeframes rápidos:

### 3.1. Dimensionamento do Risco Base:
$$R_{\text{raw}, t} = 1,5 \times ATR_{24, t} \quad (\text{calculado na escala de barras do respectivo timeframe})$$

### 3.2. Filtro de Viabilidade Econômica Institucional (Feasibility Filter):
$$\text{Se } R_{\text{raw}, t} < 0,0080 \cdot C_t \ (80\text{ bps}) \implies \mathbf{TRADE \ INELIGÍVEL \ (SKIP)}$$
- **Racional Econômico**: Não se deforma a microestrutura do trade. Se o rompimento intrínseco de 15m ou 30m possui amplitude menor que 80 bps, a operação é descartada antes da entrada. Isso mede honestamente se o timeframe consegue gerar amplitude de breakout economicamente viável após fricção.

### 3.3. Modelo de Custos Sem Dupla Contagem:
Para trades elegíveis ($R_{\text{raw}, t} \ge 80\text{ bps}$):
- Taxa da Exchange: $10\text{ bps}$ ($0,0010$ nocional round-trip).
- Slippage de Execução: $2\text{ bps}$ ($0,0002$ por operação).
- Custo Total em Unidades de R:
  $$CostR_t = \frac{0,0012 \cdot C_t}{R_{\text{raw}, t}} \le \frac{0,0012}{0,0080} = 0,15R$$
- **Convenção de Pior Caso**: Colisão no mesmo bar ($H \ge TP$ e $L \le SL$) $\implies$ SL acionado primeiro ($r_{\text{gross}} = -1,0R$).
- **Regra de GAP**: Slippage de 2 bps deduzido no preço de abertura da barra; deduz-se apenas a taxa de 10 bps no nocional.
- **Timeout Econômico Equivalente a 72 Horas**:
  - 15m: 288 barras ($288 \times 15\text{m} = 72\text{h}$)
  - 30m: 144 barras ($144 \times 30\text{m} = 72\text{h}$)
  - 2h: 36 barras ($36 \times 2\text{h} = 72\text{h}$)
  - 4h: 18 barras ($18 \times 4\text{h} = 72\text{h}$)

---

## 4. Pilar 3: Partição de Dados e Chinese Wall Prévia (2023–2024 vs 2025–2026)

Para assegurar isolamento absoluto e impedir overfitting temporal:

```text
                                AD003 DATA PARTITION
                                         │
                    ┌────────────────────┴────────────────────┐
                    ▼                                         ▼
         DISCOVERY POPULATION                      CONFIRMATORY HOLDOUT
       2023-01-01 a 2024-12-31                    2025-01-01 a 2026-08-31
          (2 Anos Completos)                         (20 Meses Virgens)
                    │                                         │
         6 Ativos Principais                       100% LACRADA SOB FIREWALL
     (BTC, ETH, SOL, AVAX, LINK, DOGE)             Nenhum script de AD003
                    │                              pode ler velas >= 2025
        4 Timeframes (15m, 30m, 2h, 4h)                       │
                    │                                         ▼
                    ▼                              Só acessível após novo
         Mineração sob FDR 5%                      pré-registro congelado
```

---

## 5. Protocolo de Multiplicidade & Regra Estrita de Seleção Confirmatória

### 5.1. Controle de Falsa Descoberta (FDR de Benjamini-Hochberg):
1. Para cada uma das $M=40$ hipóteses, calcula-se o $p$-valor empírico sob hipótese nula centrada via Block Bootstrap ($B = 10.000$).
2. Aplica-se compulsoriamente a correção de Benjamini-Hochberg ($\alpha = 0,05$):
   $$q_{(i)} = \min_{k \ge i} \left( \frac{M \cdot p_{(k)}}{k} \right)$$
3. **Barreira de Promoção**: Apenas hipóteses com $q_{(i)} < 0,0500$ são elegíveis para a fase confirmatória.

### 5.2. Mecanismo Pré-Registrado de Seleção de Candidato Único:
- Se **0 de 40** hipóteses atingirem $q_{\text{FDR}} < 0,0500 \implies$ **PROGRAMA AD003 REJEITADO EM DISCOVERY (FAIL SUMÁRIO)**. Nenhuma hipótese pode ser promovida para confirmação.
- Se uma ou mais hipóteses atingirem $q_{\text{FDR}} < 0,0500$:
  1. Identifica-se a **maior bacia topologicamente contígua** de células significativas no espaço paramétrico;
  2. Seleciona-se o **medoide da bacia** como o **único candidato confirmatório**;
  3. Rejeita-se sumariamente qualquer outlier isolado de menor amostra (proibição do cherry-picking).
- O candidato selecionado é então **congelado em especificação confirmatória independente** antes de qualquer acesso ao holdout `2025–2026`.

---

## 6. Critérios Inegociáveis de Rejeição de Candidatos

Qualquer configuração será desqualificada no Discovery se:
1. $E[R]_{\text{net}} \le 0,00R$ após custos reais de 12 bps;
2. $N_{\text{trades}} < 150$ no período de descoberta de 2 anos (2023–2024);
3. O Profit Factor for $< 1,30$;
4. Mais de $70\%$ dos sinais forem rejeitados pelo Feasibility Filter ($R_{\text{raw}} < 80\text{ bps}$), indicando incompatibilidade estrutural do timeframe com o modelo de custos.

---

## 7. Status Operacional Atual

```text
PROGRAMA                         = AD003 (TEMPORAL SCALE DEPENDENCE)
ESTADO                           = CHARTER v1.0 CONCLUÍDO (AGUARDANDO HOMOLOGAÇÃO)
MATRIZ DE HIPÓTESES              = 40 HIPÓTESES FECHADAS (TSD001 A TSD040)
POPULAÇÃO DE DISCOVERY           = 2023-01-01 A 2024-12-31 (6 ATIVOS, 4 TFS)
POPULAÇÃO CONFIRMATÓRIA          = 2025-01-01 A 2026-08-31 (100% LACRADA)
TIMEFRAME 1H                     = 100% EXCLUÍDO DA COMPETIÇÃO
DATA FIREWALL                    = ATIVO
MOTOR V8                         = 🔒 UNTOUCHED (fc19e807...b4db1)
```

Submetemos o **Charter AD003 v1.0** à apreciação da Governança Executiva para homologação prévia antes de qualquer geração de dados ou catalogação formal de matriz.
