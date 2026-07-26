import { getAllTrades, getMarketContext, createTrade, setMarketContext } from '../db/queries.js';
import { TRADE_STATUS, TRADE_RESULT } from '../db/database.js';
import db from '../db/database.js';

export class ReportsView {
  constructor() {
    this._container = null;
    this.reportData = {
      totalTrades: 0,
      netPnL: 0,
      winRate: 0,
      profitFactor: 0,
      longPnL: 0,
      shortPnL: 0,
      marketStates: {},
      summaryText: ''
    };
    
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
    await this.analyzeData();
    this.render();
  }

  async analyzeData() {
    const trades = await getAllTrades({ status: TRADE_STATUS.CLOSED });
    
    let totalWins = 0;
    let grossProfit = 0;
    let grossLoss = 0;
    
    this.reportData = {
      totalTrades: trades.length,
      netPnL: 0,
      winRate: 0,
      profitFactor: 0,
      longPnL: 0,
      shortPnL: 0,
      marketStates: {},
      summaryText: ''
    };

    if (trades.length === 0) return;

    for (const trade of trades) {
      const pnl = trade.pnl || 0;
      this.reportData.netPnL += pnl;
      
      if (pnl > 0) grossProfit += pnl;
      else grossLoss += Math.abs(pnl);

      if (trade.result === TRADE_RESULT.WIN) totalWins++;
      
      if (trade.direction === 'long') this.reportData.longPnL += pnl;
      if (trade.direction === 'short') this.reportData.shortPnL += pnl;

      // Fetch market context
      const context = await getMarketContext(trade.id);
      const state = context && context.marketState ? context.marketState : 'Unknown';
      
      if (!this.reportData.marketStates[state]) {
        this.reportData.marketStates[state] = { count: 0, pnl: 0 };
      }
      this.reportData.marketStates[state].count++;
      this.reportData.marketStates[state].pnl += pnl;
    }

    this.reportData.winRate = (totalWins / trades.length) * 100;
    this.reportData.profitFactor = grossLoss > 0 ? (grossProfit / grossLoss) : (grossProfit > 0 ? 99 : 0);
    
    this.generateSummaryText();
  }

  generateSummaryText() {
    if (this.reportData.totalTrades < 5) {
      this.reportData.summaryText = "Dados insuficientes para um diagnóstico sistêmico. O motor necessita de maior amostragem.";
      return;
    }

    let pnlStatus = this.reportData.netPnL >= 0 ? "em extração de Alpha (Lucro)." : "em estado de Bleed (Prejuízo Sistêmico).";
    let domDirection = this.reportData.longPnL > this.reportData.shortPnL ? "Operações Compradas (Longs)" : "Operações Vendidas (Shorts)";
    
    let bestState = 'Unknown';
    let maxStatePnl = -Infinity;
    
    Object.entries(this.reportData.marketStates).forEach(([state, data]) => {
      if (data.pnl > maxStatePnl) {
        maxStatePnl = data.pnl;
        bestState = state;
      }
    });

    this.reportData.summaryText = `O sistema operou um total de ${this.reportData.totalTrades} trades e encontra-se ${pnlStatus} A vantagem primária foi ancorada em ${domDirection}, tendo o contexto "${bestState}" como o terreno de caça mais eficiente. O fator de lucro de ${this.reportData.profitFactor.toFixed(2)} e taxa de acerto de ${this.reportData.winRate.toFixed(1)}% definem o atual perfil de sobrevivência.`;
  }

