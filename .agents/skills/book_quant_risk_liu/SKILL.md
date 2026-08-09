---
name: book-quant-risk-liu
description: Toolkit extraído de Quantitative Risk Management Using Python. Foco na modelagem Python acoplada ao TRG do Lyzer.
domain: Quantitative Finance
priority: P1
---

# Quantitative Risk Management Using Python (Liu)

## FASE 0 — Epistemic Framing
1. **Livro Processado**: *Quantitative Risk Management Using Python* (Peng Liu, 2025).
2. **Domínio Principal**: Backtesting, Cálculo de Risco Quantitativo (GARCH, Copulas), Validação de Modelos.
3. **Prioridade**: **P1** (Vital para evitar que a Constitutional Court utilize aproximações não comprovadas ao analisar o `processCandle`).
4. **Depth**: `reference` (Bibliotecas Python e workflows estatísticos).

## FASE 1 — Intent Alignment (O Toolkit do Autor)

### 1. Frameworks Nomeados & Mental Models
- **Dependência Multivariada (Copulas)**: Ativos financeiros não quebram sozinhos. O risco global do sistema não é a soma simples dos riscos. Copulas (Gaussian, Student-t, Archimedean) são usadas para modelar o contágio.
- **Volatilidade Dinâmica (GARCH)**: A volatilidade muda de regime em clusters. Se o Lyzer Edge processou um "Jump", ele deve calibrar a volatilidade das próximas velas usando GARCH, e não médias móveis simples (SMA).

### 2. Regras de Decisão & Thresholds
- **Se for detectar anomalias no log causal**, ENTÃO use um modelo ARMA-GARCH para gerar os resíduos (inovações) ao invés de buscar os saltos de preço brutos.
- **Backtesting Threshold**: Se a falha do VaR no backtesting violar a zona de aceitação (Traffic Light de Basel), a estratégia/algoritmo deve ser desligada via Constitutional Court.

### 3. Anti-Padrões (O que NUNCA fazer)
- **Correlação de Pearson para Riscos**: NUNCA use correlação linear para eventos de cauda. Ela subestima o risco durante crises (o "Correlation Breakdown").
- **Dados Vazados (Look-ahead bias)**: No Event Sourcing do Lyzer Edge, as janelas de cálculo quantitativo NUNCA devem espiar eventos que estão no futuro do ponto no tempo analisado na Court.

### 4. Invariantes (Pre/Pós-Condições)
- **Invariante Causal Algorítmica**: O pipeline Python acionado pelo Lyzer Edge recebe um Snapshot puramente *point-in-time*. O modelo Python deve retornar resultados determinísticos.

### 5. Checklists Operacionais
- [ ] O código Python consome pacotes robustos (statsmodels, scipy, arch) adequadamente isolados num microserviço ou worker?
- [ ] O cálculo de risco marginal tem tratamento de falha (NaN/Infinity returns)?

## FASE 2 — Execution Directive
Qualquer lógica quantitativa no projeto Ciamarro1/Lyzer-Edge escrita em Python para dar suporte ao Node.js deve adotar abordagens GARCH em favor de volatilidades históricas simples (SMA/EMA).
