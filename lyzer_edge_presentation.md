# LYZER EDGE: INSTITUTIONAL OPERATING SYSTEM
**Apresentação Executiva de Arquitetura e Engenharia**

---

## 1. O Que é o Lyzer Edge?
O Lyzer Edge **não é um "robô de trade"** (trading bot) tradicional. Ele é um **Organismo Algorítmico de Decisão** construído para operar em mercados de alta frequência. 

A maioria dos robôs do varejo olha para o mercado, vê um padrão (como um cruzamento de médias) e compra. O Lyzer Edge opera com uma filosofia institucional baseada em **Antifragilidade** e **Epistemologia (Teoria do Conhecimento)**. Antes de comprar ou vender, o Lyzer assume que o mercado está tentando enganá-lo. Ele não busca apenas "sinais de entrada", ele busca **provas matemáticas de que a estrutura de risco é favorável e de que a oportunidade não é uma armadilha.**

Para fazer isso, o Lyzer faz a informação passar por um "moedor de carne" (um pipeline) de 7 camadas de segurança antes de um único centavo ser colocado em risco.

---

## 2. O Pipeline de 7 Camadas (O Caminho de um Trade)

Imagine que o mercado acabou de gerar uma nova vela (candle) de 1 minuto. Veja exatamente o que acontece milissegundo a milissegundo dentro do `streamEngine.js`:

### Camada 1: Sensoriamento (Provedores de Sinal)
O Lyzer possui 3 motores analíticos que olham para o mercado simultaneamente:
- **Provider V1 (SMC/ICT):** Procura dinheiro institucional (Smart Money), mapeando onde os grandes players deixaram rastros (Fair Value Gaps, quebras de estrutura).
- **Provider V2 (SnD):** Calcula as zonas puras de Oferta e Demanda (Supply and Demand).
- **Provider V3 (Momentum RSI):** Analisa a força bruta e a aceleração do preço.

*Eles geram um sinal (Ex: "COMPRAR!"). Em um robô comum, a ordem seria executada aqui. No Lyzer, o julgamento apenas começou.*

### Camada 2: Destruição de Consenso (Residualization Layer)
Se todos os indicadores dizem que é hora de comprar, o mercado inteiro está vendo a mesma coisa. O Lyzer odeia o óbvio, pois o óbvio costuma ser liquidez para os grandes *players* capturarem. 
A **Camada de Residualização** ataca o sinal. Se o "consenso" for alto demais (ex: todo mundo está comprando), o Lyzer aniquila o sinal e fica de fora. Ele procura anomalias matemáticas, não o que a manada vê.

### Camada 3: Geometria de Risco (Execution Trigger Layer)
O Lyzer calcula o **TRG (Tail Risk Geometry)**. Ele mede o "risco de cauda" — a probabilidade de um evento catastrófico acontecer nos próximos minutos. Se o TRG estiver abaixo de um limite aceitável (ex: `0.35` ou `0.40`), o sinal morre aqui.

### Camada 4: O Núcleo da Verdade (TruthKernel)
O `TruthKernel` é o cérebro epistêmico. Ele se pergunta: "A estrutura do mercado faz sentido agora?".
Ele procura por dois fenômenos mortais:
- **LHDS (Local High-Dimensional Stress):** Há muita energia presa em pequenos movimentos de preço?
- **Ontological Collapse (Colapso Ontológico):** A estrutura de topos e fundos parou de fazer sentido matemático?
Se o kernel detectar que o mercado está em colapso lógico, ele **Veta** a operação.

### Camada 5: O Oráculo de Estresse (C-CLIST)
O C-CLIST é um radar contínuo de estresse. Se o mercado fica "calmo demais" (baixa volatilidade direcional - DVF plano), o C-CLIST sabe que uma explosão está se formando. Ele acumula uma pontuação de estresse. Se chegar no limite da **"Ilusão Letal"**, ele bloqueia qualquer entrada. 

### Camada 6: O Organismo Vivo (MOL - Market Organism Lifecycle)
O mercado sofreu um choque? O MOL muda o estado do Lyzer de `NORMAL` para `RECOVERY` (Recuperação). O Lyzer entra em "coma induzido". Ele exige que o mercado passe por *X* minutos de estabilidade (ex: 45 segundos, ou dezenas de *ticks* sem anomalias) antes de permitir que o sistema "acorde" e volte a operar.

### Camada 7: A Suprema Corte (Constitutional Court)
O portão final. A Corte avalia todo o dossiê: O C-CLIST estourou? O MOL está em recuperação? O risco está dentro do orçamento diário (`MAX_DAILY_CAPITAL`)? 
Se **TUDO** passar, a Corte emite o veredito: `ALLOW` (Permitir).

---

## 3. A Execução Bélica (Sniper / Scalp)

Assim que a Corte aprova, o Lyzer executa a ordem na Binance com extrema precisão militar.

- **Position Sizing (Normalização de Risco):** O Lyzer não opera "x lotes fixos". Ele olha para a volatilidade do segundo exato (o ATR) e calcula matematicamente quantos dólares ele pode colocar para que, se perder, ele perca **exatamente** o risco configurado (ex: 0,5% do capital).
- **Proteção Imediata (Break-Even Dinâmico):** Se o preço andar a nosso favor apenas um pouco (ex: `0.45R` — menos da metade do caminho do alvo), o Lyzer move o Stop Loss para o zero-a-zero. Ele zera o risco o mais rápido possível.
- **Saídas Parciais (Scale-Outs):** Ele pode realizar lucros parciais no meio do caminho (embora na última configuração do OOS-11 nós tenhamos desligado isso para testar o extremo).
- **Ejeção por Tempo (Time Exit):** O Lyzer opera por *Tese*. Se ele previu um movimento, esse movimento tem que acontecer rápido. Se passarem **15 minutos** e a tese não se provar, o Lyzer fecha a operação na hora. O tempo não perdoa teses lentas.

---

## 4. O Sistema Nervoso Central (Causal Memory)

Para nunca esquecer suas decisões, o Lyzer possui um sistema próprio de Banco de Dados local (`causal_memory.db`). Cada "tick", cada decisão da Corte, e cada sinal morto fica registrado causalmente.
- O Lyzer nunca executa sem checar seu próprio diário.
- Ele isola as responsabilidades em 3 processos distintos no servidor para que uma falha em uma parte não derrube o núcleo lógico.

## 5. Resumo do Estado Atual (Por que 255 Trades?)
No momento atual (Fase 13 - OOS 11), estamos operando apenas **LONG (compras)** e **SHORT (vendas)** com limites de Stop minúsculos (15 a 45 pontos base) e dependendo massivamente da "Ejeção por Tempo (15m)". 

O comportamento de **255 trades** (onde perdemos dinheiro) mostrou que a *Camada 2 (Residualização)* ou o *TruthKernel* estão deixando muito "ruído de mercado" ser aprovado pela Corte. O Lyzer está entrando em operações que o mercado destrói rapidamente (atirando em todos os Fair Value Gaps que aparecem). 

**Missão de Engenharia de agora:** O Guardião precisa apertar as válvulas do `TruthKernel` e do `C-CLIST` para calar o ruído, reduzindo os 255 tiros no escuro para apenas os tiros garantidos (modo Sniper).
