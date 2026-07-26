/**
 * Lyzer Edge — CognitiveTrustModelEngine
 * Cognitive Trust Score Calculator.
 * Mathematical Formula:
 *   TrustScore = EvidenceStrength + HistoricalAccuracy + Confidence + Validation - Risk
 */

export class CognitiveTrustModelEngine {
  constructor() {
    this._disposed = false;
  }

  /**
   * Computes the Cognitive Trust Score for an agent output or decision.
   * @param {object} inputs
   * @param {number} [inputs.evidenceStrength=0.90] - Scale 0.0 to 1.0
   * @param {number} [inputs.historicalAccuracy=0.95] - Scale 0.0 to 1.0
   * @param {number} [inputs.confidence=0.94] - Scale 0.0 to 1.0
   * @param {number} [inputs.validationScore=0.92] - Scale 0.0 to 1.0
   * @param {number} [inputs.riskPenalty=0.05] - Scale 0.0 to 1.0
   */
  calculateTrustScore(inputs = {}) {
    this._assertNotDisposed();

    const evidenceStrength = inputs.evidenceStrength ?? 0.90;
    const historicalAccuracy = inputs.historicalAccuracy ?? 0.95;
    const confidence = inputs.confidence ?? 0.94;
    const validationScore = inputs.validationScore ?? 0.92;
    const riskPenalty = inputs.riskPenalty ?? 0.05;

    // Normalized weighted trust score calculation
    const rawScore = (
      (evidenceStrength * 0.30) +
      (historicalAccuracy * 0.25) +
      (confidence * 0.25) +
      (validationScore * 0.20) -
      (riskPenalty * 0.20)
    );

    const normalizedTrustScore = Math.max(0, Math.min(1.0, Math.round(rawScore * 1000) / 1000));

    return Object.freeze({
      trustScore: normalizedTrustScore,
      tier: normalizedTrustScore >= 0.85 ? 'INSTITUTIONAL_HIGH_TRUST' : 'MODERATE_TRUST',
      breakdown: Object.freeze({
        evidenceStrength,
        historicalAccuracy,
        confidence,
        validationScore,
        riskPenalty
      }),
      calculatedAt: Date.now()
    });
  }

  _assertNotDisposed() {
    if (this._disposed) throw new Error('ERR_COGNITIVE_TRUST_MODEL_DISPOSED: Cognitive Trust Model Engine is disposed');
  }

  dispose() {
    this._disposed = true;
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}
