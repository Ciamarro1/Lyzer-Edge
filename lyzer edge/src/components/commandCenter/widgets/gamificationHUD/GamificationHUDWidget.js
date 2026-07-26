import { gamificationHUDManifest } from './manifest.js';

export class GamificationHUDWidget {
  constructor() {
    this.manifest = gamificationHUDManifest;
    this._container = null;
    this._runtime = null;
    this._disposed = false;
    this._interval = null;
    this._xp = 4850;
    this._level = 14;
    this._nextLevelXp = 6000;
    this._streak = 7;
    this._reputation = 98.4;

    this._quests = [
      { id: 'q1', title: 'Zero-Veto Compliance', desc: 'Execute 5 trades without ECA court veto', current: 4, target: 5, reward: 250, claimed: false },
      { id: 'q2', title: 'High-Geometry Signal', desc: 'Capture 3 trades with TRG ≥ 0.50', current: 3, target: 3, reward: 400, claimed: true },
      { id: 'q3', title: 'Causal Forensics Audit', desc: 'Inspect 2 Runtime Replays in LACW Workspace', current: 1, target: 2, reward: 150, claimed: false },
      { id: 'q4', title: 'Multi-Asset Matrix', desc: 'Maintain active signals across all 6 symbols', current: 6, target: 6, reward: 500, claimed: false }
    ];

    this._badges = [
      { id: 'b1', name: 'TRG Fortress', icon: '[SEC]', desc: 'Maintained TRG ≥ 0.40 for 100 consecutive ticks', rarity: 'LEGENDARY', unlocked: true },
      { id: 'b2', name: 'Flash Execution', icon: '[EXEC]', desc: 'Order authorizing latency < 1.0ms via UUIDv7', rarity: 'EPIC', unlocked: true },
      { id: 'b3', name: 'Supreme Court', icon: '[ECA]', desc: 'Passed 50 ECA Court validations without LHDS veto', rarity: 'RARE', unlocked: true },
      { id: 'b4', name: 'Unstoppable Streak', icon: '[STRK]', desc: '7-day continuous trading compliance streak', rarity: 'EPIC', unlocked: true },
      { id: 'b5', name: 'Diamond Engine', icon: '[ALPHA]', desc: 'Zero drawdown breaches over 24 hours of live trading', rarity: 'MYTHIC', unlocked: false },
      { id: 'b6', name: 'Causal Sovereign', icon: '[CAUSAL]', desc: 'Completed full 7-layer quantitative pipeline audit', rarity: 'LEGENDARY', unlocked: false }
    ];
  }

  async mount(container, runtime) {
    this._container = container;
    this._runtime = runtime;
    this._container.style.width = '100%';
    this._container.style.height = '100%';
    this._container.style.overflowY = 'auto';
    this._container.style.padding = '20px';
    this._container.style.background = 'rgba(4, 6, 14, 0.95)';
    this._container.style.color = '#f8fafc';
    this._container.style.fontFamily = "'Inter', system-ui, -apple-system, sans-serif";

    this._injectStyles();
    this._render();
    this._startLiveSync();
  }

