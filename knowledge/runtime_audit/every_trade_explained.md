# Reconstrução Explícita e Categorização dos Trades (Every Trade Explained)

- **Projeto**: Lyzer Edge
- **Auditor**: Guardião da Arquitetura & Principal Quant Auditor (`@[lyzer-guardian]`)
- **Arquivo de Dados**: `lyzer edge/docs/lyzer_edge_backup_2026-07-24.json`
- **Tabela CSV Completa**: [`trade_reconstruction.csv`](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/knowledge/runtime_audit/trade_reconstruction.csv)

---

## 1. Categorização e Distribuição dos Trades Reais

As 1.389 operações fechadas extraídas do backup de produção foram categorizadas por perfil temporal, resultado e par de moedas:

### Distribuição por Perfil de Resultado:
- **Vencedoras (+6.00 PnL / 2R)**: 427 trades (30.74%)
- **Perdedoras (-3.00 PnL / -1R)**: 956 trades (68.83%)
- **Breakeven (0.00 PnL)**: 6 trades (0.43%)

---

## 2. Amostragem de Operações Auditadas

Abaixo apresenta-se uma amostragem auditada das operações gravadas em `lyzer_edge_backup_2026-07-24.json`:

| ID Trade | Ativo | Direção | Entrada (UTC) | Saída (UTC) | Preço Entrada | Preço Saída | Resultado | PnL ($) | Motivo Observado |
|---|---|---|---|---|---|---|---|---|---|
| **#1394** | SOL/USD | LONG | 18:51:00 | Open | 318.62 | Open | OPEN | $0.00 | Ordem Ativa |
| **#1387** | ETH/USD | SHORT | 18:45:00 | 18:45:30 | 4437.43 | 4444.09 | **LOSS** | -$3.00 | Ruído em M1 / Stop Hit |
| **#1373** | BTC/USD | LONG | 18:44:00 | 18:45:10 | 134047.86 | 134450.00 | **WIN** | +$6.00 | Expansão de Volatilidade |
| **#1372** | BTC/USD | SHORT | 18:43:00 | 18:43:40 | 134183.74 | 133982.47 | **WIN** | +$6.00 | Reversão Estrutural M1 |
| **#1368** | EUR/USD | SHORT | 18:42:00 | 18:42:25 | 1.47767 | 1.47796 | **LOSS** | -$3.00 | Falso Breakout em M1 |
| **#1365** | GBP/USD | SHORT | 18:34:00 | 18:34:40 | 1.63003 | 1.63003 | **BE** | $0.00 | Retorno ao Breakeven |

---

## 3. Acesso à Base Completa de 1.395 Trades

O arquivo CSV [`trade_reconstruction.csv`](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/knowledge/runtime_audit/trade_reconstruction.csv) contém todas as 1.395 linhas auditadas diretamente do arquivo `lyzer_edge_backup_2026-07-24.json`.
