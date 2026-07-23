# ADR-033: Unified Cognitive Architecture (UCA) — Teoria Unificada da Arquitetura do Lyzer Edge

- **Status**: ACCEPTED (AUDIT & ARCHITECTURAL SPECIFICATION)
- **Date**: 2026-07-23
- **Author**: Guardião da Arquitetura, Principal Systems Architect, Quant Risk Specialist

---

## Executive Summary & Mission Directive

Após o desenvolvimento contínuo das Fases 1 a 15 (registradas nas ADRs 001 a 032), o ecossistema Lyzer Edge alcançou plenitude de capacidades funcionais:
- Memória Causal (Fase 5 / ADR-006)
- Aprendizado Causal e Metacognição (Fase 6 & 6.6 / ADR-010, ADR-013)
- Governança Evolutiva, Sandbox e Certificação (Fases 7.0–7.4 / ADR-017 a ADR-024)
- Inteligência de Mercado e Hipóteses (Fase 8 / ADR-025)
- Validação Empírica & Significância Estatística (Fase 9 / ADR-026)
- Inteligência de Portfólio & Genoma (Fase 10 / ADR-027)
- Ecologia & Organismo Adaptativo (Fase 11 / ADR-028)
- Operações Cognitivas & Telemetria (Fase 12 / ADR-029)
- Runtime Distribuído & Maestro Global (Fase 13 / ADR-030)
- Produção Institucional & Grafo Causal (Fase 14 / ADR-031)
- Laboratório de Pesquisa Autônomo & EVI (Fase 15 / ADR-032)

---

## 🏛️ Auditoria Crítica dos Grandes Mestres da Computação

Se Alan Turing, John von Neumann, Claude Shannon, Edsger Dijkstra e Christopher Alexander revisassem a arquitetura atual do Lyzer Edge, estes seriam os seus julgamentos objetivos:

### 1. Alan Turing (Teoria da Computabilidade & Máquinas de Estado)
- **Elogio**: A rigorosa formalização dos estados epistêmicos (`OBSERVATION`, `HYPOTHESIS`, `PROVEN_KNOWLEDGE`, `CONSTITUTIONAL`) e o isolamento entre estado de deliberação e execução de ordens.
- **Crítica de Complexidade Acidental**: A existência de dezenas de classes `Engine` separadas instanciando autômatos de estado praticamente idênticos. Turing apontaria que, pela Teoria da Computabilidade Universal, todas as transformações de hipóteses a decisões são autômatos equivalentes parametrizados por funções de transição.

### 2. John von Neumann (Arquitetura de Sistemas & Memória Central)
- **Elogio**: A imutabilidade do registro de eventos e a transacionalidade atômica da governança evolutiva.
- **Crítica de Complexidade Acidental**: A fragmentação de armazenamento de memória. Hoje coexistem `CausalMemoryDB`, `EvolutionLedger`, `ParameterVersionStore`, `StrategyGenomeRegistry` e `CausalKnowledgeGraph`. Von Neumann exigiria a unificação sob uma única infraestrutura de **Memória Central Unificada baseada em Event Sourcing**.

### 3. Claude Shannon (Teoria da Informação & Entropia)
- **Elogio**: A introdução do cálculo do **Valor Esperado da Informação (EVI)** e a redução de incerteza estatística no Laboratório de Pesquisa Autônomo.
- **Crítica de Complexidade Acidental**: A multiplicação de Scores lineares sobrepostos (`CCS`, `CES`, `EHS`, `ARS`, `CAS`, `MAS`, `GCHI`). Shannon demonstraria que esses 7 scores são apenas transformações e combinações lineares de um conjunto básico de variáveis informacionais, representando redundância de dados (entropia desnecessária).

### 4. Edsger W. Dijkstra (Engenharia de Software, Abstração & Elegância)
- **Elogio**: O axioma constitucional inviolável *"O Tribunal nunca aprende"*, que previne o acoplamento entre governança e previsão.
- **Crítica de Complexidade Acidental**: Severa repreensão à proliferação de fachadas de conveniência (`CognitivePortfolioFacade`, `CognitiveOrganismFacade`, `CognitiveOperationsFacade`, `AutonomousResearchFacade`, etc.). Dijkstra classificaria essas 8 fachadas como **abstrações rasas** que mascaram a falta de uma interface de módulo unificada.

