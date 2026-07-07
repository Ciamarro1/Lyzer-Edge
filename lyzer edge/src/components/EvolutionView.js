import { getEdgeSnapshots } from '../db/queries.js';
import { createChart } from 'lightweight-charts';
import ApexCharts from 'apexcharts';

export class EvolutionView {
  constructor() {
    this._container = null;
    this.mainChart = null;
    this.metricsChart = null;
  }

  async mount(container) {
    this._container = container;

    this._container.innerHTML = `
      <div class="page-container">
        <div class="page-header">
          <h1 class="page-title">Trader Evolution</h1>
          <p class="page-subtitle">Track your historical performance and edge over time</p>
        </div>

        <div class="dashboard-grid" style="display: grid; grid-template-columns: 1fr; gap: 1rem;">
          <div class="card">
            <h3>Edge Score Evolution</h3>
            <p class="text-muted" style="margin-bottom: 1rem;">Comparison of raw edge vs rolling averages.</p>
            <div id="evo-main-chart" style="width: 100%; height: 400px;"></div>
          </div>

          <div class="card" style="margin-top: 1rem;">
            <h3>Psychological & Behavioral Metrics</h3>
            <p class="text-muted" style="margin-bottom: 1rem;">Confidence, Persistence, and Behavior Score trends.</p>
            <div id="evo-metrics-chart" style="width: 100%; height: 350px;"></div>
          </div>
          
          <div class="card" style="margin-top: 1rem;">
            <h3>Evolution Data</h3>
            <div id="evo-data-table" style="overflow-x: auto;">
              <p>Loading data...</p>
            </div>
          </div>
        </div>
      </div>
    `;

    await this._loadData();
  }

  unmount() {
    if (this.mainChart) {
      this.mainChart.remove();
      this.mainChart = null;
    }
    if (this.metricsChart) {
      this.metricsChart.destroy();
      this.metricsChart = null;
    }
    if (this._container) {
      this._container.innerHTML = '';
      this._container = null;
    }
  }

  async _loadData() {
    const snapshots = await getEdgeSnapshots();
    
    if (!snapshots || snapshots.length === 0) {
      const mainContainer = this._container.querySelector('#evo-main-chart');
      if (mainContainer) mainContainer.innerHTML = '<div class="empty-state"><p class="text-muted">No evolution data available.</p></div>';
      
      const metricsContainer = this._container.querySelector('#evo-metrics-chart');
      if (metricsContainer) metricsContainer.innerHTML = '<div class="empty-state"><p class="text-muted">No evolution data available.</p></div>';
      
      const tableContainer = this._container.querySelector('#evo-data-table');
      if (tableContainer) tableContainer.innerHTML = '<div class="empty-state"><p class="text-muted">No evolution data available.</p></div>';
      return;
    }

    this._renderMainChart(snapshots);
    this._renderMetricsChart(snapshots);
    this._renderTable(snapshots);
  }

