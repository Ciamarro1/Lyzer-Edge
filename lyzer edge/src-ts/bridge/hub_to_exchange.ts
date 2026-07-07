import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ExchangeExecution } from '../../backend/exchangeExecution.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logFile = path.resolve(__dirname, '../../../../lyzer edge/lyzer-workspace/lyzer-core-hub/hub_output.log');

const executor = new ExchangeExecution(null, null, true); // Mock Order

function startExecutionBridge() {
    console.log(`[EXECUTION BRIDGE] Tailing Rust Hub log: ${logFile}`);
    
    let isReadingJson = false;
    let jsonBuffer = '';
    let currentPosition = 0;

    // Ensure file exists
    if (!fs.existsSync(logFile)) {
        fs.writeFileSync(logFile, '');
    }

    // Set initial position to end of file
    currentPosition = fs.statSync(logFile).size;

    setInterval(() => {
        const stats = fs.statSync(logFile);
        if (stats.size > currentPosition) {
            const stream = fs.createReadStream(logFile, { start: currentPosition, end: stats.size });
            stream.on('data', async (chunk) => {
                const text = chunk.toString();
                process.stdout.write(text); // Mirror to stdout
                const lines = text.split('\n');
                
                for (const line of lines) {
                    if (line.includes('--- BEGIN ARTIFACT JSON ---')) {
                        isReadingJson = true;
                        jsonBuffer = '';
                        continue;
                    }
                    if (line.includes('--- END ARTIFACT JSON ---')) {
                        isReadingJson = false;
                        try {
                            const artifact = JSON.parse(jsonBuffer);
                            console.log("\n[EXECUTION BRIDGE] Valid Decision Artifact Parsed.");
                            if (artifact.execution && artifact.execution.action) {
                                const { action, symbol, quantity } = artifact.execution;
                                console.log(`[EXECUTION BRIDGE] Found Execution Trigger: ${action} ${quantity} ${symbol}`);
                                const result = await executor.placeOrder(symbol, action, 'MARKET', quantity);
                                console.log(`[EXECUTION BRIDGE] Order Placed:`, result);
                            }
                        } catch (e) {
                            console.error("[EXECUTION BRIDGE] JSON parse error:", e);
                        }
                        continue;
                    }
                    if (isReadingJson) {
                        jsonBuffer += line + '\n';
                    }
                }
            });
            currentPosition = stats.size;
        } else if (stats.size < currentPosition) {
            // File was truncated
            currentPosition = 0;
        }
    }, 500);
}

startExecutionBridge();
