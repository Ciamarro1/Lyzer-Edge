export function analyze_dealing_range(candles) {
  if (!candles || candles.length === 0) return null;
  let max = -Infinity;
  let min = Infinity;
  for (const c of candles) {
    if (c.high > max) max = c.high;
    if (c.low < min) min = c.low;
  }
  const equilibrium = (max + min) / 2;
  return {
    premium: [equilibrium, max],
    discount: [min, equilibrium],
    equilibrium: equilibrium,
    high: max,
    low: min
  };
}
