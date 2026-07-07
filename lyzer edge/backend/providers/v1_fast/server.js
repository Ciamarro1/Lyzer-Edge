import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import { arlEngineInstance, arl } from './streamEngine.js';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.get('/api/status', (req, res) => {
  res.json({ status: 'Lyzer Core Backend OK' });
});

app.get('/api/extinction/status', (req, res) => {
  res.json({
    state: arl.extinctionEngine.currentState,
    stress: arl.extinctionEngine.stressLevel,
    diversity: arl.extinctionEngine.metricsTracker.getDiversity()
  });
});

app.get('/api/extinction/logs', (req, res) => {
  res.json(arl.extinctionEngine.eventsLogger.getRecent());
});

app.get('/api/extinction/species', (req, res) => {
  res.json(arl.extinctionEngine.speciesManager.getSpeciesSummary(arl.population));
});

app.post('/api/extinction/trigger', (req, res) => {
  arl.extinctionEngine.triggerBlackSwan(arl.population);
  res.json({ status: 'BLACK_SWAN_SHOCK_TRIGGERED' });
});

let clients = [];

wss.on('connection', (ws) => {
  console.log('🟢 Frontend connected to WS');
  clients.push(ws);

  ws.on('close', () => {
    console.log('🔴 Frontend disconnected from WS');
    clients = clients.filter(c => c !== ws);
  });
});

import { sendInterpretationToHub } from './ipc_client.js';

// MAIN STREAM LOOP
arlEngineInstance.on('arl', (payload) => {
  const dataStr = JSON.stringify(payload);
  clients.forEach(ws => {
    if (ws.readyState === 1) { // OPEN
      ws.send(dataStr);
    }
  });

  // TRANSLATE LIVE PAYLOAD INTO INTERPRETATION RECORD (Phase 6)
  const interp = {
      observer: { Agent: "Provider-V1" },
      incentive_profile: {
          primary_mandate: "High-Frequency Volatility Extraction",
          constraints: ["Temporal < 50ms", "Drawdown < 0.5%"]
      },
      evidence_references: [`LIVE-EVID-${Date.now()}`],
      interpretation: `Market regime detected from payload: stressLevel=${payload.stressLevel || 0}`,
      justification: `Derived from live node.js stream event.`,
      confidence: 0.90 + (Math.random() * 0.1) // Random high confidence
  };
  
  sendInterpretationToHub(interp);
});

arlEngineInstance.start();

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`🔥 Lyzer Backend running on http://localhost:${PORT}`);
});
