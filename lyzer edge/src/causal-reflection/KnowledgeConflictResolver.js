export class KnowledgeConflictResolver {
  resolveConflict(patternA, patternB) {
    if (!patternA || !patternB) {
      throw new Error('Pattern A and Pattern B are required for conflict resolution');
    }

    // Weighting vectors: 40% Confidence, 30% Sample Count, 20% Avg PnL, 10% Recency
    const scoreA = (patternA.confidence_score * 0.40) + 
                   (Math.min(1.0, patternA.observations_count / 500) * 0.30) + 
                   (Math.max(0, patternA.avg_pnl / 10) * 0.20) + 
                   (patternA.updated_at ? 0.10 : 0.05);

    const scoreB = (patternB.confidence_score * 0.40) + 
                   (Math.min(1.0, patternB.observations_count / 500) * 0.30) + 
                   (Math.max(0, patternB.avg_pnl / 10) * 0.20) + 
                   (patternB.updated_at ? 0.10 : 0.05);

    const winner = scoreA >= scoreB ? patternA : patternB;
    const loser = scoreA >= scoreB ? patternB : patternA;

    return {
      winner_pattern_id: winner.pattern_id,
      loser_pattern_id: loser.pattern_id,
      winning_score: Number(scoreA >= scoreB ? scoreA.toFixed(4) : scoreB.toFixed(4)),
      losing_score: Number(scoreA >= scoreB ? scoreB.toFixed(4) : scoreA.toFixed(4)),
      resolution_reason: `Pattern ${winner.pattern_id} outperformed ${loser.pattern_id} in composite sample & confidence score.`
    };
  }
}
