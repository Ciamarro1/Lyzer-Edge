# Lyzer Labs: Project Structure & Complete Codebase Map

A arquitetura do Lyzer Labs está dividida temporalmente e epistemologicamente nas seguintes pastas. Este mapa serve como a fonte de verdade para a localização de toda a lógica do projeto na `lyzer_analytics_line_b/`.

## The Root Engine (Era 1 - 2)
Arquivos na raiz:
- `adversarial_ight.py`, `adversarial_observer_bank.py`, `cci_model_family.py`, `constraint_layer.py`, `epistemic_observatory.py`, `ight_evaluator.py`, `ight_orchestrator.py`
- Arquivos de manipulação temporal e de manifold: `manifold_mapper.py`, `time_transformer.py`, `temporal_filter_bank.py`, `temporal_ight.py`, `transfer_entropy_layer.py`
- Arquivos de nulificação/Falsificação: `null_generator_*.py`, `invariance_falsifier.py`, `lab_c_destructive_falsification.py`

## Phase 2.7 (Causalidade e Falsificação)
- `candidate_registry.py`, `causal_ranking_engine.py`, `counterfactual_engine.py`, `scf_scorecard.py`, `stability_auditor.py`

## Phase 2.8 (Universabilidade)
- `agent_download.py`, `cross_market_universality_test.py`, `distributed_removal_test.py`, `exclusion_universe_test.py`, `synthetic_universality_test.py`

## Phase 3 (Agentes baseados em Regimes)
- `abm_engine.py`, `regimes.py`

## Phase 4a & 4b (Memória, Persistência e Estados Ocultos)
- **4a:** `regime_memory_test.py`, `state_persistence_characterization.py`
- **4b:** `state_count_discovery.py`, `state_discovery_hmm.py`, `state_transition_analysis.py`

## Phase 5 & 6 (Macro, Choques, e Narrativas)
- **5:** `phase_5a_lead_lag.py`, `phase_5b_hazard.py`, `phase_5c_emission.py`, `phase_5_macro_download.py`
- **6:** `phase_6a_pre_lead_lag.py`, `phase_6b_vix_ignition.py`, `phase_6_info_download.py`
- **6b:** `narrative_drift.py`, `narrative_edof.py`, `semantic_engine.py`
- **6c:** `data_alignment.py`, `geometry_lead_lag.py`, `narrative_geometry.py`, `transfer_entropy.py`

## Phase 7.0 - 7.099 (A Ontologia do Observador e Inteligência Evolutiva)
- **7.0 (Observer Axioms):** `ontology_base.py`, `observer_metrics.py`, `observer_taxonomy.py`
- **7.05 (Ignorance & Scope):** `observer_v2.py`, `observer_scope.py`, `observer_failure_modes.py`, `scale_invariance.py`
- **7.075 (World Models & Interpretation):** `world_model.py`, `observer_v3.py`, `belief_update.py`, `interpretation_failure_modes.py`, `observer_divergence.py`
- **7.09 (Memory & Learning):** `memory.py`, `knowledge.py`, `learning_engine.py`, `forgetting_engine.py`, `epistemic_memory.py`
- **7.095 (Agency & Decision):** `intent.py`, `utility.py`, `decision.py`, `action.py`, `consequence.py`, `decision_failure_modes.py`
- **7.099 (Meta-Ontology & Evolution):** `ontology.py`, `meta_ontology.py`, `ontology_revision.py`, `ontology_selection.py`, `ontology_failure_modes.py`

## Phase 7.1 (Observer Dynamics Lab - Era Empírica)
- **Root:** `empirical_orchestrator.py`
- **Observers:** `observers/price_observer.py`, `observers/institutional_observer.py`

*Nota: Em `C:\Users\WDAGUtilityAccount\.gemini\antigravity\brain\...` ficam todos os relatórios `.md` de síntese de cada Era gerados dinamicamente.*
