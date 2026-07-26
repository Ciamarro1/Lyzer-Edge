import { getAllTrades, getMarketContext, createTrade, setMarketContext } from '../db/queries.js';
import { TRADE_STATUS, TRADE_RESULT } from '../db/database.js';
import db from '../db/database.js';

export class PatternRecognitionView {
  constructor() {
    this._container = null;
    this.patterns = [];
    this.alphaClusters = [];
    this.toxicSignatures = [];
    
    // Bind methods
    this.injectMockData = this.injectMockData.bind(this);
    this.purgeDatabase = this.purgeDatabase.bind(this);
    this.refresh = this.refresh.bind(this);
  }

  async mount(container) {
    this._container = container;
    await this.refresh();
  }

  async refresh() {
    await this.analyzePatterns();
    this.render();
  }

  async analyzePatterns() {
    // 1. Fetch all closed trades
    const trades = await getAllTrades({ status: TRADE_STATUS.CLOSED });
    
    // 2. Fetch market context for all
    const patternMap = {};
    
    for (const trade of trades) {
      const context = await getMarketContext(trade.id);
      if (!context) continue;

      // Create a pattern signature: Direction + Session + Market State
      const session = context.session || 'Unknown Session';
      const mktState = context.marketState || 'Unknown State';
      const direction = trade.direction ? trade.direction.toUpperCase() : 'UNKNOWN';
      
      const signature = `${direction} | ${session} | ${mktState}`;
      
      if (!patternMap[signature]) {
        patternMap[signature] = {
          signature,
          count: 0,
          wins: 0,
          losses: 0,
          totalPnL: 0,
          direction,
          session,
          mktState
        };
      }
      
      patternMap[signature].count += 1;
      patternMap[signature].totalPnL += trade.pnl || 0;
      
      if (trade.result === TRADE_RESULT.WIN) patternMap[signature].wins += 1;
      if (trade.result === TRADE_RESULT.LOSS) patternMap[signature].losses += 1;
    }

    // 3. Calculate Win Rates and sort
    this.patterns = Object.values(patternMap).map(p => {
      p.winRate = p.count > 0 ? (p.wins / p.count) * 100 : 0;
      return p;
    });

    // 4. Extract Top Alpha Clusters (High Win Rate + Positive PnL, min 3 trades)
    this.alphaClusters = this.patterns
      .filter(p => p.count >= 3 && p.totalPnL > 0)
      .sort((a, b) => b.winRate - a.winRate)
      .slice(0, 3);

    // 5. Extract Toxic Signatures (High Loss Rate + Negative PnL, min 3 trades)
    this.toxicSignatures = this.patterns
      .filter(p => p.count >= 3 && p.totalPnL < 0)
      .sort((a, b) => a.winRate - b.winRate) // Lowest win rate first
      .slice(0, 3);
  }

  async injectMockData() {
    try {
      const sessions = ['London', 'New York', 'Asia'];
      const states = ['Trending', 'Ranging', 'Volatile'];
      const directions = ['long', 'short'];
      
      for (let i = 0; i < 50; i++) {
        const direction = directions[Math.floor(Math.random() * directions.length)];
        const isWin = Math.random() > 0.45; // ~55% base win rate
        
        // Force an Alpha Cluster: Long + NY + Trending = High Win
        let forcedWin = false;
        let forcedLoss = false;
        const session = sessions[Math.floor(Math.random() * sessions.length)];
        const state = states[Math.floor(Math.random() * states.length)];
        
        if (direction === 'long' && session === 'New York' && state === 'Trending') {
          forcedWin = Math.random() > 0.15; // 85% win rate pattern
        }
        // Force a Toxic Signature: Short + Asia + Ranging = High Loss
        if (direction === 'short' && session === 'Asia' && state === 'Ranging') {
          forcedLoss = Math.random() > 0.15; // 85% loss rate pattern
        }

        const actualResult = forcedWin ? true : (forcedLoss ? false : isWin);
        
        const pnl = actualResult ? (Math.random() * 200 + 50) : -(Math.random() * 150 + 50);

        const tradeId = await createTrade({
          symbol: 'BTC/USD',
          direction,
          entryPrice: 60000,
          positionSize: 1,
          status: TRADE_STATUS.CLOSED
        });
        
        // Manually hack the closed status and PnL for the mock data
        await db.trades.update(tradeId, {
          status: TRADE_STATUS.CLOSED,
          result: actualResult ? TRADE_RESULT.WIN : TRADE_RESULT.LOSS,
          pnl
        });

        await setMarketContext(tradeId, {
          session,
          marketState: state
        });
      }
      await this.refresh();
      alert("50 Mock Trades injetadas com sucesso para análise de padrões.");
    } catch (err) {
      console.error(err);
      alert("Erro ao injetar mock data.");
    }
  }

