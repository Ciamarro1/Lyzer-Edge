import { patternRecognitionManifest } from './manifest.js';
import { getAllTrades, getMarketContext, createTrade, setMarketContext } from '../../../../db/queries.js';
import { TRADE_STATUS, TRADE_RESULT } from '../../../../db/database.js';
import db from '../../../../db/database.js';

export class PatternRecognitionWidget {
  constructor() {
    this.manifest = patternRecognitionManifest;
    this._container = null;
    this._runtime = null;
    this._disposed = false;
    this.patterns = [];
    this.alphaClusters = [];
    this.toxicSignatures = [];

    this.injectMockData = this.injectMockData.bind(this);
    this.purgeDatabase = this.purgeDatabase.bind(this);
  }

  async mount(container, runtime) {
    this._container = container;
    this._runtime = runtime;
    this._container.style.width = '100%';
    this._container.style.height = '100%';
    this._container.style.overflowY = 'auto';
    this._container.style.padding = '20px';
    this._container.style.background = 'rgba(4, 6, 14, 0.95)';
    this._container.style.color = '#f8fafc';
    this._container.style.fontFamily = "'Inter', system-ui, -apple-system, sans-serif";

    this._injectStyles();
    await this.refresh();
  }

  _injectStyles() {
    if (document.getElementById('pattern-recognition-widget-styles')) return;
    const style = document.createElement('style');
    style.id = 'pattern-recognition-widget-styles';
    style.textContent = `
      .pr-container { max-width: 1400px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px; }
      .pr-header { display: flex; justify-content: space-between; align-items: center; background: rgba(6, 10, 22, 0.4); backdrop-filter: blur(28px) saturate(1.8); -webkit-backdrop-filter: blur(28px) saturate(1.8); border: 1px solid rgba(0, 243, 255, 0.2); border-radius: 16px; padding: 18px 24px; box-shadow: 0 15px 40px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.15); }
      .pr-title { font-size: 16px; font-weight: 800; color: #f8fafc; display: flex; align-items: center; gap: 10px; }
      .pr-sub { font-size: 10px; color: #94a3b8; font-family: 'JetBrains Mono', monospace; }
      .pr-btn { padding: 8px 16px; border-radius: 10px; font-size: 10px; font-weight: 800; cursor: pointer; transition: all 0.25s; font-family: 'JetBrains Mono', monospace; }
      .pr-btn-mock { background: linear-gradient(135deg, rgba(0, 243, 255, 0.15), rgba(0, 255, 157, 0.1)); border: 1px solid rgba(0, 243, 255, 0.35); color: #00f3ff; box-shadow: 0 4px 15px rgba(0,243,255,0.15); }
      .pr-btn-mock:hover { background: linear-gradient(135deg, rgba(0, 243, 255, 0.3), rgba(0, 255, 157, 0.2)); transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0,243,255,0.3); }
      .pr-btn-purge { background: linear-gradient(135deg, rgba(255, 51, 102, 0.15), rgba(239, 68, 68, 0.1)); border: 1px solid rgba(255, 51, 102, 0.35); color: #ff3366; box-shadow: 0 4px 15px rgba(255,51,102,0.15); }
      .pr-btn-purge:hover { background: linear-gradient(135deg, rgba(255, 51, 102, 0.3), rgba(239, 68, 68, 0.2)); transform: translateY(-2px); box-shadow: 0 8px 25px rgba(255,51,102,0.3); }
      .pr-grid-clusters { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
      .pr-panel { background: rgba(6, 10, 22, 0.4); backdrop-filter: blur(28px) saturate(1.8); -webkit-backdrop-filter: blur(28px) saturate(1.8); border: 1px solid rgba(0, 243, 255, 0.18); border-radius: 16px; padding: 22px; box-shadow: 0 20px 50px rgba(0,0,0,0.65), 0 0 25px rgba(0, 243, 255, 0.08), inset 0 1px 1px rgba(255,255,255,0.15); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
      .pr-panel:hover { border-color: rgba(0, 243, 255, 0.35); box-shadow: 0 25px 60px rgba(0,0,0,0.7), 0 0 35px rgba(0, 243, 255, 0.15); }
      .pr-panel-title { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 18px; font-family: 'JetBrains Mono', monospace; display: flex; align-items: center; justify-content: space-between; }
      .pr-cluster-card { background: rgba(10, 16, 32, 0.45); border-radius: 12px; padding: 16px; margin-bottom: 12px; border-left: 4px solid #00ff9d; border-top: 1px solid rgba(255,255,255,0.1); box-shadow: 0 10px 25px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
      .pr-cluster-card:hover { transform: translateY(-2px) scale(1.01); border-left-color: #00ff9d; box-shadow: 0 15px 35px rgba(0,0,0,0.6), 0 0 20px rgba(0,255,157,0.2); }
      .pr-toxic-card { background: rgba(10, 16, 32, 0.45); border-radius: 12px; padding: 16px; margin-bottom: 12px; border-left: 4px solid #ff3366; border-top: 1px solid rgba(255,255,255,0.1); box-shadow: 0 10px 25px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
      .pr-toxic-card:hover { transform: translateY(-2px) scale(1.01); border-left-color: #ff3366; box-shadow: 0 15px 35px rgba(0,0,0,0.6), 0 0 20px rgba(255,51,102,0.2); }
      .pr-sig-title { font-size: 12px; font-weight: 800; color: #f1f5f9; font-family: 'JetBrains Mono', monospace; }
      .pr-sig-stats { font-size: 10px; color: #94a3b8; margin-top: 6px; display: flex; justify-content: space-between; font-family: 'JetBrains Mono', monospace; }
      .pr-table { width: 100%; border-collapse: collapse; font-family: 'JetBrains Mono', monospace; font-size: 11px; margin-top: 10px; }
      .pr-table th { text-align: left; padding: 8px 12px; color: #64748b; font-size: 9px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid rgba(56,189,248,0.1); }
      .pr-table td { padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.02); color: #f1f5f9; }
      .pr-table tr:hover td { background: rgba(56, 189, 248, 0.04); }
    `;
    document.head.appendChild(style);
  }

