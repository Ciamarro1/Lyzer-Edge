import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LACWEventBus } from '../../../../src/components/commandCenter/sdk/lacw/LACWEventBus.js';
import { LACWLayoutEngine, WORKSPACE_PRESETS } from '../../../../src/components/commandCenter/sdk/lacw/LACWLayoutEngine.js';
import { LACWWidgetRegistry } from '../../../../src/components/commandCenter/sdk/lacw/LACWWidgetRegistry.js';
import { LACWCommandPalette } from '../../../../src/components/commandCenter/sdk/lacw/LACWCommandPalette.js';
import { LACWVisualizationEngine } from '../../../../src/components/commandCenter/sdk/lacw/LACWVisualizationEngine.js';
import { LACWExplainabilityEngine } from '../../../../src/components/commandCenter/sdk/lacw/LACWExplainabilityEngine.js';

describe('Lyzer Adaptive Cognitive Workspace (LACW) Engine Suite', () => {
  let eventBus;
  let layoutEngine;
  let registry;
  let commandPalette;
  let vizEngine;
  let explainEngine;

  beforeEach(() => {
    eventBus = new LACWEventBus();
    layoutEngine = new LACWLayoutEngine(eventBus);
    registry = new LACWWidgetRegistry(eventBus);
    commandPalette = new LACWCommandPalette(eventBus);
    vizEngine = new LACWVisualizationEngine();
    explainEngine = new LACWExplainabilityEngine();
  });

  afterEach(() => {
    eventBus.dispose();
    layoutEngine.dispose();
    registry.dispose();
    commandPalette.dispose();
    vizEngine.dispose();
    explainEngine.dispose();
  });

  it.skip('1. LACWEventBus should publish and subscribe to topics with priority and history', () => {
    const received = [];
    const unsubscribe = eventBus.subscribe('agent:state:*', (evt) => {
      received.push(evt);
    });

    eventBus.publish('agent:state:changed', { agentId: 'orchestrator', state: 'BUSY' }, { priority: 'HIGH' });

    expect(received).toHaveLength(1);
    expect(received[0].topic).toBe('agent:state:changed');
    expect(received[0].priority).toBe('HIGH');

    const history = eventBus.getHistory('agent:state:*');
    expect(history).toHaveLength(1);

    unsubscribe();
  });

  it.skip('2. LACWLayoutEngine should switch presets and save/restore snapshots', () => {
    expect(WORKSPACE_PRESETS).toContain('EXECUTIVE');
    expect(WORKSPACE_PRESETS).toContain('RESEARCH');

    const snap = layoutEngine.switchPreset('EXECUTIVE');
    expect(snap.activePreset).toBe('EXECUTIVE');
    expect(snap.regions.LEFT_PANEL.widgets).toContain('reality-status-widget');

    const saved = layoutEngine.saveSnapshot('exec_snap');
    expect(saved.snapshotName).toBe('exec_snap');

    layoutEngine.switchPreset('RESEARCH');
    expect(layoutEngine.getLayoutSnapshot().activePreset).toBe('RESEARCH');

    const restored = layoutEngine.restoreSnapshot('exec_snap');
    expect(restored.activePreset).toBe('EXECUTIVE');
  });

  it.skip('3. LACWWidgetRegistry should verify capabilities and manage plugin lifecycle', () => {
    const dummyWidget = { mount: () => {}, dispose: () => {} };
    const manifest = {
      id: 'test-plugin',
      capabilities: ['market_data:read', 'evidence:publish']
    };

    const record = registry.registerPlugin(dummyWidget, manifest);
    expect(record.pluginId).toBe('test-plugin');
    expect(registry.listPlugins()).toHaveLength(1);

    const unregistered = registry.unregisterPlugin('test-plugin');
    expect(unregistered).toBe(true);
    expect(registry.listPlugins()).toHaveLength(0);
  });

  it.skip('4. LACWCommandPalette should fuzzy search and execute commands', async () => {
    const search = commandPalette.searchCommands('explain');
    expect(search.length).toBeGreaterThan(0);
    expect(search[0].id).toBe('explain:decision-lineage');

    const result = await commandPalette.executeCommand('explain:decision-lineage', { decisionId: 'dec_123' });
    expect(result.decisionId).toBe('dec_123');
    expect(result.score).toBe(0.88);
  });

  it.skip('5. LACWVisualizationEngine should generate contract specs for Knowledge Graph', () => {
    const nodes = [{ id: 'n1', label: 'OpenMobius', type: 'engine' }];
    const edges = [{ source: 'n1', target: 'n2', relation: 'PUBLISHES_EVIDENCE', weight: 0.9 }];

    const spec = vizEngine.generateKnowledgeGraphSpec(nodes, edges);
    expect(spec.type).toBe('KNOWLEDGE_GRAPH');
    expect(spec.nodeCount).toBe(1);
    expect(spec.edgeCount).toBe(1);
  });

  it.skip('6. LACWExplainabilityEngine should generate full decision explainability lineage', () => {
    const exp = explainEngine.explainEntity('dec_999');
    expect(exp.entityId).toBe('dec_999');
    expect(exp.confidenceScore).toBeGreaterThan(0.9);
    expect(exp.participatingAgents).toContain('OpenMobiusCoproc');
    expect(exp.constitutionalCourtApproval.status).toBe('PASSED');
  });

  it.skip('7. TC39 Symbol.dispose compliance across all LACW engines', () => {
    expect(typeof eventBus[Symbol.dispose]).toBe('function');
    expect(typeof layoutEngine[Symbol.dispose]).toBe('function');

    eventBus[Symbol.dispose]();
    expect(() => eventBus.publish('test', {})).toThrow('ERR_LACW_EVENT_BUS_DISPOSED');
  });
});
