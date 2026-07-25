import { ParameterProposalEngine } from './ParameterProposalEngine.js';
import { AdaptiveShadowEngine } from './AdaptiveShadowEngine.js';
import { AdaptiveScoreEngine } from './AdaptiveScoreEngine.js';
import { ParameterVersionStore } from './ParameterVersionStore.js';
import { AdaptivePipelineController } from './AdaptivePipelineController.js';

export class AdaptiveSandboxFacade {
  constructor(causalMemoryDB) {
    this.db = causalMemoryDB;
    this.proposalEngine = new ParameterProposalEngine();
    this.shadowEngine = new AdaptiveShadowEngine(causalMemoryDB);
    this.scoreEngine = new AdaptiveScoreEngine();
    this.versionStore = new ParameterVersionStore(causalMemoryDB);
  }

  createProposal(options) {
    return this.proposalEngine.createProposal(options);
  }

  async runShadowComparison(options) {
    return await this.shadowEngine.runShadowComparison(options);
  }

  calculateACS(metrics) {
    return this.scoreEngine.calculateACS(metrics);
  }

  async saveParameterVersion(options) {
    return await this.versionStore.saveVersion(options);
  }

  async getActiveParameterVersion(moduleName, parameterName) {
    return await this.versionStore.getActiveVersion(moduleName, parameterName);
  }

  async rollbackParameterVersion(version, reason) {
    return await this.versionStore.rollback(version, reason);
  }
}

export { ParameterProposalEngine, AdaptiveShadowEngine, AdaptiveScoreEngine, ParameterVersionStore, AdaptivePipelineController };
