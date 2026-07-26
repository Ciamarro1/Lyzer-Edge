/**
 * Lyzer Edge Command Center v2 — Reality Tag Validator (ETAPA 2)
 * Prevents epistemic contamination by blocking any payload or context
 * that mixes OBSERVED_REALITY and SYNTHETIC_REALITY.
 */

export class RealityTagValidator {
  constructor() {
    this.validTags = ['OBSERVED_REALITY', 'SYNTHETIC_REALITY'];
  }

  /**
   * Validates reality tags in a single metric payload or a collection of metrics.
   * @param {Object|Array} data - A metric object or an array of metric objects.
   * @returns {Object} { valid: boolean, error?: string, veto?: string }
   */
  validate(data) {
    if (!data) {
      return { valid: false, error: "Empty payload provided for reality tag validation." };
    }

    const items = Array.isArray(data) ? data : [data];
    let observedCount = 0;
    let syntheticCount = 0;

    for (const item of items) {
      const tag = item.reality_tag || item.realityTag;
      if (!tag || !this.validTags.includes(tag)) {
        return {
          valid: false,
          error: `Invalid or missing reality_tag: '${tag}'. Must be OBSERVED_REALITY or SYNTHETIC_REALITY.`
        };
      }

      if (tag === 'OBSERVED_REALITY') {
        observedCount++;
      } else if (tag === 'SYNTHETIC_REALITY') {
        syntheticCount++;
      }
    }

    if (observedCount > 0 && syntheticCount > 0) {
      return {
        valid: false,
        veto: "EPISTEMIC_CONTAMINATION",
        error: "[EPISTEMIC_CONTAMINATION] FATAL: Cannot mix OBSERVED_REALITY and SYNTHETIC_REALITY in the same context."
      };
    }

    return {
      valid: true,
      tag: observedCount > 0 ? 'OBSERVED_REALITY' : 'SYNTHETIC_REALITY'
    };
  }
}

export const realityTagValidator = new RealityTagValidator();
