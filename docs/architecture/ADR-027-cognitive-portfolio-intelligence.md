# ADR-027: Cognitive Portfolio Intelligence Architecture

- **Status**: ACCEPTED
- **Date**: 2026-07-23
- **Author**: Guardião da Arquitetura, Principal Systems Architect, Quant Risk Specialist

---

## Context

Até a Fase 9, o Lyzer Edge possuía capacidade de:
1. Memória causal e persistência WAL (Fase 5)
2. Aprendizado e reflexão cognitiva (Fase 6 & 6.6)
3. Experimentação isolada em Sandbox e orquestração de pipeline adaptativo (Fase 7.0 & 7.1)
4. Avaliação de risco adaptativo (ARS), versionamento paramétrico, rollback automático e certificação evolutiva (Fase 7.2, 7.3 & 7.4)
5. Descoberta autônoma de regimes e hipóteses (Fase 8)
6. Validação estatística empírica, Walk-Forward Validation e maturidade de conhecimento (Fase 9)

Porém, o capital ainda era alocado de forma isolada para estratégias individuais. Para operar como uma plataforma institucional autônoma, o sistema precisa transformar estratégias isoladas em um **organismo econômico coletivo** gerido pela camada de **Cognitive Portfolio Intelligence**.

---

## Decision

Criar a camada **`src/cognitive-portfolio/`** contendo o ecossistema da **Fase 10 — Cognitive Portfolio Intelligence Layer**.

### Princípios da Arquitetura de Portfólio

1. **Alocação Baseada no Cognitive Allocation Score (CAS)**: O capital não é alocado puramente por retorno histórico recente (o que causaria overfitting), mas pelo indicador composto **CAS**:
   $$CAS = w_1 \cdot \text{EvidenceQuality (CES)} + w_2 \cdot \text{EvolutionHealth (EHS)} + w_3 \cdot \text{RegimeFit} + w_4 \cdot \text{RiskEfficiency}$$
   - $CAS \ge 90$: `CORE_ALLOCATION` ($30\% - 50\%$ do capital do regime)
   - $70 \le CAS < 90$: `ACTIVE` ($10\% - 30\%$ do capital do regime)
   - $50 \le CAS < 70$: `OBSERVATION` ($0\% - 10\%$ em modo shadow/paper)
   - $CAS < 50$: `QUARANTINE` ($0\%$ capital)

2. **Genoma da Estratégia (`StrategyGenomeRegistry`)**: Cada estratégia possui um perfil genético imutável registrando ancestralidade, regimes de afinidade, evidência estatística (CES), saúde evolutiva (EHS) e histórico de mutações.

3. **Matriz de Correlação Inteligente (`CorrelationMatrixEngine`)**: Mede correlações de retorno, drawdown e comportamento por regime entre modelos para evitar a concentração inadvertida de risco em estratégias correlacionadas.

4. **Alocação Dinâmica por Regime (`RegimeAllocationEngine`)**: Seleciona dinamicamente a cesta ótima de genomas de estratégia com base no regime de mercado atual identificado pela Fase 8.

5. **Governador de Alocação de Capital (`CapitalAllocationGovernor`)**: Gate final de proteção entre o portfólio cognitivo e o `RiskGateway`. Garante que os limites de capital por regime e a exposição máxima agregada nunca sejam excedidos.

### Módulos Principais

- `StrategyGenomeRegistry.js`
- `CorrelationMatrixEngine.js`
- `RegimeAllocationEngine.js`
- `CapitalAllocationGovernor.js`
- `PortfolioIntelligenceEngine.js`
- `index.js` (Facade)

---

## Consequences

### Positivas
- Transforma estratégias isoladas em um portfólio diversificado e resiliente a mudanças de regime.
- Impede a alocação de capital em modelos correlacionados durante períodos de estresse.
- Integração nativa com a governança da Corte ECA e o RiskGateway.

### Negativas
- Requer amostragem contínua de matrizes de correlação entre múltiplos genomas em tempo de execução.
