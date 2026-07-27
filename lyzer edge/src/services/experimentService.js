/**
 * @fileoverview Frontend service for interacting with the Quant Research Lab Experiment API.
 */

class ExperimentService {
  constructor() {
    this._baseUrl = '/api/experiments';
  }

  /**
   * Fetch complete experiment ecosystem dashboard state.
   */
  async getDashboard() {
    try {
      const res = await fetch(`${this._baseUrl}/dashboard`);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('[ExperimentService] getDashboard failed:', err.message);
      return null;
    }
  }

  /**
   * Fetch details for active experiment.
   */
  async getActive() {
    try {
      const res = await fetch(`${this._baseUrl}/active`);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('[ExperimentService] getActive failed:', err.message);
      return null;
    }
  }

  /**
   * Trigger FREEZE + NEW EXPERIMENT lifecycle event.
   * @param {string} [reason='USER_TRIGGERED']
   */
  async freezeAndNew(reason = 'USER_TRIGGERED') {
    try {
      const res = await fetch(`${this._baseUrl}/freeze-and-new`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP error ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      console.error('[ExperimentService] freezeAndNew failed:', err.message);
      throw err;
    }
  }

  /**
   * Promote an experiment to Champion.
   * @param {string} experimentId
   */
  async promoteChampion(experimentId) {
    try {
      const res = await fetch(`${this._baseUrl}/promote-champion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ experimentId })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP error ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      console.error('[ExperimentService] promoteChampion failed:', err.message);
      throw err;
    }
  }

  /**
   * Fetch historical experiment leaderboard/ranking.
   * @param {string} [sortBy='profit_factor']
   * @param {number} [limit=20]
   */
  async getRanking(sortBy = 'profit_factor', limit = 20) {
    try {
      const res = await fetch(`${this._baseUrl}/ranking?sortBy=${sortBy}&limit=${limit}`);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('[ExperimentService] getRanking failed:', err.message);
      return { ranking: [] };
    }
  }

  /**
   * Fetch single experiment details with snapshot and trades.
   * @param {string} id
   */
  async getExperiment(id) {
    try {
      const res = await fetch(`${this._baseUrl}/${id}`);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('[ExperimentService] getExperiment failed:', err.message);
      return null;
    }
  }
  /**
   * Fetch Alpha Discovery cross-experiment insights.
   */
  async getAlphaDiscovery() {
    try {
      const res = await fetch(`${this._baseUrl}/alpha-discovery`);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('[ExperimentService] getAlphaDiscovery failed:', err.message);
      return null;
    }
  }

  /**
   * Update status of an experiment (supporting 6-State Lifecycle).
   * @param {string} experimentId
   * @param {string} status
   * @param {string} [reason]
   */
  async updateStatus(experimentId, status, reason = '') {
    try {
      const res = await fetch(`${this._baseUrl}/update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ experimentId, status, reason })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP error ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      console.error('[ExperimentService] updateStatus failed:', err.message);
      throw err;
    }
  }
}

export const experimentService = new ExperimentService();
export default experimentService;
