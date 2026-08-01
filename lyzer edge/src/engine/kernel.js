/**
 * Truth Kernel — Re-exports Canonical Anti-Consensus TruthKernel from @lyzer/shared.
 * Maintains full architectural parity across Backend, Frontend, and Verification suites.
 */

import { TruthKernel as CanonicalTruthKernel } from '../../../packages/lyzer-shared/src/engine/kernel.js';

export class TruthKernel extends CanonicalTruthKernel {
  constructor(options = {}) {
    // Support legacy masterSwitchThreshold mapping to trgThreshold if passed
    const trgThreshold = options.trgThreshold || (options.masterSwitchThreshold ? options.masterSwitchThreshold / 100 : 0.4);
    const masterSwitchThreshold = options.masterSwitchThreshold !== undefined ? options.masterSwitchThreshold : 50;
    super({ ...options, trgThreshold, masterSwitchThreshold });
  }
}