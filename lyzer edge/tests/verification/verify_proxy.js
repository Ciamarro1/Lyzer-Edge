process.env.BINANCE_PROXY = 'http://localhost:8080';

import assert from 'node:assert';

const { getWsProxyAgent, getFetchDispatcher } = await import('../../backend/utils/proxyManager.js');

const wsAgent = getWsProxyAgent();
const fetchDispatcher = getFetchDispatcher();

assert(typeof wsAgent === 'object' && wsAgent !== null, 'getWsProxyAgent did not return an object');
assert(typeof fetchDispatcher === 'object' && fetchDispatcher !== null, 'getFetchDispatcher did not return an object');

console.log('Success: Proxy agents verified successfully.');
