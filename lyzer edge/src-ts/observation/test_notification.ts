import { NotificationLayer } from './notification_layer.js';
import * as path from 'path';
import * as fs from 'fs';

const workspaceRoot = process.cwd();
const dataDir = path.join(workspaceRoot, 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

console.log("=========================================");
console.log("   LYZER LABS - INFRASTRUCTURE TEST      ");
console.log("=========================================");

const testLogPath = path.join(dataDir, 'fiel_transition.log');
const testRecord = {
  timestamp: new Date().toISOString(),
  actor: "infrastructure_test",
  operation_attempted: "SMTP_VERIFICATION",
  observations_scope: ["OBS-TEST"],
  cao_violation_type: "NONE",
  solicited: true,
  event_type: "TEST_NOTIFICATION_EVENT"
};

// Create a temporary mock log just for this test
fs.writeFileSync(testLogPath, `[INFRA TEST] - TEST_NOTIFICATION_EVENT\n${JSON.stringify(testRecord, null, 2)}\n\n`);

const notificationLayer = new NotificationLayer();

console.log("[SYSTEM] Attempting to dispatch test email...");

notificationLayer.sendCSBAlert(workspaceRoot).then(() => {
    console.log("[SYSTEM] Infrastructure test completed.");
    console.log("=========================================");
    console.log("If you received the email, your SMTP configuration is verified.");
    console.log("You may now start the true CRS Engine.");
}).catch(e => {
    console.error("[SYSTEM] Test failed.", e);
});