  _injectStyles() {
    if (document.getElementById('gamification-hud-styles')) return;
    const style = document.createElement('style');
    style.id = 'gamification-hud-styles';
    style.textContent = `
      .ghud-grid { display: grid; grid-template-columns: 320px 1fr; gap: 20px; max-width: 1400px; margin: 0 auto; }
      .ghud-panel { background: rgba(8, 14, 26, 0.5); backdrop-filter: blur(20px) saturate(1.4); -webkit-backdrop-filter: blur(20px) saturate(1.4); border: 1px solid rgba(56, 189, 248, 0.1); border-radius: 14px; padding: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03); }
      .ghud-title { font-size: 11px; font-weight: 800; color: #38bdf8; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; font-family: 'JetBrains Mono', monospace; }
      .ghud-profile-card { display: flex; flex-direction: column; align-items: center; text-align: center; }
      .ghud-avatar-ring { position: relative; width: 100px; height: 100px; margin-bottom: 14px; }
      .ghud-avatar-ring svg { width: 100%; height: 100%; transform: rotate(-90deg); }
      .ghud-avatar-center { position: absolute; inset: 10px; border-radius: 50%; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border: 2px solid rgba(56, 189, 248, 0.3); display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: inset 0 0 20px rgba(56,189,248,0.2); }
      .ghud-level-num { font-size: 22px; font-weight: 900; color: #38bdf8; font-family: 'JetBrains Mono', monospace; line-height: 1; }
      .ghud-level-lbl { font-size: 8px; color: #94a3b8; letter-spacing: 1px; font-weight: 700; margin-top: 2px; }
      .ghud-rank-badge { background: linear-gradient(135deg, rgba(16,185,129,0.15), rgba(6,182,212,0.15)); border: 1px solid rgba(52,211,153,0.3); color: #34d399; font-size: 10px; font-weight: 800; padding: 4px 12px; border-radius: 20px; letter-spacing: 1px; margin-bottom: 12px; font-family: 'JetBrains Mono', monospace; }
      .ghud-xp-bar-bg { width: 100%; height: 8px; background: rgba(30, 41, 59, 0.6); border-radius: 4px; overflow: hidden; margin-top: 6px; }
      .ghud-xp-bar-fg { height: 100%; background: linear-gradient(90deg, #38bdf8, #34d399); border-radius: 4px; transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1); }
      
      /* Heatmap Grid */
      .ghud-heatmap-grid { display: grid; grid-template-columns: repeat(15, 1fr); gap: 4px; margin-top: 10px; }
      .ghud-heatmap-cell { aspect-ratio: 1; border-radius: 3px; background: rgba(30, 41, 59, 0.4); border: 1px solid rgba(255,255,255,0.02); transition: all 0.2s; cursor: pointer; position: relative; }
      .ghud-heatmap-cell:hover { transform: scale(1.2); z-index: 10; border-color: #38bdf8; box-shadow: 0 0 10px rgba(56,189,248,0.4); }
      .ghud-heatmap-cell.lvl-0 { background: rgba(15, 23, 42, 0.5); }
      .ghud-heatmap-cell.lvl-1 { background: rgba(6, 78, 59, 0.6); border-color: rgba(16,185,129,0.2); }
      .ghud-heatmap-cell.lvl-2 { background: rgba(5, 150, 105, 0.7); border-color: rgba(16,185,129,0.4); }
      .ghud-heatmap-cell.lvl-3 { background: rgba(16, 185, 129, 0.85); border-color: rgba(52,211,153,0.6); box-shadow: 0 0 6px rgba(16,185,129,0.3); }
      .ghud-heatmap-cell.lvl-4 { background: #34d399; border-color: #6ee7b7; box-shadow: 0 0 12px rgba(52,211,153,0.6); }

      /* Quest Cards */
      .ghud-quest-item { background: rgba(15, 23, 42, 0.4); border: 1px solid rgba(56, 189, 248, 0.08); border-radius: 10px; padding: 14px; margin-bottom: 10px; transition: all 0.3s ease; }
      .ghud-quest-item:hover { border-color: rgba(56, 189, 248, 0.25); background: rgba(15, 23, 42, 0.6); }
      .ghud-quest-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
      .ghud-quest-title { font-size: 12px; font-weight: 700; color: #f1f5f9; }
      .ghud-quest-reward { font-size: 10px; font-weight: 800; color: #fbbf24; font-family: 'JetBrains Mono', monospace; }
      .ghud-btn-claim { background: linear-gradient(135deg, #10b981, #059669); color: #020617; border: none; border-radius: 6px; padding: 4px 10px; font-size: 10px; font-weight: 800; cursor: pointer; transition: all 0.2s; font-family: 'JetBrains Mono', monospace; }
      .ghud-btn-claim:hover { transform: translateY(-1px); box-shadow: 0 4px 15px rgba(16,185,129,0.4); }

      /* Badges Grid */
      .ghud-badges-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
      .ghud-badge-card { background: rgba(15, 23, 42, 0.4); border: 1px solid rgba(148, 163, 184, 0.08); border-radius: 10px; padding: 14px; display: flex; flex-direction: column; align-items: center; text-align: center; position: relative; overflow: hidden; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
      .ghud-badge-card.unlocked { border-color: rgba(56, 189, 248, 0.25); background: linear-gradient(135deg, rgba(8,14,26,0.6) 0%, rgba(15,23,42,0.4) 100%); }
      .ghud-badge-card.unlocked:hover { transform: translateY(-2px); border-color: #38bdf8; box-shadow: 0 8px 25px rgba(56,189,248,0.15); }
      .ghud-badge-card.locked { opacity: 0.5; filter: grayscale(0.8); }
      .ghud-badge-icon { font-size: 28px; margin-bottom: 8px; filter: drop-shadow(0 0 10px rgba(56,189,248,0.3)); }
      .ghud-badge-name { font-size: 11px; font-weight: 700; color: #f1f5f9; margin-bottom: 4px; }
      .ghud-badge-desc { font-size: 9px; color: #94a3b8; line-height: 1.3; }
      .ghud-rarity-pill { font-size: 7px; font-weight: 800; letter-spacing: 1px; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; margin-top: 8px; font-family: 'JetBrains Mono', monospace; }
      .rarity-LEGENDARY { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }
      .rarity-EPIC { background: rgba(168, 85, 247, 0.15); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3); }
      .rarity-RARE { background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); }
      .rarity-MYTHIC { background: rgba(236, 72, 153, 0.15); color: #f472b6; border: 1px solid rgba(236, 72, 153, 0.3); }
    `;
    document.head.appendChild(style);
  }

