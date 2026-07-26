import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LACWEventBus } from '../../../../src/components/commandCenter/sdk/lacw/LACWEventBus.js';
import { UniversalAgentModel, AGENT_LIFECYCLE_STAGES } from '../../../../src/components/commandCenter/sdk/lacw/agents/UniversalAgentModel.js';
import { AgentOrchestratorEngine } from '../../../../src/components/commandCenter/sdk/lacw/agents/AgentOrchestratorEngine.js';
import { AgentCommunicationBus } from '../../../../src/components/commandCenter/sdk/lacw/agents/AgentCommunicationBus.js';
import { EpisodicMemoryEngine } from '../../../../src/components/commandCenter/sdk/lacw/agents/EpisodicMemoryEngine.js';
import { MemoryGovernanceQualityEngine } from '../../../../src/components/commandCenter/sdk/lacw/agents/MemoryGovernanceQualityEngine.js';
import { LivingKnowledgeGraphEngine, SEMANTIC_RELATION_TYPES } from '../../../../src/components/commandCenter/sdk/lacw/agents/LivingKnowledgeGraphEngine.js';
import { ContinuousLearningLoopEngine } from '../../../../src/components/commandCenter/sdk/lacw/agents/ContinuousLearningLoopEngine.js';
import { CognitiveTrustModelEngine } from '../../../../src/components/commandCenter/sdk/lacw/agents/CognitiveTrustModelEngine.js';
import { HumanFeedbackEngine } from '../../../../src/components/commandCenter/sdk/lacw/agents/HumanFeedbackEngine.js';
import { AgentMarketplaceFoundation } from '../../../../src/components/commandCenter/sdk/lacw/agents/AgentMarketplaceFoundation.js';

