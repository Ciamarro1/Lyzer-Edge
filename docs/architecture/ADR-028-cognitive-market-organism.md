# ADR-028: Cognitive Market Organism Architecture

- **Status**: ACCEPTED
- **Date**: 2026-07-23
- **Author**: Guardião da Arquitetura, Principal Systems Architect, Quant Risk Specialist

---

## Context

Com a conclusão da Fase 10 (Cognitive Portfolio Intelligence Layer), o Lyzer Edge obteve a capacidade de gerir estratégias registradas como genomas ("espécies") em um portfólio dinâmico baseado em matrizes de correlação, alocação por regime e no Cognitive Allocation Score (CAS).

Porém, o ambiente financeiro não é um sistema estático: é um ecossistema competitivo onde a liquidez varia, a volatilidade expande/contrai, estratégias sofrem deterioração natural de alpha (**Alpha Decay**) e concorrentes se adaptam. Para sobreviver a longo prazo, o Lyzer Edge precisa evoluir de um gestor estático de carteira para um **Organismo Adaptativo de Mercado (Cognitive Market Organism)**.

---

## Decision

Criar a camada **`src/market-organism/`** contendo o ecossistema da **Fase 11 — Cognitive Market Organism Layer**.

### Arquitetura do Organismo Adaptativo

```
                         MARKET ECOSYSTEM
                                │
                                ▼
                     MarketEcologyEngine
                 (Liquidity/Vol/Efficiency)
                                │
                                ▼
                   StrategyCompetitionEngine
                  (Fitness & Relative Share)
                                │
                                ▼
                        AlphaDecayEngine
                   (Half-Life & Sharpe Decay)
                                │
                                ▼
                    StrategyMutationEngine
                 (Co-Evolution & Child Genomes)
                                │
                                ▼
                   MarketAdaptationScore (MAS)
              (ADAPTIVE_ORGANISM → EVOLUTION_REQUIRED)
                                │
                                ▼
                 COGNITIVE PORTFOLIO INTELLIGENCE (Fase 10)
```

### Módulos Principais

1. **`MarketEcologyEngine.js`**
   - Monitora o ecossistema de mercado em 4 dimensões: Liquidez, Volatilidade, Eficiência do Mercado e Pressão Competitiva.

2. **`StrategyCompetitionEngine.js`**
   - Trata as estratégias como espécies competidoras no ecossistema, medindo a participação relativa de alpha e identificando declínio adaptativo.

3. **`AlphaDecayEngine.js`**
   - Calcula a meia-vida do alpha (**Alpha Half-Life**), a taxa de deterioração do Sharpe Ratio e a degradação de capacidade preditiva, sinalizando a obsolescência de modelos (`ACTIVE`, `AGING`, `OBSOLETE`).

4. **`StrategyMutationEngine.js`**
   - Implementa co-evolução através de mutações controladas de genomas genitores, gerando genomas descendentes com novos filtros ou parâmetros ajustados para submissão à validação empírica.

5. **`MarketAdaptationScore.js` (MAS)**
   - Calcula o score global de adaptação ao mercado (**MAS $\in [0, 100\%]$**):
     $$MAS = 0.30 \cdot \text{RegimeAdaptability} + 0.30 \cdot \text{AlphaSurvival} + 0.20 \cdot \text{EvolutionSpeed} + 0.20 \cdot \text{Robustness}$$
   - Zonas de MAS:
     - $90 - 100$: `ADAPTIVE_ORGANISM`
     - $70 - 89$: `HEALTHY`
     - $50 - 69$: `STRESSED`
     - $< 50$: `EVOLUTION_REQUIRED` (Dispara ciclo automático de mutação)

6. **`CognitiveOrganismFacade` (`index.js`)**
   - Interface unificada de orquestração do organismo adaptativo de mercado.

---

## Consequences

### Positivas
- Permite ao sistema descontinuar modelos obsoletos de forma proativa antes que gerem prejuízo em produção.
- Habilita a co-evolução de genomas através de mutações filhas rastreáveis.
- O MAS fornece um pulso biológico unificado da resiliência do Lyzer Edge perante mudanças no ambiente de mercado.

### Negativas
- Requer monitoramento contínuo da meia-vida de retorno de todas as estratégias ativas.
