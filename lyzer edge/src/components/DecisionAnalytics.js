import { robustnessReport } from '../db/robustness_results.js';

export class DecisionAnalytics {
  constructor() {
    this._container = null;
    this.activeTab = 'overview'; // Default active tab
  }

  mount(container) {
    this._container = container;
    this._render();
    this._bindEvents();
  }

  unmount() {
    if (this._container) {
      this._container.innerHTML = '';
      this._container = null;
    }
  }

  _bindEvents() {
    if (!this._container) return;

    const tabButtons = this._container.querySelectorAll('.analytics-tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.activeTab = e.currentTarget.getAttribute('data-tab');
        
        // Update active class on buttons
        tabButtons.forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');

        // Update displayed tab content
        const tabContents = this._container.querySelectorAll('.analytics-tab-content');
        tabContents.forEach(content => {
          content.style.display = 'none';
        });

        const activeContent = this._container.querySelector(`#tab-content-${this.activeTab}`);
        if (activeContent) {
          activeContent.style.display = 'block';
        }
      });
    });
  }

  _render() {
    if (!this._container) return;

    const report = robustnessReport;
    const isPass = report.verdict === 'PASS';
    const isWarning = report.verdict === 'PASS_WITH_WARNINGS';
    
    let verdictColor = 'var(--color-danger, #ef4444)';
    let verdictBg = 'rgba(239, 68, 68, 0.1)';
    if (isPass) {
      verdictColor = 'var(--color-success, #06d6a0)';
      verdictBg = 'rgba(6, 214, 160, 0.1)';
    } else if (isWarning) {
      verdictColor = 'var(--color-warning, #f59e0b)';
      verdictBg = 'rgba(245, 158, 11, 0.1)';
    }

    // Fragility styling
    let fragilityLabel = 'Robust / Resilient';
    let fragilityColor = 'var(--color-success, #06d6a0)';
    if (report.fragilityIndex >= 0.8) {
      fragilityLabel = 'Highly dependent on dataset (Vetoed)';
      fragilityColor = 'var(--color-danger, #ef4444)';
    } else if (report.fragilityIndex >= 0.5) {
      fragilityLabel = 'Fragile / Overfit suspicion';
      fragilityColor = 'var(--color-warning, #f59e0b)';
    } else if (report.fragilityIndex >= 0.20) {
      fragilityLabel = 'Healthy / Sturdy';
      fragilityColor = 'var(--color-info, #3b82f6)';
    }

    // System Quality styling
    const systemQuality = report.systemQuality ?? 0;
    let sqColor = 'var(--color-danger, #ef4444)';
    let sqLabel = 'Low Quality';
    if (systemQuality > 50) {
      sqColor = 'var(--color-success, #06d6a0)';
      sqLabel = 'High Quality';
    } else if (systemQuality >= 20) {
      sqColor = 'var(--color-warning, #f59e0b)';
      sqLabel = 'Medium Quality';
    }

    const testNames = {
      baseline: "[TEST 1] Baseline Replay",
      reverse: "[TEST 2] Reverse Dataset",
      shuffle: "[TEST 3] Random Shuffle",
      blind: "[TEST 4] Blind Replay",
      shock: "[TEST 5] Regime Shock",
      noise: "[TEST 6] Noise Injection",
      perturbedConfidence: "[TEST 7] Confidence Perturb",
      kernelRemoval: "[TEST 8] Component Removal",
      adversary: "[TEST 9] Synthetic Adversary",
      monteCarlo: "[TEST 10] Monte Carlo Replay"
    };

    this._container.innerHTML = `
      <div class="page-container">
        <!-- Page Header -->
        <div class="page-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem;">
          <div>
            <h1 class="page-title" style="letter-spacing: var(--tracking-tight);">Decision Analytics</h1>
            <p class="page-subtitle">Epistemological validation, robustness suite results, and failure Mode Cartography diagnostics.</p>
          </div>
          <div style="background: ${verdictBg}; color: ${verdictColor}; padding: 0.5rem 1rem; border-radius: var(--radius-xs, 4px); border: 1px solid ${verdictColor}; font-family: var(--font-mono); font-weight: var(--fw-bold); font-size: 0.9rem;">
            AUDIT STATUS: ${report.verdict}
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="card" style="padding: 0.5rem; margin-bottom: 1.5rem; border-radius: var(--radius-xs, 4px);">
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn analytics-tab-btn active" data-tab="overview" style="flex: 1; border-radius: var(--radius-xs, 4px);">Overview</button>
            <button class="btn analytics-tab-btn" data-tab="flow" style="flex: 1; border-radius: var(--radius-xs, 4px);">Decision Flow</button>
            <button class="btn analytics-tab-btn" data-tab="reality" style="flex: 1; border-radius: var(--radius-xs, 4px);">Reality</button>
            <button class="btn analytics-tab-btn" data-tab="failures" style="flex: 1; border-radius: var(--radius-xs, 4px);">Failures</button>
            <button class="btn analytics-tab-btn" data-tab="attribution" style="flex: 1; border-radius: var(--radius-xs, 4px);">Attribution</button>
          </div>
        </div>

        <!-- TAB 1: OVERVIEW -->
        <div id="tab-content-overview" class="analytics-tab-content" style="display: block;">
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; margin-bottom: 1.5rem;">
            <!-- Robustness Score Gauge -->
            <div class="card" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem; border-radius: var(--radius-xs, 4px);">
              <h3 style="margin-bottom: 1rem; color: var(--text-secondary); font-size: 0.9rem;">Robustness Score</h3>
              <div style="width: 140px; height: 140px; position: relative;">
                <svg width="140" height="140" style="transform: rotate(-90deg);">
                  <circle cx="70" cy="70" r="58" stroke="var(--bg-tertiary)" stroke-width="10" fill="none" />
                  <circle cx="70" cy="70" r="58" stroke="var(--color-edge)" stroke-width="10" fill="none"
                    stroke-dasharray="364.4" stroke-dashoffset="${364.4 - (report.score / 100) * 364.4}"
                    stroke-linecap="round" style="transition: stroke-dashoffset 1s ease;" />
                </svg>
                <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; flex-direction: column;">
                  <span style="font-size: 2.2rem; font-weight: bold; color: var(--color-edge); line-height: 1;">${report.score}</span>
                  <span style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">/ 100</span>
                </div>
              </div>
            </div>

            <!-- Fragility Index -->
            <div class="card" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem; border-radius: var(--radius-xs, 4px);">
              <h3 style="margin-bottom: 1rem; color: var(--text-secondary); font-size: 0.9rem;">Fragility Index</h3>
              <div style="font-size: 3rem; font-weight: var(--fw-bold); color: ${fragilityColor}; font-family: var(--font-mono); line-height: 1;">
                ${report.fragilityIndex.toFixed(2)}
              </div>
              <p style="margin-top: 1rem; color: ${fragilityColor}; font-weight: var(--fw-semibold); font-size: 0.85rem; text-align: center;">
                ${fragilityLabel}
              </p>
              <div style="width: 100%; height: 6px; background: var(--bg-tertiary); border-radius: var(--radius-full); overflow: hidden; margin-top: 1rem;">
                <div style="background: ${fragilityColor}; width: ${report.fragilityIndex * 100}%; height: 100%;"></div>
              </div>
            </div>

            <!-- System Quality Card -->
            <div class="card" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem; border-radius: var(--radius-xs, 4px);">
              <h3 style="margin-bottom: 1rem; color: var(--text-secondary); font-size: 0.9rem;">System Quality</h3>
              <div style="font-size: 3rem; font-weight: var(--fw-bold); color: ${sqColor}; font-family: var(--font-mono); line-height: 1;">
                ${systemQuality}
              </div>
              <p style="margin-top: 1rem; color: ${sqColor}; font-weight: var(--fw-semibold); font-size: 0.85rem; text-align: center;">
                ${sqLabel}
              </p>
              <div style="width: 100%; height: 6px; background: var(--bg-tertiary); border-radius: var(--radius-full); overflow: hidden; margin-top: 1rem;">
                <div style="background: ${sqColor}; width: ${Math.min(100, Math.max(0, systemQuality))}%; height: 100%;"></div>
              </div>
            </div>

            <!-- Veto Status & Diagnostics -->
            <div class="card" style="padding: 1.5rem; border-radius: var(--radius-xs, 4px); display: flex; flex-direction: column; justify-content: center;">
              <h3 style="margin-bottom: 0.75rem; color: var(--text-secondary); font-size: 0.9rem;">Epistemological Vetos</h3>
              ${report.vetoes.length === 0 ? `
                <div style="color: var(--color-success, #06d6a0); display: flex; align-items: center; gap: 0.5rem;">
                  <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                  <span style="font-weight: var(--fw-bold);">No Vetos Triggered</span>
                </div>
                <p class="text-muted" style="margin-top: 0.5rem; font-size: 0.8rem;">The system has passed the lookahead, state leakage, and absolute path checks.</p>
              ` : `
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                  ${report.vetoes.map(v => `
                    <div style="background: rgba(239,68,68,0.1); border: 1px solid var(--color-loss); padding: 0.5rem; border-radius: var(--radius-xs, 4px); font-size: 0.75rem; font-family: var(--font-mono); color: var(--color-loss);">
                      ⚠️ VETO: ${v}
                    </div>
                  `).join('')}
                </div>
              `}
            </div>
          </div>

          <!-- Test Cases Statistics -->
          <div class="card" style="padding: 1.5rem; border-radius: var(--radius-xs, 4px);">
            <h3 style="margin-bottom: 1rem; color: var(--text-primary); font-size: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">Survivability Matrix</h3>
            <div style="overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse; text-align: left;">
                <thead>
                  <tr style="border-bottom: 1px solid var(--border-color); font-size: 0.8rem; color: var(--text-muted); font-family: var(--font-mono);">
                    <th style="padding: 0.75rem 0.5rem;">TEST NAME</th>
                    <th style="padding: 0.75rem 0.5rem; text-align: right;">PNL</th>
                    <th style="padding: 0.75rem 0.5rem; text-align: right;">MAX DRAWDOWN</th>
                    <th style="padding: 0.75rem 0.5rem; text-align: right;">SCORE</th>
                  </tr>
                </thead>
                <tbody style="font-family: var(--font-mono); font-size: 0.85rem;">
                  ${Object.entries(testNames).map(([key, name]) => {
                    const testData = report.tests[key] || {};
                    const pnl = testData.pnl ?? testData.medianPnL ?? 0;
                    const maxDD = testData.maxDD ?? testData.worstDD ?? null;
                    const score = testData.score ?? 0;

                    let pnlColor = 'var(--text-primary)';
                    if (pnl > 0) {
                      pnlColor = 'var(--color-success, #06d6a0)';
                    } else if (pnl < 0) {
                      pnlColor = 'var(--color-loss, #ef4444)';
                    }
                    
                    const pnlSign = pnl > 0 ? '+' : '';
                    const pnlText = `${pnlSign}${pnl.toFixed(2)}%` + 
                      (key === 'noise' || key === 'monteCarlo' ? ' <span style="font-size:0.7rem; color:var(--text-muted);">(Median)</span>' : '');

                    const maxDDText = maxDD !== null ? `${maxDD}%` + (key === 'monteCarlo' ? ' <span style="font-size:0.7rem; color:var(--text-muted);">(Worst)</span>' : '') : '—';
                    const maxDDColor = maxDD !== null ? 'color: var(--color-loss, #ef4444);' : '';

                    return `
                      <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <td style="padding: 0.75rem 0.5rem; font-weight: bold; color: var(--text-primary);">${name}</td>
                        <td style="padding: 0.75rem 0.5rem; text-align: right; color: ${pnlColor};">${pnlText}</td>
                        <td style="padding: 0.75rem 0.5rem; text-align: right; ${maxDDColor}">${maxDDText}</td>
                        <td style="padding: 0.75rem 0.5rem; text-align: right;">${score}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- TAB 2: DECISION FLOW (FUNNEL HEATMAP) -->
        <div id="tab-content-flow" class="analytics-tab-content" style="display: none;">
          <div class="card" style="padding: 2rem; border-radius: var(--radius-xs, 4px);">
            <h3 style="margin-bottom: 2rem; color: var(--text-primary); text-align: center;">Decision Funnel Efficiency Heatmap</h3>
            
            <div style="display: flex; flex-direction: column; gap: 1.5rem; max-width: 700px; margin: 0 auto;">
              <!-- Signals Generated -->
              <div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-family: var(--font-mono); font-size: 0.85rem;">
                  <span style="font-weight: bold;">1. Signals Generated</span>
                  <span>${report.funnel.signalsGenerated}</span>
                </div>
                <div style="height: 24px; background: rgba(255,255,255,0.05); border-radius: var(--radius-xs, 4px); overflow: hidden; border: 1px solid var(--border-color);">
                  <div style="background: #3b82f6; width: 100%; height: 100%; display: flex; align-items: center; padding-left: 0.5rem; font-size: 0.75rem; font-family: var(--font-mono); color: #fff;">100.0%</div>
                </div>
              </div>

              <!-- Kernel Approved -->
              <div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-family: var(--font-mono); font-size: 0.85rem;">
                  <span style="font-weight: bold;">2. Kernel Approved</span>
                  <span>${report.funnel.kernelApproved}</span>
                </div>
                <div style="height: 24px; background: rgba(255,255,255,0.05); border-radius: var(--radius-xs, 4px); overflow: hidden; border: 1px solid var(--border-color);">
                  <div style="background: #0ea5e9; width: ${(report.funnel.kernelApproved / report.funnel.signalsGenerated) * 100}%; height: 100%; display: flex; align-items: center; padding-left: 0.5rem; font-size: 0.75rem; font-family: var(--font-mono); color: #fff;">
                    ${((report.funnel.kernelApproved / report.funnel.signalsGenerated) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              <!-- Sizing Approved -->
              <div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-family: var(--font-mono); font-size: 0.85rem;">
                  <span style="font-weight: bold;">3. Sizing Approved</span>
                  <span>${report.funnel.sizingApproved}</span>
                </div>
                <div style="height: 24px; background: rgba(255,255,255,0.05); border-radius: var(--radius-xs, 4px); overflow: hidden; border: 1px solid var(--border-color);">
                  <div style="background: #06b6d4; width: ${(report.funnel.sizingApproved / report.funnel.signalsGenerated) * 100}%; height: 100%; display: flex; align-items: center; padding-left: 0.5rem; font-size: 0.75rem; font-family: var(--font-mono); color: #fff;">
                    ${((report.funnel.sizingApproved / report.funnel.signalsGenerated) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              <!-- ECA Approved -->
              <div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-family: var(--font-mono); font-size: 0.85rem;">
                  <span style="font-weight: bold;">4. ECA Approved</span>
                  <span>${report.funnel.ecaApproved}</span>
                </div>
                <div style="height: 24px; background: rgba(255,255,255,0.05); border-radius: var(--radius-xs, 4px); overflow: hidden; border: 1px solid var(--border-color);">
                  <div style="background: #14b8a6; width: ${(report.funnel.ecaApproved / report.funnel.signalsGenerated) * 100}%; height: 100%; display: flex; align-items: center; padding-left: 0.5rem; font-size: 0.75rem; font-family: var(--font-mono); color: #fff;">
                    ${((report.funnel.ecaApproved / report.funnel.signalsGenerated) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              <!-- Executed -->
              <div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-family: var(--font-mono); font-size: 0.85rem;">
                  <span style="font-weight: bold;">5. Executed (Paper Orders)</span>
                  <span>${report.funnel.executedCount}</span>
                </div>
                <div style="height: 24px; background: rgba(255,255,255,0.05); border-radius: var(--radius-xs, 4px); overflow: hidden; border: 1px solid var(--border-color);">
                  <div style="background: #10b981; width: ${(report.funnel.executedCount / report.funnel.signalsGenerated) * 100}%; height: 100%; display: flex; align-items: center; padding-left: 0.5rem; font-size: 0.75rem; font-family: var(--font-mono); color: #fff;">
                    ${((report.funnel.executedCount / report.funnel.signalsGenerated) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              <!-- Winners -->
              <div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-family: var(--font-mono); font-size: 0.85rem;">
                  <span style="font-weight: bold;">6. Profitable (Winners)</span>
                  <span>${report.funnel.winnersCount}</span>
                </div>
                <div style="height: 24px; background: rgba(255,255,255,0.05); border-radius: var(--radius-xs, 4px); overflow: hidden; border: 1px solid var(--border-color);">
                  <div style="background: var(--color-success, #06d6a0); width: ${(report.funnel.winnersCount / report.funnel.signalsGenerated) * 100}%; height: 100%; display: flex; align-items: center; padding-left: 0.5rem; font-size: 0.75rem; font-family: var(--font-mono); color: #fff;">
                    ${((report.funnel.winnersCount / report.funnel.signalsGenerated) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB 3: REALITY (RDI TIMELINE) -->
        <div id="tab-content-reality" class="analytics-tab-content" style="display: none;">
          <div class="card" style="padding: 1.5rem; border-radius: var(--radius-xs, 4px); margin-bottom: 1.5rem;">
            <h3 style="margin-bottom: 1.5rem; color: var(--text-primary);">Reality Drift Index (RDI) Timeline</h3>
            
            <!-- SVG Timeline Chart -->
            <div style="position: relative; width: 100%; height: 200px; background: rgba(0,0,0,0.2); border-radius: var(--radius-xs, 4px); border: 1px solid var(--border-color);">
              <svg viewBox="0 0 500 100" preserveAspectRatio="none" style="width: 100%; height: 100%;">
                <!-- Horizontal Threshold Guidelines -->
                <line x1="0" y1="20" x2="500" y2="20" stroke="rgba(239, 68, 68, 0.3)" stroke-width="0.5" stroke-dasharray="2,2" />
                <line x1="0" y1="50" x2="500" y2="50" stroke="rgba(245, 158, 11, 0.3)" stroke-width="0.5" stroke-dasharray="2,2" />
                <line x1="0" y1="80" x2="500" y2="80" stroke="rgba(6, 214, 160, 0.15)" stroke-width="0.5" />
                
                <!-- RDI Plot Path -->
                <path d="${this._buildRdiPath(report.timeline)}" fill="none" stroke="var(--color-edge, #06d6a0)" stroke-width="1.5" style="transition: d 1s ease;" />
              </svg>
              <!-- Y-axis Labels inside graph -->
              <div style="position: absolute; top: 15px; left: 10px; font-family: var(--font-mono); font-size: 0.65rem; color: var(--color-danger);">1.00 - CRITICAL DRIFT</div>
              <div style="position: absolute; top: 95px; left: 10px; font-family: var(--font-mono); font-size: 0.65rem; color: var(--color-warning);">0.50 - STRESSED</div>
              <div style="position: absolute; bottom: 10px; left: 10px; font-family: var(--font-mono); font-size: 0.65rem; color: var(--color-success);">0.20 - NOMINAL</div>
            </div>
            
            <p class="text-muted" style="font-size: 0.8rem; text-align: center; margin-top: 0.5rem;">Plot representing the Reality Drift Index over the 500-candle simulation timeline. High spikes indicate divergence between indicators and actual price behaviors.</p>
          </div>

          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem;">
            <div class="card" style="padding: 1.5rem; border-radius: var(--radius-xs, 4px);">
              <h3 style="margin-bottom: 1rem; color: var(--text-primary);">Drift Analysis Metrics</h3>
              <ul style="list-style: none; padding: 0; margin: 0; font-family: var(--font-mono); font-size: 0.85rem; display: flex; flex-direction: column; gap: 0.75rem;">
                <li style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.5rem;">
                  <span class="text-muted">Mean RDI:</span>
                  <span style="font-weight: bold; color: var(--color-success);">0.25</span>
                </li>
                <li style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.5rem;">
                  <span class="text-muted">Peak RDI:</span>
                  <span style="font-weight: bold; color: var(--color-danger);">0.85</span>
                </li>
                <li style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.5rem;">
                  <span class="text-muted">Time-series Variance:</span>
                  <span>0.043</span>
                </li>
              </ul>
            </div>
            <div class="card" style="padding: 1.5rem; border-radius: var(--radius-xs, 4px);">
              <h3 style="margin-bottom: 1rem; color: var(--text-primary);">Reality Adaptive Shifts</h3>
              <ul style="list-style: none; padding: 0; margin: 0; font-family: var(--font-mono); font-size: 0.85rem; display: flex; flex-direction: column; gap: 0.75rem;">
                <li style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.5rem;">
                  <span class="text-muted">Stability Lock Duration:</span>
                  <span>340 candles</span>
                </li>
                <li style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.5rem;">
                  <span class="text-muted">RDI Velocity Vetoes:</span>
                  <span style="font-weight: bold; color: var(--color-warning);">3</span>
                </li>
                <li style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.5rem;">
                  <span class="text-muted">Regime Re-anchors:</span>
                  <span>14</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <!-- TAB 4: FAILURES (FAILURE EXPLORER) -->
        <div id="tab-content-failures" class="analytics-tab-content" style="display: none;">
          <div class="card" style="padding: 1.5rem; border-radius: var(--radius-xs, 4px); margin-bottom: 1.5rem;">
            <h3 style="margin-bottom: 1rem; color: var(--text-primary);">Systemic Failure Explorer</h3>
            <p class="text-muted" style="margin-bottom: 1.5rem; font-size: 0.85rem;">Immunological registry derived from the Failure Mode Cartography (FMC). Displays threats, cascading dependencies, and recommended mitigation actions.</p>
            
            <div style="display: flex; flex-direction: column; gap: 1rem;">
              ${report.threats.map(t => {
                let badgeColor = 'var(--color-danger, #ef4444)';
                if (t.severity === 'WARNING') badgeColor = 'var(--color-warning, #f59e0b)';
                return `
                  <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); padding: 1.25rem; border-radius: var(--radius-xs, 4px);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                      <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <span style="font-family: var(--font-mono); font-weight: var(--fw-bold); font-size: 1rem; color: var(--text-primary);">${t.threat}</span>
                        <span style="background: rgba(255,255,255,0.05); font-family: var(--font-mono); font-size: 0.7rem; padding: 0.2rem 0.5rem; border-radius: var(--radius-xs, 4px); color: var(--text-secondary); border: 1px solid var(--border-color);">Freq: ${t.frequency}</span>
                      </div>
                      <span style="color: ${badgeColor}; border: 1px solid ${badgeColor}; background: ${badgeColor}0d; padding: 0.25rem 0.5rem; border-radius: var(--radius-xs, 4px); font-family: var(--font-mono); font-size: 0.7rem; font-weight: var(--fw-bold);">${t.severity}</span>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 1.5rem; font-size: 0.8rem; margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid rgba(255,255,255,0.05);">
                      <div>
                        <div class="text-muted" style="margin-bottom: 0.25rem; font-family: var(--font-mono); font-size: 0.7rem;">CASCADE INTERACTION:</div>
                        <div style="font-family: var(--font-mono); color: var(--color-warning); font-weight: var(--fw-bold);">${t.cascade}</div>
                      </div>
                      <div>
                        <div class="text-muted" style="margin-bottom: 0.25rem; font-family: var(--font-mono); font-size: 0.7rem;">RECOMMENDED ACTION / REMEDIATION:</div>
                        <div style="color: var(--text-secondary); line-height: 1.4;">${t.recommendation}</div>
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>

        <!-- TAB 5: ATTRIBUTION -->
        <div id="tab-content-attribution" class="analytics-tab-content" style="display: none;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
            <!-- PnL Attribution breakdown -->
            <div class="card" style="padding: 1.5rem; border-radius: var(--radius-xs, 4px);">
              <h3 style="margin-bottom: 1.5rem; color: var(--text-primary);">Subsystem PnL Attribution</h3>
              
              <div style="display: flex; flex-direction: column; gap: 1rem; font-family: var(--font-mono); font-size: 0.85rem;">
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.5rem;">
                  <span>Baseline Kernel Strategy:</span>
                  <span style="color: var(--color-success, #06d6a0); font-weight: bold;">+$4,952.00</span>
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.5rem;">
                  <span>Noise Injection Attrib:</span>
                  <span style="color: var(--color-loss, #ef4444); font-weight: bold;">-$1,708.00</span>
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.5rem;">
                  <span>Confidence Perturb Attrib:</span>
                  <span style="color: var(--color-loss, #ef4444); font-weight: bold;">-$4,868.00</span>
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.5rem;">
                  <span>Kernel Removal Veto Attrib:</span>
                  <span style="color: var(--color-loss, #ef4444); font-weight: bold;">-$4,952.00</span>
                </div>
              </div>
            </div>

            <!-- Context Contribution Weights -->
            <div class="card" style="padding: 1.5rem; border-radius: var(--radius-xs, 4px);">
              <h3 style="margin-bottom: 1.5rem; color: var(--text-primary);">Context Contribution Weights</h3>
              <div style="display: flex; flex-direction: column; gap: 1.25rem;">
                <!-- Regime Context Weight -->
                <div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem; font-family: var(--font-mono); font-size: 0.75rem;">
                    <span>Regime Component Weight:</span>
                    <span>35.0%</span>
                  </div>
                  <div style="height: 6px; background: var(--bg-tertiary); border-radius: var(--radius-full); overflow: hidden;">
                    <div style="background: var(--color-edge); width: 35%; height: 100%;"></div>
                  </div>
                </div>

                <!-- Correlation Context Weight -->
                <div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem; font-family: var(--font-mono); font-size: 0.75rem;">
                    <span>Correlation Component Weight:</span>
                    <span>25.0%</span>
                  </div>
                  <div style="height: 6px; background: var(--bg-tertiary); border-radius: var(--radius-full); overflow: hidden;">
                    <div style="background: var(--color-edge); width: 25%; height: 100%;"></div>
                  </div>
                </div>

                <!-- Behavior Context Weight -->
                <div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem; font-family: var(--font-mono); font-size: 0.75rem;">
                    <span>Behavior Component Weight:</span>
                    <span>25.0%</span>
                  </div>
                  <div style="height: 6px; background: var(--bg-tertiary); border-radius: var(--radius-full); overflow: hidden;">
                    <div style="background: var(--color-edge); width: 25%; height: 100%;"></div>
                  </div>
                </div>

                <!-- Timeframe Context Weight -->
                <div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem; font-family: var(--font-mono); font-size: 0.75rem;">
                    <span>Timeframe Component Weight:</span>
                    <span>15.0%</span>
                  </div>
                  <div style="height: 6px; background: var(--bg-tertiary); border-radius: var(--radius-full); overflow: hidden;">
                    <div style="background: var(--color-edge); width: 15%; height: 100%;"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  _buildRdiPath(timeline) {
    if (!timeline || timeline.length === 0) return 'M 0 80';

    const width = 500;
    const height = 100;
    const paddingBottom = 15;
    const graphHeight = height - paddingBottom;
    const stepX = width / (timeline.length - 1 || 1);

    const points = timeline.map((t, index) => {
      const x = index * stepX;
      // Reality Drift index is between 0 and 1. 
      // Map 0 to y=80 (NOMINAL) and 1 to y=20 (CRITICAL)
      const rdiVal = t.rdi || 0.22;
      const y = graphHeight - (rdiVal * graphHeight);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    return `M ${points.join(' L ')}`;
  }
}
 