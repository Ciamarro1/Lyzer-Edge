/**
 * @fileoverview LLES-v1.0: Lyzer Logic Epistemic Standard v1.0
 * 
 * Defines the 5 canonical epistemic tags and strict governance rules across the Lyzer Edge ecosystem:
 * 1. [FACT:CODE] - Deterministic code invariants verified via static analysis / AST / codebase inspection.
 * 2. [FACT:RUNTIME] - Observed physical runtime telemetry and real-world execution events.
 * 3. [FACT:DATASET] - Persisted historical records, closed candle series, and immutable causal memory.
 * 4. [INFERENCE:EMPIRICAL] - Statistical deductions, confidence intervals (95% CI), Sharpe/EV regressions.
 * 5. [COUNTERFACTUAL:HYPOTHESIS] - Non-realized what-if simulations, chaos stress tests, and avoided losses.
 *
 * Invariant Rule: PHANTOM PNL PROHIBITION
 * Avoided losses from vetos, risk limits, or circuit breakers must NEVER be added to realized ledgers, NAV, or equity curves.
 */

/**
 * The 5 canonical LLES-v1.0 epistemic tags.
 */
export const LLES_TAGS = Object.freeze({
  FACT_CODE: '[FACT:CODE]',
  FACT_RUNTIME: '[FACT:RUNTIME]',
  FACT_DATASET: '[FACT:DATASET]',
  INFERENCE_EMPIRICAL: '[INFERENCE:EMPIRICAL]',
  COUNTERFACTUAL_HYPOTHESIS: '[COUNTERFACTUAL:HYPOTHESIS]'
});

/**
 * Set of allowed epistemic tags for fast lookup.
 */
export const VALID_LLES_TAG_SET = Object.freeze(new Set(Object.values(LLES_TAGS)));

/**
 * Epistemic authority definitions and evidentiary requirements for each tag.
 */
export const EPISTEMIC_AUTHORITY_MATRIX = Object.freeze({
  [LLES_TAGS.FACT_CODE]: {
    name: 'FACT_CODE',
    authority: 'DETERMINISTIC_CODE_INVARIANT',
    evidentiaryRequirement: 'Direct reference to source code, AST node, function signature, or compiled constant.',
    allowsFinancialLedger: false,
    allowsAccountingSum: false
  },
  [LLES_TAGS.FACT_RUNTIME]: {
    name: 'FACT_RUNTIME',
    authority: 'OBSERVED_PHYSICAL_TELEMETRY',
    evidentiaryRequirement: 'Physical runtime timestamp, process telemetry, live order fill confirmation, or memory audit.',
    allowsFinancialLedger: true,
    allowsAccountingSum: true
  },
  [LLES_TAGS.FACT_DATASET]: {
    name: 'FACT_DATASET',
    authority: 'HISTORICAL_PERSISTED_DATA',
    evidentiaryRequirement: 'Persisted dataset reference, row count, timeframe bounds, and immutable causal DB hash.',
    allowsFinancialLedger: true,
    allowsAccountingSum: true
  },
  [LLES_TAGS.INFERENCE_EMPIRICAL]: {
    name: 'INFERENCE_EMPIRICAL',
    authority: 'STATISTICAL_INDUCTIVE_INFERENCE',
    evidentiaryRequirement: 'Sample size N, confidence interval (e.g. 95% CI), p-value, or explicit statistical formula.',
    allowsFinancialLedger: false,
    allowsAccountingSum: false
  },
  [LLES_TAGS.COUNTERFACTUAL_HYPOTHESIS]: {
    name: 'COUNTERFACTUAL_HYPOTHESIS',
    authority: 'NON_REALIZED_HYPOTHETICAL_SIMULATION',
    evidentiaryRequirement: 'Explicit scenario assumption, simulation parameter set, or what-if branch definition.',
    allowsFinancialLedger: false,
    allowsAccountingSum: false
  }
});

/**
 * Error thrown when an invalid epistemic tag is used or epistemic contamination occurs.
 */
export class EpistemicValidationError extends Error {
  constructor(message, details = {}) {
    super(`[LLES-v1.0 EpistemicValidationError] ${message}`);
    this.name = 'EpistemicValidationError';
    this.details = details;
  }
}

/**
 * Error thrown when a counterfactual or avoided loss attempts to contaminate a realized financial ledger.
 */
export class PhantomPnLContaminationError extends Error {
  constructor(message, contaminatedField = null, payload = null) {
    super(`🚨 [LLES-v1.0 PHANTOM PNL CONTAMINATION VETO] ${message}`);
    this.name = 'PhantomPnLContaminationError';
    this.contaminatedField = contaminatedField;
    this.payload = payload;
  }
}

