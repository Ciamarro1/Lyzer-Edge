import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const registryDir = resolve(__dirname, '../results/provenance');
const registryPath = resolve(registryDir, 'EXPERIMENT_REGISTRY.json');

/**
 * GATE G: MULTIPLE HYPOTHESIS & RESEARCH PROVENANCE ENGINE
 * Enforces pre-registration of all experiments, causal lineage,
 * and family-wise multiple testing control.
 */
export class ResearchProvenanceEngine {
  constructor() {
    this.registryPath = registryPath;
    this.ensureRegistry();
  }

  ensureRegistry() {
    if (!existsSync(registryDir)) mkdirSync(registryDir, { recursive: true });
    if (!existsSync(this.registryPath)) {
      const initialRegistry = {
        registryId: 'LYZER_EDGE_QUANTITATIVE_EXPERIMENT_REGISTRY',
        createdAt: new Date().toISOString(),
        totalRegisteredExperiments: 0,
        families: {
          'V5_WYCKOFF_FAMILY': {
            description: 'Wyckoff Volume Profile ABD & Exogenous Funding Regime',
            totalVariantsTested: 6,
            registeredVariants: ['EXP-V5-TF-001', 'EXP-V5-1H-POPULATION-002', 'EXP-V5-REGIME-CAUSAL-003', 'EXP-V5-EXOGENOUS-STATE-004', 'EXP-V5-FUNDING-INCREMENTALITY-005', 'EXP-V5-CONFIRMATORY-006']
          }
        },
        experiments: []
      };
      writeFileSync(this.registryPath, JSON.stringify(initialRegistry, null, 2));
    }
  }

  loadRegistry() {
    this.ensureRegistry();
    return JSON.parse(readFileSync(this.registryPath, 'utf-8'));
  }

  preRegisterExperiment({
    experimentId,
    hypothesisId,
    parentHypothesis,
    hypothesisFamily,
    config,
    datasetHash,
    targetSampleWindow,
    plannedBootstrapIters,
    plannedPermutationIters,
    baseSeed = 42
  }) {
    const registry = this.loadRegistry();

    // Check if already registered
    const existing = registry.experiments.find(e => e.experimentId === experimentId);
    if (existing) {
      return { status: 'ALREADY_REGISTERED', receipt: existing };
    }

    const configHash = crypto.createHash('sha256').update(JSON.stringify(config)).digest('hex');
    const registrationTimestamp = new Date().toISOString();

    const provenanceSignature = crypto.createHash('sha256').update(JSON.stringify({
      experimentId,
      hypothesisId,
      parentHypothesis,
      configHash,
      datasetHash,
      registrationTimestamp
    })).digest('hex');

    const receipt = {
      experimentId,
      hypothesisId,
      parentHypothesis,
      hypothesisFamily,
      isPreRegistered: true,
      registrationTimestamp,
      configHash,
      datasetHash,
      parameters: config,
      targetSampleWindow,
      plannedBootstrapIters,
      plannedPermutationIters,
      baseSeed,
      provenanceSignature,
      executionStatus: 'PENDING_EXECUTION',
      completionTimestamp: null,
      resultsSummary: null
    };

    registry.experiments.push(receipt);
    registry.totalRegisteredExperiments = registry.experiments.length;

    if (!registry.families[hypothesisFamily]) {
      registry.families[hypothesisFamily] = {
        description: `Hypothesis Family ${hypothesisFamily}`,
        totalVariantsTested: 0,
        registeredVariants: []
      };
    }
    registry.families[hypothesisFamily].totalVariantsTested++;
    registry.families[hypothesisFamily].registeredVariants.push(experimentId);

    writeFileSync(this.registryPath, JSON.stringify(registry, null, 2));
    return { status: 'REGISTERED_NEW', receipt };
  }

  recordExecutionResults(experimentId, resultsSummary) {
    const registry = this.loadRegistry();
    const exp = registry.experiments.find(e => e.experimentId === experimentId);
    if (!exp) {
      throw new Error(`CRITICAL PROVENANCE ERROR: Attempted to record results for unregistered experiment ${experimentId}!`);
    }

    exp.executionStatus = 'COMPLETED';
    exp.completionTimestamp = new Date().toISOString();
    exp.resultsSummary = resultsSummary;

    // Calculate Family-Wise Bonferroni Penalty
    const family = registry.families[exp.hypothesisFamily];
    const totalFamilyVariants = family ? family.totalVariantsTested : 1;
    exp.familyVariantsCount = totalFamilyVariants;
    if (resultsSummary.rawPValue !== undefined) {
      exp.familyAdjustedPValue = Number(Math.min(1.0, resultsSummary.rawPValue * totalFamilyVariants).toFixed(4));
    }

    writeFileSync(this.registryPath, JSON.stringify(registry, null, 2));
    return exp;
  }

  getProvenanceSummary() {
    const registry = this.loadRegistry();
    return {
      totalExperiments: registry.totalRegisteredExperiments,
      families: Object.keys(registry.families).map(k => ({
        family: k,
        variantsCount: registry.families[k].totalVariantsTested
      }))
    };
  }
}

export const researchProvenance = new ResearchProvenanceEngine();
