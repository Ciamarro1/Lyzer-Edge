import WebSocket from 'ws';

export class SportsDataIngestor {
  constructor(apiKey = process.env.ODDS_API_KEY) {
    this.apiKey = apiKey;
    this.ws = null;
  }

  startWebSocket(callback) {
    if (!this.apiKey) {
      console.error('SportsDataIngestor: No API key provided');
      return;
    }

    const wsUrl = `wss://api.odds-api.io/v3/ws?apiKey=${this.apiKey}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.on('open', () => {
      console.log('SportsDataIngestor: WebSocket connected');
    });

    this.ws.on('message', (message) => {
      if (typeof callback === 'function') {
        callback(message);
      }
    });

    this.ws.on('error', (error) => {
      console.error('SportsDataIngestor WebSocket error:', error);
    });

    this.ws.on('close', () => {
      console.log('SportsDataIngestor: WebSocket disconnected');
    });
  }
}
