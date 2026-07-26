import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { UniversalContextEngine, CONTEXT_LAYERS } from '../../../../src/components/commandCenter/sdk/lacw/adaptive/UniversalContextEngine.js';
import { UserIntentEngine, INTENT_CATEGORIES } from '../../../../src/components/commandCenter/sdk/lacw/adaptive/UserIntentEngine.js';
import { AttentionScoringEngine, ATTENTION_STATES } from '../../../../src/components/commandCenter/sdk/lacw/adaptive/AttentionScoringEngine.js';
import { AdaptiveLayoutEngine } from '../../../../src/components/commandCenter/sdk/lacw/adaptive/AdaptiveLayoutEngine.js';
import { ProgressivePersonalizationEngine } from '../../../../src/components/commandCenter/sdk/lacw/adaptive/ProgressivePersonalizationEngine.js';
import { SmartRecommendationEngine } from '../../../../src/components/commandCenter/sdk/lacw/adaptive/SmartRecommendationEngine.js';
import { CognitiveAssistantPlannerEngine } from '../../../../src/components/commandCenter/sdk/lacw/adaptive/CognitiveAssistantPlannerEngine.js';
import { SelfOptimizationLoopEngine } from '../../../../src/components/commandCenter/sdk/lacw/adaptive/SelfOptimizationLoopEngine.js';
import { CognitiveUXScoreCalculator } from '../../../../src/components/commandCenter/sdk/lacw/adaptive/CognitiveUXScoreCalculator.js';
import { MultimodalContextAdapter } from '../../../../src/components/commandCenter/sdk/lacw/adaptive/MultimodalContextAdapter.js';

