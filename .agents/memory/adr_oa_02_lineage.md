---
type: architecture_decision_record
title: ADR-OA-02: Observation Lineage
created: 2026-06-24
status: approved
---

# LYZER LABS — OBSERVATION LINEAGE

**Objetivo:** Estabelecer a rastreabilidade perfeita da origem para cada observação arquivada, garantindo que o laboratório possa auditar a qualidade da fita em qualquer ponto do futuro.

## 1. O Problema da Ambiguidade de Origem (Lineage Loss)
Se guardarmos um *AggTrade* no arquivo sem contexto, e anos depois descobrirmos um erro grave na biblioteca de *WebSocket* que rodava na época, não saberemos qual parte do histórico está corrompida. Uma observação sem sua ascendência sistêmica é epistemologicamente frágil.

## 2. O Cabeçalho de Ascendência (Lineage Header)
Toda observação escrita no OA (Parquet) será encapsulada ou acompanhada por um cabeçalho de metadados invisível ao processo analítico, mas auditável pelo sistema:

- **Ingress_Timestamp:** O exato nanosegundo em que a placa de rede do servidor OAL recebeu o pacote. (Útil para medir atrasos de rota global, não para sequenciar o evento).
- **Feed_Provider_Version:** A documentação exata da API da origem (ex: `binance-ws-depth-v1.2`).
- **OAL_Version:** O *Git Commit Hash* do crate `lyzer-oal` que processou a observação. Isso ancora a observação ao código-fonte exato daquele momento.

## 3. Consequência Estrutural
Nenhum evento ingressa no OCR ou no Laboratório de Pesquisa se seu `Lineage Header` não for perfeitamente validável. Observações que perderam a origem ("órfãs") são marcadas como `CORRUPT` e excluídas da produção de evidências legítimas.
