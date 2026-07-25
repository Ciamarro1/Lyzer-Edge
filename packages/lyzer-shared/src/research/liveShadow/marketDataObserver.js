/**
 * 📡 MARKET DATA OBSERVER — L15 REAL MARKET OBSERVATION LAYER
 *
 * Consome feeds read-only de exchange via ExchangeDataProvider.
 * Gerencia conexões WebSocket, heartbeats, reconexões asíncronas,
 * medição de latência física, validação temporal com ClockIntegrityMonitor
 * e captura contínua de snapshots do order book sem NUNCA enviar ordens.
 */

import { ClockIntegrityMonitor } from './clockIntegrityMonitor.js';

export class MarketDataObserver {
  /**
   * @param {import('./ExchangeDataProvider.js').ExchangeDataProvider} dataProvider Provedor de dados (Binance, Coinbase, etc.)
   * @param {Object} config Configurações adicionais
   */
  constructor(dataProvider, config = {}) {
    if (!dataProvider) throw new Error('MarketDataObserver requer um ExchangeDataProvider instanciado.');
    this.dataProvider = dataProvider;
    this.clockMonitor = new ClockIntegrityMonitor(config.clockConfig || {});
    this.symbol = config.symbol || 'BTC/USDT';
    
    this.isObserving = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = config.maxReconnectAttempts || 5;
    this.heartbeatIntervalMs = config.heartbeatIntervalMs || 5000;
    this.heartbeatTimer = null;
    
    this.stats = {
      totalSnapshotsReceived: 0,
      totalWarnings: 0,
      totalHalts: 0,
      averageLatencyMs: 0,
      uptimeStartMs: 0
    };

    this.latestSnapshot = null;
    this.listeners = [];
  }

  async startObservation() {
    console.log(`[MarketDataObserver] Iniciando observação contínua read-only para ${this.symbol} via ${this.dataProvider.providerName} [${this.dataProvider.realitySource}]...`);
    this.isObserving = true;
    this.stats.uptimeStartMs = Date.now();
    
    // Conectar ao provedor
    await this.connectWithRetry();

    // Iniciar loop de monitoramento de heartbeat e captura contínua
    this.startHeartbeatMonitor();
    return true;
  }

  async stopObservation() {
    console.log(`[MarketDataObserver] Parando observação read-only...`);
    this.isObserving = false;
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    await this.dataProvider.disconnect();
    return true;
  }

  async connectWithRetry() {
    while (this.reconnectAttempts < this.maxReconnectAttempts && this.isObserving) {
      try {
        await this.dataProvider.connect();
        this.reconnectAttempts = 0;
        console.log(`✅ [MarketDataObserver] Conexão read-only estabelecida com sucesso no provedor ${this.dataProvider.providerName}.`);
        return true;
      } catch (err) {
        this.reconnectAttempts++;
        console.warn(`⚠️ [MarketDataObserver] Falha de conexão na tentativa ${this.reconnectAttempts}/${this.maxReconnectAttempts}: ${err.message}. Retentando em 2s...`);
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      const errorMsg = `🚨 [MarketDataObserver HALT] Número máximo de reconexões atingido (${this.maxReconnectAttempts}). Fechando feed.`;
      console.error(errorMsg);
      this.clockMonitor.state = 'HALT';
      throw new Error(errorMsg);
    }
  }

  startHeartbeatMonitor() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(async () => {
      if (!this.isObserving) return;
      try {
        const fetchStart = Date.now();
        const rawSnapshot = await this.dataProvider.fetchOrderBookSnapshot(this.symbol);
        const fetchEnd = Date.now();
        const latencyMs = fetchEnd - fetchStart;

        // Validar integridade temporal do relógio da exchange vs relógio local
        const clockValidation = this.clockMonitor.validateTimestamp(rawSnapshot.timestamp, fetchEnd);
        
        if (clockValidation.status === 'HALT') {
          this.stats.totalHalts++;
          this.emit('halt', { reason: 'CLOCK_INTEGRITY_HALT', incident: clockValidation.incident });
          return;
        }
        if (clockValidation.status === 'WARNING') {
          this.stats.totalWarnings++;
        }

        // Atualizar estatísticas de latência móvel
        this.stats.totalSnapshotsReceived++;
        this.stats.averageLatencyMs = ((this.stats.averageLatencyMs * (this.stats.totalSnapshotsReceived - 1)) + latencyMs) / this.stats.totalSnapshotsReceived;

        // Montar snapshot forense limpo e padronizado
        const cleanSnapshot = {
          symbol: rawSnapshot.symbol,
          timestamp: rawSnapshot.timestamp,
          realitySource: rawSnapshot.source,
          provider: rawSnapshot.provider,
          bid: rawSnapshot.bid,
          ask: rawSnapshot.ask,
          spread: rawSnapshot.spread,
          depth: rawSnapshot.depth,
          latencyMs,
          clockState: clockValidation.status
        };

        this.latestSnapshot = cleanSnapshot;
        this.emit('snapshot', cleanSnapshot);

      } catch (err) {
        console.warn(`⚠️ [MarketDataObserver] Falha em pulso de heartbeat: ${err.message}. Acionando reconexão...`);
        this.connectWithRetry().catch(e => console.error(e));
      }
    }, this.heartbeatIntervalMs);
  }

  on(event, callback) {
    this.listeners.push({ event, callback });
  }

  emit(event, data) {
    for (const listener of this.listeners) {
      if (listener.event === event) {
        listener.callback(data);
      }
    }
  }

  getObserverStats() {
    const uptimeSec = Math.floor((Date.now() - this.stats.uptimeStartMs) / 1000);
    return {
      symbol: this.symbol,
      provider: this.dataProvider.providerName,
      realitySource: this.dataProvider.realitySource,
      isObserving: this.isObserving,
      uptimeSec,
      totalSnapshotsReceived: this.stats.totalSnapshotsReceived,
      totalWarnings: this.stats.totalWarnings,
      totalHalts: this.stats.totalHalts,
      averageLatencyMs: parseFloat(this.stats.averageLatencyMs.toFixed(2)),
      clockMonitorState: this.clockMonitor.getMonitorState()
    };
  }
}
