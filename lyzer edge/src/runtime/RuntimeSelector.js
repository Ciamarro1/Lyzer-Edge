/**
 * Lyzer Edge - Runtime Selector
 * Decides whether to launch the Legacy Dashboard or the V2 Command Center.
 * Operates independently of the underlying app logic.
 */

export const Runtimes = {
  LEGACY: 'legacy-dashboard',
  COMMAND_CENTER_V2: 'command-center-v2'
};

export class RuntimeSelector {
  /**
   * Resolves the current runtime based on environment, URL, or flags.
   * @param {Object} context - Optional context injection (e.g. { url: window.location.href })
   * @returns {Object} { runtime: string, config: Object }
   */
  static resolve(context = {}) {
    // Check injected context first
    if (context.forceV2) {
      return { runtime: Runtimes.COMMAND_CENTER_V2, config: {} };
    }

    // Default to browser environment check
    if (typeof window !== 'undefined') {
      const url = new URL(context.url || window.location.href);
      
      // If the URL has ?v2=true or #/v2, force V2
      if (url.searchParams.get('v2') === 'true' || window.location.hash.includes('/v2')) {
        return { runtime: Runtimes.COMMAND_CENTER_V2, config: {} };
      }
    }

    // Default fallback to legacy to protect institutional production
    return { runtime: Runtimes.LEGACY, config: {} };
  }
}
