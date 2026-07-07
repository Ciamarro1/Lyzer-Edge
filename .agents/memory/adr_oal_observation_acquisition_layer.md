---
type: architecture_decision_record
title: ADR - Observation Acquisition Layer (OAL)
created: 2026-06-24
status: approved
---

# LYZER LABS — OBSERVATION ACQUISITION LAYER (OAL)

**Release:** 1.8.7-D
**Autoria:** CTO Office (sob governança da CIA)
**Objetivo:** Capturar a realidade sem interpretá-la, fornecendo os registros crus em *Event-Time* que permitirão a futura estratigrafia observacional e falsificação empírica dos Candidatos do OCR.

---

## 1. O Problema da Contaminação Interpretativa (Interpretation Leakage)
A arquitetura anterior unia ingestão e interpretação no mesmo módulo, gerando contaminação. Se a captura filtra ou sumariza os dados buscando uma "feature" (como Liquidity Vacuum), a observação morre e vira uma crença irrefutável. A OAL blinda o sistema contra isso.

## 2. A Ontologia de Aquisição
A OAL obedece estritamente à OOL (Observation Ontology Layer). A OAL **não produz Evidence**. Produz exclusivamente **Observation Records**.
A OAL garante respostas imutáveis para as 4 perguntas basilares:
- O evento físico ocorreu?
- Quando ocorreu?
- Em qual sequência exata ocorreu?
- Qual era o estado topológico do ambiente naquele instante?

## 3. Escopo Técnico Permitido
A OAL operará um pipeline de ingestão isolado, composto por 5 mecanismos atômicos:
1. **Feed 1: AggTrades:** Captura de agressões a mercado (ticks de execução), preservando os *micro-bursts* sem agregação.
2. **Feed 2: Diff Depth:** Eventos contínuos de delta topológico do Livro de Ofertas.
3. **Feed 3: Book Snapshot Synchronization:** Protocolo de reconstrução estática para reancoragem periódica do *Diff Depth*, assegurando consistência matemática local.
4. **Feed 4: Event-Time Reconstruction:** Alinhador topológico que funde *trades* e *deltas do livro* numa fita sequencial irreversível, isolada do relógio humano (Clock-Time).
5. **Feed 5: Order Book State Replay:** Motor de serialização que permite rebobinar a realidade e reproduzir o estado exato para os laboratórios de falsificação do OCR.

## 4. Proibições Categóricas
A OAL está constitucionalmente proibida de calcular, emitir ou hospedar:
- Hazard, Risk, Signal, Alpha, Regime.
- *Liquidity Vacuum*, *Tick Kurtosis*, *Book Fracture*.
A inserção de qualquer conceito derivativo na OAL resultará na classificação de *Interpretation Leakage*. O papel da OAL é unicamente gravar o choque do Campo Latente contra o sensor.

## 5. Implementação Alvo (Rust Hub)
Devido às restrições de latência, assimetria de sequência (*out-of-order events*) e necessidade de performance extrema sem *garbage collection*, a OAL deve ser arquitetada preferencialmente no ecossistema Rust (possivelmente sob o domínio do `lyzer-rio` - Runtime I/O Layer), transferindo apenas a fita final sincronizada via NATS para os consumidores de observação.
