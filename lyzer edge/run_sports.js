import 'dotenv/config';
import { SportsEngine } from './backend/sports/sportsEngine.js';

console.log("==============================================");
console.log(" LYZER SPORTS EDITION - STARTING ENGINE ");
console.log("==============================================");

// If the user doesn't have a real API key, we use a fake one to test the connection attempt
if (!process.env.ODDS_API_KEY) {
    console.warn("WARNING: ODDS_API_KEY not found in .env. Using a dummy key for testing.");
    process.env.ODDS_API_KEY = "dummy_key_123";
}

const engine = new SportsEngine();
engine.startLiveMode();

console.log("Engine initialized. Awaiting market divergence signals...");
