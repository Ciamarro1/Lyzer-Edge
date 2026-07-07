import { wsClient } from '../services/wsClient.js';
import ApexCharts from 'apexcharts';

export class ZSpaceDashboard {
  constructor() {
    this._container = null;
    this._onDataReceived = this._onDataReceived.bind(this);
    this._charts = {};
    this.metaCharts = {};
    this.metaData = {
      selectionPressure: Array(20).fill(0),
      fitnessHistory: [],
      evHistory: [],
    };
    this.state = {
      zState: { z_t: 0, regime: 'ranging', volatility: 'normal' },
      ev: null,
      trades: [],
      market: { close: 60000.0, open: 60000.0, high: 60000.0, low: 60000.0, volume: 0 },
      arl: null,
      avgFitnessHistory: [],
      dominantEvHistory: [],
      mode: 'SIMULATION',
      connectionState: 'CONNECTED',
      extinction: {
        ecosystemState: 'NORMAL',
        ecosystemStress: 0.0,
        diversity: 1.0,
        species: [],
        extinctionLogs: [],
        activeBlackSwan: false,
        insightMessage: 'Ecosystem stable'
      }
    };
    this._tickCount = 0;
  }

  mount(container) {
    this._container = container;
    this._renderLayout();
    this._initMetaCharts();
    this._updateUI();
    this._attachEventListeners();
    wsClient.onData(this._onDataReceived);
  }

  _attachEventListeners() {
    const triggerBtn = this._container.querySelector('#trigger-black-swan-btn');
    if (triggerBtn) {
      triggerBtn.addEventListener('click', () => {
        fetch('/api/extinction/trigger', { method: 'POST' })
          .then(res => res.json())
          .catch(err => console.error('Failed to trigger Black Swan shock', err));
      });
    }
  }

  unmount() {
    wsClient.offData(this._onDataReceived);
    if (this._charts) {
      Object.entries(this._charts).forEach(([name, chart]) => {
        if (chart) {
          try {
            chart.destroy();
          } catch (e) {
            console.error('Error destroying chart', name, e);
          }
        }
      });
      this._charts = {};
    }
    if (this.metaCharts.ev) {
      this.metaCharts.ev.destroy();
      this.metaCharts.ev = null;
    }
    if (this.metaCharts.fitness) {
      this.metaCharts.fitness.destroy();
      this.metaCharts.fitness = null;
    }
    this.metaCharts = {};
    if (this._container) {
      this._container.innerHTML = '';
      this._container = null;
    }
  }

  _onDataReceived(data) {
    if (!data) return;
    this.state.zState = data.zState || this.state.zState;
    this.state.ev = data.ev || this.state.ev;
    this.state.market = data.market || this.state.market;
    this.state.arl = data.arl || this.state.arl;
    this.state.mode = data.mode || this.state.mode;
    this.state.connectionState = data.connectionState || this.state.connectionState;

    if (data.arl) {
      this._tickCount = (this._tickCount || 0) + 1;
      const m = data.arl;
      this.state.avgFitnessHistory.push(m.avgFitness || 0);
      this.state.dominantEvHistory.push(m.dominantEV || 0);
      if (this.state.avgFitnessHistory.length > 50) this.state.avgFitnessHistory.shift();
      if (this.state.dominantEvHistory.length > 50) this.state.dominantEvHistory.shift();

      this.metaData.fitnessHistory.push(m.avgFitness || 0);
      this.metaData.evHistory.push(m.dominantEV || 0);
      if (this.metaData.fitnessHistory.length > 100) {
        this.metaData.fitnessHistory.shift();
        this.metaData.evHistory.shift();
      }
      this.metaData.selectionPressure = m.selectionPressure || Array(20).fill(0);

      this.state.extinction = {
        ecosystemState: m.ecosystemState || 'NORMAL',
        ecosystemStress: m.ecosystemStress ?? 0.0,
        diversity: m.diversity ?? 1.0,
        species: m.species || [],
        extinctionLogs: m.extinctionLogs || [],
        activeBlackSwan: m.activeBlackSwan || false,
        insightMessage: m.insightMessage || 'System live.'
      };
    }

    if (data.trade) {
      this.state.trades.unshift(data.trade);
      if (this.state.trades.length > 10) {
        this.state.trades.pop();
      }
    }

    this._updateUI();
  }

