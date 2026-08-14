import http from 'http';
import WebSocket from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set mandatory environment variables
process.env.COURT_SECRET_KEY = process.env.COURT_SECRET_KEY || 'test_secret_key_for_verification_12345';
process.env.ARL_MODE = 'TESTNET';
process.env.PORT = process.env.PORT || '7860';

console.log('🚀 Starting Backend Engine Audit & Verification Test...');

try {
  // Import server.js (starts HTTP + WebSocket servers and StreamEngine fleet)
  await import('../../backend/server.js');
  console.log('✅ lyzer edge/backend/server.js imported and booted successfully!');
} catch (err) {
  console.error('❌ Fatal error importing server.js:', err);
  process.exit(1);
}

// Allow server & StreamEngines time to bind ports and set up
await new Promise(resolve => setTimeout(resolve, 3000));

const PORT = process.env.PORT || 7860;
const BASE_URL = `http://127.0.0.1:${PORT}`;

// 1. Verify HTTP REST Endpoints
const endpoints = [
  { path: '/healthz', expectedStatus: 200 },
  { path: '/readyz', expectedStatus: 200 },
  { path: '/api/status', expectedStatus: 200 },
  { path: '/api/experiments/dashboard', expectedStatus: 200 },
  { path: '/api/archeologist/dna', expectedStatus: 200 },
  { path: '/api/extinction/status', expectedStatus: 200 },
  { path: '/api/testnet-dashboard', expectedStatus: 200 },
];

let allPassed = true;

console.log('\n--- REST API ROUTE AUDIT ---');
for (const ep of endpoints) {
  try {
    const res = await fetch(`${BASE_URL}${ep.path}`);
    const text = await res.text();
    if (res.status === ep.expectedStatus) {
      console.log(`✅ [HTTP GET] ${ep.path} -> ${res.status} OK (${text.length} bytes)`);
    } else {
      console.error(`❌ [HTTP GET] ${ep.path} -> Expected ${ep.expectedStatus}, got ${res.status}`);
      allPassed = false;
    }
  } catch (err) {
    console.error(`❌ [HTTP GET] ${ep.path} failed: ${err.message}`);
    allPassed = false;
  }
}

// 2. Verify WebSocket Connection & Stream Engine Broadcasts
console.log('\n--- WEBSOCKET HANDLER & STREAMENGINE AUDIT ---');
console.log(`🔌 Connecting to ws://127.0.0.1:${PORT}...`);

await new Promise((resolve) => {
  const ws = new WebSocket(`ws://127.0.0.1:${PORT}`);
  let receivedMessage = false;

  const timer = setTimeout(() => {
    if (!receivedMessage) {
      console.error('❌ [WS] Timeout waiting for initial WS frame');
      allPassed = false;
    }
    ws.close();
    resolve();
  }, 4000);

  ws.on('open', () => {
    console.log('✅ [WS] Successfully connected to WebSocket server!');
  });

  ws.on('message', (data) => {
    receivedMessage = true;
    const msgSnippet = data.toString().substring(0, 120);
    console.log(`✅ [WS] Frame received: ${msgSnippet}...`);
    clearTimeout(timer);
    ws.close();
    resolve();
  });

  ws.on('error', (err) => {
    console.error(`❌ [WS] Connection error: ${err.message}`);
    allPassed = false;
    clearTimeout(timer);
    ws.close();
    resolve();
  });
});

console.log('\n======================================================');
if (allPassed) {
  console.log('🎉 BACKEND ENGINE AUDIT COMPLETE: ALL CHECKS PASSED!');
  console.log('STATUS: BACKEND_HEALTHY');
  process.exit(0);
} else {
  console.error('⚠️ BACKEND ENGINE AUDIT DETECTED ISSUES!');
  console.log('STATUS: BACKEND_ISSUES');
  process.exit(1);
}
