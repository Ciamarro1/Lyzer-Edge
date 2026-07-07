// Core runtime imports — Signal → Kernel → Execution only.
// All epistemic analysis (ECA, SML, FMC, ARFI, CSI, CoC) runs OFFLINE in verify_mne.js.
import { BTC_HISTORICAL, ETH_HISTORICAL } from '../db/historicalData.js';
import { SignalEngine } from '../engine/signalEngine.js';
import { TruthKernel } from '../engine/kernel.js';

// Non-adaptive runtime constants (frozen until v0.4)
const RISK_REWARD = 2;   // Take Profit = 2 × R
const R_DISTANCE = 0.10; // Stop distance = 10% of entry price

export class DecisionStream {
  /**
   * @param {Object} [options]
   * @param {{ version: string, validFrom: string, confidenceThreshold: number }} [options.config]
   *   Injected from activeConfig (src/db/activeConfig.js) via app.js route factory.
   *   Runtime never imports activeConfig directly — it receives the value as a dependency.
   */
  constructor({ config } = {}) {
    this._container = null;

    // Resolve injected threshold — fallback to 50 for safety (same as v0.1 baseline)
    const threshold = config?.confidenceThreshold ?? 50;

    // Runtime engines — only what changes a decision
    this.signalEngine = new SignalEngine();
    this.truthKernel = new TruthKernel({ masterSwitchThreshold: threshold });

    // Expose loaded config version for UI display (read-only)
    this._configVersion = config?.version ?? 'default';

    // Stream state
    this.selectedAsset = 'BTCUSDT';
    this.currentIndex = 51; // Warmup EMA requires 50 candles
    this.isPlaying = false;
    this.intervalMs = 400;
    this.timer = null;

    // Paper Account state
    this.balance = 10000;
    this.initialBalance = 10000;
    this.peakBalance = 10000;
    this.drawdown = 0;
    this.position = null;
    this.equityHistory = [{ index: 50, balance: 10000 }];
    this.trades = [];

    // Console logs
    this.terminalLogs = [];
  }

  async mount(container) {
    this._container = container;
    this._renderBase();
    this._bindEvents();
    this.tick(); // Run initial evaluation
  }

  unmount() {
    this.pause();
    if (this._container) {
      this._container.innerHTML = '';
      this._container = null;
    }
  }