  _renderLayout() {
    if (!this._container) return;

    this._container.innerHTML = `
      <div class="page-container zspace-container">
        <!-- Dashboard Header -->
        <div class="page-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
          <div>
            <h1 class="page-title">Z-Space Live Runtime</h1>
            <p class="page-subtitle">Real-time latent state mapping and causal EV decomposition.</p>
          </div>
          <div class="live-connection-badge" id="connection-status-badge">
            <span class="pulse-indicator"></span>
            <span id="connection-status-text">LIVE FEED CONNECTED</span>
          </div>
        </div>

        <!-- Metric Cards Row -->
        <div class="live-metrics-row" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
          <div class="card metric-card">
            <div class="text-muted">Live Price</div>
            <div id="live-price" style="font-size: 1.8rem; font-weight: bold; font-family: var(--font-mono);">$0.00</div>
          </div>
          <div class="card metric-card">
            <div class="text-muted">Latent State Z_t</div>
            <div id="z-value" style="font-size: 1.8rem; font-weight: bold; font-family: var(--font-mono); color: var(--color-edge);">0.0000</div>
          </div>
          <div class="card metric-card">
            <div class="text-muted">Current Regime</div>
            <div id="live-regime" style="font-size: 1.2rem; font-weight: bold; text-transform: uppercase; margin-top: 5px;">Ranging</div>
          </div>
          <div class="card metric-card">
            <div class="text-muted">Volatility</div>
            <div id="live-volatility" style="font-size: 1.2rem; font-weight: bold; text-transform: uppercase; margin-top: 5px;">Normal</div>
          </div>
        </div>

        <!-- Main Dashboard Section -->
        <div class="zspace-grid" style="display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem;">
          
          <!-- Left Column: Heatmap and Trades -->
          <div style="display: flex; flex-direction: column; gap: 1.5rem;">
            
            <!-- Z-Space Heatmap Card -->
            <div class="card" style="padding: 1.5rem; border-radius: var(--radius-xs, 4px);">
              <h3 style="margin-bottom: 1rem; color: var(--text-primary);">Z-Space Causal Spectrum Map (20 Bins)</h3>
              <p class="text-muted" style="font-size: 0.8rem; margin-bottom: 1.5rem;">
                Visualizing the current latent state $Z_t$ mapped into discretized bins covering $[-0.5, 0.5]$. Profitable states glow green, unprofitable glow red.
              </p>
              
              <div class="heatmap-wrapper" style="display: grid; grid-template-columns: repeat(20, 1fr); gap: 4px; height: 50px; background: rgba(0,0,0,0.2); padding: 8px; border-radius: 4px; border: 1px solid var(--border-color);">
                ${Array.from({ length: 20 }).map((_, idx) => {
                  return `<div class="heatmap-bin" id="bin-${idx}" style="height: 100%; border-radius: 2px; transition: all 0.3s ease;"></div>`;
                }).join('')}
              </div>
              <div style="display: flex; justify-content: space-between; font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-muted); margin-top: 6px;">
                <span>Bearish (-0.5)</span>
                <span>Neutral (0.0)</span>
                <span>Bullish (+0.5)</span>
              </div>
            </div>

            <!-- Recent Trades Card -->
            <div class="card" style="padding: 1.5rem; border-radius: var(--radius-xs, 4px);">
              <h3 style="margin-bottom: 1rem; color: var(--text-primary);">Simulated Live Trades (Last 10)</h3>
              <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; text-align: left;">
                  <thead>
                    <tr style="border-bottom: 1px solid var(--border-color); font-size: 0.8rem; color: var(--text-muted); font-family: var(--font-mono);">
                      <th style="padding: 0.5rem 0;">Index</th>
                      <th style="padding: 0.5rem 0;">Direction</th>
                      <th style="padding: 0.5rem 0; text-align: right;">Entry Price</th>
                      <th style="padding: 0.5rem 0; text-align: right;">Ex-Post PnL</th>
                      <th style="padding: 0.5rem 0; text-align: right;">Governance</th>
                    </tr>
                  </thead>
                  <tbody id="live-trades-body" style="font-family: var(--font-mono); font-size: 0.85rem;">
                    <tr>
                      <td colspan="5" class="text-muted" style="text-align: center; padding: 2rem 0;">Waiting for trade signals...</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Right Column: EV Decomposition -->
          <div class="card" style="padding: 1.5rem; border-radius: var(--radius-xs, 4px); display: flex; flex-direction: column; gap: 1.5rem;">
            <h3 style="color: var(--text-primary); border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">Causal EV Decomposition</h3>
            
            <div id="ev-decomposition-box" style="display: flex; flex-direction: column; gap: 1.5rem; justify-content: center; height: 100%;">
              <div class="empty-state" style="text-align: center; padding: 3rem 0;">
                <p class="text-muted">Decomposition updates on trade signals.</p>
              </div>
            </div>
          </div>

        </div>

        <!-- 🧬 ARL v3.1 Darwin Engine Strategy Panel -->
        <div class="alpha-panel-v2 card" style="margin-top: 1.5rem; padding: 1.5rem; border-radius: var(--radius-xs, 2px); border: 1px solid var(--border-color);">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem; margin-bottom: 1.5rem;">
            <div>
              <h2 style="font-size: 1.3rem; margin: 0; color: var(--text-primary);">🧬 EV Alpha Darwin Engine (v3.1)</h2>
              <p class="text-muted" style="font-size: 0.8rem; margin: 5px 0 0 0;">Autonomous genetic strategy discovery, mutation, and selective pressures.</p>
            </div>
            <div style="display: flex; gap: 1rem; align-items: center; font-family: var(--font-mono); font-size: 0.8rem;">
              <div>Gen: <span id="darwin-generation" style="font-weight: bold; color: var(--color-edge);">0</span></div>
              <div>Ticks: <span id="darwin-ticks" style="font-weight: bold; color: var(--color-edge);">0</span></div>
              <div>Pool: <span id="darwin-pop-size" style="font-weight: bold; color: var(--color-edge);">0</span></div>
              <div>Extinctions: <span id="darwin-extinction-events" style="font-weight: bold; color: var(--color-danger, #ef4444);">0</span></div>
            </div>
          </div>

          <!-- Darwin Summary Row: Dominant Strategy & Lineage -->
          <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; margin-bottom: 0.5rem;">
            
            <!-- Left Side: Dominant Strategy Card -->
            <div class="card" style="padding: 1.25rem; background: rgba(0,0,0,0.15); border: 1px solid var(--border-color); border-radius: 2px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.5rem;">
                <div>
                  <h4 style="margin: 0; color: var(--text-primary); font-size: 1rem;">Dominant Strategy Genome</h4>
                  <span class="text-muted" id="dominant-id" style="font-size: 0.7rem; font-family: var(--font-mono);">ID: G_0</span>
                </div>
                <div>
                  <span class="badge health-badge stable" id="dominant-health" style="font-size: 0.7rem;">FIT</span>
                </div>
              </div>

              <!-- Metrics -->
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; font-family: var(--font-mono); font-size: 0.8rem;">
                <div>
                  <div class="text-muted" style="font-size: 0.65rem;">ENTRY LOOKBACK</div>
                  <strong id="dominant-entry-lookback">0</strong>
                </div>
                <div>
                  <div class="text-muted" style="font-size: 0.65rem;">EXIT LOOKBACK</div>
                  <strong id="dominant-exit-lookback">0</strong>
                </div>
                <div>
                  <div class="text-muted" style="font-size: 0.65rem;">DECISION THRESHOLD</div>
                  <strong id="dominant-threshold">0.00</strong>
                </div>
                <div>
                  <div class="text-muted" style="font-size: 0.65rem;">RISK MULTIPLIER</div>
                  <strong id="dominant-risk">0.00</strong>
                </div>
                <div>
                  <div class="text-muted" style="font-size: 0.65rem;">CUMULATIVE EV</div>
                  <strong id="dominant-ev" style="color: var(--color-success, #06d6a0);">0.00%</strong>
                </div>
                <div>
                  <div class="text-muted" style="font-size: 0.65rem;">STABILITY</div>
                  <strong id="dominant-stability">0.00</strong>
                </div>
                <div>
                  <div class="text-muted" style="font-size: 0.65rem;">MAX DRAWDOWN</div>
                  <strong id="dominant-drawdown">0.00%</strong>
                </div>
                <div>
                  <div class="text-muted" style="font-size: 0.65rem;">FITNESS SCORE</div>
                  <strong id="dominant-fitness" style="color: var(--color-edge);">0.00</strong>
                </div>
                <div>
                  <div class="text-muted" style="font-size: 0.65rem;">ANCESTRAL LINEAGE</div>
                  <strong id="dominant-parents" style="font-size: 0.7rem; color: var(--text-muted);">None</strong>
                </div>
              </div>
            </div>

            <!-- Right Side: Real-Time Fitness Trends -->
            <div style="display: flex; flex-direction: column; gap: 1rem;">
              <div class="card" style="padding: 0.75rem; background: rgba(0,0,0,0.15); border: 1px solid var(--border-color); border-radius: 2px;">
                <div style="display: flex; justify-content: space-between; font-size: 0.75rem; font-family: var(--font-mono); margin-bottom: 5px;">
                  <span class="text-muted">Avg Fitness:</span>
                  <strong id="avg-fitness-val">0.00</strong>
                </div>
                <div id="sparkline-avg-fitness" style="height: 60px;"></div>
              </div>
              <div class="card" style="padding: 0.75rem; background: rgba(0,0,0,0.15); border: 1px solid var(--border-color); border-radius: 2px;">
                <div style="display: flex; justify-content: space-between; font-size: 0.75rem; font-family: var(--font-mono); margin-bottom: 5px;">
                  <span class="text-muted">Dominant EV:</span>
                  <strong id="dominant-ev-val">0.00%</strong>
                </div>
                <div id="sparkline-dominant-ev" style="height: 60px;"></div>
              </div>
            </div>

          </div>
        </div>

        <!-- 🧬 ARL v3.2 — Meta-Selection Engine Panel -->
        <div class="arl-v32-panel card" style="margin-top: 1.5rem; padding: 1.5rem; border: 1px solid var(--border-color); border-radius: var(--radius-xs, 2px); background: rgba(0,0,0,0.1);">
          <div class="panel-header" style="font-size: 1.2rem; font-weight: bold; margin-bottom: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; color: var(--text-primary);">
            🧬 ARL v3.2 — Meta-Selection Engine (Co-Evolutionary Model)
          </div>

          <div class="meta-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 1.5rem;">
            <div class="meta-card" style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); padding: 10px; border-radius: 4px; text-align: center;">
              <div class="meta-title" style="font-size: 0.7rem; opacity: 0.7; font-family: var(--font-mono); text-transform: uppercase;">Generation</div>
              <div id="meta-gen" style="font-size: 1.5rem; font-weight: bold; font-family: var(--font-mono); color: var(--color-edge);">0</div>
            </div>
            <div class="meta-card" style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); padding: 10px; border-radius: 4px; text-align: center;">
              <div class="meta-title" style="font-size: 0.7rem; opacity: 0.7; font-family: var(--font-mono); text-transform: uppercase;">Strategies Pool</div>
              <div id="meta-pop" style="font-size: 1.5rem; font-weight: bold; font-family: var(--font-mono); color: var(--color-edge);">0</div>
            </div>
            <div class="meta-card" style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); padding: 10px; border-radius: 4px; text-align: center;">
              <div class="meta-title" style="font-size: 0.7rem; opacity: 0.7; font-family: var(--font-mono); text-transform: uppercase;">Selectors Pool</div>
              <div id="meta-sel" style="font-size: 1.5rem; font-weight: bold; font-family: var(--font-mono); color: var(--color-edge);">0</div>
            </div>
            <div class="meta-card" style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); padding: 10px; border-radius: 4px; text-align: center;">
              <div class="meta-title" style="font-size: 0.7rem; opacity: 0.7; font-family: var(--font-mono); text-transform: uppercase;">Dominant EV</div>
              <div id="meta-ev" style="font-size: 1.5rem; font-weight: bold; font-family: var(--font-mono); color: var(--color-success, #06d6a0);">0.00%0</div>
            </div>
          </div>

          <div class="meta-charts" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
            <div id="evChart" class="card" style="padding: 10px; background: rgba(0,0,0,0.15); min-height: 220px;"></div>
            <div id="fitnessChart" class="card" style="padding: 10px; background: rgba(0,0,0,0.15); min-height: 220px;"></div>
          </div>

          <div class="selection-heatmap" style="margin-top: 1.5rem;">
            <div class="heatmap-title" style="font-size: 0.95rem; font-weight: bold; margin-bottom: 10px; color: var(--text-secondary);">🔥 Selection Pressure distribution Map (Z-Space Bins)</div>
            <div id="selectionHeatmap" class="heatmap-grid" style="display: grid; grid-template-columns: repeat(20, 1fr); gap: 4px; background: rgba(0,0,0,0.2); padding: 8px; border-radius: 4px; border: 1px solid var(--border-color);"></div>
          </div>
        </div>

        <!-- 🧬 ARL v3.3 — Extinction Layer Panel -->
        <div class="arl-v33-panel card" id="extinction-panel" style="margin-top: 1.5rem; padding: 1.5rem; border: 1px solid var(--border-color); border-radius: var(--radius-xs, 2px); background: rgba(0,0,0,0.15); position: relative; transition: all 0.3s ease;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; margin-bottom: 1rem;">
            <span style="font-size: 1.2rem; font-weight: bold; color: var(--text-primary);">💀 ARL v3.3 — Extinction & Ecological Resilience Layer</span>
            <button id="trigger-black-swan-btn" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.4); color: var(--color-danger, #ef4444); font-size: 0.75rem; font-family: var(--font-mono); padding: 4px 8px; border-radius: 2px; cursor: pointer; transition: all 0.2s ease; font-weight: bold;">
              ⚡ TRIGGER BLACK SWAN SHOCK
            </button>
          </div>

          <!-- Ecosystem Insight Banner -->
          <div id="insight-banner" style="background: rgba(255, 255, 255, 0.03); border-left: 3px solid var(--color-edge); padding: 10px 15px; border-radius: 4px; margin-bottom: 1.5rem; font-family: var(--font-mono); font-size: 0.85rem; display: flex; align-items: center; justify-content: space-between;">
            <div>
              <span class="text-muted">SYSTEM DIAGNOSTICS: </span>
              <strong id="insight-text" style="color: var(--text-primary);">Monitoring ecological feedback.</strong>
            </div>
            <div id="ecosystem-state-badge" class="badge" style="font-size: 0.75rem; font-weight: bold; padding: 2px 6px; border-radius: 2px; text-transform: uppercase;">NORMAL</div>
          </div>

          <!-- Stress Gauge and Diversity Stat -->
          <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
            <div class="card" style="padding: 1rem; background: rgba(0,0,0,0.15); border: 1px solid var(--border-color);">
              <div style="display: flex; justify-content: space-between; font-size: 0.8rem; font-family: var(--font-mono); margin-bottom: 8px;">
                <span class="text-muted">Ecosystem Stress Factor</span>
                <strong id="stress-val">0.0%</strong>
              </div>
              <div class="progress-bar" style="height: 12px; background: rgba(255,255,255,0.05); border-radius: 6px;">
                <div id="stress-fill" class="progress-bar-fill" style="width: 0%; height: 100%; border-radius: 6px; background: var(--color-success, #06d6a0); transition: all 0.3s ease;"></div>
              </div>
            </div>
            <div class="card" style="padding: 1rem; background: rgba(0,0,0,0.15); border: 1px solid var(--border-color); display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center;">
              <span class="text-muted" style="font-size: 0.7rem; font-family: var(--font-mono); text-transform: uppercase;">Shannon Genetic Diversity</span>
              <strong id="diversity-val" style="font-size: 1.8rem; font-family: var(--font-mono); color: var(--color-edge, #00d6a0); margin-top: 5px;">1.0000</strong>
            </div>
          </div>

          <!-- Niches Mapping and Extinction Logs -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
            
            <!-- Niches/Species Clusters -->
            <div class="card" style="padding: 1rem; background: rgba(0,0,0,0.15); border: 1px solid var(--border-color);">
              <h4 style="margin-bottom: 0.75rem; color: var(--text-secondary); font-size: 0.9rem;">Niches Distribution Mapping</h4>
              <div id="niches-grid" style="display: flex; flex-wrap: wrap; gap: 8px; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 4px; border: 1px solid var(--border-color); min-height: 80px; align-items: center; justify-content: center;">
                <div class="text-muted" style="font-size: 0.8rem; font-family: var(--font-mono);">No active species mapped.</div>
              </div>
            </div>

            <!-- Recent Extinctions Logs -->
            <div class="card" style="padding: 1rem; background: rgba(0,0,0,0.15); border: 1px solid var(--border-color);">
              <h4 style="margin-bottom: 0.75rem; color: var(--text-secondary); font-size: 0.9rem;">Ecological Extinction Log</h4>
              <div style="overflow-y: auto; max-height: 180px;">
                <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.75rem; font-family: var(--font-mono);">
                  <thead>
                    <tr style="border-bottom: 1px solid var(--border-color); color: var(--text-muted);">
                      <th style="padding: 4px 0;">Time</th>
                      <th style="padding: 4px 0;">Type</th>
                      <th style="padding: 4px 0;">Description</th>
                    </tr>
                  </thead>
                  <tbody id="extinction-logs-body">
                    <tr>
                      <td colspan="3" class="text-muted" style="text-align: center; padding: 20px 0;">No extinction events logged.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      </div>
    `;
  }

