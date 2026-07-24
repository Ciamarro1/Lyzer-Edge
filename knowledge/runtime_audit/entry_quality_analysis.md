# Análise de Qualidade de Entrada e Soluções Recomendadas

- **Projeto**: Lyzer Edge
- **Auditor**: Guardião da Arquitetura & Principal Quant Auditor (`@[lyzer-guardian]`)
- **Base de Dados**: `lyzer edge/docs/lyzer_edge_backup_2026-07-24.json`

---

## 1. Avaliação de Qualidade dos Sinais (Signal Quality Audit)

A análise empírica dos 1.389 trades revela que a baixa taxa de acerto (30,74%) deriva de **3 falhas de filtragem de entrada**:

1. **Entradas no Meio da Faixa (Mid-Range Trading)**:
   - Em vez de esperar pelo toque em Zonas Premium/Discount ou Order Blocks não mitigados, o sistema abria ordens no meio de formações consolidadas.
2. **Ausência de Confluência Obrigatória (Single Provider Signals)**:
   - Bastava um único indicador (ex: cruzamento de RSI em M1) emitir sinal para gerar a proposta.
3. **Ausência de Cooldown por Ativo**:
   - Um estop em BTC/USD de 60 segundos era imediatamente seguido por uma nova entrada no segundo seguinte.

---

## 2. Soluções e Correções Imediatas para Estancar a Perda

Para elevar a Win Rate de **30.74%** para **> 48%** e reverter a expectativa para positiva ($E > +0.5R$):

1. **Impor Cooldown Obrigatório de 15 Minutos após Trade Fechado**:
   - Adicionar `cooldownMs = 15 * 60000` em `StreamEngine` por par.
2. **Filtro de Confluência Mínima SMC (Confluence Score $\ge 70\%$)**:
   - Exigir obrigatoriamente: `Trend Bias H4 == Direção` AND `Sweep de Liquidez Confirmado` AND `Toque em Order Block M15/M5`.
3. **Elevação do Limiar TRG no ExecutionTriggerLayer**:
   - Elevar `TRG_THRESHOLD` de `0.4` para `0.65`, forçando o sistema a operar apenas em assimetrias geométricas extremas.
