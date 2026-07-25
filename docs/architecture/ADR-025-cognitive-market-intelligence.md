# ADR-025: Cognitive Market Intelligence Architecture

- **Status**: ACCEPTED
- **Date**: 2026-07-23
- **Author**: Guardião da Arquitetura, Principal Systems Architect, Quant Risk Specialist

---

## Context

Com a conclusão do ecossistema de adaptação e governança (Fases 7.0 a 7.4), o Lyzer Edge possui um pipeline seguro para testar, avaliar, versionar, promover, monitorar e reverter propostas de parâmetros cognitivos.

Contudo, até a Fase 7, as hipóteses eram derivadas principalmente de ajustes simples em parâmetros existentes. Para dar o salto para **inteligência de mercado autônoma**, o sistema precisa de uma camada capaz de:
1. Descobrir regimes de mercado não mapeados ou emergentes (`RegimeDiscoveryEngine`)
2. Descobrir e compor novas features estatísticas/microestruturais (`FeatureDiscoveryEngine`)
3. Gerar hipóteses causais testáveis autonomamente (`HypothesisGenerator`)
4. Detectar anomalias e quebras estruturais de mercado em tempo real (`AnomalyDetectionEngine`)
5. Sintetizar candidatos de estratégia completos para submissão no Sandbox (`StrategyCandidateEngine`)

---

## Decision

Criar a camada **`src/cognitive-intelligence/`** contendo o ecossistema da **Fase 8 — Cognitive Market Intelligence Layer**.

### Arquitetura do Fluxo Cognitivo

```
                     MARKET TICK & CAUSAL MEMORY STREAM
                                     │
                                     ▼
                     ┌───────────────┴───────────────┐
                     ▼                               ▼
          RegimeDiscoveryEngine           AnomalyDetectionEngine
          (Cluster/Volatility)            (Structural Breaks)
                     │                               │
                     └───────────────┬───────────────┘
                                     ▼
                           FeatureDiscoveryEngine
                           (Composite Features)
                                     │
                                     ▼
                            HypothesisGenerator
                           (Testable Hypotheses)
                                     │
                                     ▼
                         StrategyCandidateEngine
                         (Candidate Strategies)
                                     │
                                     ▼
                    ADAPTIVE PIPELINE CONTROLLER (Fase 7.1)
                    (Sandbox → ARS → Court → Production)
```

### Módulos Principais

1. **`RegimeDiscoveryEngine.js`**
   - Agrupa séries temporais de indicadores causais (DVF, TRG, LHDS, spread, volatilidade) usando análise estatística de variância para identificar regimes latentes (`REGIME_EMERGING_HIGH_VOL`, `REGIME_EMERGING_LIQUIDITY_VACUUM`, etc.).

2. **`FeatureDiscoveryEngine.js`**
   - Cria expressões compostas entre indicadores base (ex: $DVF \times TRG / (LHDS + \epsilon)$) para descobrir preditores com maior poder de separação.

3. **`HypothesisGenerator.js`**
   - Gera objetos `CognitiveHypothesis` formalmente definidos com premissa causal, parâmetros propostos, impacto esperado ($\Delta PnL$) e regras de invalidação.

4. **`AnomalyDetectionEngine.js`**
   - Identifica anomalias de microestrutura ou desvios em tempo real em relação ao modelo de realidade reconstruído pela CSRL.

5. **`StrategyCandidateEngine.js`**
   - Transforma hipóteses validadas em objetos `StrategyCandidate` prontos para injeção no `AdaptivePipelineController`.

6. **`CognitiveIntelligenceFacade` (`index.js`)**
   - Interface unificada para inicializar, executar ciclos de inteligência de mercado e submeter candidatos ao pipeline adaptativo governado.

---

## Axiomas de Inteligência

1. **Nenhum Candidato Direto em Produção**: Todas as estratégias candidatas geradas pela Fase 8 **obrigatoriamente** passam pelo pipeline da Fase 7 (Sandbox → Evaluation ARS → ECA Court → Versioning → Monitoring).
2. **Determinismo & Explicabilidade**: Cada hipótese gerada carrega a cadeia causal e os dados empíricos que justificam sua criação.
3. **Não-Alucinação**: Propostas sem correlação estatística verificável no histórico causal da Fase 5 são descartadas na fase de geração.

---

## Consequences

### Positivas
- Permite que o sistema crie novas estratégias e descubra novas dinâmicas de mercado sem intervenção humana.
- Mantém o mesmo nível institucional de governança e segurança (ECA Court e ARS).
- Transforma a memória causal em uma fonte ininterrupta de alpha estatístico.

### Negativas
- Maior consumo de memória e CPU para agrupamento estatístico de regimes e combinação de features (otimizado via amostragem e execução por lotes).
