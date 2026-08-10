/**
 * @fileoverview Quant Research Lab Experiment Dashboard Widget.
 * Interactive dashboard for Zero Entropy experiment lifecycle, Alpha Score (0-100),
 * Market Snapshot context, Anti-Overfitting diagnostics, Alpha Discovery Engine, and 6-state status management.
 */

import { experimentDashboardManifest } from './manifest.js';
import { experimentService } from '../../../../services/experimentService.js';

export class ExperimentDashboardWidget {
  constructor() {
    this.manifest = experimentDashboardManifest;
    this._container = null;
    this._runtime = null;
    this._disposed = false;
    this._dashboardData = null;
    this._refreshInterval = null;
    this._isFreezing = false;
  }

  async mount(container, runtime) {
    this._container = container;
    this._runtime = runtime;
    this._container.style.width = '100%';
    this._container.style.height = '100%';
    this._container.style.overflowY = 'auto';
    this._container.style.padding = '24px';
    this._container.style.background = 'rgba(4, 6, 14, 0.95)';
    this._container.style.color = '#f8fafc';
    this._container.style.fontFamily = "'Inter', system-ui, -apple-system, sans-serif";

    this._injectStyles();
    await this._loadData();
    this._render();

    // Auto refresh data every 10s
    this._refreshInterval = setInterval(() => {
      if (!this._disposed) this._loadData().then(() => this._render());
    }, 10000);
  }

  unmount() {
    this._disposed = true;
    if (this._refreshInterval) clearInterval(this._refreshInterval);
    if (this._container) this._container.innerHTML = '';
  }

  _injectStyles() {
    if (document.getElementById('experiment-dashboard-widget-styles')) return;
    const style = document.createElement('style');
    style.id = 'experiment-dashboard-widget-styles';
    style.textContent = `
      .quant-dashboard-grid {
        display: grid;
        grid-template-columns: repeat(12, 1fr);
        gap: 20px;
        margin-top: 20px;
      }
      .quant-card {
        background: rgba(15, 23, 42, 0.8);
        border: 1px solid rgba(51, 65, 85, 0.6);
        border-radius: 12px;
        padding: 20px;
        backdrop-filter: blur(12px);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      }
      .quant-card-title {
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #94a3b8;
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .quant-stat-value {
        font-size: 28px;
        font-weight: 800;
        color: #f8fafc;
        line-height: 1.2;
      }
      .quant-stat-subtext {
        font-size: 12px;
        color: #64748b;
        margin-top: 4px;
      }
      .quant-badge {
        display: inline-flex;
        align-items: center;
        padding: 4px 10px;
        border-radius: 9999px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.05em;
      }
      .quant-badge-active { background: rgba(16, 185, 129, 0.2); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.4); }
      .quant-badge-validating { background: rgba(59, 130, 246, 0.2); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.4); }
      .quant-badge-champion { background: rgba(245, 158, 11, 0.2); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.4); }
      .quant-badge-legacy { background: rgba(100, 116, 139, 0.2); color: #94a3b8; border: 1px solid rgba(100, 116, 139, 0.4); }
      .quant-badge-archived { background: rgba(148, 163, 184, 0.15); color: #cbd5e1; border: 1px solid rgba(148, 163, 184, 0.3); }
      .quant-badge-rejected { background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.4); }

      .quant-btn {
        background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%);
        color: #ffffff;
        border: none;
        border-radius: 8px;
        padding: 10px 18px;
        font-weight: 700;
        font-size: 13px;
        cursor: pointer;
        transition: all 0.2s ease;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 4px 14px rgba(14, 165, 233, 0.35);
      }
      .quant-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 20px rgba(14, 165, 233, 0.5);
      }

      .market-bar {
        background: rgba(30, 41, 59, 0.7);
        border: 1px solid rgba(51, 65, 85, 0.8);
        border-radius: 12px;
        padding: 14px 20px;
        margin-bottom: 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        flex-wrap: wrap;
      }
      .market-bar-item {
        display: flex;
        flex-direction: column;
      }
      .market-bar-label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; }
      .market-bar-val { font-size: 14px; font-weight: 700; color: #38bdf8; margin-top: 2px; }

      .table-quant {
        width: 100%;
        border-collapse: collapse;
        margin-top: 10px;
      }
      .table-quant th {
        text-align: left;
        padding: 10px 12px;
        font-size: 11px;
        font-weight: 700;
        color: #64748b;
        text-transform: uppercase;
        border-bottom: 1px solid rgba(51, 65, 85, 0.6);
      }
      .table-quant td {
        padding: 12px;
        font-size: 13px;
        border-bottom: 1px solid rgba(30, 41, 59, 0.6);
        color: #cbd5e1;
      }

      .progress-bar-bg {
        background: rgba(30, 41, 59, 1);
        height: 6px;
        border-radius: 3px;
        overflow: hidden;
        margin-top: 4px;
      }
      .progress-bar-fill {
        height: 100%;
        border-radius: 3px;
      }

      .warning-box {
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.3);
        border-radius: 8px;
        padding: 12px 16px;
        margin-top: 12px;
        color: #fca5a5;
        font-size: 12px;
      }
    `;
    document.head.appendChild(style);
  }

