# ADENDO CONSTITUCIONAL DE PESQUISA — `AD003` (v1.0)
## Resolução das Lacunas Constitucionais: Teste Formal, Grafo de Adjacência, Contrato de Execução, Dependência Transversal e Elegibilidade Amostral

**Programa Institucional**: `ALPHA_DISCOVERY_AD003`  
**Identificador do Documento**: `AD003_CONSTITUTIONAL_ADDENDUM_v1.0`  
**Data UTC de Emissão**: `2026-09-03T05:50:00.000Z`  
**Status**: **INTEGRADO AO CHARTER AD003 — DADOS DE DISCOVERY BLOQUEADOS AGUARDANDO LIBERAÇÃO FORMAL**  
**Motor V8 SHA-256**: `fc19e807255b3ecfb8351e82d7dc9d244c1e511d9aa007ac8b67b12d584b4db1` (**100% INTACTO**).  

---

## 🏛️ Cláusula de Supremacia Constitucional

Este Adendo complementa o `AD003_TEMPORAL_SCALE_DEPENDENCE_CHARTER.md` e vincula compulsoriamente todas as fases de implementação, mineração e seleção.  
**Nenhum dado do período de Discovery (2023–2024) pode ser lido sem que este Adendo esteja commitado e selado.**

---

## 📐 1. Especificação Matemática Rigorosa do Teste Estatístico Primário

O procedimento de inferência estatística de cada uma das 40 hipóteses é formalmente definido:

### 1.1. Par de Hipóteses:
$$H_0: E[R_{\text{net}}] \le 0,000R \quad \text{vs} \quad H_1: E[R_{\text{net}}] > 0,000R$$

### 1.2. Estimando e Estatística de Teste Amostral:
Para uma hipótese $h \in \{\text{TSD001} \dots \text{TSD040}\}$, sejam $N_h$ os trades elegíveis gerados nos 6 ativos no período 2023–2024, com retornos líquidos realizados $r_{\text{net}, i}$.  
A estatística de teste primária observada é a média aritmética dos retornos líquidos em unidades de R:
$$\bar{X}_h = \frac{1}{N_h} \sum_{i=1}^{N_h} r_{\text{net}, i}$$

### 1.3. Centralização sob $H_0$ (Hall, 1992):
$$\tilde{X}_i = r_{\text{net}, i} - \bar{X}_h$$

### 1.4. Unidade do Bloco e Dependência Temporal:
- **Janelas em Tempo Calendário de 14 Dias UTC**:
  $$\mathcal{W}_k = [T_{\text{start}} + (k-1) \cdot 14\text{d}, \ T_{\text{start}} + k \cdot 14\text{d})$$
  com época de referência congelada em $T_{\text{start}} = \text{2023-01-01T00:00:00.000Z}$ e passo $\Delta = 14 \times 86.400.000\text{ ms}$.
- O bloco $\mathcal{B}_k$ agrupa todos os trades dos 6 ativos cujo encerramento ($t_{\text{exit}}$) ocorreu dentro de $\mathcal{W}_k$.
- Trades em blocos centrados: $\tilde{\mathcal{B}}_k = \{ \tilde{X}_i \mid t_{\text{exit}, i} \in \mathcal{W}_k \}$.

### 1.5. Estimador Trade-Weighted de Reamostragem:
- Reamostram-se com reposição $M_{\text{windows}}$ índices de blocos uniformemente, gerando a réplica $b$:
  $$\bar{\tilde{X}}_b^* = \frac{\sum_{j=1}^{M_{\text{windows}}} \sum_{i \in \tilde{\mathcal{B}}_{w_j}^*} \tilde{X}_i}{\sum_{j=1}^{M_{\text{windows}}} |\tilde{\mathcal{B}}_{w_j}^*|}$$
  *(Proibida expressamente a média não ponderada de janelas).*

### 1.6. Parâmetros Computacionais Fixos:
- Réplicas Monte Carlo: $B = 10.000$.
- Gerador Pseudo-Aleatório: `Mulberry32` com semente fixa **`seed = 888888`**.
- $p$-valor empírico univariado:
  $$p_h = \frac{1 + \sum_{b=1}^B \mathbb{I}(\bar{\tilde{X}}_b^* \ge \bar{X}_h)}{1 + B}$$

### 1.7. Controle de Multiplicidade (Benjamini-Hochberg FDR 5%):
Ordenam-se os $p$-valores das $M=40$ hipóteses em ordem crescente $p_{(1)} \le p_{(2)} \le \dots \le p_{(40)}$.  
O valor crítico ajustado ($q$-valor) é:
$$q_{(i)} = \min_{k \ge i} \left( \frac{40 \cdot p_{(k)}}{k} \right)$$
Uma hipótese é estatisticamente elegível se e somente se **$q_h < 0,0500$**.

---

## 🌐 2. Grafo Formal de Adjacência Topológica e Tie-Break Determinístico

Para erradicar qualquer ambiguidade sobre o significado de "maior bacia topologicamente contígua", define-se o grafo $G = (V, E)$:

