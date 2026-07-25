---
type: architecture_decision_record
title: ADR - Observation Archive (OA)
created: 2026-06-24
status: proposed
---

# LYZER LABS — OBSERVATION ARCHIVE (OA)

**Release:** 1.8.7-E
**Autoria:** CTO Office (sob governança da CIA)
**Objetivo:** Estabelecer formalmente o *Observation Archive* como o ativo central do sistema e definir as leis de preservação imutável da realidade observada (Estratigrafia Observacional).

---

## 1. O Princípio da Primazia Histórica
Em sistemas convencionais, a baixa latência (Barramento) domina a persistência. No Lyzer Labs, essa hierarquia foi invertida para evitar *Infrastructure Dominance Drift*. 
**A persistência antecede a distribuição.** 
A realidade não existe no sistema até que esteja permanentemente arquivada. O fluxo topológico obrigatório é: 
`Reality → OAL-A (Aquisição) → Observation Archive (OA) → OAL-D (Distribuição)`
Se o barramento falhar, o sistema atrasa. Se o OA falhar, o sistema perde o acoplamento com a realidade (Observation Loss).

## 2. A Ontologia de "Append-Only"
O OA não é um banco de dados operacional; ele é um **sítio arqueológico**.
1. **Imutabilidade Estrita:** É matematicamente e sistemicamente proibido realizar operações de `UPDATE` ou `DELETE` em um registro observacional.
2. **Preservação Causal:** O OA garante que modelos no futuro possam rebobinar a realidade exata e testar novas hipóteses contra eventos gravados antes dessas hipóteses sequer existirem. O erro do viés de sobrevivência é anulado.

## 3. Arquitetura de Armazenamento: Formato Imutável
Dado que a observação é um **artefato histórico imutável** (não uma tabela mutável), a decisão infraestrutural favorece formatos de arquivos colunares inertes e portáteis: **Apache Parquet**.
- **Fundamento Epistemológico:** Arquivos Parquet não dependem de um "servidor ativo" (como ClickHouse/Postgres) para existirem. Eles são blocos atômicos auto-descritivos gravados em disco. 
- **Separação de Preocupações:** Se o *Research Directorate* precisar consultar dados rapidamente usando SQL, eles usarão o ClickHouse como um *consumidor transitório* que lê a partir do Parquet. A **Fonte da Verdade Suprema** será sempre a coleção física de arquivos Parquet inertes e assinados.

## 4. O Mecanismo de Selagem (Sealing Mechanism)
A OAL-A (`lyzer-oal`) escreverá os eventos (*Event-Time Sequenced*) na memória. A cada intervalo seguro, a memória é compactada em um arquivo Parquet e gravada em disco.
Apenas **após a selagem** do lote imutável no OA, a OAL-D emite um sinal no barramento notificando os consumidores (OCR, Research) de que uma nova camada estratigráfica da realidade está disponível para leitura.

## 5. Risco Mitigado: Replay Corruption
Como o OA garante isolamento total contra modificações, a reprodução (*Replay*) do estado do livro de ofertas e *micro-bursts* ocorrerá com zero risco de corrupção regressiva. O passado do laboratório e o passado da produção estão perfeitamente congelados.
