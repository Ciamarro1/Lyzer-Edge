import { HttpsProxyAgent } from 'https-proxy-agent';
import { ProxyAgent } from 'undici';

const proxyUrl = process.env.BINANCE_PROXY;

export function getWsProxyAgent() {
  if (proxyUrl) {
    return new HttpsProxyAgent(proxyUrl);
  }
  return undefined;
}

export function getFetchDispatcher() {
  if (proxyUrl) {
    return new ProxyAgent(proxyUrl);
  }
  return undefined;
}
