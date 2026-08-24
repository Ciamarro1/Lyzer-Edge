const fs = require('fs');
const p = 'lyzer edge/src/components/commandCenter/widgets/causalGraph/CausalGraphWidget.js';
let c = fs.readFileSync(p, 'utf8');

const target1 = `        </div>

      </div>
    \`;

    this._bindDOMEvents();`;

const rep1 = `        </div>

        <!-- Causal Time-Scrubber -->
        <div style="margin-top: 14px; background: rgba(10, 16, 32, 0.45); border-radius: 12px; border: 1px solid rgba(0, 243, 255, 0.15); padding: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="color: #64748b; font-size: 10px; font-weight: 700;">CAUSAL TIME-SCRUBBER (REPLAY)</span>
            <span id="cg-scrubber-date" style="color: #00f3ff; font-size: 10px; font-weight: 800;">LIVE</span>
          </div>
          <input type="range" id="cg-time-scrubber" min="0" max="0" value="0" style="width: 100%; accent-color: #00f3ff; cursor: pointer; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; outline: none; -webkit-appearance: none; appearance: none;">
          <div style="display: flex; justify-content: space-between; margin-top: 6px; color: #475569; font-size: 9px;">
            <span id="cg-scrubber-oldest">Past</span>
            <span id="cg-scrubber-newest">Now</span>
          </div>
        </div>

      </div>
    \`;

    this._bindDOMEvents();`;

c = c.replace(target1, rep1);

const target2 = `    // Asset buttons
    this._container.querySelectorAll('.cg-asset-btn').forEach(btn => {`;

const rep2 = `    // Time Scrubber
    const scrubber = this._container.querySelector('#cg-time-scrubber');
    if (scrubber) {
      scrubber.addEventListener('input', (e) => {
        if (!this._events || this._events.length === 0) return;
        
        if (this._pollInterval) {
          clearInterval(this._pollInterval);
          this._pollInterval = null;
          const refBtn = this._container.querySelector('#cg-refresh-btn');
          if (refBtn) {
             refBtn.innerHTML = '? Auto-Refresh Paused (Replay Mode)';
             refBtn.style.color = '#fbbf24';
             refBtn.style.borderColor = 'rgba(251, 191, 36, 0.3)';
          }
        }

        const max = this._events.length - 1;
        const val = parseInt(e.target.value, 10);
        const targetIdx = max - val;
        
        this._selectedEvent = this._events[targetIdx];
        this._updateContent();
        this._renderInspector();
        
        const dateSpan = this._container.querySelector('#cg-scrubber-date');
        if (dateSpan && this._selectedEvent) {
          dateSpan.innerText = new Date(this._selectedEvent.timestamp).toLocaleTimeString();
        }
      });
    }

    // Asset buttons
    this._container.querySelectorAll('.cg-asset-btn').forEach(btn => {`;

c = c.replace(target2, rep2);

const target3 = `    eventsList.innerHTML = \`
      <div style="display: flex; flex-direction: column; gap: 8px;">`;

const rep3 = `    // Update Scrubber Bounds
    const scrubber = this._container.querySelector('#cg-time-scrubber');
    if (scrubber && this._events.length > 0) {
      const max = this._events.length - 1;
      scrubber.max = max;
      
      if (this._pollInterval && !this._selectedEvent) {
        scrubber.value = max;
      }
      
      const oldestSpan = this._container.querySelector('#cg-scrubber-oldest');
      const newestSpan = this._container.querySelector('#cg-scrubber-newest');
      if (oldestSpan) oldestSpan.innerText = new Date(this._events[max].timestamp).toLocaleTimeString();
      if (newestSpan) newestSpan.innerText = new Date(this._events[0].timestamp).toLocaleTimeString();
    }

    eventsList.innerHTML = \`
      <div style="display: flex; flex-direction: column; gap: 8px;">`;

c = c.replace(target3, rep3);
fs.writeFileSync(p, c);
