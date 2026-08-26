import fs from 'fs';
import path from 'path';
import url from 'url';
import { TruthKernel } from '../../../packages/lyzer-constitution/src/eca/truthKernel.js';
import { ShadowLogger } from '../shadowLogger.js';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const edgeDir = path.resolve(__dirname, '../');
const DATA_DIR = path.join(edgeDir, '.data');
const LOG_FILE = path.join(process.cwd(), '.data', 'shadow_veto_ledger.jsonl');

async function main() {
  console.log("====================================================");
  console.log("🔥 INSTRUMENTATION SMOKE TEST (SHADOW LOGGER)");
  console.log("====================================================\n");

  if (fs.existsSync(LOG_FILE)) {
    fs.unlinkSync(LOG_FILE);
  }

  // Same configuration as StreamEngine
  const truthKernel = new TruthKernel({ 
    trgThreshold: 0.4, 
    consensusLimit: 0.8, 
    lhdsVetoLimit: 0.95, 
    ontologicalCollapseTrg: 0.7 
  });

  // Mock Providers
  const mockProviders = {
    v1: { direction: 'LONG', confidence: 100, isConsensus: false, trg: 0.8, signal: 1 },
    v2: { direction: 'LONG', confidence: 90, isConsensus: false, trg: 0.7, signal: 1 },
  };

  const testCases = [
    {
      name: "1. Ideal Trade (Should PASS)",
      symbol: "BTCUSDT",
      time: 1724544000000, // T0
      micro: {
        sma20DistancePct: 0.0005, // 0.05% (< 0.10%)
        atr14_pct: 0.0008, // 0.08% (< 0.12%)
        lhds: 0.1,
        regime: "TREND_BULL"
      }
    },
    {
      name: "2. Over-extended Trade (Should REJECT SMA)",
      symbol: "ETHUSDT",
      time: 1724544100000,
      micro: {
        sma20DistancePct: 0.0020, // 0.20% (> 0.10%)
        atr14_pct: 0.0008,
        lhds: 0.1,
        regime: "TREND_BULL"
      }
    },
    {
      name: "3. High Volatility Trade (Should REJECT ATR)",
      symbol: "ADAUSDT",
      time: 1724544200000,
      micro: {
        sma20DistancePct: 0.0005,
        atr14_pct: 0.0015, // 0.15% (> 0.12%)
        lhds: 0.1,
        regime: "HIGH_VOLATILITY"
      }
    },
    {
      name: "4. Duplicate Cluster Trade (Should REJECT/LOG as Duplicate)",
      symbol: "ADAUSDT",
      time: 1724544260000, // +1 min from previous
      micro: {
        sma20DistancePct: 0.0005,
        atr14_pct: 0.0015,
        lhds: 0.1,
        regime: "HIGH_VOLATILITY"
      }
    }
  ];

  for (const tc of testCases) {
    console.log(`Testing: ${tc.name}`);
    const kernelResult = truthKernel.evaluate(mockProviders, tc.micro);
    
    // Fire Shadow Logger
    ShadowLogger.logSignalOutcome(
      tc.symbol, 
      tc.time, 
      'LONG',
      50000, // mock price
      tc.micro,
      kernelResult
    );
    console.log(`Verdict: ${kernelResult.eef ? 'PASS' : 'VETO'} | Reason: ${kernelResult.reason_codes[0] || 'N/A'}\n`);
  }

  console.log("Checking resulting JSONL file...");
  const lines = fs.readFileSync(LOG_FILE, 'utf8').trim().split('\n');
  let md = `# 🔬 SMOKE TEST DE INSTRUMENTAÇÃO: Shadow Logger\n\n`;
  md += `**Objetivo:** Provar que a infraestrutura de telemetria captura sinais REJECT e PASS independentemente da execução, mantendo os campos solicitados, sem vazamentos e sem viés de otimização.\n\n`;
  
  md += `## 1. Verificação de Integridade dos Logs\n\n`;
  md += `Total de sinais registrados no arquivo: **${lines.length}**\n\n`;
  
  for (const line of lines) {
    const obj = JSON.parse(line);
    md += `### Sinal: \`${obj.trade_id}\`\n`;
    md += `- **Veredito do Veto:** \`${obj.veto_status}\`\n`;
    md += `- **Razão:** \`${obj.veto_reason}\`\n`;
    md += `- **SMA Distance:** \`${(obj.sma20_distance_pct*100).toFixed(2)}%\`\n`;
    md += `- **ATR:** \`${(obj.atr_pct*100).toFixed(2)}%\`\n`;
    md += `- **Estrutura Counterfactual:** MFE 5m/15m/30m/60m e PnL presentes? \`${obj.counterfactual.pnl_60m === null ? 'SIM (Aguardando resolução temporal)' : 'NÃO'}\`\n\n`;
  }
  
  const reportPath = path.join(edgeDir, 'experiment_3_5_smoke_test.md');
  fs.writeFileSync(reportPath, md);
  console.log(`Smoke test report written to ${reportPath}`);
}

main().catch(console.error);
