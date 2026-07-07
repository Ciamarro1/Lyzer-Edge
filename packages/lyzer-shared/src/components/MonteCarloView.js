import db from '../db/database.js';
import { getAllTrades, getSetting } from '../db/queries.js';
import { calcWinRate, calcAverageRR } from '../engine/stats.js';
import { calcKellyCriterion } from '../engine/risk.js';
import { createChart } from 'lightweight-charts';

export class MonteCarloView {
  constructor() {
    this._container = null;
    this.chart = null;
  }

  async mount(container) {
    this._container = container;
    this._container.innerHTML = `
      <div class="page-container">
        <div class="page-header">
          <h1 class="page-title">Monte Carlo Simulation</h1>
          <p class="page-subtitle">Understand your system's edge through probability</p>
        </div>
        
        <div class="card" style="margin-bottom: 1rem;">
           <div style="display: flex; gap: 1rem; align-items: flex-end; flex-wrap: wrap;">
             <div>
               <label class="form-label" style="display: block; margin-bottom: 0.5rem; color: var(--color-text-muted);">Simulations</label>
               <input type="number" id="mc-sims" class="form-control" value="100" min="10" max="1000" style="width: 120px;" />
             </div>
             <div>
               <label class="form-label" style="display: block; margin-bottom: 0.5rem; color: var(--color-text-muted);">Trades per Sim</label>
               <input type="number" id="mc-trades" class="form-control" value="100" min="10" max="1000" style="width: 120px;" />
             </div>
             <div>
               <label class="form-label" style="display: block; margin-bottom: 0.5rem; color: var(--color-text-muted);">Kelly Cap (%)</label>
               <input type="number" id="mc-kelly-cap" class="form-control" value="25" min="1" max="100" style="width: 120px;" />
             </div>
             <div>
               <label class="form-label" style="display: block; margin-bottom: 0.5rem; color: var(--color-text-muted);">Ruin DD (%)</label>
               <input type="number" id="mc-ruin" class="form-control" value="90" min="1" max="100" style="width: 120px;" />
             </div>
             <div>
               <button id="mc-run-btn" class="btn btn-primary">Run Simulation</button>
             </div>
           </div>
        </div>

        <div id="mc-kpis" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
           <!-- KPIs will be injected here -->
        </div>

        <div class="card">
          <h3>Simulation Outcomes</h3>
          <div id="mc-chart" style="width: 100%; height: 400px; margin-top: 1rem;"></div>
        </div>
      </div>
    `;

    this._container.querySelector('#mc-run-btn').addEventListener('click', () => this.runSimulation(false));

    // Initially try to load from cache or run with default params
    await this.runSimulation(true);
  }

  unmount() {
    if (this.chart) {
      this.chart.remove();
      this.chart = null;
    }
    this._container = null;
  }

  async runSimulation(useCache = false) {
    const btn = this._container.querySelector('#mc-run-btn');
    const simsInput = parseInt(this._container.querySelector('#mc-sims').value, 10);
    const tradesInput = parseInt(this._container.querySelector('#mc-trades').value, 10);
    const kellyCapInput = parseInt(this._container.querySelector('#mc-kelly-cap')?.value || 25, 10) / 100;
    const ruinInput = parseInt(this._container.querySelector('#mc-ruin')?.value || 90, 10);
    
    if (btn) btn.textContent = 'Running...';
    
    try {
      const trades = await getAllTrades();
      const closedTrades = trades.filter(t => t.status === 'closed');
      
      if (closedTrades.length === 0) {
        this._container.querySelector('#mc-kpis').innerHTML = '<p class="text-muted">No closed trades available to simulate.</p>';
        return;
      }
      
      const startingBalance = await getSetting('accountBalance') || 10000;
      
      // Calculate inputs for Kelly
      const winRate = calcWinRate(closedTrades) / 100; // decimal
      const avgRR = calcAverageRR(closedTrades);
      
      const kellyRes = calcKellyCriterion(winRate, avgRR, 1, kellyCapInput);
      const halfKellyPct = kellyRes.half * 100;
      
      // Create hash for cache
      const paramsHash = `${simsInput}_${tradesInput}_${closedTrades.length}_${ruinInput}`;
      let results = null;

      if (useCache) {
        const cachedArr = await db.simulationCache.where('paramsHash').equals(paramsHash).toArray();
        if (cachedArr && cachedArr.length > 0) {
            results = cachedArr[cachedArr.length - 1].results;
        }
      }

      if (!results) {
         results = this.simulate(closedTrades, simsInput, tradesInput, startingBalance, ruinInput);
         await db.simulationCache.add({
             timestamp: new Date().toISOString(),
             paramsHash,
             results
         });
      }
      
      this.renderKPIs(results.kpis, halfKellyPct, ruinInput);
      this.renderChart(results.curves);
      
    } catch (err) {
      console.error('Simulation error:', err);
      this._container.querySelector('#mc-kpis').innerHTML = '<p class="text-danger">An error occurred during simulation.</p>';
    } finally {
      if (btn) btn.textContent = 'Run Simulation';
    }
  }