  _renderBase() {
    if (!this._container) return;

    this._container.innerHTML = `
      <style>
        .ds-layout {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.25rem;
          max-width: 1300px;
          margin: 0 auto;
          color: #d1d5db;
          font-family: var(--font-ui, system-ui, sans-serif);
        }
        @media(min-width: 1024px) {
          .ds-layout {
            grid-template-columns: 7fr 5fr;
          }
        }
        .ds-card {
          background: #0d1321;
          border: 1px solid #1e293b;
          border-radius: 4px;
          padding: 1.25rem;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
          position: relative;
          overflow: hidden;
        }
        .ds-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          border-bottom: 1px solid #1e293b;
          padding-bottom: 0.5rem;
        }
        .ds-card-title {
          font-size: 0.95rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #f8fafc;
          margin: 0;
        }
        .ds-btn {
          background: #1e293b;
          color: #f8fafc;
          border: 1px solid #334155;
          padding: 0.5rem 1rem;
          border-radius: 2px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .ds-btn:hover {
          background: #334155;
          border-color: #475569;
        }
        .ds-btn-primary {
          background: var(--color-edge, #06d6a0);
          color: #070a13;
          border-color: var(--color-edge, #06d6a0);
        }
        .ds-btn-primary:hover {
          background: #05b88a;
          border-color: #05b88a;
        }
        .ds-btn-danger {
          background: #ef4444;
          color: #ffffff;
          border-color: #ef4444;
        }
        .ds-btn-danger:hover {
          background: #dc2626;
          border-color: #dc2626;
        }
        /* Console Terminal Styles */
        .console-terminal {
          background: #070b13;
          border: 1px solid #1e293b;
          border-radius: 2px;
          height: 320px;
          overflow-y: auto;
          padding: 0.75rem;
          font-family: var(--font-mono, 'Courier New', Courier, monospace);
          font-size: 11px;
          line-height: 1.5;
          color: #e2e8f0;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .console-line {
          white-space: pre-wrap;
          word-break: break-all;
          border-left: 2px solid transparent;
          padding-left: 6px;
        }
        .console-line-info { border-left-color: #64748b; }
        .console-line-buy { border-left-color: var(--color-edge, #06d6a0); color: var(--color-edge, #06d6a0); }
        .console-line-sell { border-left-color: #ef4444; color: #ef4444; }
        .console-line-warn { border-left-color: #f59e0b; color: #f59e0b; }
        .console-line-critical { border-left-color: #dc2626; color: #ef4444; font-weight: bold; }
        
        /* Indicators and telemetry layout */
        .grid-2col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
        }
        .telemetry-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0;
          border-bottom: 1px solid rgba(30, 41, 59, 0.4);
        }
        .telemetry-label {
          font-size: 0.75rem;
          color: #94a3b8;
        }
        .telemetry-value {
          font-family: var(--font-mono, monospace);
          font-size: 0.8rem;
          font-weight: 700;
        }
        .progress-bar-container {
          width: 100%;
          height: 6px;
          background: #1e293b;
          border-radius: 1px;
          overflow: hidden;
          margin-top: 4px;
        }
        .progress-bar-fill {
          height: 100%;
          transition: width 0.3s ease;
        }
        
        /* Slider overrides */
        .ds-slider {
          -webkit-appearance: none;
          width: 100%;
          height: 4px;
          background: #1e293b;
          outline: none;
          border-radius: 2px;
        }
        .ds-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: var(--color-edge, #06d6a0);
          cursor: pointer;
          transition: transform 0.1s ease;
        }
        .ds-slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }

        .veto-alert {
          border-left: 4px solid #ef4444;
          background: rgba(239, 68, 68, 0.1);
          color: #fca5a5;
          padding: 0.75rem;
          border-radius: 2px;
          font-size: 0.75rem;
          margin-top: 0.5rem;
        }
        .clean-state {
          border-left: 4px solid var(--color-edge, #06d6a0);
          background: rgba(6, 214, 160, 0.05);
          color: #a7f3d0;
          padding: 0.75rem;
          border-radius: 2px;
          font-size: 0.75rem;
          margin-top: 0.5rem;
        }
      </style>

      <div class="page-container">
        <div class="page-header" style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem;">
          <div>
            <h1 class="page-title">Decision Stream</h1>
            <p class="page-subtitle">Real-time trading execution & Evolutionary Constitutional Layer telemetry</p>
          </div>
          
          <!-- Controls Panel -->
          <div style="display: flex; align-items: center; gap: 0.75rem; background: #0c1220; border: 1px solid #1e293b; padding: 0.5rem 1rem; border-radius: 4px;">
            <div style="display: flex; flex-direction: column; gap: 2px;">
              <span style="font-size: 0.65rem; color: #64748b; font-weight: bold; text-transform: uppercase;">Asset</span>
              <select id="asset-select" style="background: transparent; color: #f8fafc; border: none; font-size: 0.8rem; font-weight: 700; outline: none; cursor: pointer;">
                <option value="BTCUSDT" selected style="background: #0c1220;">BTCUSDT</option>
                <option value="ETHUSDT" style="background: #0c1220;">ETHUSDT</option>
              </select>
            </div>
            
            <div style="width: 1px; height: 28px; background: #1e293b;"></div>

            <button id="btn-play" class="ds-btn ds-btn-primary" style="padding: 0.35rem 0.75rem; font-size: 0.7rem;">Play</button>
            <button id="btn-reset" class="ds-btn" style="padding: 0.35rem 0.75rem; font-size: 0.7rem;">Reset</button>
            
            <div style="width: 1px; height: 28px; background: #1e293b;"></div>

            <div style="display: flex; flex-direction: column; gap: 4px; min-width: 100px;">
              <div style="display: flex; justify-content: space-between; font-size: 0.65rem; color: #64748b; font-weight: bold; text-transform: uppercase;">
                <span>Speed</span>
                <span id="speed-val" style="color: var(--color-edge, #06d6a0);">400ms</span>
              </div>
              <input type="range" id="speed-slider" class="ds-slider" min="100" max="1000" step="50" value="400" />
            </div>
          </div>
        </div>

        <div class="ds-layout">
          <!-- Left Column -->
          <div style="display: flex; flex-direction: column; gap: 1.25rem;">
            <!-- Console Terminal Card -->
            <div class="ds-card" style="display: flex; flex-direction: column; gap: 0.75rem;">
              <div class="ds-card-header" style="margin-bottom: 0.5rem;">
                <h3 class="ds-card-title">Live Core Decision Log</h3>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span id="terminal-pulse" style="width: 7px; height: 7px; border-radius: 50%; background: #64748b; display: inline-block;"></span>
                  <span id="terminal-status-text" style="font-size: 0.65rem; font-weight: 600; text-transform: uppercase; color: #64748b;">Idle</span>
                </div>
              </div>
              <div class="console-terminal" id="terminal-console">
                <div class="console-line console-line-info">[SYSTEM] Decision Stream initialized. Set asset and click Play to begin simulation loop...</div>
              </div>
            </div>

            <!-- Decision Explanation Panel -->
            <div class="ds-card">
              <div class="ds-card-header">
                <h3 class="ds-card-title">Indicators & Signal Explanation</h3>
              </div>
              <div class="grid-2col">
                <div>
                  <div class="telemetry-row">
                    <span class="telemetry-label">Current Price</span>
                    <span id="tel-price" class="telemetry-value">$0.00</span>
                  </div>
                  <div class="telemetry-row">
                    <span class="telemetry-label">Volume</span>
                    <span id="tel-volume" class="telemetry-value">0.00</span>
                  </div>
                  <div class="telemetry-row">
                    <span class="telemetry-label">EMA Fast (20)</span>
                    <span id="tel-ema20" class="telemetry-value">$0.00</span>
                  </div>
                  <div class="telemetry-row">
                    <span class="telemetry-label">EMA Slow (50)</span>
                    <span id="tel-ema50" class="telemetry-value">$0.00</span>
                  </div>
                </div>
                <div>
                  <div class="telemetry-row" style="flex-direction: column; align-items: flex-start; gap: 3px;">
                    <div style="display: flex; justify-content: space-between; width: 100%;">
                      <span class="telemetry-label">Relative Strength Index (RSI 14)</span>
                      <span id="tel-rsi" class="telemetry-value" style="color: #60a5fa;">50.00</span>
                    </div>
                    <div class="progress-bar-container">
                      <div id="bar-rsi" class="progress-bar-fill" style="width: 50%; background: #3b82f6;"></div>
                    </div>
                    <div style="display: flex; justify-content: space-between; width: 100%; font-size: 0.6rem; color: #475569; margin-top: 1px;">
                      <span>Oversold (30)</span>
                      <span>Overbought (70)</span>
                    </div>
                  </div>
                  <div class="telemetry-row">
                    <span class="telemetry-label">Market Volatility</span>
                    <span id="tel-volatility" class="telemetry-value" style="text-transform: uppercase;">Normal</span>
                  </div>
                  <div class="telemetry-row">
                    <span class="telemetry-label">Trend Strength</span>
                    <span id="tel-trend" class="telemetry-value" style="text-transform: uppercase;">Moderate</span>
                  </div>
                </div>
              </div>
              <div style="margin-top: 1rem; border-top: 1px dashed #1e293b; padding-top: 0.75rem;">
                <div style="font-size: 0.7rem; color: #64748b; font-weight: bold; text-transform: uppercase; margin-bottom: 4px;">Signal Reasons</div>
                <div id="tel-reasons" style="display: flex; flex-wrap: wrap; gap: 4px;">
                  <span style="font-size: 0.65rem; color: #94a3b8; background: #1e293b; padding: 2px 6px; border-radius: 1px;">N/A</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Column -->
          <div style="display: flex; flex-direction: column; gap: 1.25rem;">
            <!-- Kernel Breakdown -->
            <div class="ds-card">
              <div class="ds-card-header">
                <h3 class="ds-card-title">Truth Kernel Multi-Context Solver</h3>
              </div>
              <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                <!-- Context weights -->
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; margin-bottom: 2px;">
                    <span style="color: #94a3b8;">Regime Context (35% weight)</span>
                    <span id="val-ctx-regime" class="telemetry-value">0%</span>
                  </div>
                  <div class="progress-bar-container">
                    <div id="bar-ctx-regime" class="progress-bar-fill" style="width: 0%; background: #60a5fa;"></div>
                  </div>
                </div>
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; margin-bottom: 2px;">
                    <span style="color: #94a3b8;">Timeframe Context (15% weight)</span>
                    <span id="val-ctx-timeframe" class="telemetry-value">0%</span>
                  </div>
                  <div class="progress-bar-container">
                    <div id="bar-ctx-timeframe" class="progress-bar-fill" style="width: 0%; background: #60a5fa;"></div>
                  </div>
                </div>
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; margin-bottom: 2px;">
                    <span style="color: #94a3b8;">Correlation Context (25% weight)</span>
                    <span id="val-ctx-correlation" class="telemetry-value">0%</span>
                  </div>
                  <div class="progress-bar-container">
                    <div id="bar-ctx-correlation" class="progress-bar-fill" style="width: 0%; background: #60a5fa;"></div>
                  </div>
                </div>
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; margin-bottom: 2px;">
                    <span style="color: #94a3b8;">Behavior Context (25% weight)</span>
                    <span id="val-ctx-behavior" class="telemetry-value">0%</span>
                  </div>
                  <div class="progress-bar-container">
                    <div id="bar-ctx-behavior" class="progress-bar-fill" style="width: 0%; background: #60a5fa;"></div>
                  </div>
                </div>
                
                <!-- Equilibrium and master confidence -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-top: 0.75rem; border-top: 1px solid #1e293b; padding-top: 0.75rem;">
                  <div style="background: #080d1a; padding: 0.5rem; border: 1px solid #1e293b; border-radius: 2px; text-align: center;">
                    <div style="font-size: 0.65rem; color: #64748b; font-weight: bold; text-transform: uppercase;">System Equilibrium</div>
                    <div id="tel-equilibrium" style="font-size: 1.15rem; font-weight: bold; color: #f8fafc; font-family: var(--font-mono, monospace); margin-top: 2px;">0.000</div>
                  </div>
                  <div style="background: #080d1a; padding: 0.5rem; border: 1px solid #1e293b; border-radius: 2px; text-align: center;">
                    <div style="font-size: 0.65rem; color: #64748b; font-weight: bold; text-transform: uppercase;">Master Confidence</div>
                    <div id="tel-masterconf" style="font-size: 1.15rem; font-weight: bold; color: #f8fafc; font-family: var(--font-mono, monospace); margin-top: 2px;">0%</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- ECA Overlay -->
            <div class="ds-card">
              <div class="ds-card-header">
                <h3 class="ds-card-title">ECA Evolutionary Overlay</h3>
              </div>
              
              <!-- Core ECA Budget details -->
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; margin-bottom: 0.75rem;">
                <div style="background: #080d1a; border: 1px solid #1e293b; padding: 0.4rem; text-align: center; border-radius: 1px;">
                  <div style="font-size: 0.55rem; color: #64748b; font-weight: bold; text-transform: uppercase; line-height: 1;">Daily Proposals</div>
                  <div id="eca-proposals" style="font-family: var(--font-mono, monospace); font-size: 0.85rem; font-weight: bold; color: #94a3b8; margin-top: 2px;">0 / 10</div>
                </div>
                <div style="background: #080d1a; border: 1px solid #1e293b; padding: 0.4rem; text-align: center; border-radius: 1px;">
                  <div style="font-size: 0.55rem; color: #64748b; font-weight: bold; text-transform: uppercase; line-height: 1;">Proposal Failures</div>
                  <div id="eca-failures" style="font-family: var(--font-mono, monospace); font-size: 0.85rem; font-weight: bold; color: #94a3b8; margin-top: 2px;">0 / 3</div>
                </div>
                <div style="background: #080d1a; border: 1px solid #1e293b; padding: 0.4rem; text-align: center; border-radius: 1px;">
                  <div style="font-size: 0.55rem; color: #64748b; font-weight: bold; text-transform: uppercase; line-height: 1;">Cognitive Cost</div>
                  <div id="eca-cost" style="font-family: var(--font-mono, monospace); font-size: 0.85rem; font-weight: bold; color: #94a3b8; margin-top: 2px;">0 / 50</div>
                </div>
              </div>

              <!-- Veto status and messages -->
              <div id="eca-veto-panel" class="clean-state">
                CONSTITUTIONAL INTEGRITY DETECTED - 0 active vetoes.
              </div>

              <!-- Last Court Verdict details -->
              <div style="margin-top: 0.75rem; border-top: 1px dashed #1e293b; padding-top: 0.5rem; font-size: 0.75rem;">
                <div style="font-size: 0.65rem; color: #64748b; font-weight: bold; text-transform: uppercase; margin-bottom: 3px;">Last Court Verdict</div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                  <span style="color: #64748b;">Verdict Status:</span>
                  <strong id="court-verdict-val" style="color: #94a3b8; font-family: var(--font-mono, monospace); text-transform: uppercase;">None</strong>
                </div>
                <div style="display: flex; flex-direction: column; gap: 2px; margin-top: 2px;">
                  <span style="color: #64748b;">Verdict Details / Reasons:</span>
                  <div id="court-reasons-val" style="color: #94a3b8; font-size: 0.7rem; background: #070b13; padding: 4px; border: 1px solid #1e293b; min-height: 28px; font-family: var(--font-mono, monospace); border-radius: 1px; margin-top: 2px;">No evaluations yet.</div>
                </div>
              </div>
            </div>

            <!-- Paper Account Widget -->
            <div class="ds-card" style="display: flex; flex-direction: column; gap: 0.75rem;">
              <div class="ds-card-header" style="margin-bottom: 0;">
                <h3 class="ds-card-title">Paper Account Simulation</h3>
                <span id="tel-pnl" class="badge badge-plain" style="font-weight: bold; font-size: 0.75rem; padding: 2px 6px;">+0.00%</span>
              </div>
              
              <!-- Telemetry indicators for account -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                <div style="background: #080d1a; border: 1px solid #1e293b; padding: 0.5rem; border-radius: 2px;">
                  <div style="font-size: 0.6rem; color: #64748b; font-weight: bold; text-transform: uppercase;">Account Balance</div>
                  <div id="tel-balance" style="font-size: 1.1rem; font-weight: bold; font-family: var(--font-mono, monospace); color: #f8fafc; margin-top: 2px;">$10,000.00</div>
                </div>
                <div style="background: #080d1a; border: 1px solid #1e293b; padding: 0.5rem; border-radius: 2px;">
                  <div style="font-size: 0.6rem; color: #64748b; font-weight: bold; text-transform: uppercase;">Max Drawdown</div>
                  <div id="tel-drawdown" style="font-size: 1.1rem; font-weight: bold; font-family: var(--font-mono, monospace); color: #ef4444; margin-top: 2px;">0.00%</div>
                </div>
              </div>
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem;">
                <div style="background: #080d1a; border: 1px solid #1e293b; padding: 0.4rem; text-align: center; border-radius: 2px;">
                  <div style="font-size: 0.55rem; color: #64748b; font-weight: bold; text-transform: uppercase;">Trades</div>
                  <div id="tel-trades-count" style="font-family: var(--font-mono, monospace); font-size: 0.85rem; font-weight: bold; color: #94a3b8; margin-top: 2px;">0</div>
                </div>
                <div style="background: #080d1a; border: 1px solid #1e293b; padding: 0.4rem; text-align: center; border-radius: 2px;">
                  <div style="font-size: 0.55rem; color: #64748b; font-weight: bold; text-transform: uppercase;">Win Rate</div>
                  <div id="tel-win-rate" style="font-family: var(--font-mono, monospace); font-size: 0.85rem; font-weight: bold; color: #94a3b8; margin-top: 2px;">0.0%</div>
                </div>
                <div style="background: #080d1a; border: 1px solid #1e293b; padding: 0.4rem; text-align: center; border-radius: 2px;">
                  <div style="font-size: 0.55rem; color: #64748b; font-weight: bold; text-transform: uppercase;">Profit Factor</div>
                  <div id="tel-profit-factor" style="font-family: var(--font-mono, monospace); font-size: 0.85rem; font-weight: bold; color: #94a3b8; margin-top: 2px;">0.00</div>
                </div>
              </div>

              <!-- Mini SVG Equity Curve -->
              <div style="background: #070b13; border: 1px solid #1e293b; border-radius: 2px; padding: 0.5rem; min-height: 130px; display: flex; align-items: center; justify-content: center;">
                <div id="equity-chart-container" style="width: 100%;">
                  <!-- SVG injected here -->
                </div>
              </div>

              <!-- Position Tracker -->
              <div style="border-top: 1px solid #1e293b; padding-top: 0.5rem; display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem;">
                <span style="color: #64748b;">Active Position:</span>
                <span id="active-pos-val" style="font-weight: 700; font-family: var(--font-mono, monospace); color: #94a3b8;">NONE</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  _bindEvents() {
    if (!this._container) return;

    const select = this._container.querySelector('#asset-select');
    select?.addEventListener('change', (e) => {
      this.selectedAsset = e.target.value;
      this.reset();
    });

    const btnPlay = this._container.querySelector('#btn-play');
    btnPlay?.addEventListener('click', () => {
      if (this.isPlaying) {
        this.pause();
      } else {
        this.play();
      }
    });

    const btnReset = this._container.querySelector('#btn-reset');
    btnReset?.addEventListener('click', () => {
      this.reset();
    });

    const speedSlider = this._container.querySelector('#speed-slider');
    const speedVal = this._container.querySelector('#speed-val');
    speedSlider?.addEventListener('input', (e) => {
      this.intervalMs = parseInt(e.target.value, 10);
      if (speedVal) speedVal.textContent = `${this.intervalMs}ms`;
      if (this.isPlaying) {
        // Restart timer with new speed
        this.pause();
        this.play();
      }
    });
  }

  play() {
    this.isPlaying = true;
    const btnPlay = this._container?.querySelector('#btn-play');
    if (btnPlay) {
      btnPlay.textContent = 'Pause';
      btnPlay.classList.remove('ds-btn-primary');
      btnPlay.classList.add('ds-btn-danger');
    }
    
    const pulse = this._container?.querySelector('#terminal-pulse');
    const statusText = this._container?.querySelector('#terminal-status-text');
    if (pulse) {
      pulse.style.background = 'var(--color-edge, #06d6a0)';
      pulse.style.animation = 'pulseGlow 1.5s infinite';
    }
    if (statusText) {
      statusText.textContent = 'Streaming';
      statusText.style.color = 'var(--color-edge, #06d6a0)';
    }

    this.timer = setInterval(() => this.tick(), this.intervalMs);
  }

  pause() {
    this.isPlaying = false;
    const btnPlay = this._container?.querySelector('#btn-play');
    if (btnPlay) {
      btnPlay.textContent = 'Play';
      btnPlay.classList.remove('ds-btn-danger');
      btnPlay.classList.add('ds-btn-primary');
    }
    
    const pulse = this._container?.querySelector('#terminal-pulse');
    const statusText = this._container?.querySelector('#terminal-status-text');
    if (pulse) {
      pulse.style.background = '#64748b';
      pulse.style.animation = 'none';
    }
    if (statusText) {
      statusText.textContent = 'Paused';
      statusText.style.color = '#64748b';
    }

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  reset() {
    this.pause();
    this.currentIndex = 51;
    this.balance = 10000;
    this.initialBalance = 10000;
    this.peakBalance = 10000;
    this.drawdown = 0;
    this.position = null;
    this.equityHistory = [{ index: 50, balance: 10000 }];
    this.trades = [];
    this.terminalLogs = [];

    // Reset console
    const consoleContainer = this._container?.querySelector('#terminal-console');
    if (consoleContainer) {
      consoleContainer.innerHTML = `<div class="console-line console-line-info">[SYSTEM] Decision Stream reset. Select asset and click Play.</div>`;
    }

    // Refresh UI
    this.tick();
  }

  addTerminalLog(text, type = 'info') {
    this.terminalLogs.push({ text, type });
    if (this.terminalLogs.length > 100) {
      this.terminalLogs.shift();
    }

    const consoleContainer = this._container?.querySelector('#terminal-console');
    if (consoleContainer) {
      const lineClass = `console-line console-line-${type}`;
      const lineEl = document.createElement('div');
      lineEl.className = lineClass;
      lineEl.textContent = text;
      consoleContainer.appendChild(lineEl);
      
      // Auto scroll
      consoleContainer.scrollTop = consoleContainer.scrollHeight;
    }
  }

  formatTime(timestamp) {
    const d = new Date(timestamp);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  calculateCorrelation(arr1, arr2) {
    if (arr1.length === 0 || arr2.length === 0) return 1.0;
    const n = Math.min(arr1.length, arr2.length);
    const mean1 = arr1.reduce((sum, val) => sum + val, 0) / n;
    const mean2 = arr2.reduce((sum, val) => sum + val, 0) / n;

    let num = 0;
    let den1 = 0;
    let den2 = 0;

    for (let i = 0; i < n; i++) {
      const diff1 = arr1[i] - mean1;
      const diff2 = arr2[i] - mean2;
      num += diff1 * diff2;
      den1 += diff1 * diff1;
      den2 += diff2 * diff2;
    }

    if (den1 === 0 || den2 === 0) return 1.0;
    return num / Math.sqrt(den1 * den2);
  }

  closePosition(closePrice, reasonCode) {
    if (!this.position) return;

    let tradePnL = 0;
    if (this.position.type === 'LONG') {
      tradePnL = (closePrice - this.position.entryPrice) * this.position.amount;
    } else {
      tradePnL = (this.position.entryPrice - closePrice) * this.position.amount;
    }

    this.balance += tradePnL;
    
    const tradeResult = {
      type: this.position.type,
      entryPrice: this.position.entryPrice,
      exitPrice: closePrice,
      entryIndex: this.position.entryIndex,
      exitIndex: this.currentIndex,
      pnl: tradePnL,
      pnlPct: (tradePnL / this.initialBalance) * 100
    };
    
    this.trades.push(tradeResult);
    
    const logType = tradePnL >= 0 ? 'buy' : 'sell';
    const profitSign = tradePnL >= 0 ? '+' : '';
    this.addTerminalLog(
      `[TRADE EXIT] Closed ${this.position.type} @ $${closePrice} | PnL: ${profitSign}$${tradePnL.toFixed(2)} (${tradeResult.pnlPct.toFixed(2)}%) | Reason: ${reasonCode}`,
      logType
    );

    this.position = null;
  }

  tick() {
    const candles = this.selectedAsset === 'BTCUSDT' ? BTC_HISTORICAL : ETH_HISTROLLER_MOCK();
    
    function ETH_HISTROLLER_MOCK() {
      return ETH_HISTORICAL;
    }

    if (this.currentIndex >= candles.length) {
      this.pause();
      this.addTerminalLog(`[SYSTEM] End of historical candle data stream. Replay finished.`, 'info');
      return;
    }

    const currentCandle = candles[this.currentIndex];
    
    // 1. Run indicators in SignalEngine
    const sigResult = this.signalEngine.evaluate(candles, this.currentIndex);

    // 2. Build inputs for TruthKernel
    const btcCandles = BTC_HISTORICAL;
    const ethCandles = ETH_HISTORICAL;
    
    const btcRecent = btcCandles.slice(Math.max(0, this.currentIndex - 10), this.currentIndex + 1).map(c => c.close);
    const ethRecent = ethCandles.slice(Math.max(0, this.currentIndex - 10), this.currentIndex + 1).map(c => c.close);
    const correlationVal = this.calculateCorrelation(btcRecent, ethRecent);
    
    let correlationSignal = 'caution';
    let correlationConf = 60;
    if (correlationVal > 0.65) {
      correlationSignal = 'go';
      correlationConf = Math.round(correlationVal * 100);
    } else if (correlationVal < -0.2) {
      correlationSignal = 'no-go';
      correlationConf = Math.round(Math.abs(correlationVal) * 100);
    }

    // Timeframe engine: higher timeframe EMA cross
    const ema100 = this.signalEngine.calculateEMA(candles.slice(0, this.currentIndex + 1), 100);
    let timeframeSignal = 'caution';
    let timeframeConf = 60;
    if (currentCandle.close > ema100) {
      timeframeSignal = 'go';
      timeframeConf = 75;
    } else {
      timeframeSignal = 'no-go';
      timeframeConf = 75;
    }

    // Behavior engine: oversold/overbought momentum shifts
    let behaviorSignal = 'caution';
    let behaviorConf = 50;
    if (sigResult.rsi < 35) {
      behaviorSignal = 'go';
      behaviorConf = 80;
    } else if (sigResult.rsi > 65) {
      behaviorSignal = 'no-go';
      behaviorConf = 80;
    }

    const enginesInput = {
      regime: {
        signal: sigResult.signal,
        confidence: sigResult.confidence,
        reason_codes: sigResult.reasons,
        market_regime: sigResult.regime,
        trend_strength: sigResult.trendStrength
      },
      timeframe: {
        signal: timeframeSignal,
        confidence: timeframeConf,
        reason_codes: [currentCandle.close > ema100 ? 'HTF_ABOVE_EMA100' : 'HTF_BELOW_EMA100']
      },
      correlation: {
        signal: correlationSignal,
        confidence: correlationConf,
        reason_codes: [correlationVal > 0.65 ? 'STRONG_POSITIVE_LEADER_CORR' : 'DIVERGING_MARKET_CORR']
      },
      behavior: {
        signal: behaviorSignal,
        confidence: behaviorConf,
        reason_codes: [behaviorSignal === 'go' ? 'MOMENTUM_BOUNCE' : behaviorSignal === 'no-go' ? 'MOMENTUM_EXHAUST' : 'NORMAL_BEHAVIOR']
      }
    };

    // 3. Evaluate in TruthKernel
    const kernelVerdict = this.truthKernel.evaluate(enginesInput);

    // 4. Paper Account Executions (Paper Trading with hybrid exit logic)
    let action = 'HOLD';
    const closePrice = currentCandle.close;

    if (this.position) {
      let closed = false;
      let exitPrice = 0;
      let reason = '';

      if (this.position.type === 'LONG') {
        if (currentCandle.low <= this.position.stopLoss) {
          closed = true;
          exitPrice = this.position.stopLoss;
          reason = 'STOP_LOSS';
        } else if (currentCandle.high >= this.position.takeProfit) {
          closed = true;
          exitPrice = this.position.takeProfit;
          reason = 'TAKE_PROFIT';
        } else if (kernelVerdict.signal === 'no-go') {
          closed = true;
          exitPrice = closePrice;
          reason = 'REVERSAL_TO_SHORT';
        } else if (kernelVerdict.confidence < 50) {
          closed = true;
          exitPrice = closePrice;
          reason = 'LOW_CONFIDENCE';
        }
      } else if (this.position.type === 'SHORT') {
        if (currentCandle.high >= this.position.stopLoss) {
          closed = true;
          exitPrice = this.position.stopLoss;
          reason = 'STOP_LOSS';
        } else if (currentCandle.low <= this.position.takeProfit) {
          closed = true;
          exitPrice = this.position.takeProfit;
          reason = 'TAKE_PROFIT';
        } else if (kernelVerdict.signal === 'go') {
          closed = true;
          exitPrice = closePrice;
          reason = 'REVERSAL_TO_LONG';
        } else if (kernelVerdict.confidence < 50) {
          closed = true;
          exitPrice = closePrice;
          reason = 'LOW_CONFIDENCE';
        }
      }

      if (closed) {
        this.closePosition(exitPrice, reason);
        action = 'EXIT';
      }
    }

    if (!this.position) {
      if (kernelVerdict.signal === 'go' && kernelVerdict.confidence >= this.truthKernel.masterSwitchThreshold) {
        const R = closePrice * R_DISTANCE;
        const positionSize = (this.balance * 0.25) / closePrice;
        this.position = {
          type: 'LONG',
          entryPrice: closePrice,
          entryIndex: this.currentIndex,
          amount: positionSize,
          takeProfit: closePrice + RISK_REWARD * R,
          stopLoss: closePrice - R
        };
        action = 'BUY';
        this.addTerminalLog(`[TRADE ENTRY] Entered LONG @ $${closePrice.toFixed(2)} | Size: ${positionSize.toFixed(4)} | TP: $${(closePrice + RISK_REWARD * R).toFixed(2)} | SL: $${(closePrice - R).toFixed(2)}`, 'buy');
      } else if (kernelVerdict.signal === 'no-go' && kernelVerdict.confidence >= this.truthKernel.masterSwitchThreshold) {
        const R = closePrice * R_DISTANCE;
        const positionSize = (this.balance * 0.25) / closePrice;
        this.position = {
          type: 'SHORT',
          entryPrice: closePrice,
          entryIndex: this.currentIndex,
          amount: positionSize,
          takeProfit: closePrice - RISK_REWARD * R,
          stopLoss: closePrice + R
        };
        action = 'SELL';
        this.addTerminalLog(`[TRADE ENTRY] Entered SHORT @ $${closePrice.toFixed(2)} | Size: ${positionSize.toFixed(4)} | TP: $${(closePrice - RISK_REWARD * R).toFixed(2)} | SL: $${(closePrice + R).toFixed(2)}`, 'sell');
      }
    }

    // Floating PnL calculation
    let currentEquity = this.balance;
    if (this.position) {
      if (this.position.type === 'LONG') {
        const floatingPnL = (closePrice - this.position.entryPrice) * this.position.amount;
        currentEquity += floatingPnL;
      } else {
        const floatingPnL = (this.position.entryPrice - closePrice) * this.position.amount;
        currentEquity += floatingPnL;
      }
    }

    if (currentEquity > this.peakBalance) {
      this.peakBalance = currentEquity;
    }
    const currentDrawdown = ((this.peakBalance - currentEquity) / this.peakBalance) * 100;
    this.drawdown = Math.max(this.drawdown, currentDrawdown);

    this.equityHistory.push({
      index: this.currentIndex,
      balance: parseFloat(currentEquity.toFixed(2))
    });

    // 5. Output log to Console Terminal
    // Format: [HH:MM:SS] BTCUSDT - SIGNAL: LONG, KERNEL: APPROVED - Action: BUY
    const timeStr = this.formatTime(currentCandle.timestamp);
    const signalText = sigResult.signal === 'go' ? 'LONG' : (sigResult.signal === 'no-go' ? 'SHORT' : 'NEUTRAL');
    const kernelText = kernelVerdict.signal !== 'caution' ? 'APPROVED' : 'CAUTION';

    const logLine = `[${timeStr}] ${this.selectedAsset} - SIGNAL: ${signalText}, KERNEL: ${kernelText} - Action: ${action} | Conf: ${kernelVerdict.confidence}%`;

    let lineType = 'info';
    if (action === 'BUY') lineType = 'buy';
    else if (action === 'SELL') lineType = 'sell';
    else if (kernelVerdict.signal === 'caution') lineType = 'warn';

    this.addTerminalLog(logLine, lineType);

    // 7. Update visual interface elements
    this._updateUI(sigResult, kernelVerdict, currentCandle, currentEquity);
  }

  _updateUI(sigResult, kernelVerdict, currentCandle, currentEquity) {
    if (!this._container) return;

    // Update Indicators
    const telPrice = this._container.querySelector('#tel-price');
    const telVolume = this._container.querySelector('#tel-volume');
    const telEma20 = this._container.querySelector('#tel-ema20');
    const telEma50 = this._container.querySelector('#tel-ema50');
    const telRsi = this._container.querySelector('#tel-rsi');
    const barRsi = this._container.querySelector('#bar-rsi');
    const telVolatility = this._container.querySelector('#tel-volatility');
    const telTrend = this._container.querySelector('#tel-trend');
    const telReasons = this._container.querySelector('#tel-reasons');

    if (telPrice) telPrice.textContent = `$${currentCandle.close.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    if (telVolume) telVolume.textContent = currentCandle.volume.toLocaleString();
    if (telEma20) telEma20.textContent = `$${sigResult.ema20.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    if (telEma50) telEma50.textContent = `$${sigResult.ema50.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    if (telRsi) {
      telRsi.textContent = sigResult.rsi.toFixed(2);
      if (sigResult.rsi < 30) telRsi.style.color = 'var(--color-edge, #06d6a0)';
      else if (sigResult.rsi > 70) telRsi.style.color = '#ef4444';
      else telRsi.style.color = '#60a5fa';
    }
    if (barRsi) {
      barRsi.style.width = `${sigResult.rsi}%`;
      if (sigResult.rsi < 30) barRsi.style.background = 'var(--color-edge, #06d6a0)';
      else if (sigResult.rsi > 70) barRsi.style.background = '#ef4444';
      else barRsi.style.background = '#3b82f6';
    }
    if (telVolatility) {
      telVolatility.textContent = sigResult.volatility;
      if (sigResult.volatility === 'high') telVolatility.style.color = '#ef4444';
      else if (sigResult.volatility === 'low') telVolatility.style.color = 'var(--color-edge, #06d6a0)';
      else telVolatility.style.color = '#94a3b8';
    }
    if (telTrend) {
      telTrend.textContent = sigResult.trendStrength;
      if (sigResult.trendStrength === 'strong') telTrend.style.color = 'var(--color-edge, #06d6a0)';
      else if (sigResult.trendStrength === 'weak') telTrend.style.color = '#64748b';
      else telTrend.style.color = '#94a3b8';
    }
    if (telReasons) {
      telReasons.innerHTML = sigResult.reasons.map(r => `
        <span style="font-size: 0.65rem; color: #f8fafc; background: #1e293b; padding: 2px 6px; border-radius: 1px; font-family: var(--font-mono, monospace); border: 1px solid #334155;">${r}</span>
      `).join('');
    }

    // Update Kernel telemetry
    const contexts = kernelVerdict.raw_metrics?.context_confidences || {};
    const regimeVal = this._container.querySelector('#val-ctx-regime');
    const regimeBar = this._container.querySelector('#bar-ctx-regime');
    const tfVal = this._container.querySelector('#val-ctx-timeframe');
    const tfBar = this._container.querySelector('#bar-ctx-timeframe');
    const corrVal = this._container.querySelector('#val-ctx-correlation');
    const corrBar = this._container.querySelector('#bar-ctx-correlation');
    const behVal = this._container.querySelector('#val-ctx-behavior');
    const behBar = this._container.querySelector('#bar-ctx-behavior');

    if (regimeVal && regimeBar) {
      const val = Math.round((contexts.regime || 0) * 100);
      regimeVal.textContent = `${val}%`;
      regimeBar.style.width = `${val}%`;
    }
    if (tfVal && tfBar) {
      const val = Math.round((contexts.timeframe || 0) * 100);
      tfVal.textContent = `${val}%`;
      tfBar.style.width = `${val}%`;
    }
    if (corrVal && corrBar) {
      const val = Math.round((contexts.correlation || 0) * 100);
      corrVal.textContent = `${val}%`;
      corrBar.style.width = `${val}%`;
    }
    if (behVal && behBar) {
      const val = Math.round((contexts.behavior || 0) * 100);
      behVal.textContent = `${val}%`;
      behBar.style.width = `${val}%`;
    }

    const telEquilibrium = this._container.querySelector('#tel-equilibrium');
    const telMasterConf = this._container.querySelector('#tel-masterconf');

    if (telEquilibrium) {
      const score = kernelVerdict.raw_metrics?.system_equilibrium || 0;
      telEquilibrium.textContent = score.toFixed(3);
      if (score >= 0.25) telEquilibrium.style.color = 'var(--color-edge, #06d6a0)';
      else if (score <= -0.25) telEquilibrium.style.color = '#ef4444';
      else telEquilibrium.style.color = '#e2e8f0';
    }
    if (telMasterConf) {
      telMasterConf.textContent = `${kernelVerdict.confidence}%`;
      if (kernelVerdict.confidence >= 75) telMasterConf.style.color = 'var(--color-edge, #06d6a0)';
      else telMasterConf.style.color = '#ef4444';
    }

    // ECA Overlay: offline-only — show static state (no runtime court evaluation)
    const vetoPanel = this._container.querySelector('#eca-veto-panel');
    const courtVerdictVal = this._container.querySelector('#court-verdict-val');
    const courtReasonsVal = this._container.querySelector('#court-reasons-val');
    const ecaProposals = this._container.querySelector('#eca-proposals');
    const ecaFailures = this._container.querySelector('#eca-failures');
    const ecaCost = this._container.querySelector('#eca-cost');

    // Static display — ECA runs offline (verify_mne.js)
    if (ecaProposals) ecaProposals.textContent = `— / —`;
    if (ecaFailures) ecaFailures.textContent = `— / —`;
    if (ecaCost) ecaCost.textContent = `OFFLINE`;
    if (courtVerdictVal) { courtVerdictVal.textContent = 'OFFLINE'; courtVerdictVal.style.color = '#64748b'; }
    if (courtReasonsVal) courtReasonsVal.textContent = 'ECA analysis runs via verify_mne.js. Not active in runtime.';
    if (vetoPanel) {
      vetoPanel.className = 'clean-state';
      vetoPanel.textContent = 'RUNTIME CLEAN — ECA evaluations run offline only.';
    }

    // Update Paper Account
    const telBalance = this._container.querySelector('#tel-balance');
    const telDrawdown = this._container.querySelector('#tel-drawdown');
    const telPnL = this._container.querySelector('#tel-pnl');
    const activePosVal = this._container.querySelector('#active-pos-val');

    const telTradesCount = this._container.querySelector('#tel-trades-count');
    const telWinRate = this._container.querySelector('#tel-win-rate');
    const telProfitFactor = this._container.querySelector('#tel-profit-factor');

    if (telBalance) telBalance.textContent = `$${currentEquity.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    if (telDrawdown) telDrawdown.textContent = `${this.drawdown.toFixed(2)}%`;
    
    const pnlPct = ((currentEquity - this.initialBalance) / this.initialBalance) * 100;
    if (telPnL) {
      const sign = pnlPct >= 0 ? '+' : '';
      telPnL.textContent = `${sign}${pnlPct.toFixed(2)}%`;
      if (pnlPct > 0) {
        telPnL.className = 'badge badge-win';
      } else if (pnlPct < 0) {
        telPnL.className = 'badge badge-loss';
      } else {
        telPnL.className = 'badge badge-plain';
      }
    }

    const totalTrades = this.trades.length;
    const winTrades = this.trades.filter(t => t.pnl > 0);
    const lossTrades = this.trades.filter(t => t.pnl < 0);
    const winRate = totalTrades === 0 ? 0 : (winTrades.length / totalTrades) * 100;
    const totalGains = winTrades.reduce((sum, t) => sum + t.pnl, 0);
    const totalLosses = Math.abs(lossTrades.reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = totalLosses === 0 ? totalGains : totalGains / totalLosses;

    if (telTradesCount) telTradesCount.textContent = totalTrades;
    if (telWinRate) telWinRate.textContent = `${winRate.toFixed(1)}%`;
    if (telProfitFactor) telProfitFactor.textContent = profitFactor.toFixed(2);

    if (activePosVal) {
      if (this.position) {
        const floatingPnL = this.position.type === 'LONG' 
          ? (currentCandle.close - this.position.entryPrice) * this.position.amount
          : (this.position.entryPrice - currentCandle.close) * this.position.amount;
        const color = floatingPnL >= 0 ? 'var(--color-edge, #06d6a0)' : '#ef4444';
        const sign = floatingPnL >= 0 ? '+' : '';
        activePosVal.innerHTML = `<span style="color: ${this.position.type === 'LONG' ? '#3b82f6' : '#f59e0b'}; font-weight:bold;">${this.position.type}</span> @ $${this.position.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })} (<span style="color: ${color};">${sign}$${floatingPnL.toFixed(2)}</span>)`;
      } else {
        activePosVal.textContent = 'NONE';
        activePosVal.style.color = '#64748b';
      }
    }

    // Inject updated SVG Equity Curve
    const chartContainer = this._container.querySelector('#equity-chart-container');
    if (chartContainer) {
      chartContainer.innerHTML = this.renderEquityChart(this.equityHistory);
    }
  }

  renderEquityChart(history) {
    if (!history || history.length < 2) {
      return `<div style="font-size:0.7rem; color:#64748b; text-align:center;">Awaiting simulation ticks...</div>`;
    }

    const width = 360;
    const height = 110;
    const padding = 8;

    const balances = history.map(h => h.balance);
    const minBalance = Math.min(...balances);
    const maxBalance = Math.max(...balances);
    const balanceRange = maxBalance - minBalance || 1.0;

    const points = history.map((h, i) => {
      const x = padding + (i / (history.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((h.balance - minBalance) / balanceRange) * (height - 2 * padding);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const pathData = `M ${points.join(' L ')}`;
    const fillPathData = `${pathData} L ${points[points.length - 1].split(',')[0]},${height - padding} L ${points[0].split(',')[0]},${height - padding} Z`;

    const lastVal = history[history.length - 1].balance;
    const strokeColor = lastVal >= 10000 ? '#06d6a0' : '#ef4444';
    
    // Grid line for starting balance
    const startY = height - padding - ((10000 - minBalance) / balanceRange) * (height - 2 * padding);

    return `
      <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: ${height}px; display: block; overflow: visible;">
        <defs>
          <linearGradient id="svg-equity-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${strokeColor}" stop-opacity="0.15"/>
            <stop offset="100%" stop-color="${strokeColor}" stop-opacity="0.0"/>
          </linearGradient>
        </defs>
        <!-- Starting balance threshold baseline -->
        <line x1="${padding}" y1="${startY}" x2="${width - padding}" y2="${startY}" stroke="#1e293b" stroke-dasharray="3,3" stroke-width="1"/>
        
        <!-- Fill Area -->
        <path d="${fillPathData}" fill="url(#svg-equity-grad)" />
        
        <!-- Line Path -->
        <path d="${pathData}" fill="none" stroke="${strokeColor}" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round" />
        
        <!-- Current balance indicator point -->
        <circle cx="${points[points.length - 1].split(',')[0]}" cy="${points[points.length - 1].split(',')[1]}" r="3" fill="${strokeColor}" />
      </svg>
    `;
  }
}
 