# Production Failure Modes & Hardening

**Data:** Julho 2026
**Missão:** L5 Institutional Alpha Operations
**Investigador:** Lyzer Orchestrator (SRE / Reliability Engineer)

Este documento mapeia o comportamento do Lyzer Edge diante das piores catástrofes de infraestrutura possíveis. O Trading Autônomo não quebra apenas por modelos ruins, quebra por falhas silenciosas de dados.

## Matriz de Risco de Produção (Failure Modes)

| Falha (Trigger) | Impacto Teórico | Resposta Institucional (Circuit Breaker) |
| :--- | :--- | :--- |
| **Binance API Offline (503/429)** | Incapacidade de fechar trade aberto. | O `exchangeExecution.js` implementa retry com exponential backoff. O `Emergency Shutdown` é ativado após 5 retries, acionando Alarme no Telegram (Intervenção Humana Necessária). |
| **WebSocket Congelado (Zombified Connection)** | O sistema fica cego, achando que o mercado está parado. | Implementado `Data Freshness Check`. Se `Date.now() - candle.closeTime > 15000ms`, o Kernel recusa emitir sinais e aciona reset na conexão (`liveDataIngestor.js`). |
| **Dados Corrompidos (Spike/Flash Crash Falso)** | Sinais HFT injetam ordens suicidas baseadas em sombras (wicks) impossíveis. | Filtro de desvio padrão no Ingestor: Velas que movem > 5% em 1 segundo disparam o `Market State Circuit Breaker` (Regime passa para `NEWS_SHOCK` e bloqueia a execução). |
| **Enlouquecimento do Modelo (False Alpha Loop)** | Um bug matemático faz o sistema comprar e vender compulsivamente. | `Daily Loss Limit Hard Stop`. O limite financeiro e de drawdown intradiário atua na base do Funil de Execução. Se acionado, a thread de execução é "morta" pelo SO (`process.exit(1)` ou Freeze Mode). |
| **Série de Derrotas Legítimas (Drawdown Real)** | O regime de mercado mudou para algo não treinado. | `Recovery Mode` (SCL Threshold do MOL). O sistema pausa envio de capital real até provar (no papel/shadow) que teria ganho N trades seguidos. |

## Resumo Arquitetural
A injeção de Confiabilidade no Lyzer o transformou em uma Aplicação *Fail-Safe*. Em HROs (High Reliability Organizations), é sempre melhor parar o sistema (*Halt*) e deixar capital seguro do que forçar operação com rede ou dados instáveis.
