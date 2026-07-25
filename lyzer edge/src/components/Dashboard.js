import { getAllTrades, getSetting, getEdgeScoreHistory, wipeAllTrades } from '../db/queries.js';
import { calcAllStats, calcEquityCurve } from '../engine/stats.js';
import { calcEdgeScore } from '../engine/edgescore.js';
import { EdgeScoreRing } from './EdgeScoreRing.js';
import { createChart } from 'lightweight-charts';
import ApexCharts from 'apexcharts';
import { robustnessReport } from '../db/robustness_results.js';
import { DataSeederService } from '../services/DataSeederService.js';
import { BinanceSeederService } from '../services/BinanceSeederService.js';

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
        
        <!-- Epistemic Inversion Alpha Extractor Module -->
        <div class="card glass-panel" style="margin-bottom: 24px; position: relative; overflow: hidden; border-left: 4px solid var(--color-alpha-green);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <div>
              <h3 style="color: var(--text-primary); font-size: 1.15rem; margin-bottom: 4px; display: flex; align-items: center; gap: 8px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-alpha-green)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                Alpha Engine: Epistemic Inversion
              </h3>
              <p class="text-muted" style="font-size: 0.85rem; margin: 0;">Autonomous Reality Drift correction and Alpha Extraction</p>
            </div>
            
            <div class="${robustnessReport.tests.shock.pnl > 0 ? 'inversion-active' : ''}" style="background: rgba(0,0,0,0.3); border: 1px solid ${robustnessReport.tests.shock.pnl > 0 ? 'var(--color-alpha-green)' : 'var(--border-color)'}; padding: 6px 12px; border-radius: 20px; display: flex; align-items: center; gap: 8px;">
              <span style="display: block; width: 8px; height: 8px; border-radius: 50%; background: ${robustnessReport.tests.shock.pnl > 0 ? 'var(--color-alpha-green)' : 'var(--text-muted)'}; box-shadow: 0 0 8px ${robustnessReport.tests.shock.pnl > 0 ? 'var(--color-alpha-green)' : 'transparent'};"></span>
              <span style="font-family: var(--font-mono); font-size: 0.75rem; font-weight: bold; color: ${robustnessReport.tests.shock.pnl > 0 ? 'var(--color-alpha-green)' : 'var(--text-muted)'};">
                ${robustnessReport.tests.shock.pnl > 0 ? 'ACTIVE INVERSION' : 'PASSIVE FILTERING'}
              </span>
            </div>
          </div>
          
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;">
            
            <div style="background: rgba(0,0,0,0.2); padding: 12px; border-radius: 6px; border: 1px solid var(--border-color);">
              <div class="text-muted" style="font-size: 0.75rem; margin-bottom: 8px;">SYSTEM QUALITY</div>
              <div style="font-size: 1.5rem; font-weight: bold; font-family: var(--font-mono); color: var(--text-primary);">
                ${robustnessReport.systemQuality.toFixed(2)}
              </div>
            </div>
            
            <div style="background: rgba(0,0,0,0.2); padding: 12px; border-radius: 6px; border: 1px solid var(--border-color);">
              <div class="text-muted" style="font-size: 0.75rem; margin-bottom: 8px;">BASELINE REPLAY PNL</div>
              <div style="font-size: 1.5rem; font-weight: bold; font-family: var(--font-mono); color: var(--color-drift-red);">
                ${robustnessReport.tests.baseline.pnl.toFixed(2)}%
              </div>
            </div>

            <div style="background: rgba(0,0,0,0.2); padding: 12px; border-radius: 6px; border: 1px solid var(--color-alpha-green); box-shadow: 0 0 10px rgba(6, 214, 160, 0.05) inset;">
              <div style="color: var(--color-alpha-green); font-size: 0.75rem; margin-bottom: 8px; font-weight: bold;">ADVERSARY ALPHA PNL</div>
              <div style="font-size: 1.5rem; font-weight: bold; font-family: var(--font-mono); color: var(--color-alpha-green);">
                +${robustnessReport.tests.adversary.pnl.toFixed(2)}%
              </div>
            </div>
            
            <div style="background: rgba(0,0,0,0.2); padding: 12px; border-radius: 6px; border: 1px solid var(--color-alpha-green); box-shadow: 0 0 10px rgba(6, 214, 160, 0.05) inset;">
              <div style="color: var(--color-alpha-green); font-size: 0.75rem; margin-bottom: 8px; font-weight: bold;">SHOCK TEST ALPHA PNL</div>
              <div style="font-size: 1.5rem; font-weight: bold; font-family: var(--font-mono); color: var(--color-alpha-green);">
                +${robustnessReport.tests.shock.pnl.toFixed(2)}%
              </div>
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
          <div class="card" style="grid-column: 1 / -1; margin-top: 16px; border-top: 2px solid var(--accent-cyan); background: rgba(0, 0, 0, 0.2);">
            <h3 style="font-size: 1.1rem; color: var(--text-primary); margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Data Ingestion & Backtest Seeder
            </h3>
            <p class="text-muted" style="margin-bottom: 16px; font-size: 0.9rem;">Área secundária para alimentação do sistema. Gere histórico em massa ou prepare-se para uploads futuros de CSV.</p>
            
            <div style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap;">
              <button id="btn-seed-data" class="btn" style="background: rgba(0, 200, 255, 0.1); border: 1px solid var(--accent-cyan); color: var(--accent-cyan); padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold;">
                🚀 Gerar Histórico Sintético (Matemático)
              </button>

              <button id="btn-seed-binance" class="btn" style="background: rgba(243, 186, 47, 0.1); border: 1px solid #F3BA2F; color: #F3BA2F; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold; display: flex; align-items: center; gap: 8px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1.33l-5.6 5.6L12 12.53l5.6-5.6zm7.25 7.25l-5.6 5.6 5.6 5.6 5.6-5.6zm-14.5 0l-5.6 5.6 5.6 5.6 5.6-5.6zM12 15.82l-5.6 5.6L12 27.02l5.6-5.6z" transform="translate(0, -2)"/></svg>
                🌐 Ingerir Histórico Real (Binance Cripto)
              </button>

              <button id="btn-wipe-data" class="btn" style="background: rgba(239, 68, 68, 0.1); border: 1px solid #EF4444; color: #EF4444; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold;">
                🗑️ Apagar Todos os Trades (Reset Geral)
              </button>
              
              <div style="border: 1px dashed var(--border-color); border-radius: 4px; padding: 8px 16px; color: var(--text-muted); font-size: 0.9rem; cursor: not-allowed; background: rgba(255,255,255,0.02);">
                📥 Upload CSV / JSON (Coming Soon)
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Mount EdgeScoreRing
    this.edgeScoreRing.mount(this._container.querySelector('#dash-edge-score-ring'));

    // Bind Data Seeder Event
    const btnSeed = this._container.querySelector('#btn-seed-data');
    if (btnSeed) {
      btnSeed.addEventListener('click', async () => {
        if(confirm("Isso injetará 3.000 operações forjadas no banco de dados para popular os gráficos de análise. Continuar?")) {
          btnSeed.textContent = "Gerando... Aguarde...";
          btnSeed.style.opacity = "0.5";
          const success = await DataSeederService.seedMassiveHistory(3000);
          if (success) {
            alert("✅ Histórico Sintético Injetado com Sucesso! A página será recarregada.");
            window.location.reload();
          } else {
            alert("Erro ao injetar dados sintéticos.");
            btnSeed.textContent = "🚀 Gerar Histórico Sintético (Matemático)";
            btnSeed.style.opacity = "1";
          }
        }
      });
    }

    // Bind Binance Seeder Event
    const btnBinance = this._container.querySelector('#btn-seed-binance');
    if (btnBinance) {
      btnBinance.addEventListener('click', async () => {
        if(confirm("Isso conectará à API da Binance, fará o download do histórico real de BTC, ETH e SOL (3 anos) e simulará HFT, Day Trades e Swing Trades com taxas reais. Pode levar alguns segundos. Continuar?")) {
          btnBinance.textContent = "Baixando da Binance... Aguarde...";
          btnBinance.style.opacity = "0.5";
          const success = await BinanceSeederService.seedRealCryptoHistory();
          if (success) {
            alert("✅ Backtest Real de Criptomoedas Concluído! Trades Injetados com Sucesso. A página será recarregada.");
            window.location.reload();
          } else {
            alert("Erro ao puxar dados da Binance. Verifique a conexão.");
            btnBinance.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1.33l-5.6 5.6L12 12.53l5.6-5.6zm7.25 7.25l-5.6 5.6 5.6 5.6 5.6-5.6zm-14.5 0l-5.6 5.6 5.6 5.6 5.6-5.6zM12 15.82l-5.6 5.6L12 27.02l5.6-5.6z" transform="translate(0, -2)"/></svg> 🌐 Ingerir Histórico Real (Binance Cripto)`;
            btnBinance.style.opacity = "1";
          }
        }
      });
    }

    // Bind Wipe All Trades Event
    const btnWipe = this._container.querySelector('#btn-wipe-data');
    if (btnWipe) {
      btnWipe.addEventListener('click', async () => {
        if(confirm("Tem certeza que deseja APAGAR COMPLETAMENTE todos os trades e histórico de análise do sistema? Essa ação não pode ser desfeita!")) {
          await wipeAllTrades();
          alert("✅ Banco de dados local redefinido com sucesso!");
          window.location.reload();
        }
      });
    }

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
 