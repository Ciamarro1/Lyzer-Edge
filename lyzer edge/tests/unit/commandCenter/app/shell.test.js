import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CommandCenterApp } from '../../../../src/components/commandCenter/app/CommandCenterApp.js';
import { WidgetRegistry } from '../../../../src/components/commandCenter/sdk/WidgetRegistry.js';
import { RealityOrchestrator } from '../../../../src/components/commandCenter/sdk/reality/RealityOrchestrator.js';
import { ProviderRegistry } from '../../../../src/components/commandCenter/sdk/providers/ProviderRegistry.js';

describe('Phase 3.1 - CommandCenterApp Shell', () => {
  let rootElement;
  let app;
  let orchestrator;

  beforeEach(() => {
    rootElement = document.createElement('div');
    rootElement.id = 'app-root';
    document.body.appendChild(rootElement);

    const providerRegistry = new ProviderRegistry();
    orchestrator = new RealityOrchestrator({ eventBus: { emit: () => {} } }, providerRegistry);
    
    app = new CommandCenterApp(rootElement, new WidgetRegistry(), orchestrator);
  });

  afterEach(() => {
    app.dispose();
    document.body.innerHTML = '';
  });

  it('mounts the layout cleanly into the DOM', async () => {
    const layoutConfig = {
      type: 'institutional',
      panes: {
        LeftPane: '20%',
        CenterPane: '60%',
        RightPane: '20%'
      }
    };

    await app.mount(layoutConfig, {});
    
    expect(rootElement.childNodes.length).toBe(3);
    expect(rootElement.querySelector('#LeftPane')).not.toBeNull();
    expect(rootElement.querySelector('#CenterPane')).not.toBeNull();
    expect(rootElement.querySelector('#RightPane')).not.toBeNull();
    
    // Check flex proportions
    expect(rootElement.querySelector('#CenterPane').style.flex).toBe('0 0 60%');
  });

  it('cleans up DOM and listeners on dispose', async () => {
    const layoutConfig = {
      type: 'institutional',
      panes: { CenterPane: '100%' }
    };

    await app.mount(layoutConfig, {});
    expect(rootElement.childNodes.length).toBe(1);

    app.dispose();
    
    expect(rootElement.childNodes.length).toBe(0);
    expect(rootElement.innerHTML).toBe('');
  });
});
