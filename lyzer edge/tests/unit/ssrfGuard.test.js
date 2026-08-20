import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isPrivateIp,
  validateSymbol,
  validateInterval,
  validateUrl,
  safeFetch,
  DEFAULT_ALLOWED_DOMAINS
} from '../../backend/utils/ssrfGuard.js';
import { LiveDataIngestor } from '../../backend/liveDataIngestor.js';
import { sendTelegramAlert } from '../../backend/telegram.js';
import { ExchangeExecution } from '../../backend/exchangeExecution.js';

describe('ssrfGuard Utility Suite', () => {
  describe('isPrivateIp', () => {
    it('detects IPv4 loopback address (127.0.0.1)', () => {
      expect(isPrivateIp('127.0.0.1')).toBe(true);
      expect(isPrivateIp('127.0.0.254')).toBe(true);
    });

    it('detects string localhost', () => {
      expect(isPrivateIp('localhost')).toBe(true);
    });

    it('detects cloud metadata / link-local IP (169.254.169.254)', () => {
      expect(isPrivateIp('169.254.169.254')).toBe(true);
      expect(isPrivateIp('169.254.0.1')).toBe(true);
    });

    it('detects RFC 1918 Class A private IP (10.0.0.1)', () => {
      expect(isPrivateIp('10.0.0.1')).toBe(true);
      expect(isPrivateIp('10.255.255.255')).toBe(true);
    });

    it('detects RFC 1918 Class B private IP (172.16.0.1 - 172.31.255.255)', () => {
      expect(isPrivateIp('172.16.0.1')).toBe(true);
      expect(isPrivateIp('172.31.255.255')).toBe(true);
      expect(isPrivateIp('172.15.0.1')).toBe(false);
      expect(isPrivateIp('172.32.0.1')).toBe(false);
    });

    it('detects RFC 1918 Class C private IP (192.168.1.1)', () => {
      expect(isPrivateIp('192.168.1.1')).toBe(true);
      expect(isPrivateIp('192.168.255.255')).toBe(true);
    });

    it('detects Carrier-grade NAT (100.64.0.1)', () => {
      expect(isPrivateIp('100.64.0.1')).toBe(true);
      expect(isPrivateIp('100.127.255.255')).toBe(true);
    });

    it('detects IPv6 loopback, unspecified, and private ranges', () => {
      expect(isPrivateIp('::1')).toBe(true);
      expect(isPrivateIp('::')).toBe(true);
      expect(isPrivateIp('0:0:0:0:0:0:0:1')).toBe(true);
      expect(isPrivateIp('fc00::1')).toBe(true);
      expect(isPrivateIp('fd12:3456:789a:1::1')).toBe(true);
      expect(isPrivateIp('fe80::1')).toBe(true);
      expect(isPrivateIp('::ffff:127.0.0.1')).toBe(true);
      expect(isPrivateIp('::ffff:10.0.0.1')).toBe(true);
    });

    it('allows public IPv4 addresses', () => {
      expect(isPrivateIp('8.8.8.8')).toBe(false);
      expect(isPrivateIp('1.1.1.1')).toBe(false);
      expect(isPrivateIp('13.224.0.1')).toBe(false);
    });
  });

  describe('validateSymbol', () => {
    it('accepts valid uppercase symbols', () => {
      expect(validateSymbol('BTCUSDT')).toBe('BTCUSDT');
      expect(validateSymbol('ethusdt')).toBe('ETHUSDT');
      expect(validateSymbol('SOL')).toBe('SOL');
    });

    it('rejects invalid symbols', () => {
      expect(() => validateSymbol('BTC;DROP')).toThrow();
      expect(() => validateSymbol('A')).toThrow();
      expect(() => validateSymbol('')).toThrow();
      expect(() => validateSymbol('USDT/BTC')).toThrow();
      expect(() => validateSymbol('123456789012345678901')).toThrow();
      expect(() => validateSymbol(123)).toThrow();
    });
  });

  describe('validateInterval', () => {
    it('accepts allowed intervals', () => {
      expect(validateInterval('1m')).toBe('1m');
      expect(validateInterval('5m')).toBe('5m');
      expect(validateInterval('15m')).toBe('15m');
      expect(validateInterval('1h')).toBe('1h');
      expect(validateInterval('4h')).toBe('4h');
      expect(validateInterval('1d')).toBe('1d');
    });

    it('rejects unapproved intervals', () => {
      expect(() => validateInterval('2m')).toThrow();
      expect(() => validateInterval('10m')).toThrow();
      expect(() => validateInterval('1w')).toThrow();
      expect(() => validateInterval('1m;')).toThrow();
      expect(() => validateInterval('')).toThrow();
    });
  });

  describe('validateUrl', () => {
    it('rejects invalid schemes (gopher://, file://, ftp://)', async () => {
      await expect(validateUrl('gopher://127.0.0.1')).rejects.toThrow(/Disallowed URL scheme/);
      await expect(validateUrl('file:///etc/passwd')).rejects.toThrow(/Disallowed URL scheme/);
      await expect(validateUrl('ftp://api.binance.com')).rejects.toThrow(/Disallowed URL scheme/);
    });

    it('rejects direct loopback and private IP endpoints', async () => {
      await expect(validateUrl('http://127.0.0.1')).rejects.toThrow(/Access to private\/loopback IP address/);
      await expect(validateUrl('http://169.254.169.254/latest/meta-data')).rejects.toThrow(/Access to private\/loopback IP address/);
      await expect(validateUrl('http://10.0.0.1')).rejects.toThrow(/Access to private\/loopback IP address/);
      await expect(validateUrl('http://192.168.1.1')).rejects.toThrow(/Access to private\/loopback IP address/);
    });

    it('rejects unlisted external domains', async () => {
      await expect(validateUrl('https://evil-attacker.com')).rejects.toThrow(/not in allowlist/);
      await expect(validateUrl('https://binance.com.evil.com')).rejects.toThrow(/not in allowlist/);
      await expect(validateUrl('https://fakebinance.com')).rejects.toThrow(/not in allowlist/);
    });

    it('accepts valid allowlisted endpoints (with skipDns for mock testing)', async () => {
      const url1 = await validateUrl('https://api.binance.com/api/v3/klines', { skipDns: true });
      expect(url1).toBe('https://api.binance.com/api/v3/klines');

      const url2 = await validateUrl('https://testnet.binance.vision/api/v3/order', { skipDns: true });
      expect(url2).toBe('https://testnet.binance.vision/api/v3/order');

      const url3 = await validateUrl('https://api.telegram.org/bot123/sendMessage', { skipDns: true });
      expect(url3).toBe('https://api.telegram.org/bot123/sendMessage');
    });

    it('supports ws and wss when allowWs is true', async () => {
      const wsUrl = await validateUrl('wss://stream.binance.com:9443/ws/btcusdt@kline_1m', { allowWs: true, skipDns: true });
      expect(wsUrl).toBe('wss://stream.binance.com:9443/ws/btcusdt@kline_1m');
    });
  });

  describe('safeFetch wrapper', () => {
    it('blocks internal/loopback fetch requests before network execution', async () => {
      await expect(safeFetch('http://127.0.0.1/admin')).rejects.toThrow();
      await expect(safeFetch('http://169.254.169.254/latest/meta-data')).rejects.toThrow();
    });

    it('sets redirect: error on fetch requests', async () => {
      const globalFetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
      vi.stubGlobal('fetch', globalFetchMock);

      await safeFetch('https://api.binance.com/api/v3/klines', { skipDns: true });

      expect(globalFetchMock).toHaveBeenCalledWith(
        'https://api.binance.com/api/v3/klines',
        expect.objectContaining({ redirect: 'error' })
      );

      vi.unstubAllGlobals();
    });
  });

  describe('Refactored Module Hardening Integration', () => {
    describe('LiveDataIngestor', () => {
      it('rejects invalid symbols and intervals at construction', () => {
        expect(() => new LiveDataIngestor('INVALID;SYMBOL', '1m')).toThrow();
        expect(() => new LiveDataIngestor('BTCUSDT', '99m')).toThrow();
      });

      it('constructs successfully with valid symbol and interval', () => {
        const ingestor = new LiveDataIngestor('BTCUSDT', '1m');
        expect(ingestor.symbol).toBe('BTCUSDT');
        expect(ingestor.interval).toBe('1m');
      });
    });

    describe('telegram.js', () => {
      const originalEnv = process.env;

      beforeEach(() => {
        process.env = { ...originalEnv };
        process.env.TELEGRAM_BOT_TOKEN = 'mock_bot_token_12345';
        process.env.TELEGRAM_CHAT_ID = 'mock_chat_id_67890';
      });

      afterEach(() => {
        process.env = originalEnv;
        vi.unstubAllGlobals();
      });

      it('blocks unauthorized custom TELEGRAM_API_URL endpoints', async () => {
        process.env.TELEGRAM_API_URL = 'http://127.0.0.1:50053';
        await expect(sendTelegramAlert('Hello Test')).rejects.toThrow();

        process.env.TELEGRAM_API_URL = 'https://malicious-proxy.com';
        await expect(sendTelegramAlert('Hello Test')).rejects.toThrow();
      });

      it('redacts sensitive bot token from error outputs', async () => {
        process.env.TELEGRAM_API_URL = 'https://api.telegram.org';
        const globalFetchMock = vi.fn().mockRejectedValue(new Error('Connection failed to https://api.telegram.org/bot12345/sendMessage'));
        vi.stubGlobal('fetch', globalFetchMock);

        try {
          await sendTelegramAlert('Secret Alert');
          expect.fail('Should have thrown error');
        } catch (err) {
          expect(err.message).not.toContain('bot12345');
          expect(err.message).toContain('bot[REDACTED]');
        }
      });
    });

    describe('ExchangeExecution (Root, v1_fast, v2_deep)', () => {
      it('enforces symbol validation on order placement', async () => {
        const rootExec = new ExchangeExecution('key', 'secret');
        await expect(rootExec.placeOrder('BAD;SYMBOL', 'BUY')).rejects.toThrow();
      });

      it('executes safeFetch with encoded query string parameters', async () => {
        const globalFetchMock = vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ orderId: 98765 })
        });
        vi.stubGlobal('fetch', globalFetchMock);

        const exec = new ExchangeExecution('testkey', 'testsecret', true);
        const res = await exec.placeOrder('BTCUSDT', 'BUY', 'MARKET', 0.01);

        expect(res.orderId).toBe(98765);
        expect(globalFetchMock).toHaveBeenCalled();
        const calledUrl = globalFetchMock.mock.calls[0][0];
        expect(calledUrl).toContain('symbol=BTCUSDT');
        expect(calledUrl).toContain('side=BUY');
        expect(calledUrl).toContain('quantity=0.01');
        expect(globalFetchMock.mock.calls[0][1]).toEqual(expect.objectContaining({ redirect: 'error' }));

        vi.unstubAllGlobals();
      });
    });
  });
});