  simulate(closedTrades, numSims, numTradesPerSim, startBalance, ruinDdPct) {
    const curves = [];
    const endBalances = [];
    let doubledCount = 0;
    let up50Count = 0;
    let ruinCount = 0;
    const maxDrawdowns = [];
    
    const pnlPool = closedTrades.map(t => t.pnl || 0);

    for (let i = 0; i < numSims; i++) {
        let balance = startBalance;
        let peak = startBalance;
        let maxDd = 0;
        let curve = [];
        
        let hasDoubled = false;
        let hasUp50 = false;
        let isRuin = false;

        // time starts at today, incrementing by 1 day
        let t = Math.floor(Date.now() / 1000);

        for (let j = 0; j < numTradesPerSim; j++) {
            // sample random trade
            const rIdx = Math.floor(Math.random() * pnlPool.length);
            const pnl = pnlPool[rIdx];
            
            balance += pnl;
            if (balance > peak) peak = balance;
            
            // Drawdown calculation
            if (peak > 0) {
               const dd = (peak - balance) / peak;
               if (dd > maxDd) maxDd = dd;
            }

            if (balance >= startBalance * 2) hasDoubled = true;
            if (balance >= startBalance * 1.5) hasUp50 = true;
            const ruinThresholdBal = startBalance * (1 - ruinDdPct / 100);
            if (balance <= ruinThresholdBal) isRuin = true;

            curve.push({ time: t + j * 86400, value: balance });
        }

        curves.push(curve);
        endBalances.push(balance);
        maxDrawdowns.push(maxDd);

        if (hasDoubled) doubledCount++;
        if (hasUp50) up50Count++;
        if (isRuin) ruinCount++;
    }

    endBalances.sort((a, b) => a - b);
    const getPercentile = (arr, p) => arr[Math.floor(arr.length * p)] || 0;
    
    const medianEndBalance = getPercentile(endBalances, 0.5);
    const p5EndBalance = getPercentile(endBalances, 0.05);
    const p95EndBalance = getPercentile(endBalances, 0.95);
    
    const medianReturnPct = ((medianEndBalance - startBalance) / startBalance) * 100;
    const p5ReturnPct = ((p5EndBalance - startBalance) / startBalance) * 100;
    const p95ReturnPct = ((p95EndBalance - startBalance) / startBalance) * 100;
    
    maxDrawdowns.sort((a, b) => a - b);
    const expectedDrawdownPct = getPercentile(maxDrawdowns, 0.5) * 100;
    const p95DrawdownPct = getPercentile(maxDrawdowns, 0.95) * 100;

    const probDoubling = (doubledCount / numSims) * 100;
    const probUp50 = (up50Count / numSims) * 100;
    const probRuin = (ruinCount / numSims) * 100;

    return {
        curves,
        kpis: {
            medianReturnPct,
            p5ReturnPct,
            p95ReturnPct,
            expectedDrawdownPct,
            p95DrawdownPct,
            probDoubling,
            probUp50,
            probRuin
        }
    };
  }