  async purgeDatabase() {
    if (confirm("CUIDADO: Isso irá apagar TODAS as trades e contexto do banco de dados local. Tem certeza?")) {
      try {
        await db.transaction('rw', [db.trades, db.tradeEvents, db.screenshots, db.marketContext, db.tradeTags, db.equitySnapshots], async () => {
          await db.trades.clear();
          await db.tradeEvents.clear();
          await db.screenshots.clear();
          await db.marketContext.clear();
          await db.tradeTags.clear();
          await db.equitySnapshots.clear();
        });
        await this.refresh();
        alert("Banco de dados purgado com sucesso.");
      } catch (err) {
        console.error(err);
        alert("Erro ao purgar database.");
      }
    }
  }

  render() {
    if (!this._container) return;

    this._container.innerHTML = `
      <div class="page-container">
        <div class="page-header" style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h1 class="page-title">Pattern Recognition</h1>
            <p class="page-subtitle">Caçador de Anomalias e Assinaturas Epistêmicas</p>
          </div>
          
          <div style="display: flex; gap: 12px;">
            <button id="btn-inject-mock" class="btn" style="background: rgba(0, 200, 255, 0.1); border: 1px solid var(--accent-cyan); color: var(--accent-cyan); padding: 8px 16px; border-radius: 4px; cursor: pointer;">
              Injetar Mock Data
            </button>
            <button id="btn-purge-db" class="btn" style="background: rgba(239, 68, 68, 0.1); border: 1px solid var(--accent-red); color: var(--accent-red); padding: 8px 16px; border-radius: 4px; cursor: pointer;">
              Limpar Banco
            </button>
          </div>
        </div>

        ${this.patterns.length === 0 ? `
          <div class="card glass-panel" style="text-align: center; padding: 48px;">
            <div style="font-size: 3rem; margin-bottom: 16px;">🔭</div>
            <h3 style="color: var(--text-primary);">Nenhum Padrão Encontrado</h3>
            <p class="text-muted">Ainda não existem operações suficientes para mapear as assinaturas do mercado.</p>
            <p class="text-muted" style="font-size: 0.85rem;">Use a ferramenta 'Injetar Mock Data' acima para simular a descoberta de padrões.</p>
          </div>
        ` : `
          <div class="dashboard-grid">
            
            <!-- Alpha Clusters -->
            <div class="card glass-panel" style="grid-column: span 1; border-top: 4px solid var(--color-alpha-green);">
              <h3 style="color: var(--text-primary); margin-bottom: 16px; font-size: 1.1rem; display: flex; align-items: center; gap: 8px;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-alpha-green)" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                Top Alpha Clusters
              </h3>
              <p class="text-muted" style="font-size: 0.85rem; margin-bottom: 24px;">Padrões sistêmicos altamente lucrativos</p>
              
              <div style="display: flex; flex-direction: column; gap: 12px;">
                ${this.alphaClusters.length > 0 ? this.alphaClusters.map(p => `
                  <div style="background: rgba(6, 214, 160, 0.05); padding: 12px; border-radius: 8px; border: 1px solid rgba(6, 214, 160, 0.3);">
                    <div style="font-family: var(--font-mono); font-size: 0.85rem; color: var(--text-primary); margin-bottom: 8px; font-weight: bold;">
                      ${p.signature}
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <div>
                        <div class="text-muted" style="font-size: 0.75rem;">WIN RATE</div>
                        <div style="color: var(--color-alpha-green); font-weight: bold; font-family: var(--font-mono);">${p.winRate.toFixed(1)}%</div>
                      </div>
                      <div style="text-align: right;">
                        <div class="text-muted" style="font-size: 0.75rem;">ALPHA (PnL)</div>
                        <div style="color: var(--color-alpha-green); font-weight: bold; font-family: var(--font-mono);">+$${p.totalPnL.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                `).join('') : '<p class="text-muted">Poucos dados para formar clusters.</p>'}
              </div>
            </div>

            <!-- Toxic Signatures -->
            <div class="card glass-panel" style="grid-column: span 1; border-top: 4px solid var(--color-drift-red);">
              <h3 style="color: var(--text-primary); margin-bottom: 16px; font-size: 1.1rem; display: flex; align-items: center; gap: 8px;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-drift-red)" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                Toxic Signatures
              </h3>
              <p class="text-muted" style="font-size: 0.85rem; margin-bottom: 24px;">Padrões sistêmicos que destroem capital</p>
              
              <div style="display: flex; flex-direction: column; gap: 12px;">
                ${this.toxicSignatures.length > 0 ? this.toxicSignatures.map(p => `
                  <div style="background: rgba(239, 68, 68, 0.05); padding: 12px; border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.3);">
                    <div style="font-family: var(--font-mono); font-size: 0.85rem; color: var(--text-primary); margin-bottom: 8px; font-weight: bold;">
                      ${p.signature}
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <div>
                        <div class="text-muted" style="font-size: 0.75rem;">WIN RATE</div>
                        <div style="color: var(--color-drift-red); font-weight: bold; font-family: var(--font-mono);">${p.winRate.toFixed(1)}%</div>
                      </div>
                      <div style="text-align: right;">
                        <div class="text-muted" style="font-size: 0.75rem;">BLEED (PnL)</div>
                        <div style="color: var(--color-drift-red); font-weight: bold; font-family: var(--font-mono);">-$${Math.abs(p.totalPnL).toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                `).join('') : '<p class="text-muted">Poucos dados para detectar assinaturas tóxicas.</p>'}
              </div>
            </div>

            <!-- Frequency Matrix (All Patterns) -->
            <div class="card glass-panel" style="grid-column: 1 / -1; border-top: 4px solid var(--border-color);">
              <h3 style="color: var(--text-primary); margin-bottom: 16px; font-size: 1.1rem;">Matriz Completa de Padrões</h3>
              
              <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; text-align: left;">
                  <thead>
                    <tr style="border-bottom: 1px solid var(--border-color); color: var(--text-muted); font-size: 0.85rem;">
                      <th style="padding: 12px 8px;">Assinatura do Setup</th>
                      <th style="padding: 12px 8px;">Frequência (Trades)</th>
                      <th style="padding: 12px 8px;">Win Rate</th>
                      <th style="padding: 12px 8px; text-align: right;">Impacto Financeiro</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${this.patterns.sort((a,b) => b.totalPnL - a.totalPnL).map(p => `
                      <tr style="border-bottom: 1px solid rgba(255,255,255,0.02);">
                        <td style="padding: 12px 8px; font-family: var(--font-mono); font-size: 0.85rem; color: var(--text-primary);">${p.signature}</td>
                        <td style="padding: 12px 8px; color: var(--text-secondary);">${p.count}</td>
                        <td style="padding: 12px 8px; color: ${p.winRate >= 50 ? 'var(--color-alpha-green)' : 'var(--color-drift-red)'}; font-family: var(--font-mono);">${p.winRate.toFixed(1)}%</td>
                        <td style="padding: 12px 8px; text-align: right; font-family: var(--font-mono); color: ${p.totalPnL >= 0 ? 'var(--color-alpha-green)' : 'var(--color-drift-red)'};">
                          ${p.totalPnL >= 0 ? '+' : ''}$${p.totalPnL.toFixed(2)}
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        `}
      </div>
    `;

    // Attach Event Listeners
    const btnInject = this._container.querySelector('#btn-inject-mock');
    const btnPurge = this._container.querySelector('#btn-purge-db');

    if (btnInject) {
      btnInject.addEventListener('click', this.injectMockData);
    }
    
    if (btnPurge) {
      btnPurge.addEventListener('click', this.purgeDatabase);
    }
  }

  unmount() {
    if (this._container) {
      const btnInject = this._container.querySelector('#btn-inject-mock');
      const btnPurge = this._container.querySelector('#btn-purge-db');
      if (btnInject) btnInject.removeEventListener('click', this.injectMockData);
      if (btnPurge) btnPurge.removeEventListener('click', this.purgeDatabase);
      
      this._container.innerHTML = '';
    }
  }
}