  async refresh() {
    await this.analyzePatterns();
    this.render();
  }

  async analyzePatterns() {
    let trades = [];
    try {
      trades = await getAllTrades({ status: TRADE_STATUS.CLOSED });
    } catch(e) {}
    
    const patternMap = {};
    for (const trade of trades) {
      let context = null;
      try { context = await getMarketContext(trade.id); } catch(e){}
      const session = context?.session || 'New York';
      const mktState = context?.marketState || 'Trending';
      const direction = trade.direction ? trade.direction.toUpperCase() : 'LONG';
      const signature = `${direction} | ${session} | ${mktState}`;
      
      if (!patternMap[signature]) {
        patternMap[signature] = { signature, count: 0, wins: 0, losses: 0, totalPnL: 0, direction, session, mktState };
      }
      patternMap[signature].count += 1;
      patternMap[signature].totalPnL += trade.pnl || 0;
      if (trade.result === TRADE_RESULT.WIN || trade.pnl > 0) patternMap[signature].wins += 1;
      else patternMap[signature].losses += 1;
    }

    this.patterns = Object.values(patternMap).map(p => {
      p.winRate = p.count > 0 ? (p.wins / p.count) * 100 : 0;
      return p;
    });

    // If DB is empty, fill with synthetic patterns for immediate visual mining
    if (this.patterns.length === 0) {
      this.patterns = this._generateSyntheticPatterns();
    }

    this.alphaClusters = this.patterns.filter(p => p.totalPnL > 0).sort((a, b) => b.winRate - a.winRate).slice(0, 3);
    this.toxicSignatures = this.patterns.filter(p => p.totalPnL < 0).sort((a, b) => a.winRate - b.winRate).slice(0, 3);
  }

  _generateSyntheticPatterns() {
    return [
      { signature: 'LONG | New York | Trending', count: 18, wins: 15, losses: 3, totalPnL: 2450.00, winRate: 83.3, direction: 'LONG', session: 'New York', mktState: 'Trending' },
      { signature: 'SHORT | London | Breakout', count: 14, wins: 11, losses: 3, totalPnL: 1820.50, winRate: 78.6, direction: 'SHORT', session: 'London', mktState: 'Breakout' },
      { signature: 'LONG | Asia | Liquidity Sweep', count: 9, wins: 7, losses: 2, totalPnL: 940.00, winRate: 77.7, direction: 'LONG', session: 'Asia', mktState: 'Liquidity Sweep' },
      { signature: 'SHORT | Asia | Ranging', count: 12, wins: 2, losses: 10, totalPnL: -1280.00, winRate: 16.6, direction: 'SHORT', session: 'Asia', mktState: 'Ranging' },
      { signature: 'LONG | London | High Volatility', count: 10, wins: 3, losses: 7, totalPnL: -890.00, winRate: 30.0, direction: 'LONG', session: 'London', mktState: 'High Volatility' }
    ];
  }

  async injectMockData() {
    try {
      const sessions = ['London', 'New York', 'Asia'];
      const states = ['Trending', 'Ranging', 'Volatile'];
      const directions = ['long', 'short'];
      
      for (let i = 0; i < 50; i++) {
        const direction = directions[Math.floor(Math.random() * directions.length)];
        const isWin = Math.random() > 0.45;
        const session = sessions[Math.floor(Math.random() * sessions.length)];
        const state = states[Math.floor(Math.random() * states.length)];
        let forcedWin = direction === 'long' && session === 'New York' && state === 'Trending' ? Math.random() > 0.15 : isWin;
        const pnl = forcedWin ? (Math.random() * 200 + 50) : -(Math.random() * 150 + 50);

        try {
          const tradeId = await createTrade({ symbol: 'BTCUSDT', direction, entryPrice: 65000, positionSize: 1, status: TRADE_STATUS.CLOSED });
          await db.trades.update(tradeId, { status: TRADE_STATUS.CLOSED, result: forcedWin ? TRADE_RESULT.WIN : TRADE_RESULT.LOSS, pnl });
          await setMarketContext(tradeId, { session, marketState: state });
        } catch(e){}
      }
      await this.refresh();
    } catch(err) {
      console.error(err);
    }
  }

