import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const firewallDir = resolve(__dirname, '../results/firewall');
const registryFile = resolve(firewallDir, 'MULTIPLE_TESTING_REGISTRY.json');

/**
 * VALID HYPOTHESIS LIFECYCLE STATES
 */
export const HYPOTHESIS_STATES = {
  REGISTERED: 'REGISTERED',
  RUNNING: 'RUNNING',
  DISCOVERY_RESULT: 'DISCOVERY_RESULT',
  CANDIDATE: 'CANDIDATE',
  CONFIRMATORY_PREREGISTERED: 'CONFIRMATORY_PREREGISTERED',
  OOS_VALIDATION: 'OOS_VALIDATION',
  PASSED: 'PASSED',
  FAILED: 'FAILED'
};

/**
 * PERMITTED LIFECYCLE TRANSITIONS (FIREWALL ENFORCEMENT)
 */
const VALID_TRANSITIONS = {
  [HYPOTHESIS_STATES.REGISTERED]: [HYPOTHESIS_STATES.RUNNING],
  [HYPOTHESIS_STATES.RUNNING]: [HYPOTHESIS_STATES.DISCOVERY_RESULT, HYPOTHESIS_STATES.FAILED],
  [HYPOTHESIS_STATES.DISCOVERY_RESULT]: [HYPOTHESIS_STATES.CANDIDATE, HYPOTHESIS_STATES.FAILED],
  [HYPOTHESIS_STATES.CANDIDATE]: [HYPOTHESIS_STATES.CONFIRMATORY_PREREGISTERED, HYPOTHESIS_STATES.FAILED],
  [HYPOTHESIS_STATES.CONFIRMATORY_PREREGISTERED]: [HYPOTHESIS_STATES.OOS_VALIDATION, HYPOTHESIS_STATES.FAILED],
  [HYPOTHESIS_STATES.OOS_VALIDATION]: [HYPOTHESIS_STATES.PASSED, HYPOTHESIS_STATES.FAILED],
  [HYPOTHESIS_STATES.PASSED]: [],
  [HYPOTHESIS_STATES.FAILED]: []
};

/**
 * INSTITUTIONAL MULTIPLE TESTING & DISCOVERY FIREWALL CONTROLLER
 */
export class MultipleTestingController {
  constructor(registryPath = registryFile, autoPersist = true) {
    this.registryPath = registryPath;
    this.autoPersist = autoPersist;
    this.inMemoryRegistry = null;
    this.ensureRegistry();
  }

  ensureRegistry() {
    if (!existsSync(firewallDir)) mkdirSync(firewallDir, { recursive: true });
    if (!existsSync(this.registryPath)) {
      const initial = {
        controllerVersion: '1.0.0-PROVENANCE-FIREWALL',
        nominalAlpha: 0.05,
        targetFDR_Q: 0.05,
        families: {},
        hypotheses: {}
      };
      writeFileSync(this.registryPath, JSON.stringify(initial, null, 2));
      this.inMemoryRegistry = initial;
    } else if (!this.inMemoryRegistry) {
      this.inMemoryRegistry = JSON.parse(readFileSync(this.registryPath, 'utf-8'));
    }
  }

  loadRegistry() {
    if (!this.inMemoryRegistry) this.ensureRegistry();
    return this.inMemoryRegistry;
  }

  saveRegistry(reg) {
    this.inMemoryRegistry = reg;
    if (this.autoPersist) {
      writeFileSync(this.registryPath, JSON.stringify(reg, null, 2));
    }
  }

  flushToDisk() {
    if (this.inMemoryRegistry) {
      writeFileSync(this.registryPath, JSON.stringify(this.inMemoryRegistry, null, 2));
    }
  }

  /**
   * Registers a new hypothesis under a specific family before execution.
   */
  registerHypothesis({
    hypothesisId,
    familyId,
    stage = 'DISCOVERY',
    config,
    datasetHash,
    seed,
    targetSampleWindow = '2023-2026'
  }) {
    if (!hypothesisId || !familyId || !config || !datasetHash || seed === undefined) {
      throw new Error('FIREWALL REJECTION: Incomplete hypothesis registration parameters.');
    }

    const reg = this.loadRegistry();

    // Adversarial Check: Reuse of Hypothesis ID
    if (reg.hypotheses[hypothesisId]) {
      throw new Error(`FIREWALL REJECTION: Hypothesis ID '${hypothesisId}' is already registered and immutable.`);
    }

    const configHash = crypto.createHash('sha256').update(JSON.stringify(config)).digest('hex');
    const registrationTimestamp = new Date().toISOString();

    const signature = crypto.createHash('sha256').update(JSON.stringify({
      hypothesisId,
      familyId,
      stage,
      configHash,
      datasetHash,
      seed,
      registrationTimestamp
    })).digest('hex');

    // Initialize Family if not existing
    if (!reg.families[familyId]) {
      reg.families[familyId] = {
        familyId,
        createdAt: registrationTimestamp,
        totalRegisteredHypotheses: 0,
        hypothesesList: [],
        nominalAlpha: reg.nominalAlpha,
        targetFDR_Q: reg.targetFDR_Q,
        bestRawPValue: null,
        adjustedSignificanceThresholdBonferroni: reg.nominalAlpha,
        countSignificantNominal: 0,
        countSignificantBonferroni: 0,
        countSignificantFDR: 0,
        countValidatedOOS: 0,
        countRejected: 0
      };
    }

    const record = {
      hypothesisId,
      familyId,
      stage,
      lifecycleState: HYPOTHESIS_STATES.REGISTERED,
      isPreRegistered: true,
      registrationTimestamp,
      configHash,
      datasetHash,
      seed,
      targetSampleWindow,
      parameters: config,
      signature,
      rawPValue: null,
      bonferroniPValue: null,
      holmPValue: null,
      fdrQValue: null,
      isSignificantNominal: null,
      isSignificantBonferroni: null,
      isSignificantFDR: null,
      executionTimestamp: null,
      resultsSummary: null
    };

    reg.hypotheses[hypothesisId] = record;
    reg.families[familyId].totalRegisteredHypotheses++;
    reg.families[familyId].hypothesesList.push(hypothesisId);

    // Update Family Bonferroni Threshold
    const M = reg.families[familyId].totalRegisteredHypotheses;
    reg.families[familyId].adjustedSignificanceThresholdBonferroni = Number((reg.nominalAlpha / M).toFixed(6));

    this.saveRegistry(reg);
    return record;
  }

