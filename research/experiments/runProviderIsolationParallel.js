import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { fork } from 'child_process';
import os from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));

function runWorkerProcess(providerId, segment = 'is') {
  return new Promise((resolvePromise, rejectPromise) => {
    const workerScript = resolve(__dirname, 'providerWorker.js');
    const child = fork(workerScript, [], {
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      env: {
        ...process.env,
        NODE_OPTIONS: '--max-old-space-size=2048',
      }
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (line.includes('Progress:') || line.includes('Starting replay') || line.includes('Replay complete')) {
          console.log(`[${providerId.toUpperCase()}] ${line.trim()}`);
        }
      }
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('message', (msg) => {
      if (msg.success) {
        resolvePromise(msg.result);
      } else {
        rejectPromise(new Error(`Worker ${providerId} failed: ${msg.error}\n${msg.stack}`));
      }
    });

    child.on('exit', (code) => {
      if (code !== 0 && !stdout.includes('"name":')) {
        rejectPromise(new Error(`Worker ${providerId} exited with code ${code}.\nStderr: ${stderr}`));
      }
    });

    child.send({ providerId, segment });
  });
}

async function main() {
  const targetProviders = ['v2', 'v4', 'v5', 'v6', 'v7'];
  const segment = process.argv[2] || 'is';
  const cpus = os.cpus().length;

  console.log('='.repeat(70));
  console.log(`🚀 LYZER EDGE — PARALLEL PROVIDER ISOLATION EXPERIMENT (EXP-001)`);
  console.log(`Available CPUs: ${cpus} | Segment: ${segment.toUpperCase()} | Providers: ${targetProviders.join(', ').toUpperCase()}`);
  console.log('='.repeat(70));

  const t0 = performance.now();

  // Run all providers concurrently
  const promises = targetProviders.map(p => runWorkerProcess(p, segment));
  const results = await Promise.all(promises);

  const t1 = performance.now();
  const totalSec = (t1 - t0) / 1000;
  const totalCandles = results.reduce((acc, r) => acc + (r.candlesProcessed || 0), 0);
  const aggregateThroughput = totalCandles / totalSec;

  console.log('\n' + '='.repeat(70));
  console.log('📊 EXPERIMENT EXP-PROVIDER-ISOLATION-001 PARALLEL RESULTS SUMMARY');
  console.log('='.repeat(70));

  for (const r of results) {
    console.log(`\n--- PROVIDER ${r.name} ---`);
    console.log(`Trades: ${r.metrics.trades} | Win Rate: ${r.metrics.winRate}%`);
    console.log(`Net PnL: $${r.metrics.netPnL} | Profit Factor: ${r.metrics.profitFactor}`);
    console.log(`Expectancy: $${r.metrics.expectancy} | Max DD: $${r.metrics.maxDrawdown}`);
    console.log(`Duration: ${(r.runtimeMs / 1000).toFixed(1)}s | Candles: ${r.candlesProcessed}`);
    console.log(`Report: ${r.path}`);
  }

  console.log('\n' + '='.repeat(70));
  console.log(`⏱️  ALL 5 PROVIDERS COMPLETED CONCURRENTLY IN: ${totalSec.toFixed(2)}s`);
  console.log(`📈 AGGREGATE THROUGHPUT: ${aggregateThroughput.toFixed(2)} candles/sec`);
  console.log(`🎯 SPEEDUP OVER ORIGINAL BASELINE (2226s): ${(2226 / totalSec).toFixed(1)}x faster!`);
  console.log('='.repeat(70));
}

main().catch(err => {
  console.error(`\n❌ Fatal error in parallel experiment runner:`, err);
  process.exit(1);
});