### 2.1. Vértices $V$:
Os 40 nós correspondem às 40 hipóteses catalogadas `TSD001` a `TSD040`, indexadas pelo vetor de coordenadas $\mathbf{x} = (t, m, \theta)$:
- **Timeframe Ordinal $t \in \{0, 1, 2, 3\}$**: $0 \to 15\text{m}$, $1 \to 30\text{m}$, $2 \to 2\text{h}$, $3 \to 4\text{h}$.
- **Modelo de Escala $m \in \{0, 1, 2, 3, 4\}$**:
  - Ramo Econômico: $0 \to E_{24h}$, $1 \to E_{48h}$.
  - Ramo Intrínseco: $2 \to I_{20}$, $3 \to I_{40}$, $4 \to I_{80}$.
- **Compressão $\theta \in \{0, 1\}$**: $0 \to 0,60$, $1 \to 0,65$.

### 2.2. Arestas $E$ (Função de Adjacência Formal):
Dois nós $u, v \in V$ são adjacentes ($u \sim v$) se e somente se diferem em **exatamente uma coordenada**, respeitando a topologia:
1. **Adjacência de Timeframe**: $m_u = m_v$ e $\theta_u = \theta_v$, com $|t_u - t_v| = 1$.
2. **Adjacência de Escala**: $t_u = t_v$ e $\theta_u = \theta_v$, com:
   - Ou $m_u, m_v \in \{0, 1\}$ (dentro do ramo econômico) e $|m_u - m_v| = 1$;
   - Ou $m_u, m_v \in \{2, 3, 4\}$ (dentro do ramo intrínseco) e $|m_u - m_v| = 1$.
   *(Não existe aresta direta entre o ramo econômico $m=1$ e o ramo intrínseco $m=2$, pois representam paradigmas ontológicos distintos).*
3. **Adjacência de Compressão**: $t_u = t_v$ e $m_u = m_v$, com $|\theta_u - \theta_v| = 1$.

### 2.3. Definição de Bacia Significativa:
Seja $V_{\text{elegível}} \subseteq V$ o conjunto de hipóteses que satisfazem simultaneamente:
1. $q_h < 0,0500$ (FDR 5%);
2. $N_h \ge N_{\text{min\_discovery}}$ ($60$ trades);
3. $E[R]_{\text{net}} \ge +0,150R$.

Uma **Bacia** $\mathcal{C} \subseteq V_{\text{elegível}}$ é uma componente conexa do subgrafo induzido $G[V_{\text{elegível}}]$.

### 2.4. Algoritmo Determinístico de Desempate de Bacias:
Caso existam múltiplas componentes conexas em $V_{\text{elegível}}$:
1. **Cardinalidade**: Seleciona-se a bacia com maior número de nós ($|\mathcal{C}|$).
2. **Critério de Desempate 1 (Qualidade Estatística)**: Se duas bacias tiverem o mesmo $|\mathcal{C}|$, vence a bacia com **menor média de $q$-valores** ($\frac{1}{|\mathcal{C}|} \sum_{h \in \mathcal{C}} q_h$).
3. **Critério de Desempate 2 (Lexical)**: Se persistir o empate, vence a bacia cujo nó com menor ID lexical for numericamente inferior (ex: bacia contendo `TSD005` vence bacia com menor nó `TSD015`).

### 2.5. Cálculo do Medoide Determinístico da Bacia Vencedora $\mathcal{C}^*$:
Para cada nó $u \in \mathcal{C}^*$, calcula-se a distância média geodésica no grafo $G$:
$$D(u) = \sum_{v \in \mathcal{C}^*} d_G(u, v)$$
O medoide é o nó $u^* \in \mathcal{C}^*$ que minimiza $D(u)$.  
**Desempate para Medoide**:
1. Menor $q$-valor individual ($q_u$);
2. Maior tamanho amostral ($N_u$);
3. Menor ID lexical (`TSD...`).  
*Zero discricionariedade humana. 100% reproduzível por máquina.*

---

## 📜 3. Contrato Estrito de Execução (Inviolabilidade Algorítmica)

O runner de discovery deve implementar verbatim as regras consolidadas no ciclo AD002/H011:
1. **Sinal de Fechamento**: Ocorrência e validação estritamente no fechamento da barra $t$ ($C_t$).
2. **Preço de Entrada**: $P_{\text{entry}} = C_t$.
3. **Inviolabilidade Temporal**: O monitoramento de saída (SL, TP, Timeout) inicia-se **estritamente na barra $t+1$**. Proibida qualquer checagem intrabar na barra de sinal $t$.
4. **Média de Volume Prévia**:
   $$\bar{V}_{24}(t) = \frac{1}{24} \sum_{k=1}^{24} V_{t-k} \quad (\text{barras } [t-24, t-1], \ \mathbf{NUNCA} \text{ incluindo } V_t)$$
5. **Rompimento Extremo Prévio**:
   - Long: $C_t > \max(H_{t-K}, \dots, H_{t-1})$
   - Short: $C_t < \min(L_{t-K}, \dots, L_{t-1})$  
   *(A barra $t$ é comparada exclusivamente contra as $K$ barras anteriores).*
