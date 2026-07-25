import { describe, it, expect, vi } from 'vitest';
import { WidgetLifecycle } from '../../../../src/components/commandCenter/app/WidgetLifecycle.js';

describe('Phase 3.1 - WidgetLifecycle Contract', () => {
  it('enforces required methods in constructor', () => {
    expect(() => new WidgetLifecycle('test', {})).toThrow('Implementation must provide a mount() function.');
    expect(() => new WidgetLifecycle('test', { mount: () => {} })).toThrow('Implementation must provide a dispose() function.');
  });

  it('mounts, updates, and disposes correctly', () => {
    const impl = {
      mount: vi.fn(),
      update: vi.fn(),
      dispose: vi.fn()
    };
    
    const lifecycle = new WidgetLifecycle('test-widget', impl);
    const container = document.createElement('div');
    const mockRuntime = {};

    // Cannot update before mount
    lifecycle.update({ a: 1 });
    expect(impl.update).not.toHaveBeenCalled();

    lifecycle.mount(container, mockRuntime);
    expect(impl.mount).toHaveBeenCalledWith(container, mockRuntime);
    expect(lifecycle._isMounted).toBe(true);

    // Prevent double mount
    expect(() => lifecycle.mount(container, mockRuntime)).toThrow('Widget test-widget is already mounted.');

    lifecycle.update({ a: 1 });
    expect(impl.update).toHaveBeenCalledWith({ a: 1 });

    lifecycle.dispose();
    expect(impl.dispose).toHaveBeenCalled();
    expect(lifecycle._isMounted).toBe(false);
  });
});
