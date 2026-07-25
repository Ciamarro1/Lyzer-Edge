---
type: architecture_decision_record
title: ADR - Epistemological Resolution Time (ERT)
created: 2026-06-24
status: proposed
---

# LYZER LABS — EPISTEMOLOGICAL RESOLUTION TIME (ERT)

**Release:** 1.8.10
**Autoria:** CTO Office (sob regulação ontológica da CIA)
**Objetivo:** Definir o mecanismo temporal de tolerância à coexistência causal e estabelecer o limiar exato no qual uma hipótese sobrevivente ganha o status de *Evidence*, sem aniquilar prematuramente a diversidade interpretativa do sistema.

---

## 1. O Paradoxo da Resolução Prematura
No Multi-Candidate Falsification Field (MCFF), quando duas hipóteses (ex: `CANDIDATE-002` e `CANDIDATE-003`) sobrevivem ao mesmo recorte do *Observation Archive (OA)* mas propõem causas contraditórias (Exclusão Causal Mútua), o OCRL suspende a decisão.
Se o sistema forçar um desempate imediato, ele comete "Premature Winner Selection". Se nunca desempatar, sofre de estagnação epistemológica. O *ERT* regula essa tensão.

## 2. Definição do Epistemological Resolution Time (ERT)
O ERT não é medido em relógio humano (segundos ou horas). Ele é medido em **Event-Time Fatigue** (Fadiga de Evento).
O Tempo de Resolução é definido como a quantidade de eventos colidentes subsequentes necessários para que a taxa de falsificação de uma hipótese divirja estatisticamente e inequivocamente da outra.

## 3. A Mecânica da Suspensão e Vitória
Quando duas ou mais hipóteses entram em *Quarantine Lock* (Coexistência Suspensa):
1. **O Cronômetro de Atrito (Friction Clock):** O sistema passa a contar quantas vezes ambas colidem sob o mesmo estado passivo/agressivo no futuro da fita.
2. **A Sobrevivência Diferencial:** O desempate ocorre apenas quando o *Observation Archive* gera um cenário físico marginal (Edge Case) onde a geometria do `CANDIDATE-A` prevê a integridade estrutural, mas o `CANDIDATE-B` desaba (Postura *Fragile*).
3. **Decay (Exaustão por Ausência de Conflito):** Se após N milissegundos de *Event-Time* o mercado não gerar o *Tie-breaker Event*, ambas retornam ao *pool* sem vitórias. Nenhuma Evidência é gerada na ausência de teste estressor.

## 4. Promoção à "Evidence"
Apenas após o cumprimento do ERT (ou seja, apenas quando a divergência sobrevivente prova que a hipótese rival era frágil a longo prazo), a hipótese vencedora recebe o selo de `Evidence`. A inteligência gerada aqui tem a garantia de não ser fruto de um "Overfitting Epistemológico", mas sim de resistência mecânica comprovada contra um modelo opositor sob o escrutínio brutal da mesma realidade.

## 5. Implementação Técnica
O ERT será implementado como um `State Machine Timer` dentro do `OCRL`. Ele carregará o estado das hipóteses que coexistem e exigirá alimentação sequencial de eventos do OA até atingir um limiar de entropia pré-configurado (*Tie-Breaker Threshold*).
