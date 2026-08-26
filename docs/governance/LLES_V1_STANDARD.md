# 🏛️ LLES-v1.0 — LYZER LOGIC EPISTEMIC STANDARD

**Versão do Padrão:** LLES-v1.0  
**Data de Emissão:** 2026-08-25  
**Autoridade:** Guardião da Arquitetura (`@[lyzer-guardian]`) & Comitê Institucional de Governança  
**Status:** CONSTITUCIONAL & INEGOCIÁVEL (P0)  
**Escopo:** 100% de relatórios de auditoria, dashboards executivos, minutas de comitê de investimento, logs de governança e ledgers contábeis.

---

## 🎯 1. OBJETIVO & MANIFESTO EPISTÊMICO

No ecossistema **Lyzer Edge**, a verdade epistemológica é o único fundamento aceitável para tomada de decisão e alocação de risco. Sistemas algorítmicos complexos frequentemente colapsam não por incapacidade de cálculo, mas por **contaminação semântica e ilusão epistêmica** — a confusão deliberada ou acidental entre o que está no código, o que aconteceu no mercado físico, o que é inferência probabilística e o que é mera simulação hipotética.

> *"A ilusão epistêmica é a mãe da ruína quantitativa. Uma perda evitada por um freio de emergência jamais pode ser contabilizada como capital em caixa."*

O padrão **LLES-v1.0** estabelece uma barreira formal, mecânica e verificável contra:
1. Alucinações de dados e métricas infladas artificialmente.
2. Contaminação entre simulações contrafactuais e a contabilidade realizada.
3. O erro catastrófico do **"Phantom PnL"** (lucro fantasma).

---

## 🏷️ 2. AS 5 TAGS EPISTÊMICAS CANÔNICAS

Toda declaração, linha de log de governança, métrica de dashboard e relatório de auditoria deve ser tipada formalmente por uma das **5 tags epistêmicas canônicas**:

```
                                  ┌─────────────────────────────────────────────────────────────┐
                                  │                  LLES-v1.0 EPISTEMIC TREE                   │
                                  └──────────────────────────────┬──────────────────────────────┘
                                                                 │
                  ┌───────────────────────────────┬──────────────┴───────────────┬──────────────────────────────┐
                  ▼                               ▼                              ▼                              ▼
          [FACT:CODE]                     [FACT:RUNTIME]                 [FACT:DATASET]            [INFERENCE:EMPIRICAL]
     Invariante da AST /            Telemetria Física ao Vivo /       Série Histórica Fechada /     Dedução Probabilística /
     Regra Determinística           Execuções Físicas Reais           Causal Memory Persistida      Sharpe / IC 95% / Regressão
                  │                               │                              │                              │
                  └───────────────────────────────┴──────────────┬───────────────┴──────────────────────────────┘
                                                                 │ (SEGREGAÇÃO ABSOLUTA)
                                                                 ▼
                                                  [COUNTERFACTUAL:HYPOTHESIS]
                                                   Simulações "What-If" / Estresse /
                                                   Perdas Evitadas (Quarentenadas)
```

---

### 2.1 `[FACT:CODE]` — Fato de Código & Invariante Determinístico

- **Definição:** Verdades mecânicas verificáveis diretamente na árvore sintática abstrata (AST), no código-fonte compilado ou em constantes de configuração do repositório.
- **Autoridade Epistêmica:** `DETERMINISTIC_CODE_INVARIANT`
- **Requisito de Evidência:** Referência direta a arquivo, linha, constante ou assinatura de função.
- **Permissão Contábil:** ❌ Proibido somar a ledgers financeiros.
- **Exemplos Canônicos:**
  - `[FACT:CODE] O Stop-Loss da estratégia fixa está configurado em 1.2% no streamEngine.js:802.`
  - `[FACT:CODE] O limiar TRG_THRESHOLD está fixado em 0.40 no executionTriggerLayer.js.`
  - `[FACT:CODE] O pipeline sequencial de 7 camadas é executado na ordem: Providers -> Residualization -> ExecutionTrigger -> TruthKernel -> C-CLIST -> MOL -> ECA Court.`

---

### 2.2 `[FACT:RUNTIME]` — Fato de Execução Física ao Vivo

- **Definição:** Eventos físicos observados em tempo real durante a execução do processo operacional: telemetria de rede, ordens preenchidas na exchange física/testnet, consumo de memória e latências aferidas.
- **Autoridade Epistêmica:** `OBSERVED_PHYSICAL_TELEMETRY`
- **Requisito de Evidência:** Timestamp monotônico UTC, ID causal de evento (UUIDv7), resposta HTTP/WS autenticada ou probe de hardware.
- **Permissão Contábil:** ✅ Permitido compor o Realized Ledger (com proveniência verificada).
- **Exemplos Canônicos:**
  - `[FACT:RUNTIME] Ordem 0x7b1c preenchida na Binance Testnet a 64.210,50 USDT (Qty: 0.001 BTC).`
  - `[FACT:RUNTIME] Processo registrou 1.420 ticks em 60s com latência P99 de 1.8ms.`
  - `[FACT:RUNTIME] Veto emitido pela Corte Constitucional para o Intent 01a03b2f com motivo VETO_EDGE_RIDING.`

