import { describe, it, expect, beforeEach } from 'vitest';
import { RealityOrchestrator } from '../../../src/components/commandCenter/sdk/reality/RealityOrchestrator.js';
import { ProviderRegistry } from '../../../src/components/commandCenter/sdk/providers/ProviderRegistry.js';
import { LiveProvider } from '../../../src/components/commandCenter/sdk/providers/LiveProvider.js';
import { ReplayProvider } from '../../../src/components/commandCenter/sdk/providers/ReplayProvider.js';
import { RealityStates, RealityEvents } from '../../../src/components/commandCenter/sdk/reality/realityTypes.js';

describe('M1.4.5 - Reality Orchestration Layer', () => {
  let orchestrator;
  let registry;
  let eventBus;
  let eventsEmitted;

  beforeEach(() => {
    eventsEmitted = [];
    eventBus = {
      emit: (topic, payload) => {
        eventsEmitted.push({ topic, payload });
      }
    };
    
    registry = new ProviderRegistry();
    orchestrator = new RealityOrchestrator({ eventBus }, registry);
  });

  describe('Test 1: ProviderNotFoundError', () => {
    it('should reject switching to a non-existent provider', async () => {
      await expect(orchestrator.switchReality('alien')).rejects.toThrow('ProviderNotFoundError: Provider alien not found in registry.');
      
      const transitionApproved = eventsEmitted.some(e => e.topic === RealityEvents.TRANSITION_APPROVED);
      expect(transitionApproved).toBe(false);
    });
  });

  describe('Test 2: Clean Switch', () => {
    it('should disconnect old provider, connect new, and emit sequence', async () => {
      const live = new LiveProvider('live-1');
      const replay = new ReplayProvider('replay-1');
      
      registry.register(live);
      registry.register(replay);

      await orchestrator.switchReality('live-1');
      eventsEmitted = []; // Reset events after first switch

      await orchestrator.switchReality('replay-1');
      
      expect(live._connected).toBe(false); // Should be disconnected
      expect(replay._connected).toBe(true);  // Should be connected

      // Verify sequence: REQUESTED -> VALIDATED -> COMPLETED
      expect(eventsEmitted[0].topic).toBe(RealityEvents.TRANSITION_REQUESTED);
      expect(eventsEmitted[1].topic).toBe(RealityEvents.TRANSITION_VALIDATED);
      expect(eventsEmitted[2].topic).toBe(RealityEvents.TRANSITION_COMPLETED);
    });
  });

  describe('Test 3: Highlander Rule (Exclusivity)', () => {
    it('should never have two providers active simultaneously', async () => {
      const live = new LiveProvider('live-1');
      const replay = new ReplayProvider('replay-1');
      
      registry.register(live);
      registry.register(replay);

      await orchestrator.switchReality('live-1');
      expect(live._connected).toBe(true);
      expect(replay._connected).toBe(false);
      expect(orchestrator.activeProvider.id).toBe('live-1');

      await orchestrator.switchReality('replay-1');
      
      expect(live._connected).toBe(false);
      expect(replay._connected).toBe(true);
      expect(orchestrator.activeProvider.id).toBe('replay-1');
    });
  });

  describe('Test 4: Temporal Ownership', () => {
    it('should block events from unauthorized timelines', async () => {
      const live = new LiveProvider('live-1');
      registry.register(live);
      await orchestrator.switchReality('live-1');

      // Live provider is the active timeline. Attempting to write from 'replay-1' should throw.
      expect(() => {
        orchestrator.assertTimelineOwnership('replay-1');
      }).toThrow('[ERR_TIMELINE_CONFLICT] Provider replay-1 cannot write to timeline owned by live-1');
      
      // Attempting to write from 'live-1' should pass.
      expect(() => {
        orchestrator.assertTimelineOwnership('live-1');
      }).not.toThrow();
    });
  });

  describe('Test 5: Crash Recovery', () => {
    it('should transition to ERROR state if connection fails', async () => {
      const faultyReplay = new ReplayProvider('replay-faulty');
      faultyReplay.connect = async () => { throw new Error('Crash!'); };
      
      registry.register(faultyReplay);
      
      await expect(orchestrator.switchReality('replay-faulty')).rejects.toThrow('Crash!');
      
      expect(orchestrator.state).toBe(RealityStates.ERROR);
      
      const failedEvent = eventsEmitted.find(e => e.topic === RealityEvents.TRANSITION_FAILED);
      expect(failedEvent).toBeDefined();
    });
  });

  describe('Test 6: Audit Trail', () => {
    it('should maintain a permanent audit trail of transitions', async () => {
      const live = new LiveProvider('live-1');
      const replay = new ReplayProvider('replay-1');
      
      registry.register(live);
      registry.register(replay);

      await orchestrator.switchReality('live-1', 'Initial startup');
      await orchestrator.switchReality('replay-1', 'User clicked replay');

      const trail = orchestrator.auditTrail;
      expect(trail).toHaveLength(2);
      
      expect(trail[0].from).toBeNull();
      expect(trail[0].to).toBe('OBSERVED_REALITY');
      expect(trail[0].reason).toBe('Initial startup');
      
      expect(trail[1].from).toBe('OBSERVED_REALITY');
      expect(trail[1].to).toBe('RECONSTRUCTED_REALITY');
      expect(trail[1].reason).toBe('User clicked replay');
      expect(trail[1].approved).toBe(true);
      expect(trail[1].timestamp).toBeGreaterThan(0);
    });
  });
});