  /**
   * Transition hypothesis to RUNNING
   */
  startExecution(hypothesisId) {
    const reg = this.loadRegistry();
    const hyp = reg.hypotheses[hypothesisId];
    if (!hyp) {
      throw new Error(`FIREWALL REJECTION: Attempted to run unregistered hypothesis '${hypothesisId}'.`);
    }

    this._validateTransition(hyp.lifecycleState, HYPOTHESIS_STATES.RUNNING, hypothesisId);
    hyp.lifecycleState = HYPOTHESIS_STATES.RUNNING;
    this.saveRegistry(reg);
    return hyp;
  }

  /**
   * Record execution results and compute Multiple Testing Corrections
   */
  recordResults(hypothesisId, { rawPValue, resultsSummary }) {
    if (rawPValue === undefined || rawPValue === null || isNaN(rawPValue)) {
      throw new Error('FIREWALL REJECTION: rawPValue is required and must be numeric.');
    }

    const reg = this.loadRegistry();
    const hyp = reg.hypotheses[hypothesisId];
    if (!hyp) {
      throw new Error(`FIREWALL REJECTION: Cannot record results for unregistered hypothesis '${hypothesisId}'.`);
    }

    this._validateTransition(hyp.lifecycleState, HYPOTHESIS_STATES.DISCOVERY_RESULT, hypothesisId);

    hyp.lifecycleState = HYPOTHESIS_STATES.DISCOVERY_RESULT;
    hyp.rawPValue = Number(rawPValue.toFixed(6));
    hyp.executionTimestamp = new Date().toISOString();
    hyp.resultsSummary = resultsSummary;

    // Recalculate Family-Wide Multiple Testing Corrections
    this._recomputeFamilyMultipleTesting(reg, hyp.familyId);

    this.saveRegistry(reg);
    return reg.hypotheses[hypothesisId];
  }

  /**
   * Advance a discovery result to Confirmatory Candidate
   */
  promoteToCandidate(hypothesisId) {
    const reg = this.loadRegistry();
    const hyp = reg.hypotheses[hypothesisId];
    if (!hyp) throw new Error(`Hypothesis '${hypothesisId}' not found.`);

    this._validateTransition(hyp.lifecycleState, HYPOTHESIS_STATES.CANDIDATE, hypothesisId);
    hyp.lifecycleState = HYPOTHESIS_STATES.CANDIDATE;
    this.saveRegistry(reg);
    return hyp;
  }

  /**
   * Pre-register candidate for Out-Of-Sample (OOS) Validation
   */
  preRegisterConfirmatoryOOS(hypothesisId, oosDatasetHash) {
    const reg = this.loadRegistry();
    const hyp = reg.hypotheses[hypothesisId];
    if (!hyp) throw new Error(`Hypothesis '${hypothesisId}' not found.`);

    if (hyp.datasetHash === oosDatasetHash) {
      throw new Error('FIREWALL REJECTION: OOS validation dataset must be independent and different from Discovery dataset.');
    }

    this._validateTransition(hyp.lifecycleState, HYPOTHESIS_STATES.CONFIRMATORY_PREREGISTERED, hypothesisId);
    hyp.lifecycleState = HYPOTHESIS_STATES.CONFIRMATORY_PREREGISTERED;
    hyp.oosDatasetHash = oosDatasetHash;
    hyp.confirmatoryRegistrationTimestamp = new Date().toISOString();
    this.saveRegistry(reg);
    return hyp;
  }