  _updateUI() {
    if (!this._container) return;

    // Update Live Price
    const priceEl = this._container.querySelector('#live-price');
    if (priceEl) {
      priceEl.textContent = `$${this.state.market.close.toFixed(2)}`;
    }

    // Update Z_t value
    const zEl = this._container.querySelector('#z-value');
    if (zEl) {
      zEl.textContent = this.state.zState.z_t.toFixed(4);
      if (this.state.zState.z_t > 0.15) {
        zEl.style.color = 'var(--color-success, #06d6a0)';
      } else if (this.state.zState.z_t < -0.15) {
        zEl.style.color = 'var(--color-danger, #ef4444)';
      } else {
        zEl.style.color = 'var(--color-edge, #00d6a0)';
      }
    }

    // Update Regime
    const regimeEl = this._container.querySelector('#live-regime');
    if (regimeEl) {
      regimeEl.textContent = this.state.zState.regime.replace('_', ' ');
      if (this.state.zState.regime.includes('up')) {
        regimeEl.style.color = 'var(--color-success, #06d6a0)';
      } else if (this.state.zState.regime.includes('down')) {
        regimeEl.style.color = 'var(--color-danger, #ef4444)';
      } else {
        regimeEl.style.color = 'var(--text-secondary)';
      }
    }

    // Update Volatility
    const volEl = this._container.querySelector('#live-volatility');
    if (volEl) {
      volEl.textContent = this.state.zState.volatility;
      if (this.state.zState.volatility === 'high') {
        volEl.style.color = 'var(--color-warning, #f59e0b)';
      } else {
        volEl.style.color = 'var(--text-secondary)';
      }
    }

    // Update Z-Space Heatmap
    const binCount = 20;
    const minZ = -0.5;
    const maxZ = 0.5;
    const step = (maxZ - minZ) / binCount;
    const currentZ = this.state.zState.z_t;

    // Discretize current Z into bin index [0, 19]
    let activeBin = Math.floor((currentZ - minZ) / step);
    activeBin = Math.max(0, Math.min(binCount - 1, activeBin));

    for (let i = 0; i < binCount; i++) {
      const binEl = this._container.querySelector(`#bin-${i}`);
      if (!binEl) continue;

      // Reset styles
      binEl.className = 'heatmap-bin';
      binEl.style.boxShadow = 'none';

      // Estimate base expected value color for bins:
      // Typically positive Z_t bins are long-skewed, negative are short-skewed.
      // Set background opacity to represent distance from center
      const zRepresented = minZ + i * step + step / 2;
      const absoluteZ = Math.abs(zRepresented);
      
      // Bins are colored green/red/gray based on the Z-spectrum
      if (zRepresented > 0.15) {
        binEl.style.background = `rgba(6, 214, 160, ${0.1 + absoluteZ * 1.2})`;
      } else if (zRepresented < -0.15) {
        binEl.style.background = `rgba(239, 68, 68, ${0.1 + absoluteZ * 1.2})`;
      } else {
        binEl.style.background = 'rgba(255, 255, 255, 0.05)';
      }

      // Highlight active bin
      if (i === activeBin) {
        binEl.classList.add('active');
        const activeColor = zRepresented > 0.15 ? '#06d6a0' : (zRepresented < -0.15 ? '#ef4444' : '#3b82f6');
        binEl.style.background = activeColor;
        binEl.style.boxShadow = `0 0 12px ${activeColor}`;
      }
    }

    // Update EV Decomposition Card
    const evBox = this._container.querySelector('#ev-decomposition-box');
    if (evBox) {
      if (this.state.ev) {
        const ev = this.state.ev;
        const dec = ev;
        const totalEV = dec.totalEV ?? 0;

        let totalEVColor = 'var(--color-success, #06d6a0)';
        if (totalEV < 0) totalEVColor = 'var(--color-danger, #ef4444)';

        evBox.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 1.25rem;">
            
            <!-- Total Expected Value -->
            <div style="text-align: center; padding: 1rem; background: rgba(255,255,255,0.02); border: 1px dashed var(--border-color); border-radius: 4px;">
              <div class="text-muted" style="font-size: 0.75rem; font-family: var(--font-mono);">EXPECTED VALUE (TOTAL)</div>
              <div style="font-size: 2.2rem; font-weight: bold; color: ${totalEVColor}; font-family: var(--font-mono); margin-top: 5px;">
                ${(totalEV * 100).toFixed(4)}%
              </div>
              <div class="badge" style="background: rgba(255,255,255,0.05); color: var(--text-secondary); margin-top: 8px; font-family: var(--font-mono); font-size: 0.7rem; padding: 2px 8px; border-radius: 2px;">
                CLASSIFICATION: ${dec.classification}
              </div>
            </div>

            <!-- Signal EV -->
            <div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.35rem; font-family: var(--font-mono); font-size: 0.75rem;">
                <span>Signal Alpha (EV_signal)</span>
                <span style="color: ${dec.signalEV >= 0 ? '#06d6a0' : '#ef4444'}">${(dec.signalEV * 100).toFixed(4)}%</span>
              </div>
              <div style="height: 6px; background: var(--bg-tertiary); border-radius: var(--radius-full); overflow: hidden;">
                <div style="background: ${dec.signalEV >= 0 ? '#06d6a0' : '#ef4444'}; width: ${Math.min(100, Math.abs(dec.signalEV) * 1000)}%; height: 100%; border-radius: var(--radius-full);"></div>
              </div>
            </div>

            <!-- Timing EV -->
            <div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.35rem; font-family: var(--font-mono); font-size: 0.75rem;">
                <span>Timing Drift (EV_timing)</span>
                <span style="color: ${dec.timingEV >= 0 ? '#06d6a0' : '#ef4444'}">${(dec.timingEV * 100).toFixed(4)}%</span>
              </div>
              <div style="height: 6px; background: var(--bg-tertiary); border-radius: var(--radius-full); overflow: hidden;">
                <div style="background: ${dec.timingEV >= 0 ? '#06d6a0' : '#ef4444'}; width: ${Math.min(100, Math.abs(dec.timingEV) * 1000)}%; height: 100%; border-radius: var(--radius-full);"></div>
              </div>
            </div>

            <!-- Execution EV -->
            <div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.35rem; font-family: var(--font-mono); font-size: 0.75rem;">
                <span>Execution Friction (EV_execution)</span>
                <span style="color: ${dec.executionEV >= 0 ? '#06d6a0' : '#ef4444'}">${(dec.executionEV * 100).toFixed(4)}%</span>
              </div>
              <div style="height: 6px; background: var(--bg-tertiary); border-radius: var(--radius-full); overflow: hidden;">
                <div style="background: ${dec.executionEV >= 0 ? '#06d6a0' : '#ef4444'}; width: ${Math.min(100, Math.abs(dec.executionEV) * 1000)}%; height: 100%; border-radius: var(--radius-full);"></div>
              </div>
            </div>

            <!-- Regime EV -->
            <div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.35rem; font-family: var(--font-mono); font-size: 0.75rem;">
                <span>Regime Shift Bias (EV_regime)</span>
                <span style="color: ${dec.regimeEV >= 0 ? '#06d6a0' : '#ef4444'}">${(dec.regimeEV * 100).toFixed(4)}%</span>
              </div>
              <div style="height: 6px; background: var(--bg-tertiary); border-radius: var(--radius-full); overflow: hidden;">
                <div style="background: ${dec.regimeEV >= 0 ? '#06d6a0' : '#ef4444'}; width: ${Math.min(100, Math.abs(dec.regimeEV) * 1000)}%; height: 100%; border-radius: var(--radius-full);"></div>
              </div>
            </div>

          </div>
        `;
      }
    }

    // Update Trades List
    const tradesBody = this._container.querySelector('#live-trades-body');
    if (tradesBody) {
      if (this.state.trades.length === 0) {
        tradesBody.innerHTML = `
          <tr>
            <td colspan="5" class="text-muted" style="text-align: center; padding: 2rem 0;">Waiting for trade signals...</td>
          </tr>
        `;
      } else {
        tradesBody.innerHTML = this.state.trades.map(t => {
          const isLong = t.direction === 'LONG';
          const pnlVal = parseFloat(t.pnl);
          const isWin = pnlVal > 0;
          const pnlColor = pnlVal > 0 ? 'var(--color-success, #06d6a0)' : (pnlVal < 0 ? 'var(--color-danger, #ef4444)' : 'inherit');
          
          let govColor = 'inherit';
          if (t.governance === 'ALLOW') govColor = 'var(--color-success, #06d6a0)';
          else if (t.governance === 'REJECT') govColor = 'var(--color-danger, #ef4444)';
          else if (t.governance === 'CAPACITY_CONSTRAINED') govColor = 'var(--color-warning, #f59e0b)';

          return `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.03);">
              <td style="padding: 0.6rem 0;">#${t.index}</td>
              <td style="padding: 0.6rem 0;">
                <span class="badge" style="background: ${isLong ? 'rgba(6, 214, 160, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; color: ${isLong ? 'var(--color-success, #06d6a0)' : 'var(--color-danger, #ef4444)'}; font-size: 0.75rem; padding: 2px 6px; border-radius: var(--radius-xs, 4px); font-weight: bold;">
                  ${t.direction}
                </span>
              </td>
              <td style="padding: 0.6rem 0; text-align: right; font-weight: bold; color: var(--text-primary);">$${parseFloat(t.price).toFixed(2)}</td>
              <td style="padding: 0.6rem 0; text-align: right; font-weight: bold; color: ${pnlColor};">${t.pnl}</td>
              <td style="padding: 0.6rem 0; text-align: right;">
                <span style="color: ${govColor}; font-weight: var(--fw-semibold); font-size: 0.8rem;">${t.governance}</span>
              </td>
            </tr>
          `;
        }).join('');
      }
    }
    // Update ARL v3.1 Darwin Engine Dashboard
    if (this.state.arl) {
      const arl = this.state.arl;

      // 1. Update Global Evolution Metrics
      const genEl = this._container.querySelector('#darwin-generation');
      if (genEl) genEl.textContent = arl.generation;

      const ticksEl = this._container.querySelector('#darwin-ticks');
      if (ticksEl) ticksEl.textContent = arl.tick;

      const popEl = this._container.querySelector('#darwin-pop-size');
      if (popEl) popEl.textContent = arl.populationSize;

      const extEl = this._container.querySelector('#darwin-extinction-events');
      if (extEl) extEl.textContent = arl.extinctionEvents;

      const avgFitVal = this._container.querySelector('#avg-fitness-val');
      if (avgFitVal) avgFitVal.textContent = arl.avgFitness.toFixed(4);

      // 2. Update Dominant Strategy Genome
      if (arl.dominantGenome) {
        const dom = arl.dominantGenome;

        const domId = this._container.querySelector('#dominant-id');
        if (domId) domId.textContent = `ID: ${dom.id}`;

        const domEntry = this._container.querySelector('#dominant-entry-lookback');
        if (domEntry) domEntry.textContent = dom.entryLookback;

        const domExit = this._container.querySelector('#dominant-exit-lookback');
        if (domExit) domExit.textContent = dom.exitLookback;

        const domTh = this._container.querySelector('#dominant-threshold');
        if (domTh) domTh.textContent = dom.threshold.toFixed(4);

        const domRisk = this._container.querySelector('#dominant-risk');
        if (domRisk) domRisk.textContent = dom.risk.toFixed(2);

        const domEv = this._container.querySelector('#dominant-ev');
        if (domEv) {
          domEv.textContent = `${(dom.ev * 100).toFixed(4)}%`;
          domEv.style.color = dom.ev >= 0 ? 'var(--color-success, #06d6a0)' : 'var(--color-danger, #ef4444)';
        }

        const domEvVal = this._container.querySelector('#dominant-ev-val');
        if (domEvVal) {
          domEvVal.textContent = `${(dom.ev * 100).toFixed(4)}%`;
          domEvVal.style.color = dom.ev >= 0 ? 'var(--color-success, #06d6a0)' : 'var(--color-danger, #ef4444)';
        }

        const domSt = this._container.querySelector('#dominant-stability');
        if (domSt) domSt.textContent = dom.stability.toFixed(4);

        const domDd = this._container.querySelector('#dominant-drawdown');
        if (domDd) domDd.textContent = `${(dom.drawdown * 100).toFixed(4)}%`;

        const domFit = this._container.querySelector('#dominant-fitness');
        if (domFit) domFit.textContent = dom.fitness.toFixed(4);

        const domParents = this._container.querySelector('#dominant-parents');
        if (domParents) {
          domParents.textContent = dom.parents && dom.parents.length > 0 ? dom.parents.join(' × ') : 'None (Origin)';
        }

        const healthEl = this._container.querySelector('#dominant-health');
        if (healthEl) {
          if (dom.fitness > 0.15) {
            healthEl.textContent = 'DOMINANT';
            healthEl.style.color = '#00ff88';
            healthEl.style.background = 'rgba(0, 255, 136, 0.1)';
            healthEl.style.border = '1px solid rgba(0, 255, 136, 0.2)';
          } else {
            healthEl.textContent = 'EVOLVING';
            healthEl.style.color = '#ff9900';
            healthEl.style.background = 'rgba(255, 153, 0, 0.1)';
            healthEl.style.border = '1px solid rgba(255, 153, 0, 0.2)';
          }
        }
      }

      // 3. Update Sparkline Charts
      // Chart 1: Average Fitness
      const fitSparkEl = this._container.querySelector('#sparkline-avg-fitness');
      if (fitSparkEl) {
        const seriesData = this.state.avgFitnessHistory.length > 0 ? this.state.avgFitnessHistory : [0];
        if (!this._charts['avg_fitness']) {
          const options = {
            series: [{
              name: 'Avg Fitness',
              data: seriesData
            }],
            chart: {
              type: 'line',
              height: 60,
              sparkline: { enabled: true },
              animations: { enabled: false }
            },
            stroke: {
              curve: 'smooth',
              width: 2,
              colors: ['#3b82f6']
            },
            tooltip: {
              enabled: true,
              theme: 'dark',
              x: { show: false },
              y: {
                formatter: (val) => val.toFixed(4)
              }
            }
          };
          this._charts['avg_fitness'] = new ApexCharts(fitSparkEl, options);
          this._charts['avg_fitness'].render();
        } else {
          this._charts['avg_fitness'].updateSeries([{
            data: seriesData
          }]);
        }
      }

      // Chart 2: Dominant EV
      const evSparkEl = this._container.querySelector('#sparkline-dominant-ev');
      if (evSparkEl) {
        const seriesData = this.state.dominantEvHistory.length > 0 ? this.state.dominantEvHistory : [0];
        const lastEv = seriesData[seriesData.length - 1] || 0;
        if (!this._charts['dominant_ev']) {
          const options = {
            series: [{
              name: 'Dominant EV',
              data: seriesData
            }],
            chart: {
              type: 'line',
              height: 60,
              sparkline: { enabled: true },
              animations: { enabled: false }
            },
            stroke: {
              curve: 'smooth',
              width: 2,
              colors: [lastEv >= 0 ? '#00ff88' : '#ef4444']
            },
            tooltip: {
              enabled: true,
              theme: 'dark',
              x: { show: false },
              y: {
                formatter: (val) => `${(val * 100).toFixed(4)}%`
              }
            }
          };
          this._charts['dominant_ev'] = new ApexCharts(evSparkEl, options);
          this._charts['dominant_ev'].render();
        } else {
          this._charts['dominant_ev'].updateSeries([{
            data: seriesData
          }]);
          this._charts['dominant_ev'].updateOptions({
            stroke: {
              colors: [lastEv >= 0 ? '#00ff88' : '#ef4444']
            }
          });
        }
      }
    }

    // Update ARL v3.2 Meta-Selection Dashboard metrics
    if (this.state.arl) {
      const m = this.state.arl;

      const genEl = this._container.querySelector('#meta-gen');
      if (genEl) genEl.textContent = m.generation;

      const popEl = this._container.querySelector('#meta-pop');
      if (popEl) popEl.textContent = m.populationSize;

      const selEl = this._container.querySelector('#meta-sel');
      if (selEl) selEl.textContent = m.selectorCount;

      const evEl = this._container.querySelector('#meta-ev');
      if (evEl) {
        evEl.textContent = `${(m.dominantEV * 100).toFixed(4)}%`;
        evEl.style.color = m.dominantEV >= 0 ? 'var(--color-success, #06d6a0)' : 'var(--color-danger, #ef4444)';
      }

      if ((this._tickCount || 0) % 2 === 0) {
        this._renderSelectionHeatmap();
        this._updateMetaCharts();
        this._updateExtinctionUI();
      }
    }
  }

  _updateExtinctionUI() {
    if (!this._container || !this.state.extinction) return;
    const ext = this.state.extinction;

    // Update Connection Status Badge
    const connectionBadge = this._container.querySelector('#connection-status-badge');
    const connectionText = this._container.querySelector('#connection-status-text');
    if (connectionBadge && connectionText) {
      const mode = this.state.mode;
      const connState = this.state.connectionState;

      // Reset classes
      connectionBadge.className = 'live-connection-badge';
      
      if (mode === 'SIMULATION') {
        connectionBadge.classList.add('simulated');
        connectionText.textContent = 'SIMULATION ENGINE';
        connectionBadge.style.color = '#3b82f6';
        connectionBadge.style.background = 'rgba(59, 130, 246, 0.1)';
        connectionBadge.style.border = '1px solid rgba(59, 130, 246, 0.2)';
      } else {
        if (connState === 'CONNECTED') {
          connectionBadge.classList.add('active');
          connectionText.textContent = `${mode} FEED CONNECTED`;
          connectionBadge.style.color = '#00ff88';
          connectionBadge.style.background = 'rgba(0, 255, 136, 0.1)';
          connectionBadge.style.border = '1px solid rgba(0, 255, 136, 0.2)';
        } else if (connState === 'RECONNECTING') {
          connectionBadge.classList.add('reconnecting');
          connectionText.textContent = `${mode} RECONNECTING...`;
          connectionBadge.style.color = '#ff9900';
          connectionBadge.style.background = 'rgba(255, 153, 0, 0.1)';
          connectionBadge.style.border = '1px solid rgba(255, 153, 0, 0.2)';
        } else if (connState === 'DEGRADED') {
          connectionBadge.classList.add('degraded');
          connectionText.textContent = `${mode} FEED DEGRADED`;
          connectionBadge.style.color = '#f59e0b';
          connectionBadge.style.background = 'rgba(245, 158, 11, 0.1)';
          connectionBadge.style.border = '1px solid rgba(245, 158, 11, 0.2)';
        } else if (connState === 'FAILED') {
          connectionBadge.classList.add('failed');
          connectionText.textContent = `${mode} FEED FAILED`;
          connectionBadge.style.color = '#ef4444';
          connectionBadge.style.background = 'rgba(239, 68, 68, 0.1)';
          connectionBadge.style.border = '1px solid rgba(239, 68, 68, 0.2)';
        }
      }
    }

    // 1. Ecosystem State Badge and Insight Ticker
    const badge = this._container.querySelector('#ecosystem-state-badge');
    if (badge) {
      badge.textContent = ext.ecosystemState;
      badge.className = `badge health-badge`;

      if (ext.ecosystemState === 'NORMAL') {
        badge.style.color = '#00ff88';
        badge.style.background = 'rgba(0, 255, 136, 0.1)';
        badge.style.border = '1px solid rgba(0, 255, 136, 0.2)';
      } else if (ext.ecosystemState === 'STRESS') {
        badge.style.color = '#ff9900';
        badge.style.background = 'rgba(255, 153, 0, 0.1)';
        badge.style.border = '1px solid rgba(255, 153, 0, 0.2)';
      } else if (ext.ecosystemState === 'CRITICAL' || ext.ecosystemState === 'COLLAPSED') {
        badge.style.color = '#ef4444';
        badge.style.background = 'rgba(239, 68, 68, 0.1)';
        badge.style.border = '1px solid rgba(239, 68, 68, 0.2)';
      } else if (ext.ecosystemState === 'RESEEDING') {
        badge.style.color = '#3b82f6';
        badge.style.background = 'rgba(59, 130, 246, 0.1)';
        badge.style.border = '1px solid rgba(59, 130, 246, 0.2)';
      }
    }

    const insightText = this._container.querySelector('#insight-text');
    if (insightText) {
      insightText.textContent = ext.insightMessage;
    }

    const banner = this._container.querySelector('#insight-banner');
    if (banner) {
      if (ext.ecosystemState === 'NORMAL') banner.style.borderLeftColor = 'var(--color-edge, #00d6a0)';
      else if (ext.ecosystemState === 'STRESS') banner.style.borderLeftColor = 'var(--color-warning, #f59e0b)';
      else if (ext.ecosystemState === 'CRITICAL' || ext.ecosystemState === 'COLLAPSED') banner.style.borderLeftColor = 'var(--color-danger, #ef4444)';
      else if (ext.ecosystemState === 'RESEEDING') banner.style.borderLeftColor = '#3b82f6';
    }

    // 2. Stress Level Gauge
    const stressVal = this._container.querySelector('#stress-val');
    if (stressVal) {
      stressVal.textContent = `${(ext.ecosystemStress * 100).toFixed(1)}%`;
    }
    const stressFill = this._container.querySelector('#stress-fill');
    if (stressFill) {
      stressFill.style.width = `${ext.ecosystemStress * 100}%`;
      const green = Math.floor(214 * (1 - ext.ecosystemStress));
      const red = Math.floor(239 * ext.ecosystemStress);
      stressFill.style.backgroundColor = `rgb(${red}, ${green}, 40)`;
    }

    // 3. Shannon Genetic Diversity
    const diversityVal = this._container.querySelector('#diversity-val');
    if (diversityVal) {
      diversityVal.textContent = ext.diversity.toFixed(4);
      if (ext.diversity > 0.7) {
        diversityVal.style.color = 'var(--color-success, #06d6a0)';
      } else if (ext.diversity > 0.4) {
        diversityVal.style.color = 'var(--color-warning, #f59e0b)';
      } else {
        diversityVal.style.color = 'var(--color-danger, #ef4444)';
      }
    }

    // 4. Niches Mapping (Clusters Distribution)
    const nichesGrid = this._container.querySelector('#niches-grid');
    if (nichesGrid) {
      if (ext.species.length === 0) {
        nichesGrid.innerHTML = `<div class="text-muted" style="font-size: 0.8rem; font-family: var(--font-mono);">No active species mapped.</div>`;
      } else {
        nichesGrid.innerHTML = ext.species.map(sp => {
          return `
            <div class="niche-node" style="background: ${sp.color}; border: 1px solid rgba(255,255,255,0.1); padding: 6px 12px; border-radius: 4px; display: inline-flex; flex-direction: column; align-items: center; justify-content: center; min-width: 60px; transition: transform 0.2s ease; cursor: default;" title="Species ${sp.id}: members=${sp.memberCount}, fitness=${sp.avgFitness}, dominance=${sp.dominance}%">
              <span style="font-family: var(--font-mono); font-size: 0.75rem; font-weight: bold; color: #000; text-shadow: 0 1px 1px rgba(255,255,255,0.6);">${sp.id}</span>
              <span style="font-family: var(--font-mono); font-size: 0.65rem; color: #000; font-weight: bold; opacity: 0.8;">${sp.dominance}%</span>
            </div>
          `;
        }).join('');
      }
    }

    // 5. Extinction Event Logs
    const logsBody = this._container.querySelector('#extinction-logs-body');
    if (logsBody) {
      if (ext.extinctionLogs.length === 0) {
        logsBody.innerHTML = `
          <tr>
            <td colspan="3" class="text-muted" style="text-align: center; padding: 20px 0;">No extinction events logged.</td>
          </tr>
        `;
      } else {
        logsBody.innerHTML = ext.extinctionLogs.map(log => {
          let typeColor = 'var(--text-secondary)';
          if (log.type === 'BLACK_SWAN') typeColor = 'var(--color-danger, #ef4444)';
          else if (log.type === 'CLONAL_COLLAPSE') typeColor = 'var(--color-warning, #f59e0b)';
          else if (log.type === 'STATE_TRANSITION') typeColor = '#3b82f6';

          return `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.03);">
              <td style="padding: 4px 0; color: var(--text-muted); font-size: 0.7rem;">${log.timestamp}</td>
              <td style="padding: 4px 0; font-weight: bold; color: ${typeColor};">${log.type}</td>
              <td style="padding: 4px 0; color: var(--text-primary); max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${log.description}">${log.description}</td>
            </tr>
          `;
        }).join('');
      }
    }

    // 6. Black Swan Effect (Visual Screen Shake)
    const pageContainer = this._container.querySelector('.page-container');
    if (pageContainer) {
      if (ext.activeBlackSwan) {
        pageContainer.classList.add('black-swan-shake');
      } else {
        pageContainer.classList.remove('black-swan-shake');
      }
    }
  }

  _renderSelectionHeatmap() {
    const el = this._container.querySelector("#selectionHeatmap");
    if (!el) return;

    el.innerHTML = "";

    this.metaData.selectionPressure.forEach((v, i) => {
      const cell = document.createElement("div");

      const intensity = Math.min(1, Math.max(0, v));
      // Red represents high selection pressure (killing strategies), green represents low pressure
      const red = Math.floor(239 * intensity);
      const green = Math.floor(214 * (1 - intensity));
      const blue = Math.floor(160 * (1 - intensity));

      cell.style.background = `rgb(${red}, ${green}, ${blue})`;
      cell.className = "heatmap-cell";
      cell.style.height = "24px";
      cell.style.fontSize = "9px";
      cell.style.display = "flex";
      cell.style.alignItems = "center";
      cell.style.justifyContent = "center";
      cell.style.borderRadius = "2px";
      cell.style.color = intensity > 0.6 ? "white" : "black";
      cell.style.fontWeight = "bold";
      cell.style.fontFamily = "var(--font-mono)";

      cell.innerHTML = `<span>${i}</span>`;
      cell.title = `Bin ${i} Selection Pressure: ${(v * 100).toFixed(1)}%`;

      el.appendChild(cell);
    });
  }

  _initMetaCharts() {
    const evEl = this._container.querySelector("#evChart");
    const fitEl = this._container.querySelector("#fitnessChart");
    if (!evEl || !fitEl) return;

    this.metaCharts.ev = new ApexCharts(evEl, {
      chart: {
        type: "line",
        height: 200,
        animations: { enabled: false }
      },
      series: [{
        name: "EV Cumulative",
        data: this.metaData.evHistory
      }],
      stroke: { width: 2, curve: 'smooth', colors: ['#00ff88'] },
      theme: { mode: "dark" },
      title: { text: "Dominant Strategy EV Trend", style: { color: 'var(--text-primary)', fontFamily: 'var(--font-ui)' } },
      tooltip: { theme: 'dark' }
    });
    this.metaCharts.ev.render();

    this.metaCharts.fitness = new ApexCharts(fitEl, {
      chart: {
        type: "line",
        height: 200,
        animations: { enabled: false }
      },
      series: [{
        name: "Population Fitness",
        data: this.metaData.fitnessHistory
      }],
      stroke: { width: 2, curve: 'smooth', colors: ['#3b82f6'] },
      theme: { mode: "dark" },
      title: { text: "Meta-Fitness Evolution", style: { color: 'var(--text-primary)', fontFamily: 'var(--font-ui)' } },
      tooltip: { theme: 'dark' }
    });
    this.metaCharts.fitness.render();
  }

  _updateMetaCharts() {
    if (this.metaCharts.ev) {
      this.metaCharts.ev.updateSeries([{
        data: this.metaData.evHistory
      }]);
    }

    if (this.metaCharts.fitness) {
      this.metaCharts.fitness.updateSeries([{
        data: this.metaData.fitnessHistory
      }]);
    }
  }
}
 