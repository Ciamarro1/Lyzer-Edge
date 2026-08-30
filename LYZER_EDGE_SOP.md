# LYZER EDGE — Standard Operating Procedure (SOP)

**Data:** 2026-08-28
**Status Operacional:** Testnet (48h Observational Soak Test)
**Artefato Base:** `REC_COMP_INSTITUTIONAL_v1` (Engine v5)
**Ambiente:** Railway (Cloud)

---

## 1. O QUE O LYZER EDGE ESTÁ FAZENDO AGORA?

O Lyzer Edge foi configurado para uma operação de "soak test" (teste de absorção/estabilidade) de 48 horas na **Testnet**. 

Isso significa que o motor operará exatamente com o mesmo rigor, checagens de risco e lógica de um ambiente Live com dinheiro real, **mas enviará ordens simuladas para a rede Testnet da Binance**, sem consumir ou arriscar o seu capital físico. O objetivo deste teste é validar a resiliência do sistema e a obediência cega ao artefato científico, observando como ele se comporta quando deixado totalmente autônomo.

### Parâmetros Base de Operação:
- **Ativo (Symbol):** `BTCUSDT` (Bitcoin / Tether)
- **Timeframe (Janela de Tempo):** Gráfico de `1 hora` (1h)
- **Modo:** Testnet
- **Isolamento:** Todos os outros motores experimentais e lógicas soltas estão **Desligados**. O robô está alocando 100% do seu cérebro de execução para o artefato institucional.

---

## 2. A ESTRATÉGIA: WYCKOFF SPRINGS (V5)

A inteligência de execução atual do Lyzer Edge não é baseada em "adivinhação", mas em um fenômeno estrutural de mercado empiricamente validado chamado **Wyckoff Spring em Regime de Funding Negativo**.

### Como a Estratégia Funciona (Em Termos Humanos):

O mercado de Bitcoin frequentemente cria "armadilhas" de liquidez. A estratégia mapeia essas armadilhas buscando um momento exato de exaustão dos vendedores:

1. **A Armadilha (Pierce):** O robô monitora o preço pelas últimas 30 horas. Ele aguarda o momento em que o mercado "fura" (pierce) a mínima dessa janela. Isso normalmente assusta investidores comuns e aciona stop-losses.
2. **O Esforço (Volume Z-Score):** Ele não compra qualquer queda. O robô só se interessa se o "furo" for acompanhado de um pico de volume extremo (Volume Z-Score >= 1.5). Isso sinaliza que o "dinheiro grande" instituiu um esforço massivo para absorver as vendas ali.
3. **A Rejeição (Reversal):** O candle precisa fechar demonstrando forte rejeição à queda (um pavio longo na parte inferior).
4. **O Contexto Externo (Funding Rate):** A condição de ouro. O robô só autoriza a compra se o *Funding Rate* global do mercado estiver **NEGATIVO** (< 0). Funding negativo significa que a manada (o varejo) está apostando agressivamente na queda (shorteando). 

**O Gatilho:** Quando o mercado tenta cair, falha com alto volume, e a maioria das pessoas está apostando na queda, o Lyzer Edge executa um ataque (Compra/LONG) na direção contrária, capturando a explosão de preços quando os *shorters* são liquidados.

### A Gestão de Risco do Trade (Saídas - DYNAMIC_TP + TIME_ALPHA):
- **Alvo de Ganho Dinâmico (Take Profit):** Projetado para 2.5x o valor da volatilidade atual medida pelo ATR (R-Multiplier = 2.5).
- **Limite de Perda Dinâmico (Stop Loss):** Muito preciso, travado em 1.0x a volatilidade atual (ATR Multiplier = 1.0), com um piso mínimo de segurança de 0.20%.
- **Tempo Limite (Time Exit Alpha):** Independente do preço atingir o TP ou SL, se o mercado não for a favor do movimento esperado em até 6 horas, o robô encerra a posição compulsoriamente pelo preço a mercado, liberando o capital da estagnação.

---

## 3. COMO O SISTEMA SE DEFENDE SOZINHO (ARQUITETURA DE GOVERNANÇA)

O Lyzer não é apenas um "bot de trading". Ele é encapsulado em uma constituição de segurança rigorosa dividida em Níveis de Kill-Switch (K0 a K5).

Se qualquer anomalia acontecer na Testnet durante estas 48h, o sistema tomará ações autônomas:
- **K2 (Risk Halt):** Se o risco do mercado subir abruptamente, ele pode bloquear novas entradas de trades até a tempestade passar.
- **K3 (Emergency Halt):** Se a conexão com a Binance cair ou oscilar muito.
- **K4 (Reality Break):** Se a performance do modelo diferir agressivamente do que foi estudado nos laboratórios (Slippage ou custos altíssimos), ele suspenderá as operações.
- **K5 (Capital Integrity):** Se o saldo na corretora e o cálculo interno do robô divergirem até mesmo em 1 centavo, a máquina entrará em pânico controlado, decretará Morte Súbita (Halt) e nunca mais voltará a operar até você intervir.

---

## 4. O QUE VOCÊ DEVE OBSERVAR NAS PRÓXIMAS 48H

Durante o Soak Test no Railway, sua função como Diretor será observar:
1. **Estabilidade e Memória:** O container não deve reiniciar repetidamente nem estourar uso de memória.
2. **Rejeição de Ordens:** O robô *deve* passar a maior parte do tempo sem operar. Esta estratégia é de alta precisão (sniper). Ele aguarda horas ou dias por uma configuração perfeita de armadilha (Wyckoff Spring). Não ver trades em 24h é um comportamento esperado e correto.
3. **Logs de Decisão:** Pelo painel do Railway, observe se as variáveis estruturais (Provider V5 isolado) foram respeitadas e se a conexão via WebSocket reporta ping/pong normais.

---

## 5. E QUANDO VOCÊ DECIDIR USAR DINHEIRO REAL?

Quando as 48h de Testnet terminarem e você estiver pronto para a transição para Live Capital, **você não mudará código**. 

Você executará a **Cerimônia de Governança**:
1. Usará um script local na sua máquina para assinar uma permissão criptográfica informando quanto dinheiro (e.g. `$100`) o Lyzer tem permissão de usar.
2. Você colocará essa assinatura (o token gerado) no painel de configurações do Railway.
3. O robô vai inicializar, validar matematicamente que a assinatura é sua, destravar a trava física e iniciar as operações na Binance real, limitado a nunca ultrapassar os `$100`.
