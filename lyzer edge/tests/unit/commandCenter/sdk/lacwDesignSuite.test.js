import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LACWEventBus } from '../../../../src/components/commandCenter/sdk/lacw/LACWEventBus.js';
import { VisualAttentionEngine } from '../../../../src/components/commandCenter/sdk/lacw/design/VisualAttentionEngine.js';
import { CognitiveGridEngine, RESOLUTION_MODES } from '../../../../src/components/commandCenter/sdk/lacw/design/CognitiveGridEngine.js';
import { SemanticColorLanguage, SEMANTIC_CATEGORIES } from '../../../../src/components/commandCenter/sdk/lacw/design/SemanticColorLanguage.js';
import { DesignTokenEngine } from '../../../../src/components/commandCenter/sdk/lacw/design/DesignTokenEngine.js';
import { UniversalInspectorEngine } from '../../../../src/components/commandCenter/sdk/lacw/design/UniversalInspectorEngine.js';
import { CognitiveNotificationEngine } from '../../../../src/components/commandCenter/sdk/lacw/design/CognitiveNotificationEngine.js';

describe('LACW Phase 3 — Cognitive Design System Engine Suite', () => {
  let eventBus;
  let attentionEngine;
  let gridEngine;
  let colorLang;
  let tokenEngine;
  let inspectorEngine;
  let notifEngine;

  beforeEach(() => {
    eventBus = new LACWEventBus();
    attentionEngine = new VisualAttentionEngine();
    gridEngine = new CognitiveGridEngine();
    colorLang = new SemanticColorLanguage();
    tokenEngine = new DesignTokenEngine();
    inspectorEngine = new UniversalInspectorEngine();
    notifEngine = new CognitiveNotificationEngine(eventBus);
  });

  afterEach(() => {
    eventBus.dispose();
    attentionEngine.dispose();
    gridEngine.dispose();
    colorLang.dispose();
    tokenEngine.dispose();
    inspectorEngine.dispose();
    notifEngine.dispose();
  });

  it('1. VisualAttentionEngine should calculate attention score and assign visual tier', () => {
    const quiet = attentionEngine.calculateAttention({ urgency: 0.1, criticality: 0.1, confidence: 0.95 });
    expect(quiet.visualTier).toBe('QUIET');
    expect(quiet.allowMotion).toBe(false);

    const critical = attentionEngine.calculateAttention({ urgency: 0.9, criticality: 0.95, confidence: 0.2 });
    expect(critical.visualTier).toBe('CRITICAL_INTERRUPT');
    expect(critical.allowMotion).toBe(true);
    expect(critical.colorToken).toBe('--status-red');
  });

  it('2. CognitiveGridEngine should adapt columns and margins across resolutions', () => {
    expect(RESOLUTION_MODES).toContain('MOBILE');
    expect(RESOLUTION_MODES).toContain('DESKTOP');

    const mobile = gridEngine.resolveGrid(480);
    expect(mobile.mode).toBe('MOBILE');
    expect(mobile.columns).toBe(4);
    expect(mobile.isSidePanelCollapsible).toBe(true);

    const desktop = gridEngine.resolveGrid(1920);
    expect(desktop.mode).toBe('DESKTOP');
    expect(desktop.columns).toBe(16);
    expect(desktop.isSidePanelCollapsible).toBe(false);
  });

  it('3. SemanticColorLanguage should resolve CSS variables and hex values for semantic concepts', () => {
    expect(SEMANTIC_CATEGORIES.EVIDENCE).toBe('--accent-cyan');

    const cyan = colorLang.resolveColor('EVIDENCE');
    expect(cyan.token).toBe('--accent-cyan');
    expect(cyan.hex).toBe('#38bdf8');

    const incident = colorLang.resolveColor('INCIDENT');
    expect(incident.hex).toBe('#f87171');
  });

  it('4. DesignTokenEngine should calculate mathematical spacing and typography styles', () => {
    expect(tokenEngine.getSpacingPx(4)).toBe(16);
    expect(tokenEngine.getSpacingPx(8)).toBe(32);

    const compact = tokenEngine.resolveTypography('COMPACT', 'BODY');
    expect(compact.fontSizePx).toBe(9);
    expect(compact.cssString).toContain('font-size: 9px');

    const expanded = tokenEngine.resolveTypography('EXPANDED', 'TITLE');
    expect(expanded.fontSizePx).toBe(16);
  });

  it('5. UniversalInspectorEngine should resolve complete metadata and causal timeline for any entity', () => {
    const inspection = inspectorEngine.inspect('dec_99182', 'DECISION');
    expect(inspection.entityId).toBe('dec_99182');
    expect(inspection.timeline.length).toBeGreaterThan(0);
    expect(inspection.relationships).toContainEqual({ target: 'OpenMobiusCoproc', relation: 'EVIDENCE_PROVIDER' });
  });

  it('6. CognitiveNotificationEngine should filter interruptive vs silent notifications', () => {
    const silent = notifEngine.dispatchNotification({ title: 'Build Finished', urgency: 0.2, criticality: 0.1 });
    expect(silent.isInterruptive).toBe(false);
    expect(silent.deliveryChannel).toBe('SILENT_STREAM');

    const alert = notifEngine.dispatchNotification({ title: 'Tail Risk Spike', urgency: 0.9, criticality: 0.95 });
    expect(alert.isInterruptive).toBe(true);
    expect(alert.deliveryChannel).toBe('INTERRUPTIVE_MODAL');

    expect(notifEngine.getHistory()).toHaveLength(2);
  });

  it('7. TC39 Symbol.dispose compliance across all visual design engines', () => {
    expect(typeof attentionEngine[Symbol.dispose]).toBe('function');
    expect(typeof gridEngine[Symbol.dispose]).toBe('function');

    attentionEngine[Symbol.dispose]();
    gridEngine[Symbol.dispose]();

    expect(() => attentionEngine.calculateAttention({})).toThrow('ERR_VISUAL_ATTENTION_ENGINE_DISPOSED');
    expect(() => gridEngine.resolveGrid(1000)).toThrow('ERR_COGNITIVE_GRID_ENGINE_DISPOSED');
  });
});
