import { getScoreColor } from '../engine/edgescore.js';

export class EdgeScoreRing {
  constructor(options = {}) {
    this.score = options.score || 0;
    this.size = options.size || 160;
    this.strokeWidth = options.strokeWidth || 12;
    this._container = null;
  }

  mount(container) {
    this._container = container;
    this._render();
  }

  unmount() {
    if (this._container) {
      this._container.innerHTML = '';
      this._container = null;
    }
  }

  updateScore(score) {
    this.score = score;
    this._render();
  }

  _render() {
    if (!this._container) return;

    const radius = (this.size - this.strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (this.score / 100) * circumference;
    const color = getScoreColor(this.score);
    
    const label = Math.round(this.score);

    this._container.innerHTML = `
      <div class="edge-score-ring" style="width: ${this.size}px; height: ${this.size}px; position: relative;">
        <svg width="${this.size}" height="${this.size}" style="transform: rotate(-90deg);">
          <!-- Background circle -->
          <circle
            cx="${this.size / 2}"
            cy="${this.size / 2}"
            r="${radius}"
            stroke="var(--color-bg-alt, #2a2a2a)"
            stroke-width="${this.strokeWidth}"
            fill="none"
          />
          <!-- Progress circle -->
          <circle
            cx="${this.size / 2}"
            cy="${this.size / 2}"
            r="${radius}"
            stroke="${color}"
            stroke-width="${this.strokeWidth}"
            fill="none"
            stroke-dasharray="${circumference}"
            stroke-dashoffset="${offset}"
            stroke-linecap="round"
            style="transition: stroke-dashoffset 1s ease-in-out, stroke 0.5s ease;"
          />
        </svg>
        <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; flex-direction: column; text-align: center;">
          <span style="font-size: ${this.size / 3.5}px; font-weight: bold; color: ${color}; line-height: 1;">${label}</span>
          <span style="font-size: ${this.size / 10}px; color: var(--color-text-muted, #888); margin-top: 4px;">Edge Score</span>
        </div>
      </div>
    `;
  }
}
 