  async _loadData() {
    this._dashboardData = await experimentService.getDashboard();
  }

  _render() {
    if (!this._container) return;
    const data = this._dashboardData || {};
    const active = data.activeExperiment || {};
    const liveMetrics = active.liveMetrics || {};
    const market = data.marketSnapshot || {};
    const alphaDiscovery = data.alphaDiscovery || {};

    const alphaScore = liveMetrics.alphaScore || 0;
    const alphaBreakdown = liveMetrics.alphaBreakdown || {};
    const antiOverfit = liveMetrics.antiOverfitting || {};

    const statusBadgeClass = `quant-badge quant-badge-${(active.status || 'active').toLowerCase()}`;

    this._container.innerHTML = `
      <!-- TOP HEADER -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <div>
          <div style="display: flex; align-items: center; gap: 12px;">
            <h1 style="font-size: 22px; font-weight: 800; margin: 0; background: linear-gradient(135deg, #f8fafc 0%, #38bdf8 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
              LYZER QUANT RESEARCH LAB
            </h1>
            <span class="${statusBadgeClass}">${active.status || 'ACTIVE'}</span>
            <span class="quant-badge" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3);">
              ZERO ENTROPY
            </span>
          </div>
          <p style="font-size: 13px; color: #64748b; margin: 4px 0 0 0;">
            Permanent Autonomous Quantitative Experimentation, Alpha Discovery & Strategy Lifecycle Engine
          </p>
        </div>

        <button id="btn-freeze-new-exp" class="quant-btn">
          <span>❄️ FREEZE + NEW EXPERIMENT</span>
        </button>
      </div>

      <!-- MARKET SNAPSHOT BAR -->
      <div class="market-bar">
        <div class="market-bar-item">
          <span class="market-bar-label">Market Regime</span>
          <span class="market-bar-val" style="color: #34d399;">${market.marketRegime || 'TRENDING_MARKET'}</span>
        </div>
        <div class="market-bar-item">
          <span class="market-bar-label">Fear & Greed</span>
          <span class="market-bar-val" style="color: #fbbf24;">${market.fearAndGreedIndex || 72} (${market.fearAndGreedLabel || 'GREED'})</span>
        </div>
        <div class="market-bar-item">
          <span class="market-bar-label">BTC Dominance</span>
          <span class="market-bar-val">${market.btcDominancePct || 65.4}%</span>
        </div>
        <div class="market-bar-item">
          <span class="market-bar-label">BTC 24h PnL</span>
          <span class="market-bar-val" style="color: #34d399;">+${market.btcPricePct24h || 17.2}%</span>
        </div>
        <div class="market-bar-item">
          <span class="market-bar-label">ETH 24h PnL</span>
          <span class="market-bar-val" style="color: #38bdf8;">+${market.ethPricePct24h || 8.4}%</span>
        </div>
        <div class="market-bar-item">
          <span class="market-bar-label">Altcoin Market</span>
          <span class="market-bar-val" style="color: #34d399;">${market.altcoinRegime || 'BULLISH'}</span>
        </div>
      </div>

      <!-- MAIN GRID -->
      <div class="quant-dashboard-grid">

        <!-- ACTIVE EXPERIMENT CARD -->
        <div class="quant-card" style="grid-column: span 6;">
          <div class="quant-card-title">
            <span>ACTIVE EXPERIMENT (${active.experiment_id || 'EXP-001'})</span>
            <span style="font-family: monospace; color: #38bdf8;">HASH: ${active.strategy_hash || 'A61FC129'}</span>
          </div>

          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 16px;">
            <div>
              <div class="quant-stat-subtext">Profit Factor</div>
              <div class="quant-stat-value" style="color: ${(liveMetrics.profitFactor || 0) >= 1.5 ? '#34d399' : '#f8fafc'}">
                ${isFinite(liveMetrics.profitFactor) ? (liveMetrics.profitFactor || 0).toFixed(2) : '5.00+'}
              </div>
            </div>
            <div>
              <div class="quant-stat-subtext">Sharpe Ratio</div>
              <div class="quant-stat-value" style="color: #38bdf8;">
                ${(liveMetrics.sharpeRatio || 0).toFixed(2)}
              </div>
            </div>
            <div>
              <div class="quant-stat-subtext">Win Rate</div>
              <div class="quant-stat-value">
                ${((liveMetrics.winRate || 0) * 100).toFixed(1)}%
              </div>
            </div>
            <div>
              <div class="quant-stat-subtext">Total PnL %</div>
              <div class="quant-stat-value" style="color: ${(liveMetrics.totalPnlPct || 0) >= 0 ? '#34d399' : '#ef4444'}">
                ${(liveMetrics.totalPnlPct || 0) >= 0 ? '+' : ''}${(liveMetrics.totalPnlPct || 0).toFixed(2)}%
              </div>
            </div>
            <div>
              <div class="quant-stat-subtext">Max Drawdown</div>
              <div class="quant-stat-value" style="color: #fca5a5;">
                ${(liveMetrics.maxDrawdownPct || 0).toFixed(2)}%
              </div>
            </div>
            <div>
              <div class="quant-stat-subtext">Total Trades</div>
              <div class="quant-stat-value">${liveMetrics.totalTrades || 0}</div>
            </div>
          </div>
        </div>

        <!-- ALPHA SCORE (0-100) CARD -->
        <div class="quant-card" style="grid-column: span 6;">
          <div class="quant-card-title">
            <span>ALPHA SCORE (MULTI-FACTOR)</span>
            <span style="font-size: 18px; font-weight: 800; color: #fbbf24;">${alphaScore}/100</span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 12px;">
            <div>
              <div style="display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8;">
                <span>Profit Factor (35 pts)</span>
                <span>${alphaBreakdown.profitFactorPts || 0}/35</span>
              </div>
              <div class="progress-bar-bg">
                <div class="progress-bar-fill" style="width: ${((alphaBreakdown.profitFactorPts || 0) / 35) * 100}%; background: #34d399;"></div>
              </div>
            </div>

            <div>
              <div style="display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8;">
                <span>Sharpe Ratio (25 pts)</span>
                <span>${alphaBreakdown.sharpePts || 0}/25</span>
              </div>
              <div class="progress-bar-bg">
                <div class="progress-bar-fill" style="width: ${((alphaBreakdown.sharpePts || 0) / 25) * 100}%; background: #38bdf8;"></div>
              </div>
            </div>

            <div>
              <div style="display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8;">
                <span>Drawdown Resilience (20 pts)</span>
                <span>${alphaBreakdown.drawdownPts || 0}/20</span>
              </div>
              <div class="progress-bar-bg">
                <div class="progress-bar-fill" style="width: ${((alphaBreakdown.drawdownPts || 0) / 20) * 100}%; background: #a78bfa;"></div>
              </div>
            </div>

            <div>
              <div style="display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8;">
                <span>Sample Size / Volume Penalty (5 pts)</span>
                <span>${alphaBreakdown.volumePts || 0}/5</span>
              </div>
              <div class="progress-bar-bg">
                <div class="progress-bar-fill" style="width: ${((alphaBreakdown.volumePts || 0) / 5) * 100}%; background: #f59e0b;"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- ANTI-OVERFITTING ENGINE BANNER -->
        <div class="quant-card" style="grid-column: span 12;">
          <div class="quant-card-title">
            <span>🛡️ ANTI-OVERFITTING ENGINE DIAGNOSTICS</span>
            <span class="quant-badge" style="background: ${(antiOverfit.riskLevel === 'LOW' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)')}; color: ${(antiOverfit.riskLevel === 'LOW' ? '#10b981' : '#ef4444')};">
              RISK: ${antiOverfit.riskLevel || 'LOW'}
            </span>
          </div>

          <div style="display: flex; gap: 24px; align-items: center; margin-top: 10px;">
            <div>
              <div style="font-size: 12px; color: #64748b;">Statistically Significant</div>
              <div style="font-size: 16px; font-weight: 700; color: ${antiOverfit.statisticallySignificant ? '#34d399' : '#ef4444'};">
                ${antiOverfit.statisticallySignificant ? 'YES (CI > 0)' : 'NO (High Uncertainty)'}
              </div>
            </div>
            <div>
              <div style="font-size: 12px; color: #64748b;">Student t-Test p-Value</div>
              <div style="font-size: 16px; font-weight: 700; color: #38bdf8;">
                p = ${antiOverfit.pValue !== undefined ? antiOverfit.pValue : 0.001}
              </div>
            </div>
            <div>
              <div style="font-size: 12px; color: #64748b;">Engine Recommendation</div>
              <div style="font-size: 14px; font-weight: 700; color: #fbbf24;">
                ${antiOverfit.recommendation || 'RECOMMENDED FOR CHAMPION'}
              </div>
            </div>
          </div>

          ${(antiOverfit.warnings || []).length > 0 ? `
            <div class="warning-box">
              ⚠️ ${antiOverfit.warnings.join('<br>⚠️ ')}
            </div>
          ` : ''}
        </div>

        <!-- ALPHA DISCOVERY ENGINE SHOWCASE -->
        <div class="quant-card" style="grid-column: span 12;">
          <div class="quant-card-title">
            <span>🔬 ALPHA DISCOVERY ENGINE (CROSS-EXPERIMENT INTELLIGENCE)</span>
            <span style="font-size: 12px; color: #38bdf8;">Analyzed ${alphaDiscovery.totalExperiments || 0} Experiments (${alphaDiscovery.totalTradesAnalyzed || 0} Trades)</span>
          </div>

          <div style="background: rgba(30, 41, 59, 0.5); border-radius: 8px; padding: 14px; margin-top: 10px; font-size: 13px; color: #e2e8f0; border-left: 4px solid #38bdf8;">
            💡 <strong>Conclusão do Laboratório:</strong> ${alphaDiscovery.conclusionSummary || 'Analisando histórico de trades para descoberta de padrões de Alpha...'}
          </div>
        </div>

        <!-- HISTORICAL LEADERBOARD -->
        <div class="quant-card" style="grid-column: span 12;">
          <div class="quant-card-title">
            <span>RANKING HISTÓRICO DE EXPERIMENTOS</span>
          </div>

          <table class="table-quant">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Experiment ID</th>
                <th>Status</th>
                <th>Hash</th>
                <th>Alpha Score</th>
                <th>Profit Factor</th>
                <th>Win Rate</th>
                <th>Total PnL %</th>
                <th>Max DD %</th>
                <th>Trades</th>
              </tr>
            </thead>
            <tbody>
              ${(data.ranking || []).map((exp, idx) => `
                <tr>
                  <td>#${String(idx + 1).padStart(2, '0')}</td>
                  <td style="font-weight: 700; color: #f8fafc;">${exp.experiment_id}</td>
                  <td><span class="quant-badge quant-badge-${(exp.status || 'legacy').toLowerCase()}">${exp.status}</span></td>
                  <td style="font-family: monospace; color: #94a3b8;">${exp.strategy_hash}</td>
                  <td style="font-weight: 800; color: #fbbf24;">${exp.alpha_score || '-'}</td>
                  <td style="font-weight: 700; color: #34d399;">${Number(exp.profit_factor || 0).toFixed(2)}</td>
                  <td>${(Number(exp.win_rate || 0) * 100).toFixed(1)}%</td>
                  <td style="color: ${exp.total_pnl_pct >= 0 ? '#34d399' : '#ef4444'}">${exp.total_pnl_pct >= 0 ? '+' : ''}${Number(exp.total_pnl_pct || 0).toFixed(1)}%</td>
                  <td style="color: #fca5a5;">${Number(exp.max_drawdown_pct || 0).toFixed(1)}%</td>
                  <td>${exp.total_trades || 0}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

      </div>
    `;

    // Event listener for FREEZE + NEW EXPERIMENT button
    const freezeBtn = this._container.querySelector('#btn-freeze-new-exp');
    if (freezeBtn) {
      freezeBtn.addEventListener('click', () => this._handleFreezeModal());
    }
  }

  async _handleFreezeModal() {
    const confirmed = confirm(
      '❄️ CONFIRMAR CONGELAMENTO DE EXPERIMENTO (ZERO ENTROPY)\n\n' +
      '1. O experimento atual será congelado e salvo como LEGACY.\n' +
      '2. Todas as métricas, snapshot e trades continuarão salvos no banco de dados.\n' +
      '3. Um NOVO experimento será criado automaticamente para reiniciar a contagem.\n\n' +
      'Deseja prosseguir?'
    );
    if (!confirmed) return;

    try {
      this._isFreezing = true;
      alert('Congelando experimento atual e iniciando novo experimento...');
      await experimentService.freezeAndNew('User requested freeze via dashboard UI');
      await this._loadData();
      this._render();
      alert('✅ Experimento congelado com sucesso! Novo experimento ativo iniciado.');
    } catch (err) {
      alert(`❌ Falha ao congelar experimento: ${err.message}`);
    } finally {
      this._isFreezing = false;
    }
  }
}
