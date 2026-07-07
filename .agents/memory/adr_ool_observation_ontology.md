---
type: architecture_decision_record
title: ADR - Observation Ontology Layer (OOL)
created: 2026-06-24
status: approved_with_amendments
---

# LYZER LABS — OBSERVATION ONTOLOGY LAYER (OOL)

**Release:** 1.8.7-B
**Autoria:** CTO Office (sob governança da CIA)
**Objetivo:** Definir formalmente a ontologia da observação para evitar o *Sensor Replacement Fallacy*, separando estritamente a realidade da interpretação do modelo.

---

## A Nova Hierarquia Ontológica Oficial
Para evitar a dogmatização de métricas e ilusões de fechamento, o sistema adota a seguinte cadeia causal irreversível:

1. **Reality Objects:** A coisa em si, ocorrendo no Campo Latente (inatacável e inacessível diretamente).
2. **Observations:** O registro atômico e ininterpretado do evento físico (Ex: Cancelamento de 100 BTC no topo do *book*).
3. **Evidence:** Uma observação que passou pelo filtro do sistema e foi validada empíricamente como portadora de sinal causal estrutural (Ex: "Existe fragilidade estrutural confirmada").
4. **Beliefs:** A interpretação interna do sistema sobre o regime a partir da evidência (Ex: "O regime está mudando para distribuição").

---

## 1. O1 — O que é um evento observacional?
Um evento observacional é uma **mudança de estado atômica, irreversível e independente do sistema**. 
Axioma da Existência Independente: > *Se o Lyzer Labs for desligado, o evento continua existindo?*
- **É observação:** Um *tick* de agressão de 5 BTC.
- **NÃO é observação:** Um *hit rate* de 60%.

## 2. O2 — O que diferencia "Observação" de "Métrica Derivada"?
- **Observação:** É o dado puro da realidade. Não possui interpretação nem finalidade embutida.
- **Métrica Derivada:** É uma *compressão interpretativa* imposta pelo modelo (como *Moving Averages*, *Expectancy*, *Win Rate*). Ela pertence ao Sistema, não à Realidade.

## 3. O3 — Quais observações preservam causalidade? (Revisão CIA)
Nenhuma observação tem o status automático de "preservadora de causalidade". 
Fenômenos estruturais como **Liquidity Vacuum**, **Tick Kurtosis**, **Book Fracture** e **Micro-Bursts** são classificados restritamente como **Candidatos Observacionais (Observational Candidates)**. 
A capacidade deles de preservar causalidade é uma **Hipótese Forte**, não um Fato. Eles não são "a verdade", mas sim sensores propostos que deverão provar seu valor empírico antes de se tornarem Evidência.

## 4. O4 — Quais observações destroem causalidade?
Observações ou agregações que forçam **simetria** ou **homogeneização temporal**.
1. Agregação Aritmética (Médias Simples). Destrói a cauda.
2. Homogeneização Baseada em Relógio (Candles de Tempo) em vez de operação via *Event-Time*.

## 5. O5 — Qual informação pode ser comprimida? E qual nunca pode?
- **Pode ser Comprimida:** A tendência central, ruído Gaussiano simétrico (pois isso não carrega a topologia estrutural necessária para prever $T_c$).
- **Nunca pode ser Comprimida:** A Geometria de Cauda. O tempo exato entre agressões extremas ou o esvaziamento direcional do *book*. Comprimi-la transforma o colapso estrutural em ruído estatístico.
