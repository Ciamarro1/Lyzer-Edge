import fs from 'fs';
import path from 'path';

export class IrreversibilityVault {
  constructor(quarantineDir = './src/eca/quarantine') {
    this.history = [];
    this.activeState = null;
    this.quarantineDir = quarantineDir;

    try {
      if (fs && fs.mkdirSync) {
        fs.mkdirSync(this.quarantineDir, { recursive: true });
      }
    } catch (e) {
      // Fallback silently if fs is not accessible
    }
  }

  commitSnapshot(kernelState, dslState, policies, riskConstraints) {
    const snapshot = {
      id: `snapshot_${Date.now()}`,
      timestamp: Date.now(),
      kernelState: JSON.parse(JSON.stringify(kernelState)),
      dslState: JSON.parse(JSON.stringify(dslState)),
      policies: JSON.parse(JSON.stringify(policies)),
      riskConstraints: JSON.parse(JSON.stringify(riskConstraints))
    };
    this.history.push(snapshot);
    this.activeState = snapshot;
    return snapshot.id;
  }

  triggerHardRollback(failedStatePayload) {
    if (this.history.length < 2) {
      throw new Error("No previous stable snapshot available in Irreversibility Vault");
    }

    const currentFailed = this.history.pop();
    const quarantineId = `failed_${Date.now()}`;

    const quarantinePayload = {
      id: quarantineId,
      timestamp: Date.now(),
      failedSnapshot: currentFailed,
      observedFailure: failedStatePayload
    };

    try {
      if (fs && fs.writeFileSync) {
        const filePath = path.join(this.quarantineDir, `${quarantineId}.json`);
        fs.writeFileSync(filePath, JSON.stringify(quarantinePayload, null, 2), 'utf-8');
      }
    } catch (e) {
      // Fallback silently if filesystem write fails
    }

    const previousState = this.history[this.history.length - 1];
    this.activeState = previousState;

    return {
      rolledBack: true,
      quarantinedId: quarantineId,
      restoredId: previousState.id,
      state: previousState
    };
  }
}
 