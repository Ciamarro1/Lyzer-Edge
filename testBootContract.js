import { CapitalAuthorizationValidator } from './lyzer edge/backend/CapitalAuthorizationValidator.js';
import crypto from 'crypto';

const secret = 'test-secret-key-123';
process.env.CONTROL_PLANE_HMAC_SECRET = secret;
process.env.MAX_AUTHORIZED_CAPACITY = '150000';

function logTest(name, passed, detail) {
  console.log(`\n================================`);
  console.log(`[TEST] ${name}`);
  console.log(`Status: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Detail: ${detail}`);
}

async function runTests() {
  console.log("🏛️  RUNNING CRYPTOGRAPHIC BOOT CONTRACT TESTS");

  // CASE 1: Empty Signature
  try {
    CapitalAuthorizationValidator.verifySignature("");
    logTest("Case 1 (Empty Signature)", false, "Should have thrown error.");
  } catch (e) {
    logTest("Case 1 (Empty Signature)", e.message.includes("missing or empty"), e.message);
  }

  // CASE 2: Invalid/Garbage Signature
  try {
    CapitalAuthorizationValidator.verifySignature("garbage");
    logTest("Case 2 (Garbage Signature)", false, "Should have thrown error.");
  } catch (e) {
    logTest("Case 2 (Garbage Signature)", e.message.includes("malformed"), e.message);
  }

  // CASE 3: Valid T3 Signature
  const validPayload = {
    provider: 'REC_COMP_INSTITUTIONAL_v1',
    capital_tier: 'T3',
    authorized_capacity: 10000,
    expires_at: Date.now() + 86400000
  };
  const validSig = CapitalAuthorizationValidator.generateTestToken(secret, validPayload);
  try {
    process.env.DEFAULT_OPERATING_CAPACITY = '10000';
    const p = CapitalAuthorizationValidator.verifySignature(validSig);
    logTest("Case 3 (Valid Signature)", p.authorized_capacity === 10000, `Authorized Capacity: $${p.authorized_capacity}`);
  } catch (e) {
    logTest("Case 3 (Valid Signature)", false, e.message);
  }

  // CASE 4: Environmental Capacity Override Attempt
  try {
    // Environment tries to claim $150k default when only $10k was authorized
    process.env.DEFAULT_OPERATING_CAPACITY = '150000';
    CapitalAuthorizationValidator.verifySignature(validSig);
    logTest("Case 4 (Capacity Override)", false, "Should have blocked capacity override.");
  } catch (e) {
    logTest("Case 4 (Capacity Override)", e.message.includes("AUTHORIZATION_SCOPE_VIOLATION"), e.message);
  }
}

runTests();
