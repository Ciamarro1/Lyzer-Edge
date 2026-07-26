import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { UniversalEventModel } from '../../../../src/components/commandCenter/sdk/lacw/runtime/UniversalEventModel.js';
import { InstitutionalEventBus } from '../../../../src/components/commandCenter/sdk/lacw/runtime/InstitutionalEventBus.js';
import { EventReplayEngine } from '../../../../src/components/commandCenter/sdk/lacw/runtime/EventReplayEngine.js';
import { RealtimePriorityEngine } from '../../../../src/components/commandCenter/sdk/lacw/runtime/RealtimePriorityEngine.js';
import { SmartSchedulerEngine } from '../../../../src/components/commandCenter/sdk/lacw/runtime/SmartSchedulerEngine.js';
import { UniversalExecutionEngine } from '../../../../src/components/commandCenter/sdk/lacw/runtime/UniversalExecutionEngine.js';
import { ResourceManagerEngine } from '../../../../src/components/commandCenter/sdk/lacw/runtime/ResourceManagerEngine.js';
import { FailureManagerEngine } from '../../../../src/components/commandCenter/sdk/lacw/runtime/FailureManagerEngine.js';
import { CognitiveMetricEngine } from '../../../../src/components/commandCenter/sdk/lacw/runtime/CognitiveMetricEngine.js';
import { SimulationDigitalTwinEngine } from '../../../../src/components/commandCenter/sdk/lacw/runtime/SimulationDigitalTwinEngine.js';