---

### 2.3 `[FACT:DATASET]` — Fato de Registro Persistido / Base Histórica

- **Definição:** Registros históricos imutáveis armazenados em bancos de dados relacionais, tabelas SQLite de Causal Memory ou arquivos fechados de candles já finalizados.
- **Autoridade Epistêmica:** `HISTORICAL_PERSISTED_DATA`
- **Requisito de Evidência:** Nome do dataset, intervalo de datas (`start_time` a `end_time`), contagem exata de linhas ($N$) e hash SHA-256 da base.
- **Permissão Contábil:** ✅ Permitido compor o Realized Ledger histórico / Backtest Audit.
- **Exemplos Canônicos:**
  - `[FACT:DATASET] Dataset BTCUSDT 1m compreendendo 1.000 candles entre 2026-08-01 00:00 e 2026-08-01 16:40 UTC.`
  - `[FACT:DATASET] Banco de dados causal_memory.db possui 126 registros de testes de fronteira indexados.`
  - `[FACT:DATASET] Histórico de 500 execuções fechadas com slippage e comissões registradas.`

---

### 2.4 `[INFERENCE:EMPIRICAL]` — Inferência Estatística & Dedução Probabilística

- **Definição:** Conclusões numéricas derivadas matematicamente de observações de dados: taxas de acerto, Sharpe Ratio, Profit Factor, regressões, intervalos de confiança e scores de causalidade.
- **Autoridade Epistêmica:** `STATISTICAL_INDUCTIVE_INFERENCE`
- **Requisito de Evidência:** Tamanho amostral $N$, graus de liberdade, Intervalo de Confiança (ex: $95\%\text{ CI}$), $p\text{-value}$ e fórmula matemática utilizada.
- **Permissão Contábil:** ❌ Proibido somar a balanços patrimoniais em caixa (é uma métrica analítica, não capital físico).
- **Exemplos Canônicos:**
  - `[INFERENCE:EMPIRICAL] Realized Sharpe é -2.16 (N=30 trades, 95% CI [-3.12, -1.20], p=0.458), indicando ausência de significância estatística de edge.`
  - `[INFERENCE:EMPIRICAL] Win Rate observado é de 26.67% em regime de volatilidade chop.`
  - `[INFERENCE:EMPIRICAL] Causal Evidence Score (CES) calculado em 74.2/100 com cobertura de 4 regimes distintos.`

---

### 2.5 `[COUNTERFACTUAL:HYPOTHESIS]` — Hipótese Contrafactual & Simulação

- **Definição:** Cenários "what-if", simulações sintéticas, projeções de Monte Carlo, testes de estresse de Black Swan e cálculos de **perdas evitadas por vetos**.
- **Autoridade Epistêmica:** `NON_REALIZED_HYPOTHETICAL_SIMULATION`
- **Requisito de Evidência:** Premissas do cenário, parâmetros do simulador e declaração explícita de não-realização física.
- **Permissão Contábil:** 🚨 **TERMINANTEMENTE PROIBIDO SOMAR A LEDGERS REALIZADOS.**
- **Exemplos Canônicos:**
  - `[COUNTERFACTUAL:HYPOTHESIS] Veto do TruthKernel evitou uma perda teórica estimada de -$120.00 caso a ordem atingisse o Stop-Loss.`
  - `[COUNTERFACTUAL:HYPOTHESIS] Simulação de choque de liquidez de 30% projeta drawdown máximo de 12.4%.`
  - `[COUNTERFACTUAL:HYPOTHESIS] Se o consensusLimit fosse 0.0, teriam ocorrido 45 entradas adicionais no período auditado.`

---

## 🚫 3. A PROIBIÇÃO ABSOLUTA DO "PHANTOM PNL" (AXIOMA FIDUCIÁRIO)

### 3.1 A Falácia do Lucro Fantasma
Existe uma tentação intelectual e contábil comum em sistemas de gestão de risco de argumentar:
> *"O nosso sistema vetou um trade que teria perdido \$1.000. Logo, o sistema 'gerou' \$1.000 de retorno."*

**Isto é uma mentira contábil e epistemológica.**

Se a sua conta bancária tinha \$10.000 e um trade perdedor de -\$1.000 foi bloqueado, o seu saldo após o bloqueio continua sendo exatamente **\$10.000**, e não \$11.000.
Evitar uma perda preserva capital; **não cria capital novo**.

### 3.2 O Teorema da Segregação Contábil
$$\text{Realized Ledger (Patrimônio Real)} = \text{Saldo Inicial} + \sum_{i \in \text{Execuções Reais}} (\text{Gross PnL}_i - \text{Taxas}_i - \text{Slippage}_i)$$

