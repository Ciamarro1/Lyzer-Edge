/**
 * Lyzer Adaptive Cognitive Workspace (LACW) — Layout Engine
 * Docking, dynamic regions, layout presets, workspace snapshots, and adaptive rearrangement.
 * Supports presets: Executive, Research, Revenue, Experiment, Knowledge, Memory, Observability, Development, Incident Response, Governance.
 */

export const WORKSPACE_PRESETS = Object.freeze([
  'EXECUTIVE',
  'RESEARCH',
  'REVENUE',
  'EXPERIMENT',
  'KNOWLEDGE',
  'MEMORY',
  'OBSERVABILITY',
  'DEVELOPMENT',
  'INCIDENT_RESPONSE',
  'GOVERNANCE'
]);

export const DOCKING_REGIONS = Object.freeze([
  'LEFT_PANEL',
  'CENTER_CANVAS',
  'RIGHT_PANEL',
  'BOTTOM_DRAWER',
  'FLOATING_OVERLAY'
]);

export class LACWLayoutEngine {
  constructor(eventBus = null) {
    this._disposed = false;
    this._eventBus = eventBus;
    this._activePreset = 'RESEARCH';
    this._layoutState = this._buildDefaultLayoutState();
    this._snapshots = new Map();
  }

  /**
   * Switches workspace preset and triggers adaptive layout rearrangement.
   * @param {string} presetName
   */
  switchPreset(presetName) {
    this._assertNotDisposed();

    if (!WORKSPACE_PRESETS.includes(presetName)) {
      throw new Error(`ERR_INVALID_PRESET: ${presetName}. Valid: ${WORKSPACE_PRESETS.join(', ')}`);
    }

    const previousPreset = this._activePreset;
    this._activePreset = presetName;

    // Adapt layout regions based on preset focus
    this._layoutState = this._computePresetLayout(presetName);

    if (this._eventBus) {
      this._eventBus.publish('layout:preset:switched', {
        previousPreset,
        currentPreset: presetName,
        layoutState: this._layoutState
      }, { priority: 'HIGH' });
    }

    return this.getLayoutSnapshot();
  }

  /**
   * Captures a serializable snapshot of the current workspace layout.
   * @param {string} [snapshotName]
   */
  saveSnapshot(snapshotName = `snapshot_${Date.now()}`) {
    this._assertNotDisposed();

    const snapshot = Object.freeze({
      snapshotName,
      activePreset: this._activePreset,
      regions: Object.freeze(JSON.parse(JSON.stringify(this._layoutState.regions))),
      savedAt: new Date().toISOString()
    });

    this._snapshots.set(snapshotName, snapshot);
    return snapshot;
  }

  /**
   * Restores a previously saved layout snapshot.
   * @param {string} snapshotName
   */
  restoreSnapshot(snapshotName) {
    this._assertNotDisposed();

    const snapshot = this._snapshots.get(snapshotName);
    if (!snapshot) throw new Error(`ERR_SNAPSHOT_NOT_FOUND: ${snapshotName}`);

    this._activePreset = snapshot.activePreset;
    this._layoutState = {
      preset: snapshot.activePreset,
      regions: JSON.parse(JSON.stringify(snapshot.regions))
    };

    if (this._eventBus) {
      this._eventBus.publish('layout:snapshot:restored', { snapshotName, snapshot });
    }

    return this.getLayoutSnapshot();
  }

  getLayoutSnapshot() {
    this._assertNotDisposed();
    return Object.freeze({
      activePreset: this._activePreset,
      regions: Object.freeze(JSON.parse(JSON.stringify(this._layoutState.regions))),
      activePresetsList: WORKSPACE_PRESETS,
      timestamp: Date.now()
    });
  }

  _computePresetLayout(preset) {
    const regions = {
      LEFT_PANEL: { widthPx: 280, collapsed: false, widgets: [] },
      CENTER_CANVAS: { flex: 1, widgets: [] },
      RIGHT_PANEL: { widthPx: 360, collapsed: false, widgets: [] },
      BOTTOM_DRAWER: { heightPx: 180, collapsed: true, widgets: [] },
      FLOATING_OVERLAY: { activeOverlays: [] }
    };

    switch (preset) {
      case 'EXECUTIVE':
        regions.LEFT_PANEL.widgets = ['reality-status-widget'];
        regions.CENTER_CANVAS.widgets = ['continuous-measurement-widget', 'statistical-rigor-widget'];
        regions.RIGHT_PANEL.widgets = ['court-widget'];
        break;
      case 'RESEARCH':
        regions.LEFT_PANEL.widgets = ['autonomous-discovery-widget'];
        regions.CENTER_CANVAS.widgets = ['chart-host-widget', 'causal-graph-widget'];
        regions.RIGHT_PANEL.widgets = ['research-lab-widget', 'alpha-discovery-widget'];
        break;
      case 'REVENUE':
        regions.LEFT_PANEL.widgets = ['reality-status-widget'];
        regions.CENTER_CANVAS.widgets = ['chart-host-widget'];
        regions.RIGHT_PANEL.widgets = ['evidence-fusion-widget'];
        break;
      case 'OBSERVABILITY':
        regions.LEFT_PANEL.widgets = ['runtime-inspector-widget'];
        regions.CENTER_CANVAS.widgets = ['observability-dashboard-widget'];
        regions.RIGHT_PANEL.widgets = ['continuous-measurement-widget'];
        break;
      default:
        regions.LEFT_PANEL.widgets = ['reality-status-widget'];
        regions.CENTER_CANVAS.widgets = ['chart-host-widget'];
        regions.RIGHT_PANEL.widgets = ['evidence-fusion-widget'];
        break;
    }

    return { preset, regions };
  }

  _buildDefaultLayoutState() {
    return this._computePresetLayout(this._activePreset);
  }

  _assertNotDisposed() {
    if (this._disposed) throw new Error('ERR_LACW_LAYOUT_ENGINE_DISPOSED: Layout engine has been disposed');
  }

  dispose() {
    this._disposed = true;
    this._snapshots.clear();
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}