### 5. Christopher Alexander (Padrões de Linguagem & Arquitetura Fractal)
- **Elogio**: A elegância orgânica da co-evolução biológica de genomas e adaptação ao ecossistema de mercado.
- **Crítica de Complexidade Acidental**: A falha em explicitar o **Padrão Fractal Universal do Ciclo Cognitivo**, duplicando estruturas de loop em quase todos os subsistemas em vez de expressar o edifício inteiro por um único padrão autorreferencial.

---

## 1. Mapa Completo da Arquitetura (Fases 1 → 15)

```
===================================================================================
                                LYZER EDGE UNIFIED ECOSYSTEM
===================================================================================

 [CAMADA 1: EXECUÇÃO E HARDWARE]
   └── ExchangeAdapter (Binance, Bybit, Kraken, Mock)
   └── ExecutionTriggerLayer (TRG Threshold >= 0.4)
   └── RiskGateway (uuidv7 Traceability)

 [CAMADA 2: FILTROS ONTOLÓGICOS E CONSTITUIÇÃO (IMUTÁVEL)]
   └── ResidualizationLayer (Consensus Destruction)
   └── TruthKernel (LHDS Veto Limit & Ontological Collapse)
   └── C-CLIST Stress Oracle & MOL (Safety State Machine)
   └── ECA Constitutional Court (EEF & Constraint Engine - NUNCA APRENDE)

 [CAMADA 3: MEMÓRIA CAUSAL E CONHECIMENTO]
   └── CausalMemoryRuntime (CCS 100% Integrity)
   └── ParameterVersionManager & EvolutionLedger
   └── StrategyGenomeRegistry
   └── CausalKnowledgeGraph (Regime -> Feature -> Hypothesis -> Evidence -> PnL)

 [CAMADA 4: APRENDIZADO, METACOCOGNIÇÃO E DESCOBERTA]
   └── CausalLearningEngine & EpistemicState
   └── CausalReflectionEngine (Metacognition & Bias Detection)
   └── RegimeDiscoveryEngine & FeatureDiscoveryEngine
   └── HypothesisGenerator & StrategyCandidateEngine

 [CAMADA 5: SANDBOX, VALIDAÇÃO E GOVERNANÇA EVOLUTIVA]
   └── AdaptiveSandboxEngine & ParameterProposalEngine
   └── AdaptationImpactAnalyzer & RegimeStressEvaluator (ARS)
   └── EvolutionExecutor & AutomaticRollbackEngine
   └── EmpiricalValidationEngine & Walk-Forward Validation (CES, 95% CI)

 [CAMADA 6: INTELIGÊNCIA DE PORTFÓLIO E ECOSSISTEMA DE MERCADO]
   └── CorrelationMatrixEngine & RegimeAllocationEngine
   └── CapitalAllocationGovernor & PortfolioIntelligenceEngine (CAS)
   └── MarketEcologyEngine & StrategyCompetitionEngine
   └── AlphaDecayEngine (Half-Life) & StrategyMutationEngine
   └── MarketAdaptationScore (MAS)

 [CAMADA 7: OPERAÇÕES, RUNTIME DISTRIBUÍDO E PESQUISA AUTÔNOMA]
   └── CognitiveTelemetryAggregator (GCHI Index) & PipelineTracingEngine
   └── PerformanceProfilingMonitor
   └── CognitiveKernel (Maestro Global)
   └── CognitiveEventBus (Event Sourcing Backbone) & CognitiveCommandBus (CQRS)
   └── WorkerPoolEngine (6 Specialist Workers)
   └── SystemHealthSupervisor & CognitiveScheduler
   └── ExpectedValueInfoEngine (EVI) & KnowledgeGapDetector
   └── ScientificBacklogManager & ResearchPublicationEngine
```

---

## 2. Mapa de Duplicações e Redundâncias

Da auditoria realizada no código fonte, foram identificadas as seguintes **duplicações conceituais**:

