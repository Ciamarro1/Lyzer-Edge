import { FIELSensor } from './fiel_sensor.js';
import { PipelineStreamer } from './pipeline_streamer.js';
import { NotificationLayer } from './notification_layer.js';
import * as path from 'path';
import * as fs from 'fs';

const workspaceRoot = process.cwd();
const dataDir = path.join(workspaceRoot, 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Ensure clean logs for this session
fs.writeFileSync(path.join(dataDir, 'eml_stream.log'), '');
fs.writeFileSync(path.join(dataDir, 'fiel_transition.log'), '');

console.log("Initializing Continuous Reality Stress (CRS)...");

const fielSensor = new FIELSensor(workspaceRoot);
const streamer = new PipelineStreamer(fielSensor, workspaceRoot);
const notificationLayer = new NotificationLayer();

streamer.start();

// Operator Isolation Dashboard
const dashboardInterval = setInterval(async () => {
  console.clear();
  console.log("=========================================");
  console.log("       LYZER LABS - CRS TERMINAL       ");
  console.log("=========================================");
  console.log("Era: Continuous Reality Stress");
  console.log("Architecture: FROZEN");
  console.log("Learning: BLOCKED");
  console.log("-----------------------------------------");
  console.log(`Throughput (Obs Count): ${streamer.getThroughput()}`);
  console.log(`Interpretation Pressure (IP): 0`);
  console.log(`FIEL Status: ${fielSensor.hasFired ? 'FIRED (EMPIRICAL HALT)' : 'ARMED (ACTIVE)'}`);
  console.log("=========================================");
  
  if (fielSensor.hasFired) {
    clearInterval(dashboardInterval);
    console.log("\n[SYSTEM] Post-CSB Regime Entered. Stream empirically halted.");
    console.log("[SYSTEM] Check data/fiel_transition.log for details.");
    await notificationLayer.sendCSBAlert(workspaceRoot);
    process.exit(0);
  }
}, 500);

// Empirical Emergence Simulator
// Simulates the unpredictable nature of the CSB (1 in 100,000 chance per observation)
// On a VPS, this will run indefinitely until the probabilistic failure occurs.
const emergenceInterval = setInterval(() => {
  // We throttle the simulation slightly on TS to prevent instant CPU lock on infinite loops,
  // the streamer itself is doing 1 op/sec, so we check probability every 3 seconds.
  if (Math.floor(Math.random() * 100000) === 1) {
    clearInterval(emergenceInterval);
    const op = 'CORRELATE';
    const scope = ['OBS-0010', `OBS-${streamer.getThroughput().toString().padStart(4, '0')}`];
    
    console.log(`\n[SYSTEM] EMPIRICAL VIOLATION DETECTED: SPONTANEOUS CORRELATION ATTEMPT`);
    fielSensor.validateOperation(op, 'process_emergence', scope, 'EMPIRICAL', false);
  }
}, 3000);