$$\text{Realized Ledger} \cap \text{Telemetria Contrafactual} = \emptyset$$

### 3.3 Regras Mecânicas Invioláveis
1. **Campos Banidos no Ledger Realizado:** É terminantemente proibido registrar ou somar campos como `avoided_loss`, `saved_pnl`, `counterfactual_pnl`, `veto_savings`, `phantom_pnl` ou `synthetic_gain` no cálculo do NAV, Profit Factor Realizado, Win Rate Realizado ou Curva de Capital Realizada.
2. **Defesa Mecânica Ativa (`PhantomPnLGuard`):** Toda inserção de dados no Ledger ou motor de métricas passa pela inspeção do `PhantomPnLGuard.assertZeroPhantomPnL()`. A detecção de valores contrafactuais não-nulos em registros realizados dispara imediatamente o erro fatal **`PhantomPnLContaminationError`**.
3. **Quarentena Contrafactual:** Perdas evitadas podem ser registradas exclusivamente no canal analítico `counterfactualTelemetry`, sempre etiquetadas com `[COUNTERFACTUAL:HYPOTHESIS]`.

---

## 💻 4. ESPECIFICAÇÃO DE CÓDIGO E INTEGRAÇÃO

### 4.1 Utilização no Código TypeScript / JavaScript

```javascript
import { 
  LLES_TAGS, 
  formatEpistemicLog, 
  formatEpistemicDashboardMetric, 
  formatEpistemicReport,
  PhantomPnLGuard 
} from '@lyzer/shared';

// 1. Emissão de Log de Governança
const log = formatEpistemicLog(
  LLES_TAGS.FACT_RUNTIME,
  'ConstitutionalCourt',
  'Permission token granted for Intent 01a03b2f',
  { symbol: 'BTCUSDT', qty: 0.001 }
);
console.log(log.message);
// Saída: [FACT:RUNTIME] [ConstitutionalCourt] Permission token granted for Intent 01a03b2f

// 2. Formatação de Métrica de Dashboard
const metric = formatEpistemicDashboardMetric({
  name: 'realized_pnl_usd',
  tag: LLES_TAGS.FACT_RUNTIME,
  value: 450.25,
  unit: 'USD',
  source: 'causal_memory.db'
});

// 3. Blindagem de Trades contra Phantom PnL
const cleanTrades = PhantomPnLGuard.sanitizeRealizedTrades(rawTrades);
```

### 4.2 Formato Padrão de Relatórios de Comitê de Investimento

Toda ata ou relatório executivo deve adotar a estrutura padronizada:

```markdown
# 🏛️ INVESTIGATION REPORT / COMMITTEE MINUTES
**Date:** 2026-08-25 · **Standard:** LLES-v1.0 · **Author:** @lyzer-guardian

## [FACT:CODE] Invariantes do Código & Arquitetura
- O código-fonte em streamEngine.js aplica o SL em 1.2%.

## [FACT:DATASET] Base Histórica Utilizada
- Dataset com 1.000 candles de 1m entre 01/08 e 02/08/2026.

## [FACT:RUNTIME] Telemetria FÍsica Observada
- NAV Realizado apurado: R$ 105.420,50.

## [INFERENCE:EMPIRICAL] Conclusões Estatísticas Calibradas
- Sharpe Ratio realizado: -2.16 (N=30, p=0.458).

## [COUNTERFACTUAL:HYPOTHESIS] Cenários Simulados & Perdas Evitadas
- Perda evitada por vetos da Corte ECA no período: -$420.00 (Quarentenada, não somada ao NAV).
```

---

## ⚖️ 5. TAXONOMIA DE VIOLAÇÕES EPISTÊMICAS & PENALIDADES

| Nível de Violação | Descrição da Infracção | Consequência no Sistema |
|---|---|---|
| **Nível 1 (Leve)** | Declaração ou log de governança sem tag LLES-v1.0 ou com tag não padronizada. | Alerta no linter de governança e rejeição no PR Check de CI/CD. |
| **Nível 2 (Grave)** | Desalinhamento de autoridade (ex: classificar simulação como `[FACT:RUNTIME]`). | Veto de publicação da evidência; reprovação no Architecture Review Board. |
| **Nível 3 (Crítico - P0)** | **Contaminação por Phantom PnL** (somar perda evitada ao saldo ou mascarar retorno com contrafactual). | Disparo imediato de `PhantomPnLContaminationError`, bloqueio mecânico do ledger e emissão de alarme C-Level. |

---

## 📜 6. VEREDITO CONSTITUCIONAL

> **"A reputação institucional do Lyzer Edge repousa sobre a pureza de sua contabilidade e a honestidade de suas métricas. Toda inferência deve declarar suas premissas; todo fato deve provar sua origem; e nenhuma perda evitada jamais contaminará a realidade do capital realizado."**
