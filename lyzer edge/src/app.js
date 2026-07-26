/**
 * @fileoverview Application controller — mounts the cockpit full-screen.
 * Sidebar removed; all functionality lives inside the Cognitive Cockpit.
 */

import { wsClient } from './services/wsClient.js';
import { liveTradeSync } from './services/LiveTradeSyncService.js';
import { GamifiedCommandCenterView } from './components/GamifiedCommandCenterView.js';

export class App {
  constructor() {
    this._cockpit = null;
    this._root = null;
  }

  mount(selector) {
    this._root = document.querySelector(selector);
    if (!this._root) throw new Error(`[App] Root element "${selector}" not found`);

    this._root.innerHTML = '<div id="app-view" style="width:100vw;height:100vh;overflow:hidden;"></div>';

    wsClient.connect();
    liveTradeSync.start();

    this._cockpit = new GamifiedCommandCenterView();
    this._cockpit.mount(document.getElementById('app-view'));
  }

  destroy() {
    if (this._cockpit) {
      try { this._cockpit.unmount(); } catch (e) {}
      this._cockpit = null;
    }
    liveTradeSync.stop();
  }
}

export default App;
 