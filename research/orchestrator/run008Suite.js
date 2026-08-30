import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import crypto from 'crypto';
import { performance } from 'perf_hooks';
import { FROZEN_V5_CONFIG, FROZEN_CONFIG_HASH } from './frozenConfig.js';
import { runReconciliationTask } from './workers/reconciliationWorker.js';
import { getDatasetSnapshot } from './datasetSnapshot.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function getFileSha256(filePath) {
  if (!existsSync(filePath)) return 'FILE_NOT_FOUND';
  return crypto.createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

// ============================================================================
// BATCH 008 SUITE ORCHESTRATOR
// Executes 008A (Structural Exits) and 008B (DipBuy Formalization) in sequence
// with pre/post Track A integrity verification.
// ============================================================================

async function runBatch008Suite() {
  const suiteStart = performance.now();
  const timestamp = new Date().toISOString();

  console.log('═'.repeat(110));
  console.log('  🏛️ LYZER EDGE — BATCH 008 SUITE ORCHESTRATOR');
  console.log('  Data: ' + timestamp);
  console.log('  Mandato: Suite Completa 008A (V8.0 Structural Exits) + 008B (V8.1 DipBuy Formalization)');
  console.log('  Isolamento: Experimentos estatisticamente independentes — zero vazamento de informação');
  console.log('═'.repeat(110));

  // ========================================================================
  // [PRE-SUITE GATE 0] DATASET & TRACK A INTEGRITY
  // ========================================================================
  console.log('\n▸ [PRE-SUITE GATE 0] DATASET & TRACK A INTEGRITY VERIFICATION');
  console.log('─'.repeat(110));

  const { candles, funding, hashes } = getDatasetSnapshot();
  const expectedDatasetHash = '9d20a9a9754ee34171ef79653dff6dc0bd5d411dcfcc5337c655b80969d49299';

  if (hashes.candles1hSha256 !== expectedDatasetHash) {
    console.error('🔴 FATAL: Dataset SHA-256 mismatch. Aborting suite.');
    process.exit(1);
  }
  console.log(`   ✅ Dataset SHA-256: ${hashes.candles1hSha256.slice(0, 16)}... (${hashes.candleCount} candles)`);

  const frozenConfigPath = resolve(__dirname, 'frozenConfig.js');
  const lockboxPath = resolve(__dirname, '../results/v5_confirmatory/V5_SHADOW_LOCKBOX.json');
  const preConfigHash = getFileSha256(frozenConfigPath);
  const preLockboxHash = getFileSha256(lockboxPath);

  console.log(`   ✅ Frozen Config SHA-256: ${preConfigHash.slice(0, 16)}...`);
  console.log(`   ✅ Shadow Lockbox SHA-256: ${preLockboxHash.slice(0, 16)}...`);
  console.log(`   ✅ FROZEN_CONFIG_HASH: ${FROZEN_CONFIG_HASH.slice(0, 16)}...`);

  const preReconciliation = await runReconciliationTask();
  if (!preReconciliation || preReconciliation.gateA_AccountingStatus !== 'PASS') {
    console.error('🔴 FATAL: Track A reconciliation failed pre-suite. Aborting.');
    process.exit(1);
  }
  console.log(`   ✅ Track A Replay: N=${preReconciliation.totals.n}, Net $${preReconciliation.totals.netPnL.toFixed(2)}, PF ${preReconciliation.totals.netProfitFactor.toFixed(2)}`);


  // ========================================================================
  // [PHASE 1] EXECUTE BATCH 008A — V8.0 STRUCTURAL EXITS
  // ========================================================================
  console.log('\n' + '═'.repeat(110));
  console.log('  ▸ [PHASE 1] EXECUTING BATCH 008A — V8.0 STRUCTURAL EXITS');
  console.log('═'.repeat(110));

  let result008A = { status: 'NOT_RUN', error: null };
  try {
    const mod008A = await import('./batch008AStructuralExits.js');
    if (typeof mod008A.runBatch008AStructuralExits === 'function') {
      const res = await mod008A.runBatch008AStructuralExits();
      result008A = res || { status: 'COMPLETED' };
    } else {
      // Script runs on import (self-executing)
      result008A = { status: 'COMPLETED_ON_IMPORT' };
    }
    console.log('   ✅ Batch 008A completed successfully.');
  } catch (err) {
    console.error('   🔴 Batch 008A FAILED:', err.message);
    result008A = { status: 'FAILED', error: err.message };
  }

  // Verify Track A integrity between experiments
  console.log('\n▸ [INTER-EXPERIMENT INTEGRITY CHECK]');
  const midConfigHash = getFileSha256(frozenConfigPath);
  const midLockboxHash = getFileSha256(lockboxPath);
  if (midConfigHash !== preConfigHash || midLockboxHash !== preLockboxHash) {
    console.error('🔴 FATAL: Track A contaminated after 008A. Aborting 008B.');
    process.exit(1);
  }
  console.log('   ✅ Track A integrity preserved between experiments.');

  // ========================================================================
  // [PHASE 2] EXECUTE BATCH 008B — V8.1 DIPBUY FORMALIZATION
  // ========================================================================
  console.log('\n' + '═'.repeat(110));
  console.log('  ▸ [PHASE 2] EXECUTING BATCH 008B — V8.1 DIPBUY FORMALIZATION');
  console.log('═'.repeat(110));

  let result008B = { status: 'NOT_RUN', error: null };
  try {
    const mod008B = await import('./batch008BDipBuyFormalization.js');
    if (typeof mod008B.runBatch008BDipBuyFormalization === 'function') {
      const res = await mod008B.runBatch008BDipBuyFormalization();
      result008B = res || { status: 'COMPLETED' };
    } else {
      result008B = { status: 'COMPLETED_ON_IMPORT' };
    }
    console.log('   ✅ Batch 008B completed successfully.');
  } catch (err) {
    console.error('   🔴 Batch 008B FAILED:', err.message);
    result008B = { status: 'FAILED', error: err.message };
  }

  // ========================================================================
  // [POST-SUITE GATE] FINAL TRACK A RE-AUDIT
  // ========================================================================
  console.log('\n▸ [POST-SUITE GATE] FINAL TRACK A RE-AUDIT');
  console.log('─'.repeat(110));

  const postConfigHash = getFileSha256(frozenConfigPath);
  const postLockboxHash = getFileSha256(lockboxPath);
  const postReconciliation = await runReconciliationTask();

  const trackAIntact =
    postConfigHash === preConfigHash &&
    postLockboxHash === preLockboxHash &&
    postReconciliation.gateA_AccountingStatus === 'PASS';

  console.log(`   ${trackAIntact ? '✅' : '🔴'} Frozen Config SHA-256: ${postConfigHash === preConfigHash ? 'MATCH' : 'MISMATCH'}`);
  console.log(`   ${trackAIntact ? '✅' : '🔴'} Shadow Lockbox SHA-256: ${postLockboxHash === preLockboxHash ? 'MATCH' : 'MISMATCH'}`);
  console.log(`   ${trackAIntact ? '✅' : '🔴'} Track A Replay: N=${postReconciliation.totals.n}, Net $${postReconciliation.totals.netPnL.toFixed(2)}, PF ${postReconciliation.totals.netProfitFactor.toFixed(2)}`);


  // ========================================================================
  // [SUITE SUMMARY] GENERATE CONSOLIDATED REPORT
  // ========================================================================
  const suiteElapsed = ((performance.now() - suiteStart) / 1000).toFixed(2);

  const summaryReport = `# 🏛️ LYZER EDGE — BATCH 008 SUITE SUMMARY

**Data de Execução:** ${timestamp}
**Tempo Total da Suite:** ${suiteElapsed} s
**Dataset SHA-256:** \`${hashes.candles1hSha256}\`

---

## RESULTADOS DA SUITE

| Experimento | Status | Relatório | Manifesto |
|:---|:---:|:---|:---|
| **008A — V8.0 Structural Exits** | ${result008A.status === 'COMPLETED' || result008A.status === 'COMPLETED_ON_IMPORT' ? '🟢 CONCLUÍDO' : '🔴 FALHOU'} | BATCH_008A_STRUCTURAL_EXITS_REPORT.md | BATCH_008A_STRUCTURAL_EXITS_MANIFEST.json |
| **008B — V8.1 DipBuy Formalization** | ${result008B.status === 'COMPLETED' || result008B.status === 'COMPLETED_ON_IMPORT' ? '🟢 CONCLUÍDO' : '🔴 FALHOU'} | BATCH_008B_DIPBUY_FORMALIZATION_REPORT.md | BATCH_008B_DIPBUY_FORMALIZATION_MANIFEST.json |

---

## INTEGRIDADE DO TRACK A

| Verificação | Pré-Suite | Inter-Experimento | Pós-Suite |
|:---|:---:|:---:|:---:|
| **Frozen Config SHA-256** | ✅ | ✅ | ${postConfigHash === preConfigHash ? '✅' : '🔴'} |
| **Shadow Lockbox SHA-256** | ✅ | ✅ | ${postLockboxHash === preLockboxHash ? '✅' : '🔴'} |
| **Track A Replay (N=25)** | ✅ PF ${preReconciliation.totals.netProfitFactor.toFixed(2)} | — | ${postReconciliation.gateA_AccountingStatus === 'PASS' ? '✅' : '🔴'} PF ${postReconciliation.totals.netProfitFactor.toFixed(2)} |

**Veredito de Isolamento:** ${trackAIntact ? '🟢 TRACK A 100% INTOCADO — Zero contaminação experimental' : '🔴 TRACK A COMPROMETIDO — AÇÃO IMEDIATA NECESSÁRIA'}

---

## ISOLAMENTO ESTATÍSTICO

\`\`\`text
008A e 008B são experimentos estatisticamente independentes.
Nenhum resultado, threshold ou parâmetro de um foi usado para calibrar o outro.
Cada script carregou o dataset de forma independente, executou seus próprios gates,
e gerou seu próprio manifesto JSON + relatório markdown.
Execução sequencial (não paralela) para evitar contaminação de memória compartilhada.
\`\`\`

${result008A.error ? `\n### ⚠️ ERRO 008A\n\`\`\`\n${result008A.error}\n\`\`\`\n` : ''}
${result008B.error ? `\n### ⚠️ ERRO 008B\n\`\`\`\n${result008B.error}\n\`\`\`\n` : ''}
`;

  const resultsDir = resolve(__dirname, '../results/v5_confirmatory');
  if (!existsSync(resultsDir)) mkdirSync(resultsDir, { recursive: true });

  writeFileSync(resolve(resultsDir, 'BATCH_008_SUITE_SUMMARY.md'), summaryReport);
  writeFileSync(resolve(resultsDir, 'BATCH_008_SUITE_MANIFEST.json'), JSON.stringify({
    suiteTimestamp: timestamp,
    suiteElapsedSec: Number(suiteElapsed),
    datasetSha256: hashes.candles1hSha256,
    result008A: { status: result008A.status, error: result008A.error || null },
    result008B: { status: result008B.status, error: result008B.error || null },
    trackAIntegrity: {
      preConfigHash,
      postConfigHash,
      configMatch: postConfigHash === preConfigHash,
      preLockboxHash,
      postLockboxHash,
      lockboxMatch: postLockboxHash === preLockboxHash,
      preReconciliation: { nTrades: preReconciliation.totals.n, netPnl: preReconciliation.totals.netPnL, pf: preReconciliation.totals.netProfitFactor },
      postReconciliation: { nTrades: postReconciliation.totals.n, netPnl: postReconciliation.totals.netPnL, pf: postReconciliation.totals.netProfitFactor },

      overallIntact: trackAIntact
    }
  }, null, 2));

  console.log('\n' + '═'.repeat(110));
  console.log(`  🏛️ BATCH 008 SUITE COMPLETE — ${suiteElapsed}s`);
  console.log(`  008A: ${result008A.status} | 008B: ${result008B.status}`);
  console.log(`  Track A: ${trackAIntact ? '🟢 INTACT' : '🔴 COMPROMISED'}`);
  console.log('═'.repeat(110));

  return {
    result008A,
    result008B,
    trackAIntact,
    suiteElapsedSec: Number(suiteElapsed)
  };
}

runBatch008Suite().catch(err => {
  console.error('FATAL SUITE ERROR:', err);
  process.exit(1);
});
