#!/usr/bin/env node
/**
 * @fileoverview Lyzer Edge — Runtime Compliance & Boundary Verification
 *
 * This test suite enforces physical and logical separation of concerns.
 * It asserts boundary conditions, dependency injection, and schema locking.
 *
 * Exit Codes:
 *   0 = PASS (System compliant)
 *   1 = Runtime leak detected (RUNTIME_BLIND / NO_SCORE_WEIGHTS violation)
 *   2 = Config violation (FROZEN_CONFIG / SINGLE_AUTHORITY violation)
 *   3 = Kernel DI violation (KERNEL_DI violation)
 *   4 = Governance violation (GOVERNANCE_GUARD violation)
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runTests() {
  console.log('='.repeat(72));
  console.log('  LYZER CORE — BOUNDARY COMPLIANCE ENFORCEMENT ENGINE (v0.4 GATE)');
  console.log('='.repeat(72));

  // ── TEST 1 & 4: CONFIG VALIDATION (EXIT CODE 2) ──────────────────────────
  try {
    const configPath = path.join(__dirname, 'src', 'db', 'activeConfig.js');
    if (!fs.existsSync(configPath)) {
      throw new Error(`activeConfig.js file is missing at expected location: ${configPath}`);
    }

    const configModule = await import('./src/db/activeConfig.js');
    const { activeConfig } = configModule;

    // FROZEN_CONFIG
    console.log('[RUNNING] Test 1: FROZEN_CONFIG...');
    assert.strictEqual(Object.isFrozen(activeConfig), true, 'activeConfig must be frozen');

    let mutationThrown = false;
    try {
      activeConfig.confidenceThreshold = 99;
    } catch (e) {
      if (e instanceof TypeError) {
        mutationThrown = true;
      }
    }
    assert.strictEqual(mutationThrown, true, 'Mutating activeConfig must throw a TypeError in strict mode');
    console.log('  [PASS] FROZEN_CONFIG: Configuration is structurally frozen and immutable.');

    // SINGLE_AUTHORITY
    console.log('[RUNNING] Test 4: SINGLE_AUTHORITY...');
    const keys = Object.keys(activeConfig);
    assert.strictEqual(keys.length, 3, 'activeConfig must contain exactly 3 properties');
    assert.deepStrictEqual(keys.sort(), ['confidenceThreshold', 'validFrom', 'version'], 'Property schema mismatch');
    assert.strictEqual(typeof activeConfig.version, 'string', 'version must be a string');
    assert.strictEqual(typeof activeConfig.validFrom, 'string', 'validFrom must be a string');
    assert.strictEqual(typeof activeConfig.confidenceThreshold, 'number', 'confidenceThreshold must be a number');
    assert.ok(activeConfig.confidenceThreshold >= 45 && activeConfig.confidenceThreshold <= 85, 'confidenceThreshold falls outside acceptable bounds [45-85]');
    console.log('  [PASS] SINGLE_AUTHORITY: activeConfig schema validation passed.\n');

  } catch (err) {
    console.error('\n🔴 [FAIL] CONFIG/SCHEMA VIOLATION (EXIT CODE 2)');
    console.error(err.stack || err.message);
    process.exit(2);
  }

  // ── TEST 3: KERNEL DI VALIDATION (EXIT CODE 3) ───────────────────────────
  try {
    console.log('[RUNNING] Test 3: KERNEL_DI...');
    const kernelModule = await import('./src/engine/kernel.js');
    const { TruthKernel } = kernelModule;

    const defaultKernel = new TruthKernel();
    assert.strictEqual(defaultKernel.masterSwitchThreshold, 50, 'Fallback default threshold must be 50');

    const customKernel = new TruthKernel({ masterSwitchThreshold: 75 });
    assert.strictEqual(customKernel.masterSwitchThreshold, 75, 'TruthKernel failed to load injected threshold');

    const kernelPath = path.join(__dirname, 'src', 'engine', 'kernel.js');
    const kernelContent = fs.readFileSync(kernelPath, 'utf8');
    assert.strictEqual(kernelContent.includes('activeConfig.js'), false, 'TruthKernel must not import activeConfig.js directly');
    console.log('  [PASS] KERNEL_DI: TruthKernel conforms to clean constructor Dependency Injection.\n');

  } catch (err) {
    console.error('\n🔴 [FAIL] KERNEL DI VIOLATION (EXIT CODE 3)');
    console.error(err.stack || err.message);
    process.exit(3);
  }

  // ── TEST 2 & 5: RUNTIME BLINDNESS & NO LEAKS (EXIT CODE 1) ───────────────
  try {
    console.log('[RUNNING] Test 2: RUNTIME_BLIND...');
    const srcDir = path.join(__dirname, 'src');

    function stripComments(content) {
      return content
        .replace(/\/\*[\s\S]*?\*\//g, '')  // Remove multi-line comments
        .replace(/\/\/.*$/gm, '');         // Remove single-line comments
    }

    function getJsFiles(dir) {
      let results = [];
      const list = fs.readdirSync(dir);
      list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
          results = results.concat(getJsFiles(fullPath));
        } else if (file.endsWith('.js')) {
          results.push(fullPath);
        }
      });
      return results;
    }

    const jsFiles = getJsFiles(srcDir);

    jsFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      const cleanContent = stripComments(content);

      if (cleanContent.includes('verify_v02') || cleanContent.includes('verify_v03')) {
        throw new Error(`Boundary breach: File ${path.relative(__dirname, file)} references offline authority scripts.`);
      }
    });
    console.log('  [PASS] RUNTIME_BLIND: Core execution files contain no offline module links.');

    // NO_SCORE_WEIGHTS
    console.log('[RUNNING] Test 5: NO_SCORE_WEIGHTS...');
    const executionFiles = [
      'src/engine/kernel.js',
      'src/engine/sizing.js',
      'src/engine/signalEngine.js',
      'src/components/DecisionStream.js'
    ];

    const bannedTerms = ['SCORE_WEIGHTS', 'ConfigCandidate', 'tournament', 'fragilityIndex'];

    executionFiles.forEach(relPath => {
      const filePath = path.join(__dirname, relPath);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const cleanContent = stripComments(content);

        bannedTerms.forEach(term => {
          if (cleanContent.includes(term)) {
            throw new Error(`Optimization leak: Execution file ${relPath} contains optimizer term "${term}"`);
          }
        });
      }
    });
    console.log('  [PASS] NO_SCORE_WEIGHTS: Execution runtime is free of offline scoring properties.\n');

  } catch (err) {
    console.error('\n🔴 [FAIL] RUNTIME LEAK DETECTED (EXIT CODE 1)');
    console.error(err.stack || err.message);
    process.exit(1);
  }

  // ── TEST 6: GOVERNANCE GUARD (EXIT CODE 4) ───────────────────────────────
  try {
    console.log('[RUNNING] Test 6: GOVERNANCE_GUARD...');

    const configPath = path.join(__dirname, 'src', 'db', 'activeConfig.js');
    const originalConfigContent = fs.readFileSync(configPath, 'utf8');

    // Run verify_v02.js and check output
    const outputV2 = execSync('node verify_v02.js', {
      cwd: __dirname,
      env: { ...process.env, PATH: `C:\\Program Files\\nodejs;${process.env.PATH}` },
      encoding: 'utf8'
    });
    assert.ok(
      outputV2.includes('NO_CHANGE') || outputV2.includes('insufficient data'),
      'verify_v02.js did not log NO_CHANGE under baseline low-trade count conditions'
    );

    // Run verify_v03.js and check output
    const outputV3 = execSync('node verify_v03.js', {
      cwd: __dirname,
      env: { ...process.env, PATH: `C:\\Program Files\\nodejs;${process.env.PATH}` },
      encoding: 'utf8'
    });
    assert.ok(
      outputV3.includes('NO_CHANGE') || outputV3.includes('all candidates eliminated'),
      'verify_v03.js did not log NO_CHANGE under baseline low-trade count conditions'
    );

    const currentConfigContent = fs.readFileSync(configPath, 'utf8');
    assert.strictEqual(
      originalConfigContent,
      currentConfigContent,
      'activeConfig.js was modified by offline governance despite failing clamps'
    );

    console.log('  [PASS] GOVERNANCE_GUARD: Governance constraints correctly prevent config rewriting.\n');

  } catch (err) {
    console.error('\n🔴 [FAIL] GOVERNANCE VIOLATION (EXIT CODE 4)');
    console.error(err.stack || err.message);
    process.exit(4);
  }

  console.log('='.repeat(72));
  console.log('  🎉 ALL COMPLIANCE INVARIANTS SATISFIED (STATUS: SECURE)');
  console.log('='.repeat(72));
  process.exit(0);
}

runTests();
