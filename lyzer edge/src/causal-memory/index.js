import { EventFactory } from './EventFactory.js';
import { EventValidator } from './EventValidator.js';
import { EventStore } from './EventStore.js';
import { ProjectionEngine } from './ProjectionEngine.js';
import { RewindEngine } from './RewindEngine.js';

export class CausalMemoryAdapter {
  constructor(causalMemoryDB) {
    this.store = new EventStore(causalMemoryDB);
    this.projection = new ProjectionEngine();
    this.rewindEngine = new RewindEngine(this.store);
  }

  async recordObservation({ symbol, candle, correlationId }) {
    const prevHash = await this.store.getLastHash();
    const event = EventFactory.createEvent({
      type: 'MARKET_OBSERVATION_RECEIVED',
      source: 'STREAM_ENGINE',
      correlationId: correlationId || `corr_${candle.openTime}`,
      payload: { symbol, candle },
      context: { symbol },
      prevHash
    });

    await this.store.append(event);
    this.projection.processEvent(event);
    return event;
  }

  async recordReality({ symbol, csrlInvariants, lhdsScore, correlationId, regime, causationId }) {
    const prevHash = await this.store.getLastHash();
    const event = EventFactory.createEvent({
      type: 'REALITY_RECONSTRUCTED',
      source: 'CSRL_INVARIANT_EXTRACTOR',
      causationId,
      correlationId,
      regime: regime || 'REGIME_A_CONSENSUS',
      payload: { symbol, csrlInvariants, lhdsScore },
      context: { symbol },
      prevHash
    });

    await this.store.append(event);
    this.projection.processEvent(event);
    return event;
  }

  async recordJudgment({ symbol, judgmentType, violatedConstraint, evidence, severity, correlationId, causationId }) {
    const prevHash = await this.store.getLastHash();
    const event = EventFactory.createEvent({
      type: 'CONSTITUTIONAL_JUDGMENT',
      source: 'ECA_COURT_NODE',
      causationId,
      correlationId,
      payload: {
        judgment_type: judgmentType,
        violated_constraint: violatedConstraint || 'NONE',
        evidence: evidence || {},
        severity: severity || 'INFO'
      },
      context: { symbol },
      prevHash
    });

    await this.store.append(event);
    this.projection.processEvent(event);
    return event;
  }

  async recordRisk({ symbol, intentId, authorized, capitalLimit, correlationId, causationId }) {
    const prevHash = await this.store.getLastHash();
    const event = EventFactory.createEvent({
      type: 'RISK_ASSESSED',
      source: 'RISK_GATEWAY_RUST',
      causationId,
      correlationId,
      intentId,
      payload: { authorized, capitalLimit },
      context: { symbol },
      prevHash
    });

    await this.store.append(event);
    this.projection.processEvent(event);
    return event;
  }

  async recordExecution({ symbol, intentId, status, orderDetails, correlationId, causationId }) {
    const prevHash = await this.store.getLastHash();
    const event = EventFactory.createEvent({
      type: 'EXECUTION_RESULT',
      source: 'EXCHANGE_EXECUTION',
      causationId,
      correlationId,
      intentId,
      payload: { status, orderDetails },
      context: { symbol },
      prevHash
    });

    await this.store.append(event);
    this.projection.processEvent(event);
    return event;
  }

  async rewind(targetTimestampMs) {
    return await this.rewindEngine.rewind(targetTimestampMs);
  }

  getCurrentState() {
    return this.projection.getCurrentState();
  }
}

export { EventFactory, EventValidator, EventStore, ProjectionEngine, RewindEngine };
