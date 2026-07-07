// evidenceHistory.js
 
// Note: contracts are defined in TypeScript for type checking; runtime import omitted.
 
/**
 * Simple in‑memory rolling buffer for Observation records.
 * No pruning, persistence, or compression – just the minimal API
 * required for Sprint 1.
 */
class EvidenceHistory {
  /**
   * @param {number} maxSize - Maximum number of records to retain (default 100)
   */
  constructor(maxSize = 100) {
    this.maxSize = maxSize;
    /** @type {Observation[]} */
    this.buffer = [];
  }
 
  /** Validate an Observation against the contract at runtime */
  static _validate(record) {
    if (typeof record !== 'object' || record === null) {
      throw new Error('Invalid Observation: not an object');
    }
    const requiredProps = ['timestamp', 'regime', 'volatility', 'observations'];
    for (const p of requiredProps) {
      if (!(p in record)) {
        throw new Error(`Invalid Observation: missing ${p}`);
      }
    }
    // basic type checks
    if (typeof record.timestamp !== 'number') {
      throw new Error('Invalid Observation: timestamp must be number');
    }
    if (typeof record.regime !== 'string') {
      throw new Error('Invalid Observation: regime must be string');
    }
    if (typeof record.volatility !== 'number') {
      throw new Error('Invalid Observation: volatility must be number');
    }
    if (typeof record.observations !== 'object' || record.observations === null) {
      throw new Error('Invalid Observation: observations must be object');
    }
    // optional deeper checks could be added later
    return true;
  }
 
  /** Add a new Observation record */
  addRecord(record) {
    EvidenceHistory._validate(record);
    this.buffer.push(record);
    // enforce rolling window size
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift();
    }
  }
 
  /** Return a shallow copy of the current window */
  getWindow() {
    return [...this.buffer];
  }
 
  /** Clear all stored records */
  clear() {
    this.buffer = [];
  }
 
  /** Current number of stored records */
  size() {
    return this.buffer.length;
  }
}
 
export const evidenceHistory = new EvidenceHistory();
export default EvidenceHistory;
 