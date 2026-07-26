import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CommandCenterView } from '../../../src/components/CommandCenterView.js';

describe('CommandCenterView Integration', () => {
  let container;
  let view;

  beforeEach(() => {
    if (typeof window !== 'undefined' && !window.matchMedia) {
      window.matchMedia = (query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => true,
      });
    }

    container = document.createElement('div');
    container.id = 'app';
    document.body.appendChild(container);
    view = new CommandCenterView();
  });

  afterEach(() => {
    if (view) view.unmount();
    document.body.innerHTML = '';
  });

  it('mounts CommandCenterApp V2 cleanly without throwing ERR_MANIFEST_INVALID', async () => {
    await expect(view.mount(container)).resolves.not.toThrow();
    
    expect(container.querySelector('#LeftPane')).not.toBeNull();
    expect(container.querySelector('#CenterPane')).not.toBeNull();
    expect(container.querySelector('#RightPane')).not.toBeNull();
  });
});
