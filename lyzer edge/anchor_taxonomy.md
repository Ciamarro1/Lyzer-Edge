# Anchor Taxonomy

O ECA utiliza múltiplas famílias de âncoras para medir a aderência da premissa interna à realidade operacional externa. A taxonomia a seguir divide os fatos com autoridade de veto sobre o sistema em quatro camadas interligadas.

## 1. Constraint Anchors (Execution & Infrastructure)
São as âncoras mais determinísticas. Elas medem se as ações decididas pelo sistema são de fato possíveis na realidade da infraestrutura e execução real.

### Infrastructure Anchors
*   **API Availability:** O websocket ou REST API está vivo, responsivo e sem rate limits sendo atingidos.
*   **Exchange Status:** A própria bolsa não reportou incidentes de manutenção, congelamento ou halts de negociação.
*   **Data Freshness:** O delta entre o timestamp reportado pelos pacotes e o clock interno do servidor (garante que não há backlog na fila do feed).
*   **Feed Integrity:** Ausência de gaps e sequência contínua de IDs ou seqNums.

### Execution Anchors
*   **Latency:** Tempo do roundtrip real de ordens ou de echo requests.
*   **Slippage:** A diferença entre o preço da decisão interna e o preço de preenchimento real (fill price).
*   **Fill Rate:** Percentual da ordem que efetivamente obteve liquidez (impacto profundo no scaling do sistema).
*   **Order Rejection Rate:** Contagem de rejeições técnicas da corretora devido a saldo, lot-sizing ou invalid ticks.

## 2. Market Anchors (Hard Anchors)
Esses são os fatos fundamentais e inegáveis do mercado. Não são predições.
*   **Trade Tape (Time and Sales):** O registro absoluto das negociações efetuadas no mercado.
*   **OHLCV:** Resumo histórico consolidado e irrefutável de cada fatia de tempo.
*   **Volume & Liquidity:** Profundidade de mercado (Order Book Level 2) verificável.
*   **Spread:** Bid/Ask real verificado contra a hipótese de custo do sistema.
*   **Funding Rates:** Custo de carrego (perpetuais) exato e objetivo.

## 3. Contextual Anchors (Soft Anchors)
Parâmetros conjunturais ou extrativos baseados na observação externa.
*   **Regime Detection:** O agrupamento atual do estado do mercado segundo métricas duradouras (Bull/Bear, Volatility Regime).
*   **Macro Context:** Indicadores de maior grau ou de mercados correlacionados.
*   **Volatility Structure:** Como a variância está distribuída estruturalmente fora da curva prevista.

## 4. System Stability Anchors (Meta Anchors)
Medem o grau de descolamento entre a máquina de predição do Lyzer e os fatos observados (Hard/Constraint Anchors).
*   **Counterfactual Validity Score:** Quando o Lyzer diz "Se eu tivesse comprado, ganharia X". O ECA simula o preenchimento, verifica se a liquidez era suficiente e se o slippage teria negado o edge.
*   **Prediction Stability:** Mede a consistência temporal das hipóteses lançadas.
*   **Prediction Decay Rate:** Com que velocidade uma predição confirmada perde seu poder preditivo em relação à *Trade Tape*.
*   **Hypothesis Survival Rate:** Taxa de retenção e durabilidade das hipóteses sob o teste do tempo e da execução real.
