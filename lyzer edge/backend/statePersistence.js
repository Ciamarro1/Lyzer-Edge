import fs from 'fs';
import path from 'path';

const DATA_DIR = process.env.DATA_DIR || '/tmp/data';
const STATE_FILE = path.join(DATA_DIR, 'engine_state.json');

export function saveEngineState(engines) {
  try {
    const state = {};
    for (const engine of engines) {
      state[engine.symbol] = {
        activePosition: engine.activePosition,
        tradeHistory: engine.tradeHistory
      };
    }
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
    console.log('[PERSISTENCE] Engine state successfully saved to disk.');
  } catch (err) {
    console.error('[PERSISTENCE] Failed to save engine state:', err);
  }
}

export function loadEngineState(engines) {
  try {
    if (!fs.existsSync(STATE_FILE)) {
      console.log('[PERSISTENCE] No saved engine state found.');
      return;
    }
    const raw = fs.readFileSync(STATE_FILE, 'utf-8');
    const state = JSON.parse(raw);
    for (const engine of engines) {
      if (state[engine.symbol]) {
        const saved = state[engine.symbol];
        engine.activePosition = saved.activePosition || null;
        engine.tradeHistory = saved.tradeHistory || [];
      }
    }
  } catch (err) {
    console.error('[PERSISTENCE] Failed to load engine state:', err);
  }
}

export function clearEngineState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      fs.unlinkSync(STATE_FILE);
      console.log('[PERSISTENCE] Cleared engine_state.json from disk.');
    }
  } catch (err) {
    console.error('[PERSISTENCE] Failed to clear engine state:', err);
  }
}
