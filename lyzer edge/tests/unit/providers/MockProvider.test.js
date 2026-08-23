import { describe, it, expect } from 'vitest';
import { MockProvider } from '../../../src/components/commandCenter/sdk/providers/MockProvider.js';

describe('MockProvider (Anti-Mock Purge Enforcement)', () => {
  it('strictly forbids instantiation and throws SYNTHETIC_MOCK_FORBIDDEN', () => {
    expect(() => new MockProvider('mock-1')).toThrow('SYNTHETIC_MOCK_FORBIDDEN');
  });
});
