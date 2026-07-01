import { getAllTrades, getSetting, getEdgeScoreHistory } from '../db/queries.js';
import { calcAllStats, calcEquityCurve } from '../engine/stats.js';
import { calcEdgeScore } from '../engine/edgescore.js';
import { EdgeScoreRing } from './EdgeScoreRing.js';
import { createChart } from 'lightweight-charts';
import ApexCharts from 'apexcharts';

export class Dashboard {
  constructor() {
    this._container = null;
    this.edgeScoreRing = new EdgeScoreRing({ size: 160, strokeWidth: 14 });
    this.equityChart = null;
    this.edgeTrendChart = null;
  }

  async mount(container) {
    this._container = container;
    
    // Initial HTML setup
    this._container.innerHTML = `
      <div class="page-container">
        <div class="page-header">
          <h1 class="page-title">Edge Dashboard</h1>
          <p class="page-subtitle">Your trading performance at a glance</p>
        </div>
        
        <div class="card" style="margin-bottom: 8px; border: 1px solid var(--accent-cyan); background: rgba(0, 200, 255, 0.03);">
          <div style="display: flex; gap: 16px; align-items: flex-start;">
            <div style="font-size: 2rem;">🧠</div>
            <div>
              <h2 style="color: var(--accent-cyan); margin-bottom: 8px; font-size: 1.25rem;">Welcome to Lyzer Edge Analyst</h2>
              <p style="color: var(--text-secondary); margin-bottom: 12px; font-size: 0.95rem;">This is your Epistemic Governance and Quantitative Edge command center. To get started:</p>
              <ul style="list-style-type: none; padding-left: 0; color: var(--text-secondary); font-size: 0.9rem; display: flex; flex-direction: column; gap: 6px;">
                <li><strong style="color: var(--text-primary);">1. Decision Stream:</strong> Watch real-time Epistemic Core (ECA) logic auditing simulated trades.</li>
                <li><strong style="color: var(--text-primary);">2. Analytics:</strong> Evaluate the statistical edge and PnL impact of the active constraints.</li>
                <li><strong style="color: var(--text-primary);">3. Policy Editor:</strong> Tweak the Constitutional constraints without crashing the system.</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div class="dashboard-grid">
          <!-- Top Row -->
          <div class="card" style="display: flex; align-items: center; justify-content: center; min-height: 220px;">
            <div id="dash-edge-score-ring"></div>
          </div>
          <div class="card">
            <h3 style="font-size: 1.1rem; color: var(--text-primary);">Risk of Ruin</h3>
            <div class="empty-state" style="padding: 2rem;"><p class="text-muted">Awaiting Live Trades</p></div>
          </div>
          <div class="card">
            <h3 style="font-size: 1.1rem; color: var(--text-primary);">Best Setup</h3>
            <div class="empty-state" style="padding: 2rem;"><p class="text-muted">Calculating Variance...</p></div>
          </div>

          <!-- Middle Row -->
          <div class="card" style="grid-column: span 2;">
            <h3 style="font-size: 1.1rem; color: var(--text-primary);">Equity Curve</h3>
            <div id="dash-equity-chart" style="width: 100%; height: 300px;"></div>
          </div>
          <div class="card" style="grid-column: span 1;">
            <h3 style="font-size: 1.1rem; color: var(--text-primary);">Edge Score Trend</h3>
            <div id="dash-edge-trend-chart" style="width: 100%; height: 300px;"></div>
          </div>

          <!-- Bottom Row -->
          <div class="card" style="grid-column: 1 / -1;">
            <h3 style="font-size: 1.1rem; color: var(--text-primary); margin-bottom: 16px;">Quick Stats</h3>
            <div id="dash-quick-stats" style="display: flex; flex-wrap: wrap; gap: 32px;">
              <p class="text-muted">Loading stats...</p>
            </div>
          </div>
          <div class="card" style="grid-column: 1 / -1;">
            <h3 style="font-size: 1.1rem; color: var(--text-primary); margin-bottom: 16px;">Recent Decisions</h3>
            <div id="dash-recent-trades">
              <p class="text-muted">Loading trades...</p>
            </div>
          </div>
        </div>
      </div>
    `;

    // Mount EdgeScoreRing
    this.edgeScoreRing.mount(this._container.querySelector('#dash-edge-score-ring'));

    await this._loadData();
  }