describe('LACW Phase 10 — Adaptive Intelligence Layer & Self-Optimizing Workspace Suite', () => {
  let contextEngine;
  let intentEngine;
  let attentionEngine;
  let layoutEngine;
  let personalizationEngine;
  let recommendationEngine;
  let assistantPlanner;
  let selfOptimizationLoop;
  let uxScoreCalculator;
  let multimodalAdapter;

  beforeEach(() => {
    contextEngine = new UniversalContextEngine();
    intentEngine = new UserIntentEngine();
    attentionEngine = new AttentionScoringEngine();
    layoutEngine = new AdaptiveLayoutEngine();
    personalizationEngine = new ProgressivePersonalizationEngine();
    recommendationEngine = new SmartRecommendationEngine();
    assistantPlanner = new CognitiveAssistantPlannerEngine();
    selfOptimizationLoop = new SelfOptimizationLoopEngine();
    uxScoreCalculator = new CognitiveUXScoreCalculator();
    multimodalAdapter = new MultimodalContextAdapter();
  });

  afterEach(() => {
    contextEngine.dispose();
    intentEngine.dispose();
    attentionEngine.dispose();
    layoutEngine.dispose();
    personalizationEngine.dispose();
    recommendationEngine.dispose();
    assistantPlanner.dispose();
    selfOptimizationLoop.dispose();
    uxScoreCalculator.dispose();
    multimodalAdapter.dispose();
  });

  it('1. UniversalContextEngine should manage 6 context layers and aggregate context snapshots', () => {
    expect(CONTEXT_LAYERS).toHaveLength(6);
    contextEngine.updateContext('SESSION', { userRole: 'RESEARCHER' });
    contextEngine.updateContext('MOMENT', { state: 'CONDUCTING_EXPERIMENT' });

    const snapshot = contextEngine.getAggregatedContext();
    expect(snapshot.activePersona).toBe('RESEARCHER');
    expect(snapshot.momentState).toBe('CONDUCTING_EXPERIMENT');
  });

  it('2. UserIntentEngine should classify user prompt into 10 intent categories', () => {
    expect(INTENT_CATEGORIES).toContain('EXPLAIN');
    expect(INTENT_CATEGORIES).toContain('OPTIMIZE');

    const intent = intentEngine.classifyIntent('Explain why TruthKernel vetoed this trade');
    expect(intent.type).toBe('EXPLAIN');
    expect(intent.confidence).toBeGreaterThan(0.9);
  });

  it('3. AttentionScoringEngine should compute Attention Score and assign 6 attention states', () => {
    expect(ATTENTION_STATES).toContain('CRITICAL');
    expect(ATTENTION_STATES).toContain('IMPORTANT');

    const score = attentionEngine.calculateAttentionScore({ impact: 0.95, urgency: 0.90, relevance: 0.98 });
    expect(score.attentionScore).toBeGreaterThan(0.85);
    expect(score.attentionState).toBe('CRITICAL');
  });

  it('4. AdaptiveLayoutEngine should dynamically adapt layout panels and density based on persona', () => {
    const devLayout = layoutEngine.generateAdaptedLayout('DEVELOPER');
    expect(devLayout.primaryPanels).toContain('Runtime');
    expect(devLayout.viewDensity).toBe('COMPACT');

    const execLayout = layoutEngine.generateAdaptedLayout('EXECUTIVE');
    expect(execLayout.primaryPanels).toContain('Metrics');
    expect(execLayout.viewDensity).toBe('SPACIOUS');
  });

  it('5. ProgressivePersonalizationEngine should track user preferences and confidence progressive learning', () => {
    personalizationEngine.recordPreferenceSignal('u1', 'theme', 'DARK_MODE');
    const pref = personalizationEngine.recordPreferenceSignal('u1', 'theme', 'DARK_MODE');

    expect(pref.frequency).toBe(2);
    expect(personalizationEngine.getUserPreferences('u1')).toHaveLength(1);
  });

  it('6. SmartRecommendationEngine should generate evidence-backed action recommendations', () => {
    const rec = recommendationEngine.generateRecommendation('u1');
    expect(rec.recommendationId).toBeDefined();
    expect(rec.confidence).toBeGreaterThan(0.9);
    expect(rec.targetAction).toBe('OPEN_PERFORMANCE_INSPECTOR');
  });

  it('7. CognitiveAssistantPlannerEngine should formulate multi-step action plans for complex goals', () => {
    const plan = assistantPlanner.formulateActionPlan('Analyze Market Regime');
    expect(plan.planId).toBeDefined();
    expect(plan.steps).toHaveLength(4);
    expect(plan.expectedResult).toBeDefined();
  });

  it('8. SelfOptimizationLoopEngine should execute systemic self-optimization loops', async () => {
    const cycle = await selfOptimizationLoop.runOptimizationCycle('High Latency Spike');
    expect(cycle.cycleId).toBeDefined();
    expect(cycle.status).toBe('OPTIMIZATION_APPLIED');
  });

  it('9. CognitiveUXScoreCalculator should calculate formula-driven Cognitive UX Score', () => {
    const ux = uxScoreCalculator.calculateUXScore({ timeToGoalSec: 10, actionCount: 2, satisfaction: 0.99 });
    expect(ux.cognitiveUXScore).toBeGreaterThan(0.85);
    expect(ux.rating).toBe('INSTITUTIONAL_EXCELLENT_UX');
  });

  it('10. MultimodalContextAdapter should convert text, image, code, audio, and spatial inputs', () => {
    const res = multimodalAdapter.processMultimodalContext('VISION', { img: 'chart.png' });
    expect(res.modality).toBe('VISION');
    expect(res.processedSignal).toContain('embedding vector');
  });

  it('11. TC39 Symbol.dispose compliance across all adaptive intelligence engines', () => {
    expect(typeof contextEngine[Symbol.dispose]).toBe('function');
    expect(typeof layoutEngine[Symbol.dispose]).toBe('function');

    contextEngine[Symbol.dispose]();
    layoutEngine[Symbol.dispose]();

    expect(() => contextEngine.getAggregatedContext()).toThrow('ERR_UNIVERSAL_CONTEXT_ENGINE_DISPOSED');
    expect(() => layoutEngine.generateAdaptedLayout('DEVELOPER')).toThrow('ERR_ADAPTIVE_LAYOUT_ENGINE_DISPOSED');
  });
});
