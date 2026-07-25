/**
 * ARL v3.3 Events Logger
 * Manages evolutionary memory logging for colapsos and state changes.
 */

export class EventsLogger {
  constructor() {
    this.logs = [];
    this.maxLogs = 10;
  }

  logStateTransition(oldState, newState) {
    this.logEvent('STATE_TRANSITION', `Ecosystem shifted from ${oldState} to ${newState}`);
  }

  logEvent(type, description, species = []) {
    const event = {
      timestamp: new Date().toLocaleTimeString(),
      type, // 'BLACK_SWAN' | 'CLONAL_COLLAPSE' | 'STATE_TRANSITION' | 'OVERDOMINANCE'
      description,
      species: species.map(s => s.id || s)
    };

    this.logs.unshift(event);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }
  }

  getRecent() {
    return this.logs;
  }

  getInsightMessage(currentState) {
    // Generate intelligent diagnostics based on logs history
    const recent = this.logs.slice(0, 3);
    const types = recent.map(l => l.type);

    if (types.includes('BLACK_SWAN')) {
      return 'Tail-risk shock active! Shocking fitness scores.';
    }
    if (types.includes('CLONAL_COLLAPSE')) {
      return 'Clonal collapse triggered! Purging homogeneous clones.';
    }

    switch(currentState) {
      case 'NORMAL':
        return 'Ecosystem stable. Diversity profiles healthy.';
      case 'STRESS':
        return 'Regime drift warning: Selecting for resilience.';
      case 'CRITICAL':
        return 'Critical! Overfit threshold exceeded. Collapse imminent.';
      case 'COLLAPSED':
        return 'Extinction active. Purging overfitted strategy clusters.';
      case 'RESEEDING':
        return 'Niches depleted. Generating pioneer strategy genomes.';
      default:
        return 'System live.';
    }
  }
}