| Duplicação | Localização Atual | Causa Raiz | Oportunidade de Compressão |
|------------|------------------|------------|----------------------------|
| **Cálculo de Scores Lineares** | `CES`, `ARS`, `EHS`, `CAS`, `MAS`, `GCHI` | Cada módulo implementou sua própria ponderação escalar | Unificar em um único `GenericCompositeScore` parametrizado por pesos |
| **Ciclo de Avaliação de Regras** | `EmpiricalValidation`, `AdaptationImpact`, `RegimeStress`, `Ecology` | Cada engine executa transformações de métricas em enums de zona | Unificar em um único `ParametricDecisionEngine` parametrizado por regras |
| **Persistência de Dados** | `CausalMemoryDB`, `Ledger`, `VersionStore`, `GenomeRegistry`, `KnowledgeGraph` | Vários repositórios SQLite/Memória independentes | Unificar como **Projeções de Leitura** da `UniversalMemoryArchitecture` baseada em Event Sourcing |
| **Fachadas de Conveniência** | `CognitivePortfolioFacade`, `CognitiveOrganismFacade`, `CognitiveOperationsFacade`, etc. | Métodos wrappers idênticos (`evaluate`, `runCycle`, `getStatus`) | Implementar uma interface unificada `ICognitiveModule` |

---

## 3. Mapa das Abstrações Universais (A Teoria Unificada)

Toda a arquitetura do Lyzer Edge pode ser reduzida a apenas **4 Abstrações Universais Primitivas**:

```
                       ┌────────────────────────────────────────┐
                       │     UNIVERSAL COGNITIVE ARCHITECTURE   │
                       └───────────────────┬────────────────────┘
                                           │
         ┌───────────────────┬─────────────┴───────┬───────────────────┐
         ▼                   ▼                     ▼                   ▼
1. Cognitive Loop   2. Generic Score   3. Universal Memory   4. Cognitive Runtime
   (Fractal Pattern)  (Composite Weight)  (Event Sourcing Log)  (Kernel+Bus+Workers)
```

### 1. The Universal Cognitive Loop (`CognitiveLoop`)
O circuito fractal de 8 fases presente em todos os subsistemas:
$$\text{Observe} \longrightarrow \text{Represent} \longrightarrow \text{Reason} \longrightarrow \text{Generate} \longrightarrow \text{Evaluate} \longrightarrow \text{Govern} \longrightarrow \text{Execute} \longrightarrow \text{Learn/Publish}$$

### 2. The Generic Composite Score (`GenericCompositeScore`)
Formulação matemática unificada para todos os scores:
$$Score(\vec{x}, \vec{w}) = \sum_{i=1}^k w_i \cdot N(x_i), \quad w_i \in [0, 1], \; \sum w_i = 1.0$$

### 3. The Universal Memory Architecture (`UniversalMemoryArchitecture`)
Toda a memória do sistema é a sequência imutável de eventos $E = \{e_1, e_2, \dots, e_n\}$, onde Ledger, Version Control, Genome Registry e Knowledge Graph são apenas **Projeções de Leitura (Read Views)** sobre $E$.

### 4. The Cognitive Runtime Platform (`CognitiveRuntimePlatform`)
A fusão do Maestro (`CognitiveKernel`), Mensageria (`CognitiveEventBus`), Intenções (`CognitiveCommandBus`), Cadência (`CognitiveScheduler`) e Paralelismo (`WorkerPoolEngine`).

---

## 4. Mapa de Responsabilidades por Camada

