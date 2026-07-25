/**
 * Lyzer Edge Command Center v2 — Metric Validator (ETAPA 2)
 * Validates metric schemas, data types, mandatory fields, and timestamp integrity.
 */

export class MetricValidator {
  constructor() {
    this.requiredFields = ['name', 'value', 'reality_tag', 'timestamp', 'source'];
  }

  /**
   * Validates a metric payload against institutional schema rules.
   * @param {Object} metric
   * @returns {Object} { valid: boolean, error?: string }
   */
  validate(metric) {
    if (!metric || typeof metric !== 'object') {
      return { valid: false, error: "Metric payload must be a valid JSON object." };
    }

    // Check required fields
    for (const field of this.requiredFields) {
      if (metric[field] === undefined && metric[field === 'reality_tag' ? 'realityTag' : field] === undefined) {
        return { valid: false, error: `Missing mandatory metric schema field: '${field}'` };
      }
    }

    // Validate timestamp is a valid ISO 8601 string or numeric timestamp
    const ts = metric.timestamp;
    const parsedTs = new Date(ts).getTime();
    if (isNaN(parsedTs)) {
      return { valid: false, error: `Invalid timestamp format: '${ts}'. Must be ISO 8601 or epoch millis.` };
    }

    // Validate reality_tag values
    const tag = metric.reality_tag || metric.realityTag;
    if (tag !== 'OBSERVED_REALITY' && tag !== 'SYNTHETIC_REALITY') {
      return { valid: false, error: `Invalid reality_tag: '${tag}'. Must be OBSERVED_REALITY or SYNTHETIC_REALITY.` };
    }

    return { valid: true };
  }
}

export const metricValidator = new MetricValidator();
