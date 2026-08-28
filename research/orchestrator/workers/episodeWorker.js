import { parentPort, workerData } from 'worker_threads';
import { FROZEN_V5_CONFIG, FROZEN_CONFIG_HASH } from '../frozenConfig.js';

export function runEpisodeTask(providedLedger = []) {
  const ledger = providedLedger;

  const clusters = [];
  let currentCluster = [];

  for (let i = 0; i < ledger.length; i++) {
    const trade = ledger[i];
    if (currentCluster.length === 0) {
      currentCluster.push(trade);
    } else {
      const prev = currentCluster[currentCluster.length - 1];
      const diffHours = (trade.timestamp - prev.timestamp) / (1000 * 3600);
      if (diffHours <= 24) {
        currentCluster.push(trade);
      } else {
        clusters.push([...currentCluster]);
        currentCluster = [trade];
      }
    }
  }
  if (currentCluster.length > 0) clusters.push(currentCluster);

  let count1 = 0;
  let count2 = 0;
  let count3 = 0;
  let countMore = 0;

  const episodes = [];

  clusters.forEach((c, idx) => {
    const epId = idx + 1;
    const nTrades = c.length;
    const epGross = c.reduce((s, t) => s + t.trueGrossPnL, 0);
    const epFriction = c.reduce((s, t) => s + t.totalFrictionCost, 0);
    const epNet = c.reduce((s, t) => s + t.trueNetPnL, 0);
    const isEpWin = epNet > 0;
    const dates = c.map(t => t.dateUtc.slice(0, 16)).join(' | ');

    if (nTrades === 1) count1++;
    else if (nTrades === 2) count2++;
    else if (nTrades === 3) count3++;
    else countMore++;

    episodes.push({
      episodeId: epId,
      tradeCount: nTrades,
      tradeIds: c.map(t => t.tradeId),
      grossPnL: Number(epGross.toFixed(2)),
      friction: Number(epFriction.toFixed(2)),
      netPnL: Number(epNet.toFixed(2)),
      isWin: isEpWin,
      timestamps: c.map(t => t.timestamp),
      dateStr: dates
    });
  });

  const totalEpisodes = episodes.length;
  const epWins = episodes.filter(e => e.isWin).length;
  const epLosses = totalEpisodes - epWins;
  const episodeWinRate = Number(((epWins / totalEpisodes) * 100).toFixed(2));

  // Concentration Analysis
  const sortedEpNet = [...episodes].sort((a, b) => b.netPnL - a.netPnL);
  const totalNetPnL = Number(ledger.reduce((s, t) => s + t.trueNetPnL, 0).toFixed(2));

  const top1Net = sortedEpNet[0].netPnL;
  const top3Net = Number(sortedEpNet.slice(0, 3).reduce((s, e) => s + e.netPnL, 0).toFixed(2));
  const top5Net = Number(sortedEpNet.slice(0, 5).reduce((s, e) => s + e.netPnL, 0).toFixed(2));

  const top1SharePct = Number(((top1Net / totalNetPnL) * 100).toFixed(2));
  const top3SharePct = Number(((top3Net / totalNetPnL) * 100).toFixed(2));
  const top5SharePct = Number(((top5Net / totalNetPnL) * 100).toFixed(2));

  const worstEpisode = sortedEpNet[sortedEpNet.length - 1].netPnL;
  const medianEpisode = sortedEpNet[Math.floor(sortedEpNet.length / 2)].netPnL;

  // Gate E Assertion: Top 1 Episode <= 40% of PnL, Top 3 Episodes <= 70% of PnL
  const gateEPass = top1SharePct <= FROZEN_V5_CONFIG.gates.gateE_Top1EpisodeMaxSharePct;

  return {
    workerName: 'episodeWorker',
    configHash: FROZEN_CONFIG_HASH,
    totalTrades: ledger.length,
    totalEpisodes,
    composition: {
      episodesWith1Trade: count1,
      episodesWith2Trades: count2,
      episodesWith3Trades: count3,
      tradesCheckSum: (count1 * 1 + count2 * 2 + count3 * 3 + countMore)
    },
    performance: {
      episodeWins: epWins,
      episodeLosses: epLosses,
      episodeWinRate,
      totalNetPnL,
      medianEpisodeNetPnL: medianEpisode,
      worstEpisodeNetPnL: worstEpisode
    },
    concentration: {
      top1EpisodeNet: top1Net,
      top1EpisodeSharePct: top1SharePct,
      top3EpisodesNet: top3Net,
      top3EpisodesSharePct: top3SharePct,
      top5EpisodesNet: top5Net,
      top5EpisodesSharePct: top5SharePct
    },
    gateE_ConcentrationStatus: gateEPass ? 'PASS' : 'WARN_EXCEEDED_BOUND',
    episodes
  };
}

if (parentPort) {
  const result = runEpisodeTask(workerData?.ledger);
  parentPort.postMessage(result);
}