  async injectMockData() {
    try {
      const states = ['Trending', 'Ranging', 'Volatile'];
      const directions = ['long', 'short'];
      
      for (let i = 0; i < 30; i++) {
        const direction = directions[Math.floor(Math.random() * directions.length)];
        const isWin = Math.random() > 0.40; // ~60% base win rate
        const pnl = isWin ? (Math.random() * 300 + 100) : -(Math.random() * 200 + 50);

        const tradeId = await createTrade({
          symbol: 'ETH/USD',
          direction,
          entryPrice: 3000,
          positionSize: 1,
          status: TRADE_STATUS.CLOSED
        });
        
        await db.trades.update(tradeId, {
          status: TRADE_STATUS.CLOSED,
          result: isWin ? TRADE_RESULT.WIN : TRADE_RESULT.LOSS,
          pnl
        });

        await setMarketContext(tradeId, {
          session: 'New York',
          marketState: states[Math.floor(Math.random() * states.length)]
        });
      }
      await this.refresh();
      alert("Mock Trades injetadas no banco de dados para os Relatórios.");
    } catch (err) {
      console.error(err);
      alert("Erro ao injetar mock data.");
    }
  }

  async purgeDatabase() {
    if (confirm("CUIDADO: Isso irá apagar TODAS as trades do banco. Tem certeza?")) {
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

    const rd = this.reportData;
    const isProfitable = rd.netPnL >= 0;
    const highlightColor = isProfitable ? 'var(--color-alpha-green)' : 'var(--color-drift-red)';

    this._container.innerHTML = `
      <div class="page-container">
        <div class="page-header" style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h1 class="page-title">Executive Snapshot</h1>
            <p class="page-subtitle">Sumário Epistêmico e Performance Macro</p>
          </div>
          
          <div style="display: flex; gap: 12px;">
            <button id="btn-inject-reports" class="btn" style="background: rgba(0, 200, 255, 0.1); border: 1px solid var(--accent-cyan); color: var(--accent-cyan); padding: 8px 16px; border-radius: 4px; cursor: pointer;">
              Injetar Mock Trades
            </button>
            <button id="btn-purge-reports" class="btn" style="background: rgba(239, 68, 68, 0.1); border: 1px solid var(--accent-red); color: var(--accent-red); padding: 8px 16px; border-radius: 4px; cursor: pointer;">
              Limpar Banco
            </button>
          </div>
        </div>

        ${rd.totalTrades === 0 ? `
          <div class="card glass-panel" style="text-align: center; padding: 48px;">
            <div style="font-size: 3rem; margin-bottom: 16px; color: var(--text-muted);"></div>
            <h3 style="color: var(--text-primary);">Relatório Vazio</h3>
            <p class="text-muted">Não há operações fechadas suficientes para construir o diagnóstico.</p>
          </div>
        ` : `
          <div class="dashboard-grid">
            
            <!-- Snapshot Row -->
            <div class="card glass-panel" style="grid-column: 1 / -1; display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; border-top: 4px solid ${highlightColor};">
              <div style="text-align: center; border-right: 1px solid rgba(255,255,255,0.1);">
                <div class="text-muted" style="font-size: 0.8rem; margin-bottom: 8px;">NET PnL</div>
                <div style="font-size: 1.8rem; font-weight: bold; font-family: var(--font-mono); color: ${highlightColor};">
                  ${isProfitable ? '+' : ''}$${rd.netPnL.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </div>
              </div>
              <div style="text-align: center; border-right: 1px solid rgba(255,255,255,0.1);">
                <div class="text-muted" style="font-size: 0.8rem; margin-bottom: 8px;">WIN RATE</div>
                <div style="font-size: 1.8rem; font-weight: bold; font-family: var(--font-mono); color: var(--text-primary);">
                  ${rd.winRate.toFixed(1)}%
                </div>
              </div>
              <div style="text-align: center; border-right: 1px solid rgba(255,255,255,0.1);">
                <div class="text-muted" style="font-size: 0.8rem; margin-bottom: 8px;">PROFIT FACTOR</div>
                <div style="font-size: 1.8rem; font-weight: bold; font-family: var(--font-mono); color: var(--text-primary);">
                  ${rd.profitFactor.toFixed(2)}
                </div>
              </div>
              <div style="text-align: center;">
                <div class="text-muted" style="font-size: 0.8rem; margin-bottom: 8px;">TOTAL TRADES</div>
                <div style="font-size: 1.8rem; font-weight: bold; font-family: var(--font-mono); color: var(--text-primary);">
                  ${rd.totalTrades}
                </div>
              </div>
            </div>

            <!-- Cognitive Summary -->
            <div class="card glass-panel" style="grid-column: 1 / -1; background: rgba(0,0,0,0.2);">
              <h3 style="color: var(--text-primary); margin-bottom: 12px; font-size: 1.1rem; display: flex; align-items: center; gap: 8px;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-amber)" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                AI Cognitive Summary
              </h3>
              <p style="color: var(--text-secondary); font-size: 1rem; line-height: 1.6; font-style: italic;">
                "${rd.summaryText}"
              </p>
            </div>

            <!-- Distribution by Direction -->
            <div class="card glass-panel" style="grid-column: span 1;">
              <h3 style="color: var(--text-primary); margin-bottom: 16px; font-size: 1rem;">Distribuição por Direção</h3>
              <div style="display: flex; flex-direction: column; gap: 12px;">
                <div style="background: rgba(255,255,255,0.02); padding: 12px; border-radius: 8px;">
                  <div class="text-muted" style="font-size: 0.8rem;">LONG PnL</div>
                  <div style="font-size: 1.2rem; font-family: var(--font-mono); color: ${rd.longPnL >= 0 ? 'var(--color-alpha-green)' : 'var(--color-drift-red)'};">
                    ${rd.longPnL >= 0 ? '+' : ''}$${rd.longPnL.toFixed(2)}
                  </div>
                </div>
                <div style="background: rgba(255,255,255,0.02); padding: 12px; border-radius: 8px;">
                  <div class="text-muted" style="font-size: 0.8rem;">SHORT PnL</div>
                  <div style="font-size: 1.2rem; font-family: var(--font-mono); color: ${rd.shortPnL >= 0 ? 'var(--color-alpha-green)' : 'var(--color-drift-red)'};">
                    ${rd.shortPnL >= 0 ? '+' : ''}$${rd.shortPnL.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            <!-- Distribution by Market State -->
            <div class="card glass-panel" style="grid-column: span 1;">
              <h3 style="color: var(--text-primary); margin-bottom: 16px; font-size: 1rem;">Distribuição por Contexto</h3>
              <div style="display: flex; flex-direction: column; gap: 8px;">
                ${Object.entries(rd.marketStates).map(([state, data]) => `
                  <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.02); padding: 8px 12px; border-radius: 6px;">
                    <span style="font-size: 0.9rem; color: var(--text-secondary);">${state} (${data.count})</span>
                    <span style="font-family: var(--font-mono); font-size: 0.9rem; color: ${data.pnl >= 0 ? 'var(--color-alpha-green)' : 'var(--color-drift-red)'};">
                      ${data.pnl >= 0 ? '+' : ''}$${data.pnl.toFixed(2)}
                    </span>
                  </div>
                `).join('')}
              </div>
            </div>

          </div>
        `}
      </div>
    `;

    // Attach Event Listeners
    const btnInject = this._container.querySelector('#btn-inject-reports');
    const btnPurge = this._container.querySelector('#btn-purge-reports');

    if (btnInject) btnInject.addEventListener('click', this.injectMockData);
    if (btnPurge) btnPurge.addEventListener('click', this.purgeDatabase);
  }

  unmount() {
    if (this._container) {
      const btnInject = this._container.querySelector('#btn-inject-reports');
      const btnPurge = this._container.querySelector('#btn-purge-reports');
      if (btnInject) btnInject.removeEventListener('click', this.injectMockData);
      if (btnPurge) btnPurge.removeEventListener('click', this.purgeDatabase);
      
      this._container.innerHTML = '';
    }
  }
}