  async purgeDatabase() {
    if (confirm("Purge local trades database?")) {
      try {
        await db.transaction('rw', [db.trades, db.tradeEvents, db.marketContext], async () => {
          await db.trades.clear();
          await db.tradeEvents.clear();
          await db.marketContext.clear();
        });
        await this.refresh();
      } catch(err) {
        console.error(err);
      }
    }
  }

  render() {
    if (!this._container) return;

    this._container.innerHTML = `
      <div class="pr-container">
        <!-- Header -->
        <div class="pr-header">
          <div>
            <div class="pr-title">
              PATTERN RECOGNITION & EPISTEMIC ANOMALY HUNTER
            </div>
            <div class="pr-sub">Automated cluster discovery, high-win alpha signatures, and toxic setup isolation</div>
          </div>
          <div style="display: flex; gap: 10px;">
            <button class="pr-btn pr-btn-mock" id="pr-inject-btn">INJECT 50 MOCK TRADES</button>
            <button class="pr-btn pr-btn-purge" id="pr-purge-btn">PURGE DB</button>
          </div>
        </div>

        <!-- Clusters & Signatures Grid -->
        <div class="pr-grid-clusters">
          <!-- Top Alpha Clusters -->
          <div class="pr-panel">
            <div class="pr-panel-title" style="color: #34d399;">
              <span>TOP ALPHA CLUSTERS</span>
              <span style="font-size: 9px; color: #94a3b8;">High Expectancy Patterns</span>
            </div>
            ${this.alphaClusters.map(a => `
              <div class="pr-cluster-card">
                <div class="pr-sig-title">${a.signature}</div>
                <div class="pr-sig-stats">
                  <span>Sample: <strong>${a.count} trades</strong></span>
                  <span>Win Rate: <strong style="color: #34d399;">${a.winRate.toFixed(1)}%</strong></span>
                  <span>Net PnL: <strong style="color: #34d399;">+$${a.totalPnL.toFixed(2)}</strong></span>
                </div>
              </div>
            `).join('')}
          </div>

          <!-- Toxic Signatures -->
          <div class="pr-panel">
            <div class="pr-panel-title" style="color: #f87171;">
              <span>TOXIC SIGNATURES</span>
              <span style="font-size: 9px; color: #94a3b8;">High Veto & Loss Risk</span>
            </div>
            ${this.toxicSignatures.map(t => `
              <div class="pr-toxic-card">
                <div class="pr-sig-title">${t.signature}</div>
                <div class="pr-sig-stats">
                  <span>Sample: <strong>${t.count} trades</strong></span>
                  <span>Win Rate: <strong style="color: #f87171;">${t.winRate.toFixed(1)}%</strong></span>
                  <span>Net PnL: <strong style="color: #f87171;">-$${Math.abs(t.totalPnL).toFixed(2)}</strong></span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Full Patterns Matrix Table -->
        <div class="pr-panel">
          <div class="pr-panel-title" style="color: #38bdf8;">
            <span>EPISTEMIC PATTERNS & MARKET CONTEXT MATRIX</span>
            <span style="color: #94a3b8; font-size: 9px;">${this.patterns.length} Signatures Identified</span>
          </div>
          <table class="pr-table">
            <thead>
              <tr>
                <th>Signature Pattern</th>
                <th>Direction</th>
                <th>Session</th>
                <th>Market State</th>
                <th>Executions</th>
                <th>Win %</th>
                <th>Net PnL ($)</th>
              </tr>
            </thead>
            <tbody>
              ${this.patterns.map(p => `
                <tr>
                  <td style="font-weight: 800; color: #f8fafc;">${p.signature}</td>
                  <td><span style="color: ${p.direction === 'LONG' ? '#34d399' : '#f87171'}; font-weight: 700;">${p.direction}</span></td>
                  <td>${p.session}</td>
                  <td>${p.mktState}</td>
                  <td>${p.count}</td>
                  <td style="color: ${p.winRate >= 50 ? '#34d399' : '#f87171'}; font-weight: 700;">${p.winRate.toFixed(1)}%</td>
                  <td style="color: ${p.totalPnL >= 0 ? '#34d399' : '#f87171'}; font-weight: 700;">$${p.totalPnL.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    this._container.querySelector('#pr-inject-btn')?.addEventListener('click', async () => {
      await this.injectMockData();
    });
    this._container.querySelector('#pr-purge-btn')?.addEventListener('click', async () => {
      await this.purgeDatabase();
    });
  }

  dispose() {
    this._disposed = true;
    if (this._container) { this._container.innerHTML = ''; this._container = null; }
    this._runtime = null;
  }

  unmount() { this.dispose(); }
}
