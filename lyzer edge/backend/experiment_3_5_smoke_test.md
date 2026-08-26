# 🔬 SMOKE TEST DE INSTRUMENTAÇÃO: Shadow Logger

**Objetivo:** Provar que a infraestrutura de telemetria captura sinais REJECT e PASS independentemente da execução, mantendo os campos solicitados, sem vazamentos e sem viés de otimização.

## 1. Verificação de Integridade dos Logs

Total de sinais registrados no arquivo: **4**

### Sinal: `SHADOW_BTCUSDT_1724544000000`
- **Veredito do Veto:** `REJECT`
- **Razão:** `NO_ACTION_GEOMETRY_FLAT`
- **SMA Distance:** `0.05%`
- **ATR:** `0.08%`
- **Estrutura Counterfactual:** MFE 5m/15m/30m/60m e PnL presentes? `SIM (Aguardando resolução temporal)`

### Sinal: `SHADOW_ETHUSDT_1724544100000`
- **Veredito do Veto:** `REJECT`
- **Razão:** `NO_ACTION_GEOMETRY_FLAT`
- **SMA Distance:** `0.20%`
- **ATR:** `0.08%`
- **Estrutura Counterfactual:** MFE 5m/15m/30m/60m e PnL presentes? `SIM (Aguardando resolução temporal)`

### Sinal: `SHADOW_ADAUSDT_1724544200000`
- **Veredito do Veto:** `REJECT`
- **Razão:** `NO_ACTION_GEOMETRY_FLAT`
- **SMA Distance:** `0.05%`
- **ATR:** `0.15%`
- **Estrutura Counterfactual:** MFE 5m/15m/30m/60m e PnL presentes? `SIM (Aguardando resolução temporal)`

### Sinal: `SHADOW_ADAUSDT_1724544260000`
- **Veredito do Veto:** `REJECT`
- **Razão:** `NO_ACTION_GEOMETRY_FLAT`
- **SMA Distance:** `0.05%`
- **ATR:** `0.15%`
- **Estrutura Counterfactual:** MFE 5m/15m/30m/60m e PnL presentes? `SIM (Aguardando resolução temporal)`