  _render() {
    const pct = Math.round((this._xp / this._nextLevelXp) * 100);
    const strokeDash = Math.round(2 * Math.PI * 40);
    const strokeOffset = Math.round(strokeDash * (1 - pct / 100));

    this._container.innerHTML = `
      <div class="ghud-grid">
        <!-- Left Sidebar: Profile & Streak Stats -->
        <div style="display: flex; flex-direction: column; gap: 20px;">
          <div class="ghud-panel ghud-profile-card">
            <div class="ghud-avatar-ring">
              <svg viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" stroke="rgba(30,41,59,0.6)" stroke-width="6" fill="none"/>
                <circle cx="50" cy="50" r="40" stroke="url(#xp-grad)" stroke-width="6" fill="none"
                        stroke-dasharray="${strokeDash}" stroke-dashoffset="${strokeOffset}" stroke-linecap="round"/>
                <defs>
                  <linearGradient id="xp-grad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stop-color="#38bdf8"/>
                    <stop offset="100%" stop-color="#34d399"/>
                  </linearGradient>
                </defs>
              </svg>
              <div class="ghud-avatar-center">
                <div class="ghud-level-num">${this._level}</div>
                <div class="ghud-level-lbl">LEVEL</div>
              </div>
            </div>
            <div class="ghud-rank-badge">SOVEREIGN OPERATOR</div>
            <div style="width: 100%; font-size: 10px; color: #94a3b8; display: flex; justify-content: space-between; font-family: 'JetBrains Mono', monospace;">
              <span>XP Progress</span>
              <span style="color: #38bdf8; font-weight: 700;">${this._xp} / ${this._nextLevelXp} XP</span>
            </div>
            <div class="ghud-xp-bar-bg">
              <div class="ghud-xp-bar-fg" style="width: ${pct}%;"></div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; width: 100%; margin-top: 16px;">
              <div style="background: rgba(15, 23, 42, 0.4); border: 1px solid rgba(56,189,248,0.08); padding: 10px; border-radius: 8px; text-align: center;">
                <div style="font-size: 9px; color: #94a3b8; text-transform: uppercase;">Active Streak</div>
                <div style="font-size: 16px; font-weight: 800; color: #fbbf24; font-family: 'JetBrains Mono', monospace; margin-top: 2px;">${this._streak} Days</div>
              </div>
              <div style="background: rgba(15, 23, 42, 0.4); border: 1px solid rgba(56,189,248,0.08); padding: 10px; border-radius: 8px; text-align: center;">
                <div style="font-size: 9px; color: #94a3b8; text-transform: uppercase;">Reputation</div>
                <div style="font-size: 16px; font-weight: 800; color: #34d399; font-family: 'JetBrains Mono', monospace; margin-top: 2px;">${this._reputation}</div>
              </div>
            </div>
          </div>

          <!-- Heatmap Panel -->
          <div class="ghud-panel">
            <div class="ghud-title">
              <span>Execution Heatmap</span>
              <span style="color: #34d399; font-size: 9px;">30-Day Activity</span>
            </div>
            <div class="ghud-heatmap-grid" id="ghud-heatmap">
              ${Array.from({ length: 45 }, (_, i) => {
                const lvl = Math.floor(Math.random() * 5);
                return `<div class="ghud-heatmap-cell lvl-${lvl}" title="Day ${i + 1}: ${lvl * 3} trades executed (${lvl > 2 ? '100%' : '92%'} compliance)"></div>`;
              }).join('')}
            </div>
          </div>
        </div>

        <!-- Right Main: Quests & Badges Cabinet -->
        <div style="display: flex; flex-direction: column; gap: 20px;">
          <!-- Active Quests -->
          <div class="ghud-panel">
            <div class="ghud-title">
              <span>Daily Quests & Objectives</span>
              <span style="color: #fbbf24; font-size: 9px;">Reset in 04h 12m</span>
            </div>
            <div id="ghud-quests-list">
              ${this._quests.map(q => {
                const isComplete = q.current >= q.target;
                const questPct = Math.min(100, Math.round((q.current / q.target) * 100));
                return `
                  <div class="ghud-quest-item">
                    <div class="ghud-quest-header">
                      <div class="ghud-quest-title">${q.title}</div>
                      <div class="ghud-quest-reward">
                        +${q.reward} XP
                        ${isComplete && !q.claimed ? `<button class="ghud-btn-claim" data-qid="${q.id}">CLAIM</button>` : ''}
                        ${q.claimed ? `<span style="color:#34d399; font-size:9px;">CLAIMED</span>` : ''}
                      </div>
                    </div>
                    <div style="font-size: 10px; color: #94a3b8; margin-bottom: 8px;">${q.desc}</div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                      <div class="ghud-xp-bar-bg" style="flex: 1; height: 6px;">
                        <div class="ghud-xp-bar-fg" style="width: ${questPct}%; background: ${isComplete ? '#34d399' : '#38bdf8'};"></div>
                      </div>
                      <span style="font-size: 9px; color: ${isComplete ? '#34d399' : '#94a3b8'}; font-weight: 700; font-family: 'JetBrains Mono', monospace;">${q.current}/${q.target}</span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Achievements Cabinet -->
          <div class="ghud-panel">
            <div class="ghud-title">
              <span>Achievement Badges Cabinet</span>
              <span style="color: #c084fc; font-size: 9px;">${this._badges.filter(b => b.unlocked).length} / ${this._badges.length} Unlocked</span>
            </div>
            <div class="ghud-badges-grid">
              ${this._badges.map(b => `
                <div class="ghud-badge-card ${b.unlocked ? 'unlocked' : 'locked'}">
                  <div class="ghud-badge-icon">${b.icon}</div>
                  <div class="ghud-badge-name">${b.name}</div>
                  <div class="ghud-badge-desc">${b.desc}</div>
                  <div class="ghud-rarity-pill rarity-${b.rarity}">${b.rarity}</div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    this._bindEvents();
  }

  _bindEvents() {
    this._container.querySelectorAll('.ghud-btn-claim').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const qid = e.currentTarget.dataset.qid;
        const q = this._quests.find(x => x.id === qid);
        if (q && !q.claimed) {
          q.claimed = true;
          this._xp += q.reward;
          if (this._xp >= this._nextLevelXp) {
            this._level += 1;
            this._nextLevelXp += 1500;
          }
          this._render();
        }
      });
    });
  }

  _startLiveSync() {
    this._interval = setInterval(() => {
      if (this._disposed || !this._container || !this._container.isConnected) {
        clearInterval(this._interval);
        return;
      }
      if (this._runtime && this._runtime.getLatestData) {
        const latest = this._runtime.getLatestData();
        const activeCount = Object.keys(latest).length;
        if (activeCount > 0) {
          const q4 = this._quests.find(q => q.id === 'q4');
          if (q4 && q4.current < activeCount) {
            q4.current = activeCount;
            this._render();
          }
        }
      }
    }, 3000);
  }

  dispose() {
    this._disposed = true;
    if (this._interval) { clearInterval(this._interval); this._interval = null; }
    if (this._container) { this._container.innerHTML = ''; this._container = null; }
    this._runtime = null;
  }

  unmount() { this.dispose(); }
}
