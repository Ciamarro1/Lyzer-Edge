export class ParameterVersionStore {
  constructor(causalMemoryDB) {
    this.db = causalMemoryDB;
  }

  async saveVersion({ module, parameter, version, value, proposalId, approvedBy }) {
    if (!module || !parameter || !version || value === undefined) {
      throw new Error('Module, parameter, version, and value are required');
    }

    const versionRecord = {
      module,
      parameter,
      version,
      value,
      status: 'ACTIVE',
      proposal_id: proposalId || 'proposal_manual',
      approved_by: approvedBy || 'ECA_COURT'
    };

    await this.db.insertParameterVersion(versionRecord);
    return versionRecord;
  }

  async getActiveVersion(moduleName, parameterName) {
    return await this.db.getActiveParameterVersion(moduleName, parameterName);
  }

  async rollback(version, reason) {
    await this.db.rollbackParameterVersion(version, reason || 'DETERIORATION_POST_PROMOTION');
    return {
      version,
      status: 'ROLLED_BACK',
      reason: reason || 'DETERIORATION_POST_PROMOTION',
      rolled_back_at: Date.now()
    };
  }
}
