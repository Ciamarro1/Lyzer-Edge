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

async function testEndpoints() {
  console.log('Testing Binance Public Futures Endpoints...');
  
  // 1. Funding Rate
  try {
    const funding = await httpsGet('https://fapi.binance.com/fapi/v1/fundingRate?symbol=BTCUSDT&limit=5');
    console.log('✅ Funding Rate Endpoint OK. Sample:', funding.slice(0, 2));
  } catch (err) {
    console.error('❌ Funding Rate failed:', err.message);
  }

  // 2. Open Interest Hist
  try {
    const oi = await httpsGet('https://fapi.binance.com/futures/data/openInterestHist?symbol=BTCUSDT&period=1h&limit=5');
    console.log('✅ Open Interest Hist Endpoint OK. Sample:', oi.slice(0, 2));
  } catch (err) {
    console.error('❌ Open Interest failed:', err.message);
  }
}

testEndpoints();
