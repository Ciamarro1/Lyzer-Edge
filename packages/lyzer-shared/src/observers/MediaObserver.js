/**
 * Media Observer — Observer Dynamics Lab (Era 7.1 Wave 2)
 * Ingests media narratives, computes EPU (Economic Policy Uncertainty),
 * models Negative Bias, and applies exponential sentiment decay.
 */
export class MediaObserver {
  constructor(options = {}) {
    this.decayRate = options.decayRate || 0.0005; // lambda in seconds
    this.negativeBiasMultiplier = options.negativeBiasMultiplier || 1.6;
    this.newsStream = [];
    this.epuHistory = [];
  }

  /**
   * Ingests a news or narrative event.
   * @param {Object} item - { id, timestamp, headline, sentiment (-1 to 1), category, reach (0-1) }
   */
  ingestNews(item) {
    const rawSentiment = typeof item.sentiment === 'number' ? item.sentiment : 0;
    // Negative bias: bad news has asymmetric psychological impact
    const adjustedSentiment = rawSentiment < 0
      ? rawSentiment * this.negativeBiasMultiplier
      : rawSentiment;

    const newsEntry = {
      id: item.id || `NEWS_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      timestamp: item.timestamp || Date.now(),
      headline: item.headline || '',
      category: item.category || 'MACRO',
      rawSentiment,
      adjustedSentiment: Math.max(-1.0, Math.min(1.0, adjustedSentiment)),
      reach: item.reach || 0.5
    };

    this.newsStream.push(newsEntry);
    if (this.newsStream.length > 500) this.newsStream.shift();
    return newsEntry;
  }

  /**
   * Calculates the decayed sentiment of a specific news event at time t.
   */
  getSentimentDecay(newsItem, currentTime = Date.now()) {
    const elapsedSeconds = Math.max(0, (currentTime - newsItem.timestamp) / 1000);
    const decayFactor = Math.exp(-this.decayRate * elapsedSeconds);
    return newsItem.adjustedSentiment * decayFactor;
  }

  /**
   * Computes the aggregated net sentiment across all active news items.
   */
  getCurrentSentiment(currentTime = Date.now()) {
    if (this.newsStream.length === 0) {
      return { netSentiment: 0, activeStoriesCount: 0, dominantNarrative: 'NEUTRAL' };
    }

    let totalWeightedSentiment = 0;
    let totalWeight = 0;

    for (const item of this.newsStream) {
      const decayed = this.getSentimentDecay(item, currentTime);
      const weight = item.reach || 0.5;
      totalWeightedSentiment += decayed * weight;
      totalWeight += weight;
    }

    const net = totalWeight > 0 ? totalWeightedSentiment / totalWeight : 0;
    const boundedNet = Math.max(-1.0, Math.min(1.0, net));

    let dominantNarrative = 'NEUTRAL';
    if (boundedNet > 0.25) dominantNarrative = 'EUPHORIA';
    else if (boundedNet < -0.25) dominantNarrative = 'PANIC';

    return {
      netSentiment: boundedNet,
      activeStoriesCount: this.newsStream.length,
      dominantNarrative
    };
  }

  /**
   * Computes the Economic Policy Uncertainty (EPU) index from narrative dispersion.
   */
  getEpuScore(currentTime = Date.now()) {
    if (this.newsStream.length < 2) return 0.2; // Baseline calm uncertainty

    const sentiments = this.newsStream.map(n => this.getSentimentDecay(n, currentTime));
    const mean = sentiments.reduce((a, b) => a + b, 0) / sentiments.length;
    const variance = sentiments.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / sentiments.length;
    const dispersion = Math.sqrt(variance);

    // EPU is higher when news reports contradictory or high-variance narratives
    const epu = Math.min(1.0, dispersion * 1.5 + (Math.abs(mean) * 0.3));
    return epu;
  }
}