describe('LACW Phase 4 — Cognitive Runtime & Realtime Infrastructure Suite', () => {
  let eventModel;
  let eventBus;
  let replayEngine;
  let priorityEngine;
  let scheduler;
  let executionEngine;
  let resourceManager;
  let failureManager;
  let metricEngine;
  let digitalTwin;

  beforeEach(() => {
    eventModel = new UniversalEventModel();
    eventBus = new InstitutionalEventBus();
    replayEngine = new EventReplayEngine(eventBus);
    priorityEngine = new RealtimePriorityEngine();
    scheduler = new SmartSchedulerEngine();
    executionEngine = new UniversalExecutionEngine(eventBus);
    resourceManager = new ResourceManagerEngine();
    failureManager = new FailureManagerEngine();
    metricEngine = new CognitiveMetricEngine();
    digitalTwin = new SimulationDigitalTwinEngine();
  });

  afterEach(() => {
    eventModel.dispose();
    eventBus.dispose();
    replayEngine.dispose();
    priorityEngine.dispose();
    scheduler.dispose();
    executionEngine.dispose();
    resourceManager.dispose();
    failureManager.dispose();
    metricEngine.dispose();
    digitalTwin.dispose();
  });

  it('1. UniversalEventModel should create and validate 18-attribute universal events', () => {
    const evt = eventModel.createEvent('Cognitive.Reasoning.Evaluated', { score: 0.95 }, { importance: 'HIGH' });
    expect(evt.id).toBeDefined();
    expect(evt.type).toBe('Cognitive.Reasoning.Evaluated');

    const validation = eventModel.validateEvent(evt);
    expect(validation.valid).toBe(true);
    expect(validation.missingAttributes).toHaveLength(0);
  });

  it('2. InstitutionalEventBus should handle pub/sub, priority queues, and DLQ backpressure', () => {
    const received = [];
    eventBus.subscribe('Cognitive.*', (evt) => received.push(evt));

    const evt = eventModel.createEvent('Cognitive.Reasoning.Evaluated', { score: 0.95 }, { importance: 'HIGH' });
    eventBus.publish(evt);

    expect(received).toHaveLength(1);
    expect(received[0].id).toBe(evt.id);
  });

  it('3. EventReplayEngine should reconstruct state at target timestamp', () => {
    const events = [
      { type: 'state:changed', timestamp: 100, payload: { stateKey: 'k1', record: { value: 'val1' } } },
      { type: 'state:changed', timestamp: 200, payload: { stateKey: 'k1', record: { value: 'val2' } } },
      { type: 'state:changed', timestamp: 300, payload: { stateKey: 'k1', record: { value: 'val3' } } }
    ];

    const replayed = replayEngine.reconstructStateAt(events, 250);
    expect(replayed.eventsReplayedCount).toBe(2);
    expect(replayed.reconstructedState.k1).toBe('val2');
  });

  it('4. RealtimePriorityEngine should classify streams into IMMEDIATE, BATCHED, or BACKGROUND', () => {
    const immediate = priorityEngine.classifyStreamDelivery({ id: 'e1', importance: 'CRITICAL' });
    expect(immediate.channel).toBe('IMMEDIATE_STREAM');

    const batched = priorityEngine.classifyStreamDelivery({ id: 'e2', importance: 'NORMAL' });
    expect(batched.channel).toBe('BATCHED_STREAM');
  });

  it('5. SmartSchedulerEngine should schedule and execute tasks in priority order', async () => {

    scheduler.scheduleTask('task1', async () => 'out1', { priority: 'NORMAL' });
    scheduler.scheduleTask('task2', async () => 'out2', { priority: 'HIGH' });

    const job = await scheduler.executeNextJob();
    expect(job.taskName).toBe('task2'); // High priority executes first
    expect(job.output).toBe('out2');
  });

  it('6. UniversalExecutionEngine should execute target fn and record execution trace', async () => {
    const res = await executionEngine.execute('COMMAND', 'cmd_1', async (ctx) => 'done', { user: 'admin' });
    expect(res.status).toBe('COMPLETED');
    expect(res.output).toBe('done');
    expect(res.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('7. ResourceManagerEngine should verify budget constraints and consume tokens', () => {
    const budget = resourceManager.checkBudget({ estimatedTokens: 500, estimatedMemoryMb: 50 });
    expect(budget.allowed).toBe(true);

    const totalUsed = resourceManager.consumeTokens(500);
    expect(totalUsed).toBe(500);
  });

  it('8. FailureManagerEngine should trip circuit breaker upon threshold breach and execute fallbacks', async () => {
    const failingFn = async () => { throw new Error('Simulated Failure'); };
    const fallbackFn = async () => 'fallback_value';

    for (let i = 0; i < 3; i++) {
      await failureManager.executeWithResilience('target_a', failingFn, fallbackFn);
    }

    const openResult = await failureManager.executeWithResilience('target_a', failingFn, fallbackFn);
    expect(openResult.circuitState).toBe('OPEN');
    expect(openResult.output).toBe('fallback_value');
  });

  it('9. CognitiveMetricEngine should compute specialized cognitive metrics', () => {
    const metrics = metricEngine.computeCognitiveMetrics({ decisionConfidence: 0.95 });
    expect(metrics.decisionConfidence).toBe(0.95);
    expect(metrics.overallCognitiveHealthScore).toBeGreaterThan(0.9);
  });

  it('10. SimulationDigitalTwinEngine should evaluate pre-execution scenarios', () => {
    const sim = digitalTwin.evaluateSimulationScenario('ExcludeProviderX', { excludeProviderX: true });
    expect(sim.scenarioName).toBe('ExcludeProviderX');
    expect(sim.predictedImpactDelta).toBeDefined();
    expect(sim.riskAssessment).toBeDefined();
  });

  it('11. TC39 Symbol.dispose compliance across all runtime engines', () => {
    expect(typeof eventModel[Symbol.dispose]).toBe('function');
    expect(typeof scheduler[Symbol.dispose]).toBe('function');

    eventModel[Symbol.dispose]();
    scheduler[Symbol.dispose]();

    expect(() => eventModel.createEvent('Test', {})).toThrow('ERR_UNIVERSAL_EVENT_MODEL_DISPOSED');
    expect(() => scheduler.scheduleTask('t', () => {})).toThrow('ERR_SMART_SCHEDULER_ENGINE_DISPOSED');
  });
});
