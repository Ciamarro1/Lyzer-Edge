import { describe, test, expect } from 'vitest';
import { EventFactory } from '../../src/causal-memory/EventFactory.js';
import { EventValidator } from '../../src/causal-memory/EventValidator.js';

describe('EventValidator & Hash Chain Integrity Verification', () => {
  test('approves valid event with matching hash and chain link', () => {
    const event = EventFactory.createEvent({
      type: 'CONSTITUTIONAL_JUDGMENT',
      source: 'ECA_COURT',
      correlationId: 'corr_789',
      payload: { judgment: 'ALLOW' }
    });

    expect(() => EventValidator.validate(event, '0'.repeat(64))).not.toThrow();
  });

  test('throws error if hash chain is broken (prevHash mismatch)', () => {
    const event = EventFactory.createEvent({
      type: 'RISK_ASSESSED',
      source: 'RISK_GATEWAY',
      correlationId: 'corr_789',
      prevHash: 'b'.repeat(64)
    });

    expect(() => EventValidator.validate(event, 'c'.repeat(64))).toThrow(/Hash chain broken/);
  });

  test('throws error if event payload has been tampered with (hash mismatch)', () => {
    const event = EventFactory.createEvent({
      type: 'EXECUTION_RESULT',
      source: 'EXCHANGE',
      correlationId: 'corr_789',
      payload: { status: 'FILLED' }
    });

    // Tamper with payload after hash calculation
    event.payload.status = 'CORRUPTED_MODIFICATION';

    expect(() => EventValidator.validate(event, '0'.repeat(64))).toThrow(/Tamper detection/);
  });
});
