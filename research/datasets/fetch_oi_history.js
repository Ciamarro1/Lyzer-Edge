import https from 'https';

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 10000 }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`JSON parse error: ${e.message}`)); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('TIMEOUT')); });
  });
}

async function testOIHistory() {
  console.log('Testing historical Open Interest reach on Binance Futures...');
  // Check how far back Binance allows openInterestHist (startTime parameter)
  const t2023 = new Date('2023-01-01T00:00:00Z').getTime();
  const t2024 = new Date('2024-01-01T00:00:00Z').getTime();
  const tRecent = Date.now() - (29 * 24 * 3600 * 1000);

  try {
    const url2023 = `https://fapi.binance.com/futures/data/openInterestHist?symbol=BTCUSDT&period=1h&startTime=${t2023}&limit=5`;
    const res2023 = await httpsGet(url2023);
    console.log(`2023 query returned ${res2023.length} items. Earliest timestamp:`, res2023[0] ? new Date(res2023[0].timestamp).toISOString() : 'none');
  } catch (err) {
    console.log('2023 query failed:', err.message);
  }

  try {
    const urlRecent = `https://fapi.binance.com/futures/data/openInterestHist?symbol=BTCUSDT&period=1h&startTime=${tRecent}&limit=5`;
    const resRecent = await httpsGet(urlRecent);
    console.log(`Recent (30d) query returned ${resRecent.length} items. Earliest timestamp:`, resRecent[0] ? new Date(resRecent[0].timestamp).toISOString() : 'none');
  } catch (err) {
    console.log('Recent query failed:', err.message);
  }
}

testOIHistory();
