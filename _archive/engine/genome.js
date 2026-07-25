import { calcEdgeScore } from './edgescore.js';

/**
 * Lyzer Edge - Edge Genome Engine
 * 
 * Automatically synthesizes the trader's DNA from the Pattern Graph across three layers:
 * - Natural Habitat: The intersection where the trader thrives
 * - Anti-Habitat: The intersection where capital is destroyed
 * - Untapped Habitat: High Edge & Confidence, but very low participation
 */

/**
 * Derives trading session if missing
 */
function deriveSession(isoDate) {
  if (!isoDate) return 'Unknown';
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return 'Unknown';

  const hour = d.getUTCHours();
  if (hour >= 0 && hour < 8) return 'Asia';
  if (hour >= 8 && hour < 13) return 'London';
  if (hour >= 13 && hour < 17) return 'Overlap';
  if (hour >= 17 && hour < 21) return 'NY';
  return 'Off-Hours';
}

/**
 * Get traits for a trade
 */
function getTradeTraits(trade) {
  return {
    session: trade.session || deriveSession(trade.entryDate),
    regime: trade.marketContext?.marketState || 'Unknown',
    setup: trade.setupType || trade.marketContext?.structure || 'Unknown',
    direction: trade.direction || 'Unknown'
  };
}

/**
 * Generates combinations of dimensions for intersection analysis
 * 
 * @param {Array} trades 
 * @returns {Array} List of habitat profiles
 */
export function buildGenomeProfiles(trades) {
  const groups = new Map();

  for (const t of trades) {
    const traits = getTradeTraits(t);
    // Ignore trades missing crucial context to avoid noisy unknown intersections
    if (traits.session === 'Unknown' && traits.regime === 'Unknown' && traits.setup === 'Unknown') {
      continue;
    }
    
    // Create intersection key: Session + Regime + Setup + Direction
    // E.g., London + Trend + FVG + Long
    const keyParts = [];
    if (traits.session !== 'Unknown') keyParts.push(traits.session);
    if (traits.regime !== 'Unknown') keyParts.push(traits.regime);
    if (traits.setup !== 'Unknown') keyParts.push(traits.setup);
    if (traits.direction !== 'Unknown') keyParts.push(traits.direction);

    // Only analyze combinations with at least 2 dimensions for meaningful habitats
    if (keyParts.length < 2) continue;

    const key = keyParts.join(' + ');
    
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(t);
  }

  const profiles = [];
  for (const [key, groupTrades] of groups) {
    const edge = calcEdgeScore(groupTrades);
    profiles.push({
      habitat: key,
      tradeCount: groupTrades.length,
      edgeScore: edge.score,
      confidence: edge.confidence,
      components: edge.components
    });
  }

  return profiles;
}

/**
 * Extracts the Edge Genome from the analyzed trades.
 * 
 * @param {Array} trades 
 * @returns {Object} Genome layers (Natural, Anti, Untapped)
 */
export function extractEdgeGenome(trades) {
  const profiles = buildGenomeProfiles(trades);

  // Sort by highest edge score
  const sortedByEdge = [...profiles].sort((a, b) => b.edgeScore - a.edgeScore);
  
  // Natural Habitat: High Edge, at least Moderate confidence (>= 100 trades usually, or 30+)
  // We'll consider trades >= 30 as a valid baseline for Natural Habitat
  const naturalHabitats = sortedByEdge.filter(p => p.tradeCount >= 30 && p.edgeScore >= 65);
  
  // Anti-Habitat: Low Edge (< 40), decent sample size (at least 20 to prove it's bad)
  const sortedByWorst = [...profiles].sort((a, b) => a.edgeScore - b.edgeScore);
  const antiHabitats = sortedByWorst.filter(p => p.tradeCount >= 20 && p.edgeScore < 45);

  // Untapped Habitat: High Edge (> 70) but low participation (Trades < 30)
  const untappedHabitats = sortedByEdge.filter(p => p.tradeCount < 30 && p.tradeCount >= 5 && p.edgeScore >= 70);

  return {
    naturalHabitat: naturalHabitats.length > 0 ? naturalHabitats[0] : null,
    antiHabitat: antiHabitats.length > 0 ? antiHabitats[0] : null,
    untappedHabitat: untappedHabitats.length > 0 ? untappedHabitats[0] : null,
    allProfiles: profiles
  };
}
 