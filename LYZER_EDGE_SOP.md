# LYZER EDGE — Standard Operating Procedure (SOP)

**Data:** 2026-09-04  
**Status Operacional:** 🟢 CERTIFIED PRODUCTION READY (Tier 0 — Binance Testnet)  
**Artefato Base:** `REC_COMP_INSTITUTIONAL_v1` (Engine v5 Wyckoff Spring 1H Long-Only)  
**Invariante Kernel (SHA-256):** `fc19e807255b3ecfb8351e82d7dc9d244c1e511d9aa007ac8b67b12d584b4db1`  
**Ambiente:** Railway (Cloud) / Binance Testnet  
**Capital Real Autorizado:** **$0,00 USD (TIER 0 - CONGELAMENTO ATIVO)**  

---

## 1. O QUE O LYZER EDGE ESTÁ FAZENDO AGORA?

O Lyzer Edge concluiu com sucesso o **teste de absorção de 48 horas (48h Soak Test)** no Railway e passou pela **Auditoria de Prontidão Operacional (10/10 checks)** e verificação dos **7 Clamps do Fidelity Gate**.

O motor opera na **Trilha 1 (Produção)** com rigor institucional máximo:
- Conectado em tempo real à **Testnet da Binance**, processando candles de 1 hora de `BTCUSDT`.
- Ordens são simuladas diretamente na rede de teste sem consumir capital físico da firma ($0 capital real).
- O motor matemático `REC_COMP_INSTITUTIONAL_v1` está matematicamente selado e imutável.
- A Trilha 2 de pesquisa laboratorial (hipóteses H001 a H017) foi concluída e arquivada, confirmando que a única assimetria quantitativa viável é a absorção direcional de liquidações via Wyckoff Spring com funding negativo.

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

Durante a operação contínua na Testnet (Tier 0), sua função como Diretor é observar:
1. **Estabilidade e Memória:** O container mantém uso estável de memória (< 180MB RAM) sem vazamentos nem reinicializações espúrias.
2. **Rejeição de Ordens:** O robô passa $\approx 99\%$ do tempo sem operar. Esta estratégia é de alta precisão (sniper). Ele aguarda horas ou dias por uma configuração perfeita de armadilha (Wyckoff Spring com funding negativo). Não ver trades em 24h ou 48h é um comportamento cientificamente esperado e desejável.
3. **Logs de Decisão:** Pelo painel do Railway, confirme que o StreamEngine reporta ping/pong normais (latência < 150ms) e que o invariant SHA-256 do kernel permanece intocado.

---

## 5. E QUANDO VOCÊ DECIDIR USAR DINHEIRO REAL? (TRANSIÇÃO DE CAPITAL)

A transição de capital é estritamente regida pelo documento [`research/PLATFORM_OPERATIONAL_CERTIFICATION_AND_CAPITAL_GOVERNANCE.md`](file:///c:/Users/WDAGUtilityAccount/Documents/Nova%20pasta%20(2)/research/PLATFORM_OPERATIONAL_CERTIFICATION_AND_CAPITAL_GOVERNANCE.md).

O sistema opera sob a **Escada Institucional de Capital**:
- **Tier 0 (Estado Atual Ativo):** Binance Testnet, **$0,00 USD** capital real.
- **Tier 1 (Piloto Micro-Alocação):** Teto de **$500,00 USD**, em conta isolada com alavancagem 1.0x.
- **Tier 2 (Escala):** Teto de **$1.000,00 USD**, após 90 dias ininterruptos em Tier 1 com Sharpe > 2.50.

### A Cerimônia de Governança (Para ativar Tier 1):
Quando a Diretoria Executiva deliberar pela ativação do Piloto Tier 1, **nenhum código será alterado**:
1. O Diretor Executivo gerará uma chave criptográfica Ed25519 em máquina fria (air-gapped ou local) assinando a permissão para até `$500 USD`.
2. Essa assinatura (token de autorização out-of-band) será injetada como variável de ambiente no Railway: `CAPITAL_AUTH_TOKEN`.
3. Ao inicializar, o `StreamEngine` validará matematicamente a assinatura contra a chave pública mestre, desativará o modo `HALTED` e habilitará a execução em dinheiro real estritamente até o limite assinado.
4. Qualquer violação dos disjuntores K1–K5 (como perda de 2% do capital ou 3 stops consecutivos) reverterá compulsoriamente a plataforma para o Tier 0 ($0).
