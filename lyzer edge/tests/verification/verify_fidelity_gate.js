import { StreamEngine } from '../../backend/streamEngine.js';

console.log('==================================================');
console.log('FINAL DEPLOYMENT FIDELITY GATE');
console.log('==================================================\n');

// Mock environment parameters for the test
process.env.AUTHORIZATION_STATE = 'AUTHORIZED';
process.env.AUTHORIZED_PROVIDER = 'REC_COMP_INSTITUTIONAL_v1';
process.env.MAX_DAILY_CAPITAL = '150000';

function runTest(name, configOverrides, expectedErrorPhrase) {
  process.stdout.write(`[GATE] ${name.padEnd(40)} `);
  try {
    const config = {
      symbol: 'BTCUSDT',
      interval: '1h',
      exitPolicy: 'DYNAMIC_TP',
      timeExitMinutes: 360,
      ...configOverrides
    };
    
    // Set matching env variables for the core parameters
    process.env.EXIT_POLICY = config.exitPolicy;
    process.env.TIME_EXIT_MINUTES = config.timeExitMinutes.toString();
    process.env.ATR_SL_MULTIPLIER = configOverrides.atrSl || '1.0';
    process.env.ATR_TP_MULTIPLIER = configOverrides.atrTp || '2.5';
    
    const engine = new StreamEngine(config);
    if (expectedErrorPhrase) {
      console.log(`❌ FAILED (Expected HALT, but system booted)`);
      return false;
    } else {
      console.log(`✅ PASS (Booted correctly)`);
      return true;
    }
  } catch (error) {
    if (expectedErrorPhrase && error.message.includes(expectedErrorPhrase)) {
      console.log(`✅ PASS (HALTED correctly: ${error.message})`);
      return true;
    } else {
      console.log(`❌ FAILED (Unexpected error: ${error.message})`);
      return false;
    }
  }
}

let passed = true;

passed &= runTest('Baseline (Perfect Institutional Settings)', {}, null);

passed &= runTest('Unauthorized Asset (ETHUSDT)', { symbol: 'ETHUSDT' }, 'Unauthorized Asset');

passed &= runTest('Unauthorized Timeframe (1m)', { interval: '1m' }, 'Unauthorized Timeframe');

passed &= runTest('Unauthorized Exit Policy (TIME only)', { exitPolicy: 'TIME' }, 'Unauthorized Exit Policy');

passed &= runTest('Unauthorized Time Exit (15 min)', { timeExitMinutes: 15 }, 'Unauthorized Time Exit');

passed &= runTest('Unauthorized SL (2.0)', { atrSl: '2.0' }, 'Unauthorized SL');

passed &= runTest('Unauthorized TP (3.0)', { atrTp: '3.0' }, 'Unauthorized TP');

console.log('\n==================================================');
if (passed) {
  console.log('✅ ALL FIDELITY GATES PASSED. RUNTIME CONTRACT IS UNBREAKABLE.');
} else {
  console.log('❌ FIDELITY GATES FAILED. DO NOT DEPLOY.');
}
console.log('==================================================');
