/**
 * ARL v3.3 Extinction Engine
 * Orchestrates global ecosystem state machine transitions and extinction events.
 */

import { MetricsTracker } from './metricsTracker.js';
import { EventsLogger } from './eventsLogger.js';
import { SpeciesManager } from './speciesManager.js';
import { SelectorPool } from './selectorPool.js';

export const EcosystemState = {
  NORMAL: 'NORMAL',
  STRESS: 'STRESS',
  CRITICAL: 'CRITICAL',
  COLLAPSED: 'COLLAPSED',
  RESEEDING: 'RESEEDING'
};

export class ExtinctionEngine {
  constructor() {
    this.currentState = EcosystemState.NORMAL;
    this.activeBlackSwan = false;
    this.stressLevel = 0.0; // 0.0 to 1.0

    this.metricsTracker = new MetricsTracker();
    this.eventsLogger = new EventsLogger();
    this.speciesManager = new SpeciesManager();
    this.selectorPool = new SelectorPool(20);
  }

  step(population, StrategyGenome, tick) {
    // 1. Cluster genomes into distinct species
    this.speciesManager.cluster(population);

    // 2. Compute state metric values
    this.metricsTracker.calculate(population, this.speciesManager.species);
    const diversity = this.metricsTracker.getDiversity();
    const ecosystemStress = this.metricsTracker.getEcosystemStress();
    this.stressLevel = ecosystemStress;

    // 3. Evaluate Endogenous State Machine transitions
    if (this.currentState !== EcosystemState.COLLAPSED && this.currentState !== EcosystemState.RESEEDING) {
      if (diversity < 0.25 || this.stressLevel > 0.8) {
        this.transitionTo(EcosystemState.CRITICAL);
      } else if (diversity < 0.50 || this.stressLevel > 0.5) {
        this.transitionTo(EcosystemState.STRESS);
      } else {
        this.transitionTo(EcosystemState.NORMAL);
      }
    }

    // 4. Random Exogenous Shock Triggers (Black Swan)
    if (this.currentState !== EcosystemState.COLLAPSED && this.currentState !== EcosystemState.RESEEDING) {
      if (Math.random() < 0.015) { // 1.5% chance per tick
        this.triggerBlackSwan(population);
      }
    }

    // 5. Co-evolve adversarial selectors
    this.selectorPool.step(this.currentState);

    // 6. Execute Mass Purges if collapsed
    if (this.currentState === EcosystemState.COLLAPSED) {
      this.executeMassExtinction(population);
    }

    // 7. Reseed niches if reseeding
    if (this.currentState === EcosystemState.RESEEDING) {
      this.reseedSpecies(population, StrategyGenome, tick);
    }

    // 8. Apply fitness sharing pressure on surviving candidates
    this.speciesManager.applyFitnessSharing(population);

    return {
      ecosystemState: this.currentState,
      ecosystemStress: this.stressLevel,
      diversity,
      species: this.speciesManager.getSpeciesSummary(population),
      extinctionLogs: this.eventsLogger.getRecent(),
      activeBlackSwan: this.activeBlackSwan,
      insightMessage: this.eventsLogger.getInsightMessage(this.currentState)
    };
  }

  transitionTo(newState) {
    if (this.currentState === newState) return;
    const oldState = this.currentState;
    this.currentState = newState;
    this.eventsLogger.logStateTransition(oldState, newState);
  }

  triggerBlackSwan(population) {
    this.activeBlackSwan = true;
    this.transitionTo(EcosystemState.COLLAPSED);

    const wipedSpecies = [];
    if (this.speciesManager.species.length > 0) {
      // Wipes out members of a random species cluster
      const targetSp = this.speciesManager.species[Math.floor(Math.random() * this.speciesManager.species.length)];
      wipedSpecies.push(targetSp.id);

      const targetIds = new Set(targetSp.members.map(m => m.id));
      for (let i = population.length - 1; i >= 0; i--) {
        if (targetIds.has(population[i].id)) {
          population.splice(i, 1);
        }
      }
      targetSp.members = [];
    }

    this.eventsLogger.logEvent('BLACK_SWAN', 'Tail-risk shock triggered! Purged random niche cluster.', wipedSpecies);

    // Dynamic reset of the warning indicator
    setTimeout(() => {
      this.activeBlackSwan = false;
    }, 1500);
  }

  executeMassExtinction(population) {
    const affected = this.speciesManager.extinctOverdominant(population);
    this.eventsLogger.logEvent(
      'CLONAL_COLLAPSE',
      'Mass extinction executed. Overdominant homogeneous clusters purged.',
      affected.map(s => s.id)
    );
    this.transitionTo(EcosystemState.RESEEDING);
  }

  reseedSpecies(population, StrategyGenome, tick) {
    const baselineSize = 50;
    this.speciesManager.reseedAll(population, baselineSize, StrategyGenome, tick);
    this.selectorPool.resetSelectors();
    this.transitionTo(EcosystemState.NORMAL);
  }
}
