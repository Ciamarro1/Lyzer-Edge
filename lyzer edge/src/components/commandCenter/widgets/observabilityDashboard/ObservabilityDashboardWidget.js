import { manifest } from './manifest.js';
import { DistributedTracingEngine } from '../../sdk/evidence/observability/DistributedTracingEngine.js';
import { HistoricalTrendEngine } from '../../sdk/evidence/observability/HistoricalTrendEngine.js';
import { BenchmarkReproducibilityEngine } from '../../sdk/evidence/observability/BenchmarkReproducibilityEngine.js';
import { ContinuousMeasurementPlatformEngine } from '../../sdk/evidence/telemetry/ContinuousMeasurementPlatformEngine.js';

export class ObservabilityDashboardWidget {
  constructor() {
    this.manifest = manifest;
    this._container = null;
    this._disposed = false;

    this._tracingEngine = new DistributedTracingEngine();
    this._trendEngine = new HistoricalTrendEngine();
    this._reproEngine = new BenchmarkReproducibilityEngine();
    this._platformEngine = new ContinuousMeasurementPlatformEngine();
  }

  async mount(container, context) {
    this._container = container;

    // Simulate a distributed trace to demonstrate the span tree
    const trace = this._tracingEngine.createTrace('tick-pipeline');
    const ingestSpan = trace.addSpan('data-ingestion');
    ingestSpan.finish('OK');
    const evalSpan = trace.addSpan('signal-evaluation');
    evalSpan.finish('OK');
    const kernelSpan = trace.addSpan('truth-kernel');
    kernelSpan.finish('OK');
    const courtSpan = trace.addSpan('constitutional-court');
    courtSpan.finish('OK');
    trace.finish('OK');

    const completedTraces = this._tracingEngine.getCompletedTraces(5);
    const pipelineMetrics = this._tracingEngine.computePipelineMetrics();

    // Record simulated historical snapshots for trend demonstration
    const commits = ['a1b2c3d', 'e4f5g6h', 'i7j8k9l', '4ca50ec', 'phase12'];
    const telemetry = this._platformEngine.generateTelemetrySnapshot();
    for (const hash of commits) {
      this._trendEngine.recordSnapshot(hash, telemetry);
    }

    const regressions = this._trendEngine.detectRegressions(5);
    const sharpeTrend = this._trendEngine.getTrendSeries('sharpeOOS', 5);
    const latencyTrend = this._trendEngine.getTrendSeries('p99LatencyUs', 5);

    // Capture a reproducibility fingerprint
    const reproRecord = this._reproEngine.captureFingerprintedRun(
      { sharpeOOS: telemetry.producao.sharpeOOS, p99LatencyUs: telemetry.performance.p99LatencyUs },
      { pipelineMode: 'FULL', evidenceEngines: 7 },
      { commitHash: '4ca50ec' }
    );
    const reproManifest = this._reproEngine.exportReproducibilityManifest();

    // Render sparkline helper
    const sparkline = (values, color) => {
      const max = Math.max(...values);
      const min = Math.min(...values);
      const range = max - min || 1;
      return values.map(v => {
        const height = Math.max(2, Math.round(((v - min) / range) * 16));
        return `<span style="display:inline-block;width:6px;height:${height}px;background:${color};margin:0 1px;vertical-align:bottom;border-radius:1px;"></span>`;
      }).join('');
    };

    this._container.innerHTML = `
      <div style="padding: 12px; font-family: monospace; background: #060913; color: #f8fafc; border-radius: 6px; font-size: 11px; border: 1px solid #1e293b;">
        <div style="font-weight: bold; color: #38bdf8; border-bottom: 1px solid #1e293b; padding-bottom: 4px; margin-bottom: 8px; display: flex; justify-content: space-between;">
          <span>🔭 OBSERVABILITY & REPRODUCIBILITY DASHBOARD</span>
          <span style="color: #a855f7;">PHASE 12 PLATFORM</span>
        </div>

        <!-- Panel 1: Distributed Tracing -->
        <div style="margin-bottom: 8px; background: #0f172a; padding: 6px; border-radius: 4px;">
          <div style="color: #94a3b8; font-weight: bold; margin-bottom: 4px;">Distributed Trace — Pipeline Spans:</div>
          ${completedTraces.length > 0 ? completedTraces.map(t => `
            <div style="color: #cbd5e1; margin-bottom: 2px;">
              <span style="color: #4ade80;">●</span> <strong>${t.name}</strong> — ${t.totalSpans} spans — ${t.totalDurationMs}ms
              <span style="color: #94a3b8; font-size: 9px;">[${t.traceId}]</span>
            </div>
            ${t.spans.filter(s => s.parentSpanId).map(s => `
              <div style="padding-left: 16px; color: #94a3b8;">
                └─ <span style="color: #facc15;">${s.name}</span>: ${s.durationMs}ms <span style="color: ${s.status === 'OK' ? '#4ade80' : '#f87171'};">[${s.status}]</span>
              </div>
            `).join('')}
          `).join('') : '<div style="color: #94a3b8;">No completed traces.</div>'}

          ${Object.keys(pipelineMetrics).length > 0 ? `
            <div style="margin-top: 4px; color: #94a3b8; font-weight: bold;">Pipeline Stage Metrics:</div>
            ${Object.entries(pipelineMetrics).map(([name, m]) => `
              <div style="padding-left: 8px; color: #cbd5e1;">
                ${name}: avg=${m.avgMs}ms | p50=${m.p50Ms}ms | p99=${m.p99Ms}ms | count=${m.count}
              </div>
            `).join('')}
          ` : ''}
        </div>

        <!-- Panel 2: Historical Trends -->
        <div style="margin-bottom: 8px; background: #0f172a; padding: 6px; border-radius: 4px;">
          <div style="color: #94a3b8; font-weight: bold; margin-bottom: 4px;">Historical Trends (last ${commits.length} commits):</div>
          <div style="display: flex; gap: 16px; flex-wrap: wrap;">
            <div>
              <div style="color: #38bdf8; font-size: 9px;">Sharpe OOS</div>
              ${sparkline(sharpeTrend.map(s => s.value), '#4ade80')}
              <div style="color: #4ade80; font-size: 10px;">${sharpeTrend[sharpeTrend.length - 1]?.value ?? '—'}</div>
            </div>
            <div>
              <div style="color: #38bdf8; font-size: 9px;">P99 Latency (µs)</div>
              ${sparkline(latencyTrend.map(s => s.value), '#facc15')}
              <div style="color: #facc15; font-size: 10px;">${latencyTrend[latencyTrend.length - 1]?.value ?? '—'}µs</div>
            </div>
          </div>
          ${regressions.length > 0
            ? `<div style="margin-top: 4px; color: #f87171; font-weight: bold;">Regressions Detected:</div>
               ${regressions.map(r => `<div style="padding-left: 8px; color: #f87171;">${r.severity}: ${r.metric} changed ${r.pctChange}%</div>`).join('')}`
            : `<div style="margin-top: 4px; color: #4ade80;">No regressions detected across ${commits.length} commits.</div>`
          }
        </div>

        <!-- Panel 3: Reproducibility -->
        <div style="background: #0f172a; padding: 6px; border-radius: 4px;">
          <div style="color: #94a3b8; font-weight: bold; margin-bottom: 4px;">Reproducibility Manifest:</div>
          <div style="color: #cbd5e1;">
            <div>Commit: <strong style="color: #38bdf8;">${reproManifest.commitHash}</strong></div>
            <div>Config Hash: <span style="color: #a855f7;">${reproManifest.configHash}</span></div>
            <div>Dataset Hash: <span style="color: #a855f7;">${reproManifest.datasetHash}</span></div>
            <div>Environment: ${reproManifest.environment.nodeVersion} / ${reproManifest.environment.platform} / ${reproManifest.environment.arch}</div>
            <div>CPU Cores: ${reproManifest.environment.cpuCores} | Memory: ${reproManifest.environment.totalMemoryMb}MB</div>
          </div>
        </div>
      </div>
    `;

    return {
      dispose: () => this.dispose()
    };
  }

  dispose() {
    this._disposed = true;
    if (this._tracingEngine) this._tracingEngine.dispose();
    if (this._trendEngine) this._trendEngine.dispose();
    if (this._reproEngine) this._reproEngine.dispose();
    if (this._platformEngine) this._platformEngine.dispose();
    if (this._container) this._container.innerHTML = '';
  }
}
