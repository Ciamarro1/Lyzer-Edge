---
type: architecture_decision_record
title: ADR-OA-03: Observation Corruption Protocol
created: 2026-06-24
status: approved
---

# LYZER LABS — OBSERVATION CORRUPTION PROTOCOL

**Objetivo:** Formalizar as reações do sistema frente à entrega de uma "realidade quebrada" (Falhas físicas de rede, pacotes perdidos ou dessincronizações estruturais).

## 1. O Problema do Intervencionismo do Observador
A pior atitude sistêmica perante a quebra de um canal (ex: *WebSocket drop* ou *Sequence ID gap*) é a tentativa de interpolar dados ou "adivinhar" o preenchimento para não travar o barramento. Isso é envenenamento epistemológico. A OAL não é autorizada a reparar a realidade. 

## 2. A Diretriz: "Fail-Fast & Mark Fracture"
Quando a continuidade da realidade falha (ex: O *Update ID* do Livro da Binance pula de `1005` direto para `1008`):

1. **Parada Imediata (Halt):** O fluxo de *Event-Time* é imediatamente interrompido no OAL-A.
2. **Marcação de Fratura Topológica:** Um evento explícito do tipo `OBSERVATION_FRACTURE` é escrito (committed) no *Observation Archive* no instante exato da anomalia. Ele prova que houve uma perda de continuidade no universo observável do Lyzer.
3. **Restabelecimento Base (Resync):** A OAL-A aciona o REST Snapshot Sync. Apenas após obter a nova âncora estática comprovada (nível 1000), uma nova fita sequencial é iniciada, acompanhada pelo marcador `RESYNC_ACHIEVED`.

## 3. Consequência no Laboratório e no OCR
Sempre que o *Research Directorate* ou o Truth Kernel encontrarem um evento `OBSERVATION_FRACTURE` lendo a fita do OA, eles estão proibidos de unir matematicamente os eventos anteriores à fratura com os eventos pós-fratura para calcular transições contínuas (como Assimetria de Liquidez). O laboratório tratará as fraturas como cortes epistemológicos absolutos.