  renderKPIs(kpis, halfKellyPct, ruinConfig) {
    const kpiDiv = this._container.querySelector('#mc-kpis');
    kpiDiv.innerHTML = `
      <div class="card" style="padding: 1rem;">
        <div class="text-muted" style="font-size: 0.875rem;">Return (5th/50th/95th)</div>
        <div style="font-size: 1.25rem; font-weight: bold; margin-top: 0.5rem;">
          <span style="color: ${kpis.p5ReturnPct >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}">${kpis.p5ReturnPct.toFixed(1)}%</span>
          <span style="color: var(--color-text-muted); font-weight: normal; margin: 0 4px;">/</span>
          <span style="color: ${kpis.medianReturnPct >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}">${kpis.medianReturnPct.toFixed(1)}%</span>
          <span style="color: var(--color-text-muted); font-weight: normal; margin: 0 4px;">/</span>
          <span style="color: ${kpis.p95ReturnPct >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}">${kpis.p95ReturnPct.toFixed(1)}%</span>
        </div>
      </div>
      <div class="card" style="padding: 1rem;">
        <div class="text-muted" style="font-size: 0.875rem;">Drawdown (50th/95th)</div>
        <div style="font-size: 1.25rem; font-weight: bold; margin-top: 0.5rem;">
          <span style="color: var(--color-danger)">-${kpis.expectedDrawdownPct.toFixed(1)}%</span>
          <span style="color: var(--color-text-muted); font-weight: normal; margin: 0 4px;">/</span>
          <span style="color: var(--color-danger)">-${kpis.p95DrawdownPct.toFixed(1)}%</span>
        </div>
      </div>
      <div class="card" style="padding: 1rem;">
        <div class="text-muted" style="font-size: 0.875rem;">Half Kelly (Rec. Risk)</div>
        <div style="font-size: 1.5rem; font-weight: bold;">${halfKellyPct.toFixed(2)}%</div>
      </div>
      <div class="card" style="padding: 1rem;">
        <div class="text-muted" style="font-size: 0.875rem;">Prob. of +50%</div>
        <div style="font-size: 1.5rem; font-weight: bold;">${kpis.probUp50.toFixed(1)}%</div>
      </div>
      <div class="card" style="padding: 1rem;">
        <div class="text-muted" style="font-size: 0.875rem;">Prob. of Doubling</div>
        <div style="font-size: 1.5rem; font-weight: bold;">${kpis.probDoubling.toFixed(1)}%</div>
      </div>
      <div class="card" style="padding: 1rem;">
        <div class="text-muted" style="font-size: 0.875rem;">Prob. of Ruin (>${ruinConfig}% DD)</div>
        <div style="font-size: 1.5rem; font-weight: bold; color: ${kpis.probRuin > 0 ? 'var(--color-danger)' : 'inherit'}">${kpis.probRuin.toFixed(1)}%</div>
      </div>
    `;
  }

  renderChart(curves) {
    const chartDiv = this._container.querySelector('#mc-chart');
    chartDiv.innerHTML = '';

    this.chart = createChart(chartDiv, {
      width: chartDiv.clientWidth,
      height: 400,
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

    // To prevent the chart from lagging, we show a sample of max 50 curves
    const sampleCurves = curves.slice(0, 50);

    sampleCurves.forEach(curve => {
      const ls = this.chart.addLineSeries({
        color: 'rgba(59, 130, 246, 0.3)',
        lineWidth: 1,
        crosshairMarkerVisible: false,
      });
      ls.setData(curve);
    });

    this.chart.timeScale().fitContent();

    window.addEventListener('resize', () => {
      if (this.chart && chartDiv) {
        this.chart.applyOptions({ width: chartDiv.clientWidth });
      }
    });
  }
}
 