1. **Percepção e Abstração**: Converter ticks de mercado e eventos de corretora em estados de realidade padronizados sem ruído.
2. **Filtro Ontológico e Constituição (Imutável)**: Veto de risco de cauda (TRG), limitação ontológica (TruthKernel) e governança irrevogável (ECA Court).
3. **Memória e Conhecimento**: Garantia de integridade causal (CCS 100%) e manutenção da linhagem histórica.
4. **Aprendizado e Reflexão**: Formulação de hipóteses, detecção de viés metacognitivo e estimativa de incerteza.
5. **Governança Evolutiva e Sandbox**: Experimentação isolada em ambiente sombra, cálculo de risco adaptativo (ARS) e transações paramétricas com rollback automático.
6. **Alocação Cognitiva de Capital**: Distribuição de capital proporcional ao grau de evidência e adequação ao regime (CAS, Matriz de Correlação).
7. **Organismo e Operações**: Resiliência ambiental, detecção de Alpha Decay, cálculo do MAS, GCHI e tracing de latência.
8. **Decisão Econômica de Pesquisa**: Ranqueamento de investigações por EVI e alocação de orçamento de computação.

---

## 5. Mapa de Dependências e Fluxo Causal

```text
Market Reality
   │
   ▼
ExchangeAdapter / MarketWorker
   │
   ▼
CausalMemoryRuntime (CCS 100%)
   │
   ▼
CognitiveKernel / CognitiveEventBus (Backbone)
   │
   ├──────────────────────────────┬──────────────────────────────┐
   ▼                              ▼                              ▼
CausalReflectionEngine      KnowledgeGapDetector        MarketEcologyEngine
   │                              │                              │
   ▼                              ▼                              ▼
ParameterProposalEngine     ExpectedValueInfoEngine     StrategyCompetitionEngine
   │                              │                              │
   ▼                              ▼                              ▼
AdaptiveSandboxEngine       ScientificBacklogManager     AlphaDecayEngine
   │                              │                              │
   ▼                              ▼                              ▼
ECA Constitutional Court    EmpiricalValidationEngine   StrategyMutationEngine
   │                              │                              │
   ▼                              ▼                              ▼
ParameterVersionManager     ResearchPublicationEngine   PortfolioIntelligenceEngine (CAS)
   │                              │                              │
   └──────────────────────────────┴──────────────────────────────┘
                                  │
                                  ▼
                     CapitalAllocationGovernor
                                  │
                                  ▼
                           RiskGateway
                                  │
                                  ▼
                            Order Execution
```

---

## 6. Mapa de Repetições de Código & Padrões

1. **Instanciação de SQLite**: 6 arquivos instanciam bases de dados independentes.
2. **Métodos Wrappers de Fachada**: `evaluateEcology`, `evaluateCompetition`, `evaluateDecay`, `aggregateTelemetry` apenas delegam chamadas para sub-motores sem adicionar lógica.
3. **Estruturas de Retorno de Relatório**: Todos os relatórios retornam objetos com a estrutura `{ status, timestamp, evaluated_at, details }`.

---

## 7. Mapa de Oportunidades de Simplificação e Compressão

1. **Compressão de Scores (7 $\to$ 1)**: Substituir `CES`, `ARS`, `EHS`, `CAS`, `MAS`, `GCHI` e `CCS` pela classe genérica `GenericCompositeScore`.
2. **Compressão de Engines (15 $\to$ 1)**: Substituir a duplicação de autômatos pela classe genérica `ParametricDecisionEngine`.
3. **Compressão de Fachadas (8 $\to$ 1)**: Fazer todas as fachadas herdarem de uma classe base `CognitiveModuleBase` implementando a interface `ICognitiveModule`.
4. **Compressão de Armazenamento (5 $\to$ 1)**: Unificar a gravação de estado sob o `UniversalMemoryManager` com projeções imutáveis no SQLite.

---

## 8. Lista de Componentes a Converter em Frameworks Genéricos

### 1. `GenericCompositeScore`
Framework reutilizável de cálculo escalar ponderado com validação de pesos e zonas automáticas.

### 2. `ParametricDecisionEngine`
Framework genérico de processamento de regras, onde entradas entram em um pipeline de regras registradas e saem como um veredito classificado em zonas.

### 3. `UniversalMemoryArchitecture`
Repositório central de Event Sourcing do qual derivam as exibições de Ledger, Version Store, Genome Registry e Knowledge Graph.

### 4. `ICognitiveModule` (Interface Única)
Contrato padrão para todos os módulos cognitivos do Lyzer Edge:
```ts
interface ICognitiveModule {
    observe(input: any): Promise<any>;
    reason(state: any): Promise<any>;
    evaluate(params: any): Promise<any>;
    execute(decision: any): Promise<any>;
    learn(feedback: any): Promise<any>;
}
```