6. **Colisão Intrabar (Pior Caso)**: Se dentro da mesma barra $H_k \ge TP$ e $L_k \le SL \implies$ Stop Loss executado primeiro ($r_{\text{gross}} = -1,0R$).
7. **Regra de GAP no Open**:
   - Long Gap SL ($O_k \le SL$): $P_{\text{exit}} = O_k - 0,0002 \cdot O_k$; dedução exclusiva de taxas: $r_{\text{net}} = \frac{P_{\text{exit}} - P_{\text{entry}}}{1R_t} - \frac{0,0010 \cdot C_t}{1R_t}$.
   - Long Gap TP ($O_k \ge TP$): $P_{\text{exit}} = O_k - 0,0002 \cdot O_k$; dedução exclusiva de taxas: $r_{\text{net}} = \frac{P_{\text{exit}} - P_{\text{entry}}}{1R_t} - \frac{0,0010 \cdot C_t}{1R_t}$.
   *(Espelhamento idêntico para Short).*
8. **Posição Única Concorrente por Ativo**: Enquanto houver posição aberta no ativo, novos sinais no mesmo ativo são ignorados. Posições simultâneas em ativos diferentes são permitidas.

---

## 🛡️ 4. Formulação Conceitual Rigorosa do Feasibility Filter (80 bps)

Substitui-se qualquer menção de derivação direta dos 12 bps pela formulação constitucional:
> **“Trades com $R_{\text{raw}} < 80\text{ bps}$ são considerados economicamente inviáveis sob o contrato AD003 e são excluídos antes da entrada.”**

- $R_{\text{raw}, t} = 1,5 \times ATR_{24, t}$.
- Se $R_{\text{raw}, t} < 0,0080 \cdot C_t \implies$ **SKIP** (nenhum trade registrado; contador de sinais inviáveis incrementado para auditoria).
- Se $R_{\text{raw}, t} \ge 0,0080 \cdot C_t \implies$ Trade executado com fricção real de $12\text{ bps}$:
  $$CostR_t = \frac{0,0012 \cdot C_t}{R_{\text{raw}, t}} \le 0,15R$$

---

## 🌐 5. Cláusula de Dependência Transversal de Ativos (Cross-Asset Dependence)

> **RECONHECIMENTO DE DEPENDÊNCIA TRANSVERSAL:**  
> Os seis ativos do universo de descoberta (`BTC`, `ETH`, `SOL`, `AVAX`, `LINK`, `DOGE`) não são tratados como séries estocasticamente independentes. Eles compartilham choques de liquidez, rotação de risco sistêmico e regimes macroeconômicos do complexo cripto.  
> O uso compulsório de **blocos em tempo calendário de 14 dias UTC** preserva essa estrutura de dependência transversal, mantendo agrupadas na mesma janela temporal todas as operações simultâneas ou correlacionadas entre os 6 ativos.

---

## 📊 6. Política de Tamanho Amostral Mínimo em Discovery ($N_{\text{min\_discovery}}$)

Para evitar que anomalias com 2 a 5 trades e retornos exorbitantes sejam classificadas como "descobertas promissoras":
- **Piso de Elegibilidade de Poder em Discovery**:
  $$\mathbf{N_{\text{min\_discovery}} = 60 \text{ trades independentes}}$$
  (Média mínima de ~30 trades por ano no universo combinado de 6 ativos durante o período de 2 anos de 2023–2024).
- **Regra**: Qualquer hipótese que gere $N_h < 60$ trades será sumariamente desqualificada ($V_{\text{elegível}}$ requer $N_h \ge 60$), impedindo que células sub-amostradas participem da formação de bacias confirmatórias.

---

## 🔒 Matriz de Lacre Operacional

```text
AD003 CHARTER v1.0               = HOMOLOGADO CONDICIONALMENTE
AD003 CONSTITUTIONAL ADDENDUM    = PROTOCOLADO & SELADO
TESTE ESTATÍSTICO PRIMÁRIO       = 14-DAY CALENDAR BLOCK BOOTSTRAP (B=10.000, Seed=888888)
GRAFO DE ADJACÊNCIA              = FORMALIZADO MATEMATICAMENTE
TIE-BREAK DE BACIAS              = 100% DETERMINÍSTICO (CARDINALIDADE -> Q-MÉDIO -> ID)
FEASIBILITY FILTER               = R_raw < 80 bps (EXCLUSÃO PURA DE INVIABILIDADE)
DEPENDÊNCIA DE ATIVOS            = FORMALMENTE RECONHECIDA NO BLOCO CALENDÁRIO
DISCOVERY MIN SAMPLE SIZE        = N >= 60 TRADES
DATA FIREWALL (2025–2026)        = 100% BLOQUEADO
DISCOVERY ACCESS (2023–2024)     = AGUARDANDO HOMOLOGAÇÃO EXECUTIVA FINAL
MOTOR V8                         = 🔒 UNTOUCHED (fc19e807...b4db1)
```

Este Adendo é submetido à Governança Executiva para homologação final de destravamento exclusivo dos dados de Discovery (2023–2024).
