/**
 * @fileoverview Application entry point.
 * Initialises the IndexedDB database then mounts the application shell.
 */

import { initDatabase } from './db/database.js';
import { App } from './app.js';
import './styles/variables.css';
import './styles/base.css';
import './styles/components.css';
import './styles/layout.css';

async function main() {
  try {
    await initDatabase();
    const app = new App();
    app.mount('#app');
  } catch (error) {
    console.error('[LyzerEdge] Fatal error during startup:', error);

    const root = document.getElementById('app');
    if (root) {
      root.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;
                    font-family:system-ui;color:#e8eaf0;background:#0c0e14;text-align:center;padding:2rem">
          <div>
            <h1 style="margin-bottom:0.5rem">Failed to Start</h1>
            <p style="color:#9498ad">Unable to initialise the database. Please reload the page.</p>
            <pre style="margin-top:1rem;font-size:12px;color:#ff6b6b">${error.message}</pre>
          </div>
        </div>`;
    }
  }
}

main();
 