  /**
   * Record OOS Validation outcome
   */
  finalizeOOSValidation(hypothesisId, { oosRawPValue, passedAllGates, oosSummary }) {
    const reg = this.loadRegistry();
    const hyp = reg.hypotheses[hypothesisId];
    if (!hyp) throw new Error(`Hypothesis '${hypothesisId}' not found.`);

    this._validateTransition(hyp.lifecycleState, HYPOTHESIS_STATES.OOS_VALIDATION, hypothesisId);
    hyp.lifecycleState = HYPOTHESIS_STATES.OOS_VALIDATION;

    const family = reg.families[hyp.familyId];
    const isSignificantBonferroni = oosRawPValue <= family.adjustedSignificanceThresholdBonferroni;
    const finalPassed = passedAllGates && isSignificantBonferroni;

    hyp.lifecycleState = finalPassed ? HYPOTHESIS_STATES.PASSED : HYPOTHESIS_STATES.FAILED;
    hyp.oosRawPValue = oosRawPValue;
    hyp.oosSummary = oosSummary;
    hyp.oosCompletedTimestamp = new Date().toISOString();

    if (finalPassed) {
      family.countValidatedOOS++;
    } else {
      family.countRejected++;
    }

    this.saveRegistry(reg);
    return hyp;
  }

  _validateTransition(fromState, toState, hypothesisId) {
    const allowed = VALID_TRANSITIONS[fromState] || [];
    if (!allowed.includes(toState)) {
      throw new Error(`FIREWALL REJECTION: Illegal lifecycle transition from '${fromState}' to '${toState}' for hypothesis '${hypothesisId}'.`);
    }
  }

  /**
   * Recomputes Bonferroni, Holm-Bonferroni, and Benjamini-Hochberg (BH) for an entire family
   */
  _recomputeFamilyMultipleTesting(reg, familyId) {
    const family = reg.families[familyId];
    const hypKeys = family.hypothesesList;
    const M = hypKeys.length;

    // Collect all hypotheses with recorded raw p-values
    const evaluated = hypKeys
      .map(k => reg.hypotheses[k])
      .filter(h => h.rawPValue !== null);

    if (evaluated.length === 0) return;

    // 1. Single-Step Bonferroni
    family.adjustedSignificanceThresholdBonferroni = Number((reg.nominalAlpha / M).toFixed(6));
    family.countSignificantNominal = 0;
    family.countSignificantBonferroni = 0;

    for (const h of evaluated) {
      h.bonferroniPValue = Number(Math.min(1.0, h.rawPValue * M).toFixed(6));
      h.isSignificantNominal = h.rawPValue <= reg.nominalAlpha;
      h.isSignificantBonferroni = h.rawPValue <= family.adjustedSignificanceThresholdBonferroni;

      if (h.isSignificantNominal) family.countSignificantNominal++;
      if (h.isSignificantBonferroni) family.countSignificantBonferroni++;
    }

    // 2. Holm-Bonferroni (Step-Down FWER)
    const sortedForHolm = [...evaluated].sort((a, b) => a.rawPValue - b.rawPValue);
    let holmPassed = true;
    for (let k = 0; k < sortedForHolm.length; k++) {
      const h = sortedForHolm[k];
      const rank = k + 1;
      const holmThreshold = reg.nominalAlpha / (M - rank + 1);
      if (holmPassed && h.rawPValue <= holmThreshold) {
        h.holmPValue = Number((h.rawPValue * (M - rank + 1)).toFixed(6));
        h.isSignificantHolm = true;
      } else {
        holmPassed = false;
        h.holmPValue = Number(Math.min(1.0, h.rawPValue * (M - rank + 1)).toFixed(6));
        h.isSignificantHolm = false;
      }
    }

    // 3. Benjamini-Hochberg (FDR)
    const sortedForBH = [...evaluated].sort((a, b) => a.rawPValue - b.rawPValue);
    let maxSignificantRankBH = -1;

    for (let k = sortedForBH.length - 1; k >= 0; k--) {
      const h = sortedForBH[k];
      const rank = k + 1;
      const bhThreshold = (rank / M) * reg.targetFDR_Q;
      if (h.rawPValue <= bhThreshold) {
        maxSignificantRankBH = rank;
        break;
      }
    }

    family.countSignificantFDR = 0;
    for (let k = 0; k < sortedForBH.length; k++) {
      const h = sortedForBH[k];
      const rank = k + 1;
      h.fdrQValue = Number(Math.min(1.0, (h.rawPValue * M) / rank).toFixed(6));
      h.isSignificantFDR = rank <= maxSignificantRankBH;
      if (h.isSignificantFDR) family.countSignificantFDR++;
    }

    // Best raw p-value
    family.bestRawPValue = Math.min(...evaluated.map(h => h.rawPValue));
  }

  getFamilySummary(familyId) {
    const reg = this.loadRegistry();
    const family = reg.families[familyId];
    if (!family) return null;

    return {
      familyId,
      totalRegistered: family.totalRegisteredHypotheses,
      nominalAlpha: family.nominalAlpha,
      bonferroniAlpha: family.adjustedSignificanceThresholdBonferroni,
      significantNominal: family.countSignificantNominal,
      significantBonferroni: family.countSignificantBonferroni,
      significantFDR: family.countSignificantFDR,
      validatedOOS: family.countValidatedOOS,
      rejected: family.countRejected
    };
  }
}

export const multipleTestingController = new MultipleTestingController();
