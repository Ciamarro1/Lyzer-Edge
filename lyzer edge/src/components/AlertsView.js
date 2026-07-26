import db from '../db/database.js';

export class AlertsView {
  constructor() {
    this._container = null;
    this.alerts = [];
    
    // Bind methods
    this.injectMockData = this.injectMockData.bind(this);
    this.purgeAlerts = this.purgeAlerts.bind(this);
    this.markAllRead = this.markAllRead.bind(this);
    this.refresh = this.refresh.bind(this);
  }

  async mount(container) {
    this._container = container;
    await this.refresh();
  }

  async refresh() {
    await this.loadAlerts();
    this.render();
  }

  async loadAlerts() {
    // Fetch from newest to oldest
    this.alerts = await db.alerts.orderBy('timestamp').reverse().toArray();
  }

  async injectMockData() {
    try {
      const now = new Date();
      
      const mockAlerts = [
        {
          type: 'RISK',
          severity: 'critical',
          timestamp: new Date(now.getTime() - 1000 * 60 * 5).toISOString(),
          read: false,
          title: 'Drawdown atingiu VaR de 95%',
          message: 'O capital operacional sofreu stress crítico. Motor de Risco sugere pausa nas operações.'
        },
        {
          type: 'PATTERN',
          severity: 'warning',
          timestamp: new Date(now.getTime() - 1000 * 60 * 30).toISOString(),
          read: false,
          title: 'Assinatura Tóxica Detectada',
          message: 'Tentativa de setup Short + Asia + Ranging. Histórico mostra 85% de chance de Bleed.'
        },
        {
          type: 'EDGE',
          severity: 'warning',
          timestamp: new Date(now.getTime() - 1000 * 60 * 120).toISOString(),
          read: true,
          title: 'Inversão Epistêmica Ativada',
          message: 'Seu modelo base falhou 3x consecutivas. O motor MNE ativou Inversão Cognitiva nas próximas entradas.'
        },
        {
          type: 'SYSTEM',
          severity: 'info',
          timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 24).toISOString(),
          read: true,
          title: 'Backup de Inteligência Concluído',
          message: 'IndexedDB foi sincronizado localmente com sucesso.'
        }
      ];

      await db.alerts.bulkAdd(mockAlerts);
      await this.refresh();
      alert("Mock Alerts (Pânico) injetados com sucesso.");
    } catch (err) {
      console.error(err);
      alert("Erro ao injetar mock alerts.");
    }
  }

  async markAllRead() {
    try {
      const unread = await db.alerts.where('read').equals(0).toArray(); // Sometimes false is stored as 0 or false, let's just fetch all and update
      const allAlerts = await db.alerts.toArray();
      const updates = allAlerts.filter(a => !a.read).map(a => db.alerts.update(a.id, { read: true }));
      await Promise.all(updates);
      await this.refresh();
    } catch(e) {
      console.error(e);
    }
  }

  async purgeAlerts() {
    if (confirm("CUIDADO: Isso irá apagar TODOS os alertas do banco de dados local. Tem certeza?")) {
      try {
        await db.alerts.clear();
        await this.refresh();
      } catch (err) {
        console.error(err);
        alert("Erro ao limpar alertas.");
      }
    }
  }

  getSeverityStyles(severity) {
    switch(severity) {
      case 'critical':
        return {
          bg: 'rgba(239, 68, 68, 0.05)',
          border: 'rgba(239, 68, 68, 0.4)',
          color: 'var(--color-drift-red)',
          icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
        };
      case 'warning':
        return {
          bg: 'rgba(255, 170, 0, 0.05)',
          border: 'rgba(255, 170, 0, 0.4)',
          color: 'var(--accent-amber)',
          icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
        };
      case 'info':
      default:
        return {
          bg: 'rgba(0, 200, 255, 0.05)',
          border: 'rgba(0, 200, 255, 0.3)',
          color: 'var(--accent-cyan)',
          icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
        };
    }
  }

  formatDate(isoString) {
    const d = new Date(isoString);
    return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  }

  render() {
    if (!this._container) return;

    this._container.innerHTML = `
      <div class="page-container">
        <div class="page-header" style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h1 class="page-title">Alerts & Interventions</h1>
            <p class="page-subtitle">Central de Monitoramento Cognitivo e Risco Sistêmico</p>
          </div>
          
          <div style="display: flex; gap: 12px;">
            <button id="btn-inject-alerts" class="btn" style="background: rgba(255, 170, 0, 0.1); border: 1px solid var(--accent-amber); color: var(--accent-amber); padding: 8px 16px; border-radius: 4px; cursor: pointer;">
              Injetar Mock Alerts
            </button>
            <button id="btn-read-alerts" class="btn" style="background: rgba(0, 200, 255, 0.1); border: 1px solid var(--accent-cyan); color: var(--accent-cyan); padding: 8px 16px; border-radius: 4px; cursor: pointer;">
              Marcar Todos Lidos
            </button>
            <button id="btn-purge-alerts" class="btn" style="background: rgba(239, 68, 68, 0.1); border: 1px solid var(--accent-red); color: var(--accent-red); padding: 8px 16px; border-radius: 4px; cursor: pointer;">
              Limpar Alertas
            </button>
          </div>
        </div>

        ${this.alerts.length === 0 ? `
          <div class="card glass-panel" style="text-align: center; padding: 48px;">
            <div style="font-size: 3rem; margin-bottom: 16px; color: var(--text-muted);"></div>
            <h3 style="color: var(--text-primary);">Sistema Estável</h3>
            <p class="text-muted">Nenhum alerta ou intervenção no momento.</p>
            <p class="text-muted" style="font-size: 0.85rem;">Use a ferramenta 'Injetar Mock Alerts' acima para testar o sistema de Pânico e Glassmorphism.</p>
          </div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 16px;">
            ${this.alerts.map(alert => {
              const styles = this.getSeverityStyles(alert.severity);
              const unreadBorder = !alert.read ? `border-left: 4px solid ${styles.color};` : `border-left: 4px solid transparent;`;
              const opacity = alert.read ? '0.6' : '1';
              
              return `
                <div class="card glass-panel" style="display: flex; gap: 16px; background: ${styles.bg}; border: 1px solid ${styles.border}; ${unreadBorder} opacity: ${opacity}; padding: 16px; align-items: flex-start;">
                  <div style="color: ${styles.color}; flex-shrink: 0; padding-top: 2px;">
                    ${styles.icon}
                  </div>
                  <div style="flex-grow: 1;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                      <span style="font-family: var(--font-mono); font-size: 0.75rem; color: ${styles.color}; font-weight: bold;">
                        [${alert.type}]
                      </span>
                      <span class="text-muted" style="font-size: 0.8rem;">
                        ${this.formatDate(alert.timestamp)}
                      </span>
                    </div>
                    <h3 style="color: var(--text-primary); font-size: 1.05rem; margin-bottom: 6px;">
                      ${alert.title || 'Alerta do Sistema'}
                    </h3>
                    <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.4;">
                      ${alert.message || ''}
                    </p>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    `;

    // Attach Event Listeners
    const btnInject = this._container.querySelector('#btn-inject-alerts');
    const btnRead = this._container.querySelector('#btn-read-alerts');
    const btnPurge = this._container.querySelector('#btn-purge-alerts');

    if (btnInject) btnInject.addEventListener('click', this.injectMockData);
    if (btnRead) btnRead.addEventListener('click', this.markAllRead);
    if (btnPurge) btnPurge.addEventListener('click', this.purgeAlerts);
  }

  unmount() {
    if (this._container) {
      const btnInject = this._container.querySelector('#btn-inject-alerts');
      const btnRead = this._container.querySelector('#btn-read-alerts');
      const btnPurge = this._container.querySelector('#btn-purge-alerts');
      if (btnInject) btnInject.removeEventListener('click', this.injectMockData);
      if (btnRead) btnRead.removeEventListener('click', this.markAllRead);
      if (btnPurge) btnPurge.removeEventListener('click', this.purgeAlerts);
      
      this._container.innerHTML = '';
    }
  }
}
