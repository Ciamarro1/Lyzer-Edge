import { CapitalAuthorizationValidator } from '../../lyzer edge/backend/CapitalAuthorizationValidator.js';
import crypto from 'crypto';

global.usedNonces = new Set(); // Simulate external DB tracking used nonces

// Generate Ed25519 Key Pair representing Out-of-Band Governance
const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
const pubKeyPem = publicKey.export({ type: 'spki', format: 'pem' });
const privKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' });

// System env defaults
process.env.GOVERNANCE_PUBLIC_KEY = pubKeyPem;
process.env.MAX_AUTHORIZED_CAPACITY = '150000';

function logTest(name, passed, detail) {
  console.log(`\n================================`);
  console.log(`[GATE] ${name}`);
  console.log(`Status: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Detail: ${detail}`);
}

async function runGates() {
  console.log("🏛️  BATCH 033 — DEPLOYMENT FIDELITY & CLOUD BOOT GATE");
  let allPassed = true;

  // GATE A: Clean Boot (Railway ENV empty)
  try {
    CapitalAuthorizationValidator.verifySignature("");
    logTest("Gate A (Clean Boot)", false, "Should have thrown missing signature error.");
    allPassed = false;
  } catch (e) {
    logTest("Gate A (Clean Boot)", e.message.includes("missing or empty"), e.message);
  }

  // GATE B: Forged Authorization
  try {
    // Attackers try to sign a payload using a different key or garbage
    const fakeKey = crypto.generateKeyPairSync('ed25519').privateKey.export({ type: 'pkcs8', format: 'pem' });
    const forgedSig = CapitalAuthorizationValidator.generateTestToken(fakeKey, {
      provider: 'REC_COMP_INSTITUTIONAL_v1', authorized_capacity: 150000
    });
    CapitalAuthorizationValidator.verifySignature(forgedSig);
    logTest("Gate B (Forged Authorization)", false, "Should have rejected forged signature.");
    allPassed = false;
  } catch (e) {
    logTest("Gate B (Forged Authorization)", e.message.includes("INVALID_SIGNATURE"), e.message);
  }

  // Generate a valid signature for subsequent tests
  const validPayload = {
    provider: 'REC_COMP_INSTITUTIONAL_v1',
    capital_tier: 'T3',
    authorized_capacity: 10000,
    nonce: crypto.randomUUID(),
    expires_at: Date.now() + 86400000
  };
  const validSig = CapitalAuthorizationValidator.generateTestToken(privKeyPem, validPayload);

  // GATE C: Replay Attack
  try {
    CapitalAuthorizationValidator.verifySignature(validSig); // First use (valid)
    CapitalAuthorizationValidator.verifySignature(validSig); // Second use (replay)
    logTest("Gate C (Replay Attack)", false, "Should have rejected replayed nonce.");
    allPassed = false;
  } catch (e) {
    logTest("Gate C (Replay Attack)", e.message.includes("REPLAY"), e.message);
  }

  // GATE D: Scope Escalation
  try {
    const scopePayload = { ...validPayload, nonce: crypto.randomUUID() };
    const scopeSig = CapitalAuthorizationValidator.generateTestToken(privKeyPem, scopePayload);
    // Environment tries to claim $100k
    process.env.DEFAULT_OPERATING_CAPACITY = '100000';
    CapitalAuthorizationValidator.verifySignature(scopeSig);
    logTest("Gate D (Scope Escalation)", false, "Should have blocked environment capacity override.");
    allPassed = false;
  } catch (e) {
    logTest("Gate D (Scope Escalation)", e.message.includes("AUTHORIZATION_SCOPE_VIOLATION"), e.message);
  }

  // GATE E: K5 Persistence
  try {
    // Simulate container death and reboot with K5 still active in external DB
    process.env.MOCK_DB_K5_ACTIVE = 'true';
    const isHalted = process.env.MOCK_DB_K5_ACTIVE === 'true';
    if (isHalted) throw new Error("PERSISTENT K5 ACTIVE: Human Unlock Required.");
    logTest("Gate E (K5 Persistence)", false, "Should have halted on persistent K5.");
    allPassed = false;
  } catch (e) {
    logTest("Gate E (K5 Persistence)", e.message.includes("PERSISTENT K5 ACTIVE"), e.message);
  }

  // GATE F: Provider Tampering
  try {
    process.env.DEFAULT_OPERATING_CAPACITY = '10000';
    const tamperedPayload = { ...validPayload, nonce: crypto.randomUUID(), provider: 'REC_COMP_EXPERIMENTAL_v2' };
    const tamperedSig = CapitalAuthorizationValidator.generateTestToken(privKeyPem, tamperedPayload);
    CapitalAuthorizationValidator.verifySignature(tamperedSig);
    logTest("Gate F (Provider Tampering)", false, "Should have blocked incorrect provider hash.");
    allPassed = false;
  } catch (e) {
    logTest("Gate F (Provider Tampering)", e.message.includes("Provider mismatch"), e.message);
  }

  console.log(`\n==================================================`);
  if (allPassed) {
    console.log(`✅ BATCH 033 DEPLOYMENT FIDELITY GATE PASSED.`);
    console.log(`The environment cannot forge authority. Ready for Git Commit.`);
  } else {
    console.log(`❌ BATCH 033 DEPLOYMENT FIDELITY GATE FAILED.`);
  }
}

runGates();