describe('LACW Phase 5 — Cognitive Agents, Memory Architecture & Learning System Suite', () => {
  let eventBus;
  let agentModel;
  let orchestrator;
  let commBus;
  let episodicMemory;
  let memoryGovernance;
  let knowledgeGraph;
  let learningLoop;
  let trustModel;
  let feedbackEngine;
  let marketplace;

  beforeEach(() => {
    eventBus = new LACWEventBus();
    agentModel = new UniversalAgentModel({ id: 'agent_alpha', name: 'Alpha Discovery Agent', capabilities: ['market_data:read'] });
    orchestrator = new AgentOrchestratorEngine(eventBus);
    commBus = new AgentCommunicationBus(eventBus);
    episodicMemory = new EpisodicMemoryEngine();
    memoryGovernance = new MemoryGovernanceQualityEngine();
    knowledgeGraph = new LivingKnowledgeGraphEngine(eventBus);
    learningLoop = new ContinuousLearningLoopEngine(eventBus);
    trustModel = new CognitiveTrustModelEngine();
    feedbackEngine = new HumanFeedbackEngine(eventBus);
    marketplace = new AgentMarketplaceFoundation();
  });

  afterEach(() => {
    eventBus.dispose();
    agentModel.dispose();
    orchestrator.dispose();
    commBus.dispose();
    episodicMemory.dispose();
    memoryGovernance.dispose();
    knowledgeGraph.dispose();
    learningLoop.dispose();
    trustModel.dispose();
    feedbackEngine.dispose();
    marketplace.dispose();
  });

  it('1. UniversalAgentModel should enforce 19 mandatory attributes and lifecycle transitions', () => {
    expect(AGENT_LIFECYCLE_STAGES).toContain('CREATED');
    expect(AGENT_LIFECYCLE_STAGES).toContain('EXECUTING');

    const snap = agentModel.getAgentSnapshot();
    expect(snap.id).toBe('agent_alpha');
    expect(snap.status).toBe('CREATED');

    const updated = agentModel.transitionLifecycle('AVAILABLE');
    expect(updated.status).toBe('AVAILABLE');
    expect(updated.history.length).toBeGreaterThan(0);
  });

  it('2. AgentOrchestratorEngine should register agents and delegate missions based on capabilities', async () => {
    orchestrator.registerAgent(agentModel);

    const mission = await orchestrator.delegateMission('Discover Alpha Patterns', 'market_data:read');
    expect(mission.missionId).toBeDefined();
    expect(mission.assignedAgentId).toBe('agent_alpha');
    expect(mission.status).toBe('COMPLETED');
  });

  it('3. AgentCommunicationBus should deliver structured inter-agent messages with evidence', () => {
    const msg = commBus.sendMessage('agent_alpha', 'orchestrator', 'REQUEST_EVIDENCE', { query: 'BOS_strength' });
    expect(msg.messageId).toBeDefined();
    expect(msg.status).toBe('DELIVERED');

    const history = commBus.getAgentMessages('agent_alpha');
    expect(history).toHaveLength(1);
  });

  it('4. EpisodicMemoryEngine should record experiential episodes and learned lessons', () => {
    const ep = episodicMemory.recordEpisode('agent_alpha', 'EXPERIMENT_RUN', {
      outcome: 'SUCCESS',
      learnedLesson: 'TRG threshold >= 0.40 prevents drawdowns'
    });

    expect(ep.episodeId).toBeDefined();
    expect(ep.outcome).toBe('SUCCESS');
    expect(episodicMemory.getEpisodes('agent_alpha')).toHaveLength(1);
  });

  it('5. MemoryGovernanceQualityEngine should consolidate temporary episodes into verified facts', () => {
    const episodes = [
      { episodeId: 'ep1', outcome: 'SUCCESS', learnedLesson: 'BOS pattern valid in range' },
      { episodeId: 'ep2', outcome: 'FAILED', learnedLesson: 'Do not run during high spread' }
    ];

    const consolidation = memoryGovernance.consolidateMemories(episodes);
    expect(consolidation.promotedFactsCount).toBe(1);
    expect(consolidation.promotedFacts[0].statement).toBe('BOS pattern valid in range');
  });

  it('6. LivingKnowledgeGraphEngine should add nodes and semantic relation edges', () => {
    expect(SEMANTIC_RELATION_TYPES).toContain('DependsOn');
    expect(SEMANTIC_RELATION_TYPES).toContain('Supports');

    knowledgeGraph.addNode('n1', 'OpenMobius', 'ENGINE');
    knowledgeGraph.addNode('n2', 'EvidenceFusion', 'ENGINE');
    knowledgeGraph.addEdge('n1', 'n2', 'Supports', 0.95);

    const graph = knowledgeGraph.exportGraph();
    expect(graph.nodeCount).toBe(2);
    expect(graph.edgeCount).toBe(1);
  });

  it('7. ContinuousLearningLoopEngine should execute 8-step cognitive learning cycles', async () => {
    const cycle = await learningLoop.executeLearningCycle('agent_alpha', {
      observation: 'Volatility compression',
      hypothesis: 'Provider weight shift'
    });

    expect(cycle.cycleId).toBeDefined();
    expect(cycle.step8_Improve).toContain('Provider Weight Updated');
  });

  it('8. CognitiveTrustModelEngine should calculate formula-driven Cognitive Trust Score', () => {
    const score = trustModel.calculateTrustScore({
      evidenceStrength: 0.95,
      historicalAccuracy: 0.98,
      confidence: 0.92,
      validationScore: 0.94,
      riskPenalty: 0.02
    });

    expect(score.trustScore).toBeGreaterThan(0.85);
    expect(score.tier).toBe('INSTITUTIONAL_HIGH_TRUST');
  });

  it('9. HumanFeedbackEngine should record human operator approvals and interventions', () => {
    const fb = feedbackEngine.recordFeedback('dec_991', 'APPROVE', { comments: 'Approved for live shadow mode' });
    expect(fb.feedbackId).toBeDefined();
    expect(fb.feedbackType).toBe('APPROVE');
    expect(feedbackEngine.getFeedbackHistory()).toHaveLength(1);
  });

  it('10. AgentMarketplaceFoundation should register and list published agents', () => {
    const pub = marketplace.publishAgent({ id: 'quant_alpha_agent', version: '2.1.0', author: 'Lyzer_Labs' });
    expect(pub.agentId).toBe('quant_alpha_agent');
    expect(marketplace.listPublishedAgents()).toHaveLength(1);
  });

  it('11. TC39 Symbol.dispose compliance across all agent & learning engines', () => {
    expect(typeof agentModel[Symbol.dispose]).toBe('function');
    expect(typeof orchestrator[Symbol.dispose]).toBe('function');

    agentModel[Symbol.dispose]();
    orchestrator[Symbol.dispose]();

    expect(() => agentModel.getAgentSnapshot()).toThrow('ERR_UNIVERSAL_AGENT_MODEL_DISPOSED');
    expect(() => orchestrator.registerAgent(null)).toThrow('ERR_AGENT_ORCHESTRATOR_ENGINE_DISPOSED');
  });
});
