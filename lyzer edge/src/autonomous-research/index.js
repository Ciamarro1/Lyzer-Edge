import { AutonomousResearchDirector } from './AutonomousResearchDirector.js';
import { KnowledgeGapDetector } from './KnowledgeGapDetector.js';
import { ExpectedValueInfoEngine } from './ExpectedValueInfoEngine.js';
import { ScientificBacklogManager } from './ScientificBacklogManager.js';
import { ResearchPublicationEngine } from './ResearchPublicationEngine.js';

export class AutonomousResearchFacade {
  constructor(causalKnowledgeGraph, config = {}) {
    this.director = new AutonomousResearchDirector(causalKnowledgeGraph, config);
  }

  runResearchCycle(options) {
    return this.director.runResearchCycle(options);
  }

  detectGaps() {
    return this.director.gapDetector.detectGaps();
  }

  evaluateEVI(proposal) {
    return this.director.backlogManager.eviEngine.evaluateEVI(proposal);
  }

  getPublications() {
    return this.director.publicationEngine.getPublications();
  }

  getBacklogStatus() {
    return this.director.backlogManager.getBacklogStatus();
  }
}

export {
  AutonomousResearchDirector,
  KnowledgeGapDetector,
  ExpectedValueInfoEngine,
  ScientificBacklogManager,
  ResearchPublicationEngine
};
