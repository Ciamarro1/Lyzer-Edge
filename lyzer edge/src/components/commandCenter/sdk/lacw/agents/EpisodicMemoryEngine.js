/**
 * Lyzer Edge — EpisodicMemoryEngine
 * Experiential & Event Memory Engine.
 * Records execution events, experiments, outcomes, failures, and learned lessons.
 */

let _epIdCounter = 0;

export class EpisodicMemoryEngine {
  constructor() {
    this._disposed = false;
    this._episodes = [];
  }

  /**
   * Records an experiential memory episode.
   * @param {string} agentId
   * @param {string} eventCategory
   * @param {Record<string, unknown>} details
   */
  recordEpisode(agentId, eventCategory, details = {}) {
    this._assertNotDisposed();

    const episodeId = `ep_${Date.now()}_${++_epIdCounter}`;

    const episode = Object.freeze({
      episodeId,
      agentId,
      eventCategory,
      details: Object.freeze({ ...details }),
      outcome: details.outcome || 'SUCCESS',
      learnedLesson: details.learnedLesson || 'Maintain TRG threshold >= 0.40',
      recordedAt: new Date().toISOString(),
      timestamp: Date.now()
    });

    this._episodes.push(episode);
    return episode;
  }

  /**
   * Retrieves episodes for an agent or category.
   * @param {string} [agentId]
   * @param {number} [limit=20]
   */
  getEpisodes(agentId = null, limit = 20) {
    this._assertNotDisposed();
    if (!agentId) return this._episodes.slice(-limit);
    return this._episodes.filter(e => e.agentId === agentId).slice(-limit);
  }

  _assertNotDisposed() {
    if (this._disposed) throw new Error('ERR_EPISODIC_MEMORY_ENGINE_DISPOSED: Episodic Memory Engine is disposed');
  }

  dispose() {
    this._disposed = true;
    this._episodes = [];
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}
