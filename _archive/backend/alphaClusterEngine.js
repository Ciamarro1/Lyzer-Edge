/**
 * ARL v2 Alpha Clustering Engine
 * Groups signal hypotheses into families of behaviour to detect aggregate edge.
 */

export class AlphaClusterEngine {
  constructor() {
    this.clusters = {
      "Momentum": ["breakout_momentum"],
      "Mean Reversion": ["mean_reversion_lowvol"],
      "Rejection": ["wick_rejection"]
    };
  }

  getClusterForSignal(signalName) {
    for (const [clusterName, signals] of Object.entries(this.clusters)) {
      if (signals.includes(signalName)) return clusterName;
    }
    return "Unclassified";
  }

  analyzeClusters(signalResults) {
    const clusterMap = {};

    Object.entries(signalResults).forEach(([name, res]) => {
      const cluster = this.getClusterForSignal(name);
      if (!clusterMap[cluster]) {
        clusterMap[cluster] = {
          name: cluster,
          evs: [],
          decays: [],
          sharpes: [],
          signals: []
        };
      }
      clusterMap[cluster].evs.push(res.ev);
      clusterMap[cluster].decays.push(res.decay);
      clusterMap[cluster].sharpes.push(res.sharpe);
      clusterMap[cluster].signals.push(name);
    });

    const report = {};
    for (const [cName, data] of Object.entries(clusterMap)) {
      const avgEv = data.evs.reduce((a, b) => a + b, 0) / (data.evs.length || 1);
      const avgDecay = data.decays.reduce((a, b) => a + b, 0) / (data.decays.length || 1);
      const avgSharpe = data.sharpes.reduce((a, b) => a + b, 0) / (data.sharpes.length || 1);

      report[cName] = {
        name: cName,
        avgEv: Number(avgEv.toFixed(6)),
        avgDecay: Number(avgDecay.toFixed(6)),
        avgSharpe: Number(avgSharpe.toFixed(2)),
        status: avgEv > 0.0001 ? "ALIVE" : "DEAD",
        signals: data.signals
      };
    }
    return report;
  }
}