/**
 * Validates whether a given string is a valid LLES-v1.0 tag.
 * @param {string} tag 
 * @returns {boolean}
 */
export function isValidEpistemicTag(tag) {
  return typeof tag === 'string' && VALID_LLES_TAG_SET.has(tag.trim());
}

/**
 * Asserts that a tag is valid, throwing an EpistemicValidationError if not.
 * @param {string} tag 
 * @returns {string} The trimmed valid tag
 */
export function assertValidEpistemicTag(tag) {
  if (!isValidEpistemicTag(tag)) {
    throw new EpistemicValidationError(
      `Invalid epistemic tag: "${tag}". Must be one of: ${Object.values(LLES_TAGS).join(', ')}`,
      { received: tag, allowed: Object.values(LLES_TAGS) }
    );
  }
  return tag.trim();
}

/**
 * Tags a message or statement with an LLES-v1.0 epistemic prefix.
 * @param {string} tag - One of LLES_TAGS
 * @param {string} message - The content statement
 * @returns {string} Stamped message
 */
export function tagMessage(tag, message) {
  const validTag = assertValidEpistemicTag(tag);
  return `${validTag} ${message}`;
}

/**
 * Formats a standardized epistemic governance log entry.
 * @param {string} tag - Epistemic tag from LLES_TAGS
 * @param {string} component - Originating component or engine
 * @param {string} message - Primary log description
 * @param {Object} [metadata={}] - Structured context
 * @returns {Object} Standardized log record
 */
export function formatEpistemicLog(tag, component, message, metadata = {}) {
  const validTag = assertValidEpistemicTag(tag);
  const authorityInfo = EPISTEMIC_AUTHORITY_MATRIX[validTag];

  return Object.freeze({
    epistemic_tag: validTag,
    epistemic_authority: authorityInfo.authority,
    timestamp: new Date().toISOString(),
    component: component || 'SYSTEM',
    message: `${validTag} [${component}] ${message}`,
    raw_message: message,
    metadata: Object.freeze({ ...metadata })
  });
}

/**
 * Formats an epistemic dashboard metric object for UI and Command Center consumption.
 * @param {Object} config
 * @param {string} config.name - Name of metric
 * @param {string} config.tag - LLES epistemic tag
 * @param {*} config.value - Metric value
 * @param {string} [config.unit=''] - Unit of measurement
 * @param {number} [config.confidence] - Confidence score (0 to 1) or CI
 * @param {number} [config.sampleSize] - Sample size N
 * @param {string} [config.source] - Originating file, table, or telemetry probe
 * @returns {Object} Epistemic metric snapshot
 */
export function formatEpistemicDashboardMetric({
  name,
  tag,
  value,
  unit = '',
  confidence = null,
  sampleSize = null,
  source = null
}) {
  const validTag = assertValidEpistemicTag(tag);
  return Object.freeze({
    name,
    epistemic_tag: validTag,
    epistemic_authority: EPISTEMIC_AUTHORITY_MATRIX[validTag].authority,
    value,
    unit,
    confidence,
    sample_size: sampleSize,
    source,
    updated_at: new Date().toISOString()
  });
}

/**
 * Formats an institutional governance report incorporating LLES-v1.0 sections.
 * @param {Object} reportConfig
 * @param {string} reportConfig.title
 * @param {string} reportConfig.author
 * @param {Array<{ tag: string, heading: string, content: string }>} reportConfig.sections
 * @returns {string} Markdown formatted report
 */
export function formatEpistemicReport({ title, author = 'Lyzer Epistemic Governance Committee', sections = [] }) {
  const dateStr = new Date().toISOString().split('T')[0];
  let md = `# ${title}\n\n`;
  md += `**Date:** ${dateStr} · **Standard:** LLES-v1.0 · **Author:** ${author}\n\n`;
  md += `---\n\n`;

  for (const section of sections) {
    const validTag = assertValidEpistemicTag(section.tag);
    md += `## ${validTag} ${section.heading}\n\n`;
    md += `${section.content.trim()}\n\n`;
  }

  return md;
}

/**
 * Phantom PnL Guard
 * Enforces the absolute prohibition of adding avoided losses, veto savings, or counterfactual gains into realized ledgers.
 */
