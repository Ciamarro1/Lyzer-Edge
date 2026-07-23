import { EvolutionExecutor } from './EvolutionExecutor.js';
import { ParameterVersionManager } from './ParameterVersionManager.js';
import { AdaptiveRuntimeMonitor } from './AdaptiveRuntimeMonitor.js';
import { AutomaticRollbackEngine } from './AutomaticRollbackEngine.js';

export class AdaptiveEvolutionFacade {
  constructor(causalMemoryDB) {
    this.db = causalMemoryDB;
    this.executor = new EvolutionExecutor();
    this.versionManager = new ParameterVersionManager();
    this.monitor = new AdaptiveRuntimeMonitor();
    this.rollbackEngine = new AutomaticRollbackEngine(causalMemoryDB);
  }

  createTransaction(options) {
    return this.executor.createTransaction(options);
  }

  executeTransaction(txId) {
    return this.executor.execute(txId);
  }

  completeTransaction(txId) {
    return this.executor.complete(txId);
  }

  createSnapshot(version, parameters, reason) {
    return this.versionManager.createSnapshot(version, parameters, reason);
  }

  diff(fromVersion, toVersion) {
    return this.versionManager.diff(fromVersion, toVersion);
  }

  startMonitoring(txId, baseline) {
    return this.monitor.startMonitoring(txId, baseline);
  }

  recordTrade(txId, tradeResult) {
    return this.monitor.recordTrade(txId, tradeResult);
  }

  async rollback({ transaction, monitorVerdict, evolutionLedger, currentTick }) {
    return await this.rollbackEngine.rollback({
      transaction,
      monitorVerdict,
      evolutionExecutor: this.executor,
      evolutionLedger,
      currentTick
    });
  }

  isQuarantined(proposalId, currentTick) {
    return this.rollbackEngine.isQuarantined(proposalId, currentTick);
  }

  getActiveTransactions() {
    return this.executor.getActiveTransactions();
  }

  getLineage() {
    return this.versionManager.getLineage();
  }

  getRollbackHistory() {
    return this.rollbackEngine.getRollbackHistory();
  }
}

export { EvolutionExecutor, ParameterVersionManager, AdaptiveRuntimeMonitor, AutomaticRollbackEngine };
