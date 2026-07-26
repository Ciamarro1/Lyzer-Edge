/**
 * Lyzer Edge — CertificationEngine
 * Cryptographic-Grade Systemic Certificate Issuer.
 * Issues immutable certificates for Decisions, Experiments, Plugins, Models, Predictions, Benchmarks, Deployments, Executions.
 */

import { createHash } from 'crypto';

let _certIdCounter = 0;

export class CertificationEngine {
  constructor(eventBus = null) {
    this._disposed = false;
    this._eventBus = eventBus;
    this._issuedCertificates = new Map();
  }

  /**
   * Issues a signed institutional certificate for a cognitive artifact or decision.
   * @param {string} targetType - e.g. 'DECISION', 'EXPERIMENT', 'PLUGIN', 'MODEL'
   * @param {string} targetId
   * @param {Record<string, unknown>} evidenceData
   */
  issueCertificate(targetType, targetId, evidenceData = {}) {
    this._assertNotDisposed();

    const certId = `cert_${targetType.toLowerCase()}_${Date.now()}_${++_certIdCounter}`;
    const payloadStr = JSON.stringify({ targetType, targetId, evidenceData });
    const signature = createHash('sha256').update(payloadStr).digest('hex');

    const certificate = Object.freeze({
      certId,
      targetType,
      targetId,
      evidenceSummary: Object.freeze({ ...evidenceData }),
      signature,
      issuedBy: 'ConstitutionalCourt_Authority',
      validUntil: Date.now() + (365 * 24 * 3600 * 1000), // 1 year
      issuedAt: new Date().toISOString(),
      timestamp: Date.now()
    });

    this._issuedCertificates.set(certId, certificate);

    if (this._eventBus) {
      this._eventBus.publish('certificate:issued', { certId, targetType, targetId });
    }

    return certificate;
  }

  /**
   * Verifies authenticity of a certificate signature.
   * @param {string} certId
   */
  verifyCertificate(certId) {
    this._assertNotDisposed();

    const cert = this._issuedCertificates.get(certId);
    if (!cert) return { valid: false, reason: 'NOT_FOUND' };

    const payloadStr = JSON.stringify({
      targetType: cert.targetType,
      targetId: cert.targetId,
      evidenceData: cert.evidenceSummary
    });

    const recomputedSignature = createHash('sha256').update(payloadStr).digest('hex');
    const valid = recomputedSignature === cert.signature && Date.now() < cert.validUntil;

    return Object.freeze({
      certId,
      valid,
      issuedBy: cert.issuedBy,
      targetId: cert.targetId
    });
  }

  _assertNotDisposed() {
    if (this._disposed) throw new Error('ERR_CERTIFICATION_ENGINE_DISPOSED: Certification Engine is disposed');
  }

  dispose() {
    this._disposed = true;
    this._issuedCertificates.clear();
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}