  _renderMainChart(snapshots) {
    const container = this._container.querySelector('#evo-main-chart');
    if (!container) return;
    container.innerHTML = '';

    const sorted = [...snapshots].sort((a, b) => a.date.localeCompare(b.date));

    // Prepare Lightweight Charts data
    let lastTime = 0;
    const toTime = (dateStr, index) => {
      let t = new Date(dateStr).getTime() / 1000;
      if (isNaN(t)) {
        t = (new Date().getTime() / 1000) - (sorted.length - index) * 86400;
      }
      if (t <= lastTime) {
        t = lastTime + 60;
      }
      lastTime = t;
      return t;
    };

    const edgeScoreData = [];
    const rolling30Data = [];
    const rolling100Data = [];

    sorted.forEach((s, i) => {
      const time = toTime(s.date, i);
      edgeScoreData.push({ time, value: s.edgeScore || 0 });
      if (s.rolling30Edge !== undefined && s.rolling30Edge !== null) {
        rolling30Data.push({ time, value: s.rolling30Edge });
      }
      if (s.rolling100Edge !== undefined && s.rolling100Edge !== null) {
        rolling100Data.push({ time, value: s.rolling100Edge });
      }
    });

    this.mainChart = createChart(container, {
      width: container.clientWidth,
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

    const edgeSeries = this.mainChart.addLineSeries({
      color: 'rgba(255, 255, 255, 0.5)',
      lineWidth: 1,
      lineStyle: 1, // Dotted/Dashed
      title: 'Raw Edge',
    });
    edgeSeries.setData(edgeScoreData);

    const r30Series = this.mainChart.addLineSeries({
      color: '#3b82f6',
      lineWidth: 2,
      title: '30-Trade Avg',
    });
    r30Series.setData(rolling30Data);

    const r100Series = this.mainChart.addLineSeries({
      color: '#06d6a0',
      lineWidth: 3,
      title: '100-Trade Avg',
    });
    r100Series.setData(rolling100Data);

    this.mainChart.timeScale().fitContent();

    window.addEventListener('resize', () => {
      if (this.mainChart && container) {
        this.mainChart.applyOptions({ width: container.clientWidth });
      }
    });
  }

  _renderMetricsChart(snapshots) {
    const container = this._container.querySelector('#evo-metrics-chart');
    if (!container) return;
    container.innerHTML = '';

    const sorted = [...snapshots].sort((a, b) => a.date.localeCompare(b.date));
    const dates = sorted.map(s => s.date);
    const confidence = sorted.map(s => s.confidence || 0);
    const persistence = sorted.map(s => s.persistence || 0);
    const behavior = sorted.map(s => s.behaviorScore || 0);

    const options = {
      series: [
        { name: 'Confidence', data: confidence },
        { name: 'Persistence', data: persistence },
        { name: 'Behavior', data: behavior }
      ],
      chart: {
        type: 'line',
        height: 350,
        toolbar: { show: false },
        background: 'transparent',
        animations: { enabled: false }
      },
      stroke: {
        curve: 'smooth',
        width: 2
      },
      colors: ['#a855f7', '#f59e0b', '#ec4899'],
      xaxis: {
        categories: dates,
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
      legend: {
        labels: { colors: '#d1d5db' }
      },
      theme: { mode: 'dark' }
    };

    this.metricsChart = new ApexCharts(container, options);
    this.metricsChart.render();
  }
  
  _renderTable(snapshots) {
    const container = this._container.querySelector('#evo-data-table');
    if (!container) return;
    
    const sorted = [...snapshots].sort((a, b) => b.date.localeCompare(a.date)); // Newest first

    container.innerHTML = `
      <table style="width: 100%; border-collapse: collapse; text-align: left;">
        <thead>
          <tr style="border-bottom: 1px solid var(--color-border, #333);">
            <th style="padding: 0.75rem 0.5rem;">Date</th>
            <th style="padding: 0.75rem 0.5rem;">Total Trades</th>
            <th style="padding: 0.75rem 0.5rem;">Raw Edge</th>
            <th style="padding: 0.75rem 0.5rem;">30-Avg Edge</th>
            <th style="padding: 0.75rem 0.5rem;">Behavior</th>
            <th style="padding: 0.75rem 0.5rem;">Risk of Ruin</th>
          </tr>
        </thead>
        <tbody>
          ${sorted.map(s => `
            <tr style="border-bottom: 1px solid var(--color-border, #333);">
              <td style="padding: 0.75rem 0.5rem;">${s.date}</td>
              <td style="padding: 0.75rem 0.5rem;">${s.totalTrades ?? '-'}</td>
              <td style="padding: 0.75rem 0.5rem;">${s.edgeScore != null ? s.edgeScore.toFixed(1) : '-'}</td>
              <td style="padding: 0.75rem 0.5rem; color: #3b82f6;">${s.rolling30Edge != null ? s.rolling30Edge.toFixed(1) : '-'}</td>
              <td style="padding: 0.75rem 0.5rem; color: #ec4899;">${s.behaviorScore != null ? s.behaviorScore.toFixed(1) : '-'}</td>
              <td style="padding: 0.75rem 0.5rem; color: var(--color-danger, #ef4444);">${s.riskOfRuin != null ? s.riskOfRuin.toFixed(2) + '%' : '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }
}
 