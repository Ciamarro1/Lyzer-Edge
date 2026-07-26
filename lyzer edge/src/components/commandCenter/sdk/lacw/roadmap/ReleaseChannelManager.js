/**
 * Lyzer Edge — ReleaseChannelManager
 * Release Channel & Deployment Strategy Manager.
 * Manages 5 Release Channels: EXPERIMENTAL, ALPHA, BETA, STABLE, ENTERPRISE.
 */

export const RELEASE_CHANNELS = Object.freeze([
  'EXPERIMENTAL',
  'ALPHA',
  'BETA',
  'STABLE',
  'ENTERPRISE'
]);

export class ReleaseChannelManager {
  constructor() {
    this._disposed = false;
  }

  /**
   * Promotes a release candidate to specified release channel.
   * @param {string} version
   * @param {string} targetChannel - One of RELEASE_CHANNELS
   */
  promoteRelease(version, targetChannel) {
    this._assertNotDisposed();

    if (!RELEASE_CHANNELS.includes(targetChannel)) {
      throw new Error(`ERR_INVALID_RELEASE_CHANNEL: ${targetChannel}. Valid: ${RELEASE_CHANNELS.join(', ')}`);
    }

    return Object.freeze({
      version,
      channel: targetChannel,
      promotedAt: new Date().toISOString()
    });
  }

  _assertNotDisposed() {
    if (this._disposed) throw new Error('ERR_RELEASE_CHANNEL_MANAGER_DISPOSED: Release Channel Manager is disposed');
  }

  dispose() {
    this._disposed = true;
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}
