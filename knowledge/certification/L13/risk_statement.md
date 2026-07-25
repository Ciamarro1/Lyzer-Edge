# ⚖️ L13 INSTITUTIONAL FIDUCIARY RISK STATEMENT
**Date:** Julho 2026

Este documento formaliza a declaração fiduciária de gerenciamento de risco perante cotistas, auditores e comitês de governança do fundo Lyzer Edge.

## 1. Princípio de Preservação Patrimonial
O fundo quantitativo Lyzer Edge não tem compromisso com lucros a qualquer custo. O compromisso supremo e inegociável é a **preservação do capital sob gestão** e a sobrevivência a choques sistêmicos de cauda longa.

## 2. Circuit Breakers Institucionais (Hard Limits)
- **Drawdown Intradiário > 5%:** O sistema corta sumariamente 50% da alocação de risco (Cautious Mode).
- **Drawdown Intradiário > 10%:** O sistema cancela ordens pendentes, zera posições abertas e decreta **HALT INSTITUCIONAL**. O religamento exige 24 horas de cooldown em Recovery Mode.
- **Divergência Institucional > 15%:** Se a diferença entre backtest e execução real superar 15% em 30 dias, o fundo assume mudança estrutural na exchange e regride para **SHADOW MODE** autonomamente.
- **Orçamento Macro L12 (0% em Crise):** Se a correlação ultracurta entre ativos de risco disparar para > 0.80, o risco sistêmico zera o orçamento de risco (HALT).

## 3. Rastreabilidade Total
Nenhuma operação pode ser realizada sem o registro prévio, assinado e carimbado no `DecisionLedger`, garantindo 100% de transparência em auditorias forenses.
