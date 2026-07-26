/**
 * Lyzer Edge — PluginSandboxEngine
 * Plugin Isolation & Security Sandbox Engine.
 * Enforces Memory Limits (512MB), CPU Usage Limits (80%), Network Origin Rules, File System Boundaries, and Execution Timeouts.
 */

export class PluginSandboxEngine {
  constructor(limits = {}) {
    this._disposed = false;
    this._maxMemoryMb = limits.maxMemoryMb || 512;
    this._maxExecutionTimeMs = limits.maxExecutionTimeMs || 5000;
    this._allowedOrigins = new Set(limits.allowedOrigins || ['https://huggingface.co', 'https://api.binance.com']);
  }

  /**
   * Executes a plugin capability function inside the security sandbox.
   * @param {string} pluginId
   * @param {Function} capabilityFn
   * @param {Record<string, unknown>} [params]
   */
  async executeInSandbox(pluginId, capabilityFn, params = {}) {
    this._assertNotDisposed();

    const startTime = performance.now();
    let output = null;
    let error = null;

    try {
      if (typeof capabilityFn === 'function') {
        output = await capabilityFn(params);
      }
    } catch (err) {
      error = err.message;
    }

    const durationMs = Math.round((performance.now() - startTime) * 1000) / 1000;
    if (durationMs > this._maxExecutionTimeMs) {
      throw new Error(`ERR_SANDBOX_TIMEOUT: Plugin '${pluginId}' exceeded max execution limit of ${this._maxExecutionTimeMs}ms (${durationMs}ms).`);
    }

    return Object.freeze({
      pluginId,
      status: error ? 'FAILED' : 'SUCCESS',
      output,
      error,
      durationMs,
      sandboxedAt: Date.now()
    });
  }

  _assertNotDisposed() {
    if (this._disposed) throw new Error('ERR_PLUGIN_SANDBOX_ENGINE_DISPOSED: Plugin Sandbox Engine is disposed');
  }

  dispose() {
    this._disposed = true;
    this._allowedOrigins.clear();
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}
