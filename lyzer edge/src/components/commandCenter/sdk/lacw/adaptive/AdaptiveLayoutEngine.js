/**
 * Lyzer Edge — AdaptiveLayoutEngine
 * Dynamic Workspace Layout Adaptation Engine.
 * Reorganizes panels, widget ordering, sizes, and density based on User Persona (Developer, Researcher, Executive) and Task Context.
 */

export class AdaptiveLayoutEngine {
  constructor() {
    this._disposed = false;
  }

  /**
   * Generates an adapted workspace layout structure.
   * @param {'DEVELOPER' | 'RESEARCHER' | 'EXECUTIVE'} persona
   * @param {string} [taskContext='GENERAL']
   */
  generateAdaptedLayout(persona = 'DEVELOPER', taskContext = 'GENERAL') {
    this._assertNotDisposed();

    let primaryPanels = ['Runtime', 'Logs', 'Architecture', 'Inspector'];
    let density = 'COMPACT';

    if (persona === 'RESEARCHER') {
      primaryPanels = ['Knowledge', 'Sources', 'Experiments', 'Comparisons'];
      density = 'NORMAL';
    } else if (persona === 'EXECUTIVE') {
      primaryPanels = ['Metrics', 'Results', 'Risks', 'Decisions'];
      density = 'SPACIOUS';
    }

    return Object.freeze({
      persona,
      taskContext,
      primaryPanels: Object.freeze([...primaryPanels]),
      viewDensity: density,
      widgetOrdering: Object.freeze(['OverviewCard', 'LiveStreamChart', 'InspectorPanel']),
      adaptedAt: new Date().toISOString()
    });
  }

  _assertNotDisposed() {
    if (this._disposed) throw new Error('ERR_ADAPTIVE_LAYOUT_ENGINE_DISPOSED: Adaptive Layout Engine is disposed');
  }

  dispose() {
    this._disposed = true;
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}