  unmount() {
    this.edgeScoreRing.unmount();
    if (this.equityChart) {
      this.equityChart.remove();
      this.equityChart = null;
    }
    if (this.edgeTrendChart) {
      this.edgeTrendChart.destroy();
      this.edgeTrendChart = null;
    }
    if (this._container) {
      this._container.innerHTML = '';
      this._container = null;
    }
  }

  async _loadData() {
    const trades = await getAllTrades();
    const closedTrades = trades.filter(t => t.status === 'closed');
    
    // Sort oldest to newest for equity curve
    const chronologicalClosedTrades = [...closedTrades].reverse();

    const startingBalance = await getSetting('accountBalance') || 10000;
    
    const stats = calcAllStats(closedTrades);
    const edgeScoreData = calcEdgeScore(closedTrades);

    // Update Ring
    this.edgeScoreRing.updateScore(edgeScoreData.score);

    // Update Quick Stats
    const statsContainer = this._container.querySelector('#dash-quick-stats');
    if (statsContainer) {
      statsContainer.innerHTML = `
        <div class="stat-item">
          <div class="text-muted">Win Rate</div>
          <div style="font-size: 1.5rem; font-weight: bold;">${stats.winRate.toFixed(1)}%</div>
        </div>
        <div class="stat-item">
          <div class="text-muted">Profit Factor</div>
          <div style="font-size: 1.5rem; font-weight: bold;">${stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}</div>
        </div>
        <div class="stat-item">
          <div class="text-muted">Avg RR</div>
          <div style="font-size: 1.5rem; font-weight: bold;">${stats.avgRR.toFixed(2)}</div>
        </div>
        <div class="stat-item">
          <div class="text-muted">Max DD</div>
          <div style="font-size: 1.5rem; font-weight: bold; color: var(--color-danger, #ef4444);">-${stats.maxDrawdown.maxDrawdown.toFixed(2)}%</div>
        </div>
        <div class="stat-item">
          <div class="text-muted">Sharpe Ratio</div>
          <div style="font-size: 1.5rem; font-weight: bold;">${stats.sharpeRatio.toFixed(2)}</div>
        </div>
      `;
    }

    // Update Recent Trades list
    const recentTradesContainer = this._container.querySelector('#dash-recent-trades');
    if (recentTradesContainer) {
      const recent = trades.slice(0, 5); // Assuming already sorted newest first by queries.js
      if (recent.length === 0) {
        recentTradesContainer.innerHTML = '<p class="text-muted">No trades recorded yet.</p>';
      } else {
        recentTradesContainer.innerHTML = `
          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="border-bottom: 1px solid var(--color-border, #333);">
                <th style="padding: 0.5rem 0;">Date</th>
                <th style="padding: 0.5rem 0;">Symbol</th>
                <th style="padding: 0.5rem 0;">Dir</th>
                <th style="padding: 0.5rem 0;">Result</th>
                <th style="padding: 0.5rem 0;">PnL</th>
              </tr>
            </thead>
            <tbody>
              ${recent.map(t => `
                <tr style="border-bottom: 1px solid var(--color-border, #333);">
                  <td style="padding: 0.5rem 0;">${(t.exitDate || t.entryDate || '').split('T')[0]}</td>
                  <td style="padding: 0.5rem 0;">${t.symbol}</td>
                  <td style="padding: 0.5rem 0; text-transform: capitalize;">${t.direction}</td>
                  <td style="padding: 0.5rem 0;">
                    <span style="color: ${t.result === 'win' ? 'var(--color-success, #06d6a0)' : t.result === 'loss' ? 'var(--color-danger, #ef4444)' : 'inherit'}">
                      ${t.result ? t.result.toUpperCase() : t.status.toUpperCase()}
                    </span>
                  </td>
                  <td style="padding: 0.5rem 0; color: ${(t.pnl || 0) > 0 ? 'var(--color-success, #06d6a0)' : (t.pnl || 0) < 0 ? 'var(--color-danger, #ef4444)' : 'inherit'}">
                    $${(t.pnl || 0).toFixed(2)}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      }
    }

    // Render Equity Chart (Lightweight Charts)
    const equityContainer = this._container.querySelector('#dash-equity-chart');
    if (equityContainer && closedTrades.length > 0) {
      const curveData = calcEquityCurve(chronologicalClosedTrades, startingBalance);
      // Ensure unique sorted dates for Lightweight charts. If multiple on same day, just use index as time if it fails, or format as proper date.
      // Lightweight charts requires time to be ascending and unique.
      // Let's create a synthetic timestamp if dates are same.
      let lastTime = 0;
      const lwData = curveData.map((pt, i) => {
        let t = new Date(pt.date).getTime() / 1000;
        if (isNaN(t)) {
            // fallback
            t = (new Date().getTime() / 1000) - (curveData.length - i) * 86400;
        }
        if (t <= lastTime) {
           t = lastTime + 60; // add a minute
        }
        lastTime = t;
        return {
          time: t,
          value: pt.balance
        };
      });

      this.equityChart = createChart(equityContainer, {
        width: equityContainer.clientWidth,
        height: 300,
        layout: {
          background: { type: 'solid', color: 'transparent' },
          textColor: '#d1d5db',
        },
        grid: {
          vertLines: { color: 'rgba(42, 46, 57, 0.5)' },
          horzLines: { color: 'rgba(42, 46, 57, 0.5)' },
        },
        rightPriceScale: {
          borderVisible: false,
        },
        timeScale: {
          borderVisible: false,
        },
      });

      const areaSeries = this.equityChart.addAreaSeries({
        lineColor: '#3b82f6',
        topColor: 'rgba(59, 130, 246, 0.4)',
        bottomColor: 'rgba(59, 130, 246, 0.0)',
        lineWidth: 2,
      });

      areaSeries.setData(lwData);
      this.equityChart.timeScale().fitContent();

      // Handle resize
      window.addEventListener('resize', () => {
        if (this.equityChart && equityContainer) {
          this.equityChart.applyOptions({ width: equityContainer.clientWidth });
        }
      });
    } else if (equityContainer) {
      equityContainer.innerHTML = '<div class="empty-state"><p class="text-muted">Not enough data for equity curve</p></div>';
    }

    // Render Edge Score Trend (ApexCharts)
    const trendContainer = this._container.querySelector('#dash-edge-trend-chart');
    if (trendContainer) {
      const history = await getEdgeScoreHistory();
      if (history.length < 2) {
        trendContainer.innerHTML = '<div class="empty-state"><p class="text-muted">Not enough history for trend (needs >1 save)</p></div>';
      } else {
        const options = {
          series: [{
            name: 'Edge Score',
            data: history.map(h => ({ x: h.date, y: h.score }))
          }],
          chart: {
            type: 'line',
            height: 300,
            toolbar: { show: false },
            background: 'transparent',
            animations: { enabled: false }
          },
          stroke: {
            curve: 'smooth',
            width: 3
          },
          colors: ['#06d6a0'],
          xaxis: {
            type: 'datetime',
            labels: { style: { colors: '#d1d5db' } },
            axisBorder: { show: false },
            axisTicks: { show: false }
          },
          yaxis: {
            min: 0,
            max: 100,
            labels: { style: { colors: '#d1d5db' } }
          },
          grid: {
            borderColor: 'rgba(42, 46, 57, 0.5)',
            strokeDashArray: 4,
          },
          theme: { mode: 'dark' }
        };
        this.edgeTrendChart = new ApexCharts(trendContainer, options);
        this.edgeTrendChart.render();
      }
    }
  }
}
 