import crypto from 'crypto';

export class CapitalAuthorizationValidator {
  /**
   * Verifies the boot authorization payload against the cryptographic signature using Ed25519.
   * If valid, returns the parsed authorization scope.
   * If invalid, throws an error resulting in a HARD HALT.
   */
  static verifySignature(envString) {
    if (!envString || envString.trim() === '') {
      throw new Error("CAPITAL_AUTHORIZATION_SIGNATURE is missing or empty.");
    }
    
    const parts = envString.split('.');
    if (parts.length !== 2) {
      throw new Error("CAPITAL_AUTHORIZATION_SIGNATURE is malformed.");
    }

    const [encodedPayload, providedSignatureBase64] = parts;
    const publicKeyPem = process.env.GOVERNANCE_PUBLIC_KEY;
    
    if (!publicKeyPem) {
      throw new Error("GOVERNANCE_PUBLIC_KEY is missing. Cannot verify signature.");
    }

    const isVerified = crypto.verify(
      null,
      Buffer.from(encodedPayload),
      publicKeyPem,
      Buffer.from(providedSignatureBase64, 'base64')
    );

    if (!isVerified) {
      throw new Error("Cryptographic verification failed: INVALID_SIGNATURE.");
    }

    let payload;
    try {
      const decodedStr = Buffer.from(encodedPayload, 'base64').toString('utf8');
      payload = JSON.parse(decodedStr);
    } catch (e) {
      throw new Error("Failed to parse authorization payload.");
    }

    this.validateScope(payload);

    return payload;
  }

  static validateScope(payload) {
    // 1. Validate Provider Hash
    const expectedProvider = 'REC_COMP_INSTITUTIONAL_v1';
    if (payload.provider !== expectedProvider) {
      throw new Error(`AUTHORIZATION_SCOPE_VIOLATION: Provider mismatch. Expected ${expectedProvider}, got ${payload.provider}`);
    }

    // 2. Validate Expiration
    if (payload.expires_at) {
      const now = Date.now();
      if (now > payload.expires_at) {
        throw new Error("AUTHORIZATION_SCOPE_VIOLATION: Signature expired.");
      }
    }

    // 3. Validate Capacity constraints
    const maxCapacity = parseFloat(process.env.MAX_AUTHORIZED_CAPACITY || '150000');
    if (payload.authorized_capacity > maxCapacity) {
      throw new Error(`AUTHORIZATION_SCOPE_VIOLATION: Authorized capacity (${payload.authorized_capacity}) exceeds structural ceiling (${maxCapacity}).`);
    }

    const envDefaultCapacity = parseFloat(process.env.DEFAULT_OPERATING_CAPACITY || '0');
    if (envDefaultCapacity > payload.authorized_capacity) {
      throw new Error(`AUTHORIZATION_SCOPE_VIOLATION: Environment DEFAULT_OPERATING_CAPACITY (${envDefaultCapacity}) exceeds the cryptographically authorized capacity (${payload.authorized_capacity}).`);
    }

    // 4. Validate Nonce/Replay (Simulated DB check)
    // In production, we check a persistent DB to ensure `payload.nonce` has not been used.
    if (global.usedNonces && global.usedNonces.has(payload.nonce)) {
      throw new Error(`NONCE / AUTHORIZATION_ID REPLAY: Authorization already used.`);
    }
    if (global.usedNonces) global.usedNonces.add(payload.nonce);
  }

  /**
   * Helper function to generate a test Ed25519 token. DO NOT USE IN PRODUCTION.
   */
  static generateTestToken(privateKeyPem, payload) {
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
    const signature = crypto.sign(null, Buffer.from(encodedPayload), privateKeyPem).toString('base64');
    return `${encodedPayload}.${signature}`;
  }
}
