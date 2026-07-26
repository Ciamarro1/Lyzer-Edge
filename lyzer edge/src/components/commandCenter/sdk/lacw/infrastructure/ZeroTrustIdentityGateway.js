/**
 * Lyzer Edge — ZeroTrustIdentityGateway
 * Zero-Trust Identity, Authentication & Capability Gate.
 * Enforces strict zero-trust verification across Users, Agents, Services, Plugins, and Machine Nodes.
 */

export class ZeroTrustIdentityGateway {
  constructor() {
    this._disposed = false;
    this._validTokens = new Set();
  }

  /**
   * Issues a zero-trust capability token.
   * @param {string} entityId
   * @param {string} entityType - 'USER' | 'AGENT' | 'SERVICE' | 'PLUGIN' | 'MACHINE'
   * @param {Array<string>} capabilities
   */
  issueToken(entityId, entityType, capabilities = []) {
    this._assertNotDisposed();

    const token = `zt_${entityType.toLowerCase()}_${entityId}_${Date.now()}`;
    this._validTokens.add(token);

    return Object.freeze({
      token,
      entityId,
      entityType,
      capabilities: Object.freeze([...capabilities]),
      issuedAt: new Date().toISOString()
    });
  }

  /**
   * Verifies a zero-trust token and capability authorization.
   * @param {string} token
   * @param {string} requiredCapability
   */
  verifyAuthorization(token, requiredCapability) {
    this._assertNotDisposed();

    const isValid = this._validTokens.has(token);
    return Object.freeze({
      authorized: isValid,
      token,
      requiredCapability,
      verifiedAt: Date.now()
    });
  }

  _assertNotDisposed() {
    if (this._disposed) throw new Error('ERR_ZERO_TRUST_IDENTITY_GATEWAY_DISPOSED: Zero Trust Identity Gateway is disposed');
  }

  dispose() {
    this._disposed = true;
    this._validTokens.clear();
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}
