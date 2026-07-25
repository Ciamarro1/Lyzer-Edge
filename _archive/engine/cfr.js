/**
 * Capital Fluidity Regulator (CFR)
 * 
 * Part of the System Pressure Design Layer (Release 1.5).
 * Prevents capital stratification (safe kernels starving aggressive kernels). 
 * Periodically redistributes the allocation baseline to ensure no kernel becomes permanently dominant.
 */
export class CapitalFluidityRegulator {
  constructor(config = {}) {
    this.maxStratificationRatio = config.maxStratificationRatio || 0.8; // E.g., one kernel has 80% of capital
    this.redistributionTaxRate = config.redistributionTaxRate || 0.1; // Amount of capital to tax and redistribute
    this.minBaselineAllocation = config.minBaselineAllocation || 0.05; // Minimum 5% for any active kernel
  }

  /**
   * Measures the level of capital stratification across kernels.
   * @param {object} kernelAllocations - Dictionary of kernelId to current capital allocation (0.0 to 1.0).
   * @returns {object} Stratification metrics.
   */
  measureStratification(kernelAllocations) {
    const allocations = Object.values(kernelAllocations);
    const totalCapital = allocations.reduce((sum, val) => sum + val, 0);
    
    if (totalCapital === 0) return { isStratified: false, dominantKernel: null, maxShare: 0 };

    let maxShare = 0;
    let dominantKernel = null;

    for (const [kernelId, allocation] of Object.entries(kernelAllocations)) {
      const share = allocation / totalCapital;
      if (share > maxShare) {
        maxShare = share;
        dominantKernel = kernelId;
      }
    }

    return {
      isStratified: maxShare > this.maxStratificationRatio,
      dominantKernel,
      maxShare,
      totalCapital
    };
  }

  /**
   * Redistributes the baseline allocation to prevent permanent dominance.
   * Takes a "tax" from dominant kernels and distributes to starved ones.
   * @param {object} kernelAllocations - Current kernel allocations.
   * @param {object} stratificationMetrics - Metrics from measureStratification.
   * @returns {object} New kernel allocations.
   */
  redistributeBaseline(kernelAllocations, stratificationMetrics) {
    const newAllocations = { ...kernelAllocations };
    const kernels = Object.keys(newAllocations);
    let collectedTax = 0;

    // Apply tax to kernels above average or just the dominant ones
    // and enforce minimum baseline.
    for (const kernel of kernels) {
      const share = newAllocations[kernel] / stratificationMetrics.totalCapital;
      
      // If a kernel is dominant, tax it
      if (share > this.maxStratificationRatio) {
        const taxAmount = newAllocations[kernel] * this.redistributionTaxRate;
        newAllocations[kernel] -= taxAmount;
        collectedTax += taxAmount;
      }
    }

    // Distribute tax equally among all other non-dominant kernels
    // ensuring minimum baselines are met
    const starvedKernels = kernels.filter(k => k !== stratificationMetrics.dominantKernel);
    const distributionAmount = collectedTax / (starvedKernels.length || 1);

    for (const kernel of starvedKernels) {
      newAllocations[kernel] += distributionAmount;
      
      // Enforce minimum baseline allocation
      const minCapital = stratificationMetrics.totalCapital * this.minBaselineAllocation;
      if (newAllocations[kernel] < minCapital) {
        const deficit = minCapital - newAllocations[kernel];
        newAllocations[kernel] = minCapital;
        // Subtract from the dominant kernel here.
        if (stratificationMetrics.dominantKernel) {
             newAllocations[stratificationMetrics.dominantKernel] -= deficit;
        }
      }
    }

    return newAllocations;
  }

  /**
   * Regulates capital allocation to prevent stratification.
   * @param {object} state - Current system state containing kernel allocations.
   * @returns {object} Evaluation results, mirroring Truth Kernel structured output.
   */
  regulate(state) {
    const { allocations = {} } = state;
    const stratificationMetrics = this.measureStratification(allocations);
    
    let signal = 'MAINTAIN_ALLOCATION';
    let reason_codes = [];
    let newAllocations = { ...allocations };

    if (stratificationMetrics.isStratified) {
      signal = 'REDISTRIBUTE_CAPITAL';
      reason_codes.push('CAPITAL_STRATIFICATION_DETECTED');
      reason_codes.push(`DOMINANT_KERNEL_${stratificationMetrics.dominantKernel}`);
      
      newAllocations = this.redistributeBaseline(allocations, stratificationMetrics);
    }

    return {
      signal,
      confidence: stratificationMetrics.maxShare, // Confidence is proportional to the degree of stratification
      reason_codes,
      raw_metrics: stratificationMetrics,
      system_adjustments: {
        new_allocations: newAllocations
      }
    };
  }
}
 