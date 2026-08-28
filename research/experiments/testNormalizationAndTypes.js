import { ResidualizationLayer } from '../../packages/lyzer-shared/src/engine/residualization.js';
import { TruthKernel } from '../../packages/lyzer-constitution/src/eca/truthKernel.js';

console.log('='.repeat(70));
console.log('🧪 UNIT TESTS: CONFIDENCE NORMALIZATION & TYPE INTEGRITY');
console.log('='.repeat(70));

const tests = [];

// Test 1: Confidence Normalization [0-1] vs [0-100]
const rl = new ResidualizationLayer({ consensusLimit: 0.1 });

const divFraction = rl.extractDivergence([{ signal: 'long', confidence: 0.80 }]);
const divPercent = rl.extractDivergence([{ signal: 'long', confidence: 80 }]);
const divOne = rl.extractDivergence([{ signal: 'long', confidence: 1.0 }]);
const divHundred = rl.extractDivergence([{ signal: 'long', confidence: 100 }]);

const diff1 = Math.abs(divFraction.divergence - divPercent.divergence);
const diff2 = Math.abs(divOne.divergence - divHundred.divergence);

const test1Pass = diff1 < 1e-6 && diff2 < 1e-6 && Math.abs(divFraction.divergence - 0.80) < 1e-6;
tests.push({
  name: 'confidence_scale_invariance',
  status: test1Pass ? 'PASS' : 'FAIL',
  details: `0.80 vs 80 diff: ${diff1.toFixed(8)}, 1.0 vs 100 diff: ${diff2.toFixed(8)}, scalar: ${divFraction.divergence.toFixed(4)}`
});

// Test 2: TruthKernel Output Structure & Safe Numeric Access
const kernel = new TruthKernel({ trgThreshold: 0.40 });
const kernelResult = kernel.evaluate({
  v1: { signal: 'flat', confidence: 0 },
  v2: { signal: 'long', confidence: 80 }
});

const trgVal = typeof kernelResult.trg === 'number' ? kernelResult.trg : (kernelResult.trg?.trg || 0);
const dvfVal = typeof kernelResult.dvf === 'number' ? kernelResult.dvf : (kernelResult.dvf?.divergence || 0);

const test2Pass = typeof trgVal === 'number' && !isNaN(trgVal) && trgVal > 0 && typeof dvfVal === 'number' && dvfVal > 0;
tests.push({
  name: 'truth_kernel_numeric_extraction',
  status: test2Pass ? 'PASS' : 'FAIL',
  details: `trgVal: ${trgVal.toFixed(4)}, dvfVal: ${dvfVal.toFixed(4)}, EEF: ${kernelResult.eef}`
});

// Test 3: Multi-Scale and Multi-Engine Single Provider Independence
const engines = ['v2', 'v5', 'v6', 'v7'];
let allEnginesValid = true;
for (const eng of engines) {
  const res = kernel.evaluate({
    [eng]: { signal: 'long', confidence: 75 }
  });
  const t = typeof res.trg === 'number' ? res.trg : (res.trg?.trg || 0);
  if (isNaN(t) || t <= 0) allEnginesValid = false;
}

tests.push({
  name: 'single_provider_trg_projection',
  status: allEnginesValid ? 'PASS' : 'FAIL',
  details: 'All engines (V2, V5, V6, V7) project valid non-zero TRG in isolation'
});

console.log('\nResults:');
for (const t of tests) {
  console.log(`[${t.status}] ${t.name}: ${t.details}`);
}

const allPassed = tests.every(t => t.status === 'PASS');
console.log('='.repeat(70));
console.log(`NORMALIZATION & TYPE AUDIT: ${allPassed ? 'ALL TESTS PASSED ✅' : 'FAILURES DETECTED ❌'}`);
console.log('='.repeat(70));

if (!allPassed) process.exit(1);
