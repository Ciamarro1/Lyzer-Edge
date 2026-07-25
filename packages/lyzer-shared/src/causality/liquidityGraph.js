/**
 * LiquidityGraph — Dynamic Weighted Liquidity Network
 * Represents Buy-side (BSL) and Sell-side (SSL) pools as graph nodes.
 */

export class LiquidityGraph {
  constructor() {
    this.nodes = new Map();
    this.nodeCounter = 0;
  }

  addNode({ type, price, strength = 1.0, htf = false, ageCandles = 0 }) {
    const id = `Node_${++this.nodeCounter}`;
    const node = {
      id,
      type, // 'BUY_SIDE' | 'SELL_SIDE'
      price,
      strength,
      htf,
      ageCandles,
      isMitigated: false,
      mitigationTime: null
    };
    this.nodes.set(id, node);
    return node;
  }

  updateGraph(currentPrice, atr) {
    const activeNodes = [];
    for (const [id, node] of this.nodes.entries()) {
      if (node.isMitigated) continue;

      // Distance in ATR
      const distanceAtr = Math.abs(currentPrice - node.price) / (atr || 1);

      // Check if price swept the liquidity node
      if (node.type === 'BUY_SIDE' && currentPrice >= node.price) {
        node.isMitigated = true;
        node.mitigationTime = Date.now();
      } else if (node.type === 'SELL_SIDE' && currentPrice <= node.price) {
        node.isMitigated = true;
        node.mitigationTime = Date.now();
      } else {
        // Probability attraction decay curve
        const probability = Math.max(0.1, 1 - distanceAtr * 0.15);
        activeNodes.push({ ...node, distanceAtr, probability });
      }
    }
    return activeNodes;
  }
}
