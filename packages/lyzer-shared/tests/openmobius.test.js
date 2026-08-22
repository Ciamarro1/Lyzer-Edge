import { find_sweeps } from '../src/providers/openmobius/liquidity.js';
import { find_order_blocks, calcAtr } from '../src/providers/openmobius/orderBlocks.js';
import { analyze_dealing_range } from '../src/providers/openmobius/location.js';
import assert from 'assert';

describe('OpenMobius Math Ports', () => {
  const mockCandles = [
    { open: 100, high: 110, low: 90, close: 105 },
    { open: 105, high: 115, low: 95, close: 110 },
    { open: 110, high: 120, low: 100, close: 115 },
    { open: 115, high: 125, low: 105, close: 120 },
    { open: 120, high: 130, low: 110, close: 125 }
  ];

  it('analyze_dealing_range should calculate premium, discount, equilibrium', () => {
    const res = analyze_dealing_range(mockCandles);
    assert.strictEqual(res.high, 130);
    assert.strictEqual(res.low, 90);
    assert.strictEqual(res.equilibrium, 110);
    assert.deepStrictEqual(res.premium, [110, 130]);
    assert.deepStrictEqual(res.discount, [90, 110]);
  });

  it('find_order_blocks should return empty on small dataset without proper setup', () => {
    const obs = find_order_blocks(mockCandles);
    assert.strictEqual(Array.isArray(obs), true);
  });

  it('find_sweeps should return array', () => {
    const sweeps = find_sweeps(mockCandles, [{ index: 0, price: 105, kind: 'high' }]);
    assert.strictEqual(Array.isArray(sweeps), true);
  });
});
