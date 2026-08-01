import assert from 'assert';
import { TruthKernel } from '../../lyzer edge/src/engine/kernel.js';

console.log('='.repeat(72));
console.log('  EMPIRICAL STRESS TEST — TRUTH KERNEL DEPENDENCY INJECTION');
console.log('='.repeat(72));

// Test cases for DI parameters
const testCases = [
  { input: undefined, expectedMaster: 50, expectedEttTrg: 0.4 },
  { input: {}, expectedMaster: 50, expectedEttTrg: 0.4 },
  { input: { masterSwitchThreshold: 10 }, expectedMaster: 10, expectedEttTrg: 0.1 },
  { input: { masterSwitchThreshold: 75 }, expectedMaster: 75, expectedEttTrg: 0.75 },
  { input: { masterSwitchThreshold: 100 }, expectedMaster: 100, expectedEttTrg: 1.0 },
  { input: { masterSwitchThreshold: 0 }, expectedMaster: 0, expectedEttTrg: 0.4 },
  { input: { trgThreshold: 0.25 }, expectedMaster: 50, expectedEttTrg: 0.25 },
  { input: { masterSwitchThreshold: 80, trgThreshold: 0.35 }, expectedMaster: 80, expectedEttTrg: 0.35 },
  { input: { lhdsVetoLimit: 0.9, ontologicalCollapseTrg: 0.85 }, expectedMaster: 50, expectedEttTrg: 0.4 }
];

console.log('\n[1] Instantiation & Property Verification:');
for (const tc of testCases) {
  const kernel = new TruthKernel(tc.input);
  console.log(`  Input: ${JSON.stringify(tc.input)} -> masterSwitchThreshold=${kernel.masterSwitchThreshold}, ett.trgThreshold=${kernel.ett.trgThreshold}`);
  assert.strictEqual(kernel.masterSwitchThreshold, tc.expectedMaster, `masterSwitchThreshold mismatch for ${JSON.stringify(tc.input)}`);
  assert.strictEqual(kernel.ett.trgThreshold, tc.expectedEttTrg, `ett.trgThreshold mismatch for ${JSON.stringify(tc.input)}`);
}
console.log('  [PASS] All DI property initializations verified dynamically.');

console.log('\n[2] Dynamic Behavior Stress Test (Execution Trigger Modulation):');

// Provide providers with opposing signals to create divergence
// v1 = long 60% (+0.60), v2 = short 30% (-0.30) => maxDiff = 0.90
// DVF = 0.90. With trgExponent=2, structuralRisk = 0.90^2 = 0.81.
// With liquidityDivergence = 0.5, TRG = 0.81 * 0.5 = 0.405.
const mockProviders = {
  v1: { signal: 'long', confidence: 60 },
  v2: { signal: 'short', confidence: 30 },
  v3: { signal: 'caution', confidence: 0 },
  v4: { signal: 'caution', confidence: 0 }
};
const mockMicro = {
  scaleDivergence: 0.2,
  lhds: 0.1,
  liquidityDivergence: 0.5
};

// 1. Low threshold kernel (masterSwitchThreshold = 10 -> trgThreshold = 0.10)
const lowKernel = new TruthKernel({ masterSwitchThreshold: 10 });
const lowResult = lowKernel.evaluate(mockProviders, mockMicro);

// 2. High threshold kernel (masterSwitchThreshold = 75 -> trgThreshold = 0.75)
const highKernel = new TruthKernel({ masterSwitchThreshold: 75 });
const highResult = highKernel.evaluate(mockProviders, mockMicro);

console.log(`  Calculated TRG: ${lowResult.trg.toFixed(4)}`);
console.log(`  Low Threshold Kernel (10 / trgThreshold 0.10)  -> eef: ${lowResult.eef}, reason: ${lowResult.reason_codes[0]}`);
console.log(`  High Threshold Kernel (75 / trgThreshold 0.75) -> eef: ${highResult.eef}, reason: ${highResult.reason_codes[0]}`);

// Verifications
assert.strictEqual(typeof lowResult.trg, 'number', 'TRG must be a number');
assert.ok(lowResult.trg > 0.10 && lowResult.trg < 0.75, `TRG (${lowResult.trg}) must be between 0.10 and 0.75 for this test`);
assert.strictEqual(lowResult.eef, true, 'Low threshold kernel (trgThreshold=0.10) should trigger execution (eef=true)');
assert.strictEqual(highResult.eef, false, 'High threshold kernel (trgThreshold=0.75) should block execution (eef=false)');

console.log('  [PASS] Dynamic DI behavior verified: Changing DI threshold dynamically toggles EEF execution trigger.');

console.log('\n[3] Clean Boundary & Direct Import Sanity Check:');
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const kernelFile = path.join(__dirname, '..', '..', 'lyzer edge', 'src', 'engine', 'kernel.js');
const kernelContent = fs.readFileSync(kernelFile, 'utf8');

assert.strictEqual(kernelContent.includes('activeConfig'), false, 'kernel.js must NOT import activeConfig');
assert.strictEqual(kernelContent.includes('import { activeConfig'), false, 'kernel.js must NOT import activeConfig directly');
console.log('  [PASS] TruthKernel maintains complete boundary isolation from activeConfig.');

console.log('\n' + '='.repeat(72));
console.log('  🎉 DI STRESS TEST COMPLETED SUCCESSFULLY (DI IS DYNAMIC & FUNCTIONAL)');
console.log('='.repeat(72));