---

## 9. Lista de Componentes que NÃO Devem Ser Unificados

Estes componentes **DEVEM PERMANECER ABSOLUTAMENTE ESPECIALIZADOS E SEPARADOS** para preservar a segurança ontológica e constitucional do sistema:

1. **ECA Constitutional Court**: NUNCA deve ser fundido com motores de aprendizado ou previsão. Axioma fundamental: *"O Tribunal nunca aprende"*.
2. **TruthKernel**: O filtro de veto ontológico (LHDS Veto Limit) deve permanecer estático e imutável no nível do Kernel de Execução.
3. **ResidualizationLayer**: A destruição de consenso entre provedores (V1 SMC, V2 SnD, V3 Momentum) deve ser mantida puramente matemática no início do pipeline.
4. **ExecutionTriggerLayer**: O limiar TRG ($\ge 0.4$) não deve ser unificado com heurísticas de otimização de portfólio.

---

## 10. Lista de Riscos de Over-Engineering Identificados

1. **Inflação de Abstrações Rasas**: Criar uma fachada para cada novo conceito adicionado sem que haja complexidade que justifique a fachada.
2. **Overhead de Serialização de Eventos**: Converter objetos locais simples em múltiplos envelopes de evento assíncronos em pipelines síncronos críticos de alta frequência.
3. **Multiplicação de Métricas de Risco Ponderadas**: Criar novos "Scores" compostos que apenas combinam scores já existentes (ex: GCHI combinando CAS, MAS, ARS, EHS).

---

## 11. Lista de Riscos de Regressão Infinita Identificados

1. **Meta-Metacognição**: O risco de criar uma camada de reflexão sobre o motor de reflexão (Fase 6.6 $\to$ Meta-Reflection $\to$ Meta-Meta-Reflection).
2. **Auto-Mutação sem Âncora Empírica**: O risco de o motor de mutação gerar mutações de estratégias que geram novas mutações antes que a validação empírica ($N \ge 500$) conclua o ciclo da primeira geração.

---

## 12. Critérios Objetivos de Governança para Bloquear Novas Camadas Desnecessárias

Para que qualquer nova funcionalidade ou módulo seja aceito no repositório do Lyzer Edge a partir desta ADR, ele **DEVE SATISFAZER ESTRITAMENTE OS 4 CRITÉRIOS DE CORTE**:

1. **Critério da Incapacidade de Representação**: A nova exigência NÃO pode ser expressa como uma instância parametrizada do `GenericCompositeScore`, do `ParametricDecisionEngine` ou do `UniversalMemoryArchitecture`.
2. **Critério da Evidência Econômica Mensurável**: O novo componente deve provar em simulação isolada ($N \ge 500, p \le 0.01$) um aumento do Sharpe Ratio, redução de Drawdown ou aumento da eficiência de CPU (EVI).
3. **Critério da Não-Duplicação de Loop**: O componente não pode redefinir um loop de decisão independente; ele deve se encaixar em uma das 8 fases do `CognitiveLoop` universal.
4. **Critério da Minimalidade de Dijkstra**: Se o mesmo objetivo puder ser alcançado ajustando os parâmetros de um módulo existente, a criação da nova classe fica **ESTRITAMENTE PROIBIDA**.

---

## Veredito & Teoria Unificada do Lyzer Edge

> **"O Lyzer Edge não é um conjunto heterogêneo de 15 motores desconectados. O Lyzer Edge é um único Circuito Cognitivo Fractal Universal (CognitiveLoop), que opera sobre um Registro Imutável de Eventos Causais (UniversalMemory), cujas decisões são filtradas pela Constituição e avaliadas por Funções Paramétricas de Score (GenericCompositeScore)."**

Com a aprovação deste ADR-033, a expansão horizontal de novas camadas no Lyzer Edge é encerrada. A evolução do sistema passa a ser orientada pela **simplicidade, refinamento de parâmetros, eficiência computacional e validação empírica institucional**.
