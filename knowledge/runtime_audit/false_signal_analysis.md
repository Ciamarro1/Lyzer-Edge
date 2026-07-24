# Análise de Sinais Falsos e Frequência Operacional (False Signal & Churn Analysis)

- **Projeto**: Lyzer Edge
- **Auditor**: Guardião da Arquitetura & Principal Quant Auditor (`@[lyzer-guardian]`)
- **Base de Dados**: `lyzer edge/docs/lyzer_edge_backup_2026-07-24.json`

---

## 1. O Fenômeno de Churn e Overtrading

A auditoria dos timestamps das 1.389 operações revelou um comportamento atípico de disparo sequencial a cada 1 a 3 minutos:

```text
[Timestamp Analysis - Extrato de 10 minutos (18:40 - 18:50)]
- 18:40:02 -> LONG  SOL/USD (Loss)
- 18:40:12 -> LONG  GBP/USD (Loss)
- 18:41:05 -> SHORT BTC/USD (Win)
- 18:41:15 -> SHORT EUR/USD (Loss)
- 18:42:01 -> SHORT GBP/USD (Win)
- 18:42:10 -> SHORT EUR/USD (Loss)
- 18:43:02 -> SHORT BTC/USD (Loss)
- 18:43:11 -> SHORT EUR/USD (Loss)
- 18:44:04 -> SHORT BTC/USD (Win)
- 18:44:14 -> SHORT ETH/USD (Loss)
```

### Análise de Causa Raiz do Overtrading:

1. **Gatilhos de Sinal sem Cooldown**:
   - Os provedores de sinal (`v1_smc_ict.js`, `v2_snd_snr.js`, `v3_momentum_rsi.js`) emitiam sinais em quase todas as velas de 1 minuto (`1m`).
   - Não havia período mínimo de resfriamento (*cooldown*) entre trades no mesmo ativo.
2. **Ignorância da Estrutura H4/H1 no Trigger de Entrada**:
   - Embora o `TimeframeManager` montasse os candles de H4 e H1, o `EntryEngine` aceitava cruzamentos locais de M1 sem exigir o alinhamento de bias de H4.
3. **Incapacidade da Corte de Vetar quando a Volatilidade está Média**:
   - O `TruthKernel` vetava corretamente sob ruído catastrófico ($\text{LHDS} > 0.8$), mas em mercados de consolidação de baixa amplitude ($\text{TRG} \approx 0.45$), o sinal passava pelo portão sem atrito.

---

## 2. Histograma de Tempo de Retenção (Holding Time)

```text
Tempo de Retenção (Duração da Posição):
  < 1 minuto  : ▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇ (1.140 trades - 82%)
  1 - 3 min   : ▇▇▇▇ (210 trades - 15%)
  > 5 min     : █ (39 trades - 3%)
```

- **Diagnóstico**: 82% das posições foram estopadas ou atingiram TP em **menos de 60 segundos**.
- **Conclusão**: O sistema operava como um scalper cego sem buffer de ruído, sendo victimizado por pontas de spread e ruído de microestrutura de 1m.
