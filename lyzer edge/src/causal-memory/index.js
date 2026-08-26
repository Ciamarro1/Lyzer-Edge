import { EventFactory } from './EventFactory.js';
import { EventValidator } from './EventValidator.js';
import { EventStore } from './EventStore.js';
import { ProjectionEngine } from './ProjectionEngine.js';
import { RewindEngine } from './RewindEngine.js';
import { LearningEngine } from './LearningEngine.js';
import { canonicalJson } from './canonicalJson.js';
import {
  sha256,
  hmacSha256,
  serializeCausalEvent,
  computeCausalHash,
  verifyCausalHash,
  verifyCausalChain,
  GENESIS_PREV_HASH
} from './causalCrypto.js';

export class CausalMemoryAdapter {
  constructor(causalMemoryDB) {
    this.store = new EventStore(causalMemoryDB);
    this.projection = new ProjectionEngine();
    this.rewindEngine = new RewindEngine(this.store);
    this.learningEngine = new LearningEngine();
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

  async recordRealitySnapshot({ symbol, tensorHash, tensorLocation, compressedVector, dimensions, correlationId, causationId }) {
    const prevHash = await this.store.getLastHash();
    const event = EventFactory.createEvent({
      type: 'REALITY_SNAPSHOT_CREATED',
      source: 'CSRL_SCALE_NORMALIZER',
      causationId,
      correlationId,
      payload: { symbol, tensor_hash: tensorHash, tensor_location: tensorLocation, compressed_vector: compressedVector, dimensions },
      context: { symbol },
      prevHash
    });

    await this.store.append(event);
    this.projection.processEvent(event);
    return event;
  }

  async recordFeature({ symbol, orderBlocks, liquidityPools, marketStructure, correlationId, causationId }) {
    const prevHash = await this.store.getLastHash();
    const event = EventFactory.createEvent({
      type: 'FEATURE_GENERATED',
      source: 'SMC_ENGINE_FACADE',
      causationId,
      correlationId,
      payload: { symbol, order_blocks: orderBlocks || [], liquidity_pools: liquidityPools || [], market_structure: marketStructure || {} },
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

  async recordLearning({ symbol, intentId, predicted, reality, correlationId, causationId }) {
    const lesson = this.learningEngine.analyzeOutcome({ intentId, predicted, reality });
    const prevHash = await this.store.getLastHash();

    const event = EventFactory.createEvent({
      type: 'LEARNING_FEEDBACK',
      source: 'LEARNING_ENGINE',
      causationId,
      correlationId,
      intentId,
      payload: {
        intentId,
        predicted,
        reality,
        lesson
      },
      context: { symbol },
      prevHash
    });

    await this.store.append(event);
    this.projection.processEvent(event);
    return event;
  }

  calculateCCS() {
    const state = this.getCurrentState();
    const totalRequired = 8;
    let covered = 0;

    if (state.lastObservation) covered++;
    if (state.lastReality) covered++;
    if (state.lastRealitySnapshot) covered++;
    if (state.lastFeature) covered++;
    if (state.lastJudgment) covered++;
    if (state.lastRisk) covered++;
    if (state.lastExecution) covered++;
    if (state.lastLearning) covered++;

    const score = (covered / totalRequired) * 100;
    return {
      score,
      coveredCount: covered,
      totalRequired,
      isFullyComplete: score === 100
    };
  }

  async rewind(targetTimestampMs) {
    return await this.rewindEngine.rewind(targetTimestampMs);
  }

  getCurrentState() {
    return this.projection.getCurrentState();
  }
}

export {
  EventFactory,
  EventValidator,
  EventStore,
  ProjectionEngine,
  RewindEngine,
  LearningEngine,
  canonicalJson,
  sha256,
  hmacSha256,
  serializeCausalEvent,
  computeCausalHash,
  verifyCausalHash,
  verifyCausalChain,
  GENESIS_PREV_HASH
};
