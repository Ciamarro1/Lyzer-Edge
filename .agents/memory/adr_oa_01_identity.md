---
type: architecture_decision_record
title: ADR-OA-01: Observation Identity
created: 2026-06-24
status: approved
---

# LYZER LABS — OBSERVATION IDENTITY

**Objetivo:** Definir o que torna uma observação única, prevenindo o "Duplicate Reality Problem".

## 1. O Problema da Identidade Trivial
Historicamente, sistemas usam o relógio local do servidor (`local_timestamp`) como identificador primário. Isso destrói o *Event-Time* puro e torna a fita não-determinística. Se um servidor atrasa o processamento por 5 milissegundos, o ID muda. A identidade da observação deve emanar da realidade (Exchange), não do observador (OAL).

## 2. A Composição da Identidade Observacional
Uma observação é declarada unicamente pelo seguinte tuplo determinístico:
`Observation_ID = Hash(Symbol + Exchange_Event_ID + Exchange_Timestamp + Payload_Hash)`

Onde:
- **Symbol:** O ativo físico observado (ex: `BTCUSDT`).
- **Exchange_Event_ID:** O identificador topológico estrito fornecido pela origem (ex: Binance Update ID `u` ou AggTrade ID `a`). Esse é o principal vetor de sequencialidade absoluta.
- **Exchange_Timestamp:** O tempo reportado pela fita de origem (`T` e `E`).
- **Payload_Hash:** Assinatura SHA-256 (ou *fast hash* como xxHash) do dado bruto recebido. Garante que duas observações com o mesmo ID, mas payloads diferentes, gerem colisão detectável.

## 3. Consequência Estrutural
Nenhum evento ingressa no OA (Observation Archive) sem possuir esse `Observation_ID` atrelado a ele em formato de coluna física no Parquet. Se o mesmo *Exchange_Event_ID* chegar duas vezes (mensageria duplicada de rede), o OAL o descarta silenciosamente ao verificar o *hash* determinístico.