export class PhantomPnLGuard {
  static FORBIDDEN_REALIZED_KEYS = Object.freeze([
    'avoided_loss',
    'avoidedLoss',
    'avoided_losses',
    'saved_pnl',
    'savedPnl',
    'saved_loss',
    'savedLoss',
    'counterfactual_pnl',
    'counterfactualPnl',
    'counterfactual_savings',
    'veto_savings',
    'vetoSavings',
    'veto_pnl_benefit',
    'phantom_pnl',
    'phantomPnl',
    'hypothetical_gain',
    'synthetic_pnl'
  ]);

  /**
   * Asserts that a realized ledger entry contains NO counterfactual / phantom PnL fields.
   * Throws PhantomPnLContaminationError if a violation is detected.
   * @param {Object} entry 
   * @returns {boolean} true if clean
   */
  static assertZeroPhantomPnL(entry) {
    if (!entry || typeof entry !== 'object') return true;

    for (const key of PhantomPnLGuard.FORBIDDEN_REALIZED_KEYS) {
      if (entry[key] !== undefined && entry[key] !== null) {
        const val = Number(entry[key]);
        if (!isNaN(val) && val !== 0) {
          throw new PhantomPnLContaminationError(
            `Field "${key}" with value ${val} detected in realized financial record. Avoided losses and counterfactuals CANNOT contaminate realized ledger.`,
            key,
            entry
          );
        }
      }
    }

    // Verify tag compatibility if epistemic_tag is present
    if (entry.epistemic_tag) {
      const tag = entry.epistemic_tag;
      if (tag === LLES_TAGS.COUNTERFACTUAL_HYPOTHESIS && (entry.realized_pnl !== undefined || entry.pnl !== undefined)) {
        throw new PhantomPnLContaminationError(
          `Entry tagged with [COUNTERFACTUAL:HYPOTHESIS] cannot be written to Realized Financial Ledger.`,
          'epistemic_tag',
          entry
        );
      }
    }

    return true;
  }

  /**
   * Sanitizes an array of trade objects intended for realized performance calculation.
   * Strips out any accidental phantom PnL additions and verifies realized purity.
   * @param {Array<Object>} trades 
   * @returns {Array<Object>} Sanitized trades array
   */
  static sanitizeRealizedTrades(trades) {
    if (!Array.isArray(trades)) return [];

    return trades.map(trade => {
      PhantomPnLGuard.assertZeroPhantomPnL(trade);

      // Return a clean clone containing only verified realized parameters
      const sanitized = { ...trade };
      for (const key of PhantomPnLGuard.FORBIDDEN_REALIZED_KEYS) {
        delete sanitized[key];
      }
      
      // Ensure realized tag is present
      if (!sanitized.epistemic_tag) {
        sanitized.epistemic_tag = LLES_TAGS.FACT_RUNTIME;
      }

      return Object.freeze(sanitized);
    });
  }

  /**
   * Segregates raw records into Realized Ledger ([FACT:RUNTIME] / [FACT:DATASET])
   * and Counterfactual Telemetry ([COUNTERFACTUAL:HYPOTHESIS]).
   * @param {Array<Object>} records 
   * @returns {{ realizedLedger: Array<Object>, counterfactualTelemetry: Array<Object> }}
   */
  static segregateLedger(records) {
    const realizedLedger = [];
    const counterfactualTelemetry = [];

    for (const record of records || []) {
      const isCounterfactual = 
        record.epistemic_tag === LLES_TAGS.COUNTERFACTUAL_HYPOTHESIS ||
        record.is_counterfactual === true ||
        record.verdict === 'VETO' ||
        record.action === 'AVOIDED_TRADE';

      if (isCounterfactual) {
        counterfactualTelemetry.push(Object.freeze({
          ...record,
          epistemic_tag: LLES_TAGS.COUNTERFACTUAL_HYPOTHESIS,
          epistemic_authority: EPISTEMIC_AUTHORITY_MATRIX[LLES_TAGS.COUNTERFACTUAL_HYPOTHESIS].authority
        }));
      } else {
        PhantomPnLGuard.assertZeroPhantomPnL(record);
        realizedLedger.push(Object.freeze({
          ...record,
          epistemic_tag: record.epistemic_tag || LLES_TAGS.FACT_RUNTIME,
          epistemic_authority: EPISTEMIC_AUTHORITY_MATRIX[record.epistemic_tag || LLES_TAGS.FACT_RUNTIME].authority
        }));
      }
    }

    return {
      realizedLedger: Object.freeze(realizedLedger),
      counterfactualTelemetry: Object.freeze(counterfactualTelemetry)
    };
  }
}
