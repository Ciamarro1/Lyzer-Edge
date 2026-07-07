---
type: architecture_decision_record
title: ADR - Observer Conflict Matrix (OCM)
created: 2026-06-24
status: proposed
---

# LYZER LABS — OBSERVER CONFLICT MATRIX (OCM)

**Release:** 1.8.8-B
**Autoria:** CTO Office (em resposta à Diretiva CIA)
**Objetivo:** Estabelecer a ontologia e a mecânica de resolução para colisões de realidade entre múltiplos feeds observacionais concorrentes, sem corromper o histórico e sem forçar consensos sintéticos.

---

## 1. O Paradoxo das Múltiplas Realidades
Na microestrutura de alta frequência, feeds diferentes raramente contam a mesma história de forma perfeitamente sincronizada ou simétrica. 
Exemplo Clássico (O Paradoxo do Iceberg):
- **Realidade A (Feed de AggTrades):** Observa o consumo agressivo de 50 BTC.
- **Realidade B (Feed de Diff Depth):** Observa que o saldo do primeiro nível de preço (*Top of Book*) não sofreu redução de 50 BTC.
Se o sistema forçar uma "média" ou eleger um feed como "verdadeiro", ele comete *Interpretation Leakage*. A divergência não é um erro de dados; é a assinatura do próprio fenômeno causal (reabastecimento passivo oculto / Iceberg).

## 2. O Princípio da Coexistência Conflituosa
O Observer Conflict Matrix (OCM) instaura a lei fundamental de que **o conflito é uma entidade de primeira classe**, não uma anomalia a ser limpa.
1. O *Observation Archive (OA)* armazena ambas as realidades inertes, lado a lado. Nenhuma sobrepõe a outra.
2. O *Observation Candidate Registry (OCR)* submete a hipótese a ambas as realidades simultaneamente.

## 3. Matriz de Resolução de Conflito (OCM)
Quando o CFR (Cross-Feed Reconciliation) detecta que Realidade A contradiz Realidade B para o mesmo *Event-Time*, o OCR classifica a postura do Candidato perante a matriz:

- **Postura Cega (Blindness):** O candidato explica a Realidade A mas ignora a colisão com a Realidade B. 
  *Ação do OCM:* O candidato recebe penalidade massiva no *Integrity Score (OIS)*. Hipóteses caolhas são falsificadas sumariamente.
- **Postura Falsificada (Fragility):** O candidato tenta explicar A e B, mas sua regra causal quebra sob a contradição. 
  *Ação do OCM:* O candidato morre epistemologicamente (Status: `FALSIFIED`).
- **Postura Estereoscópica (Survivability):** O candidato não apenas sobrevive à divergência, mas **exige** a divergência para existir (ex: a hipótese de *Spoofing* ou *Iceberg Replenishment* depende da contradição entre agressão e profundidade).
  *Ação do OCM:* O candidato sobrevive e ganha *Integrity Score*.

## 4. O "Conflito" como Origem de Novos Candidatos
A OCM introduz a capacidade de "Falsificação Ativa". Se a fita do OA apresenta uma colisão de realidades que destrói todos os candidatos atuais, esse vácuo causal gera uma assinatura. O sistema não entra em pânico. Um "Regime sem Evidência" é declarado, preservando o Lyzer de operar sob falsas premissas até que um novo candidato estereoscópico seja descoberto.

## 5. Implementação Física
A OCM não será um módulo separado do OCR; será a lógica matemática central dentro do `lyzer-ocr/src/reconciliation.rs`. A matriz cruzará topologias de feed utilizando as chaves primárias do OA (*Event-Time* e *Payload Hash*) para garantir que as colisões testadas ocorreram exatamente no mesmo milissegundo de *Clock-Time* universal do mercado.
