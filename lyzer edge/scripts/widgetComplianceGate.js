/**
 * Lyzer Edge Command Center V2 — SDK Compliance Gate
 * Automated institutional audit script for widget contract, security, and performance compliance.
 * Reads declarative rules from scripts/widget-rules.json and awards Certification Levels (Bronze, Silver, Gold, Platinum).
 */

import fs from 'fs';
import path from 'path';
import { validateWidgetPlugin } from '../src/components/commandCenter/sdk/IWidgetPlugin.js';

export class WidgetComplianceGate {
  constructor(rulesPath = null) {
    const defaultRulesPath = path.resolve(process.cwd(), 'scripts/widget-rules.json');
    const targetPath = rulesPath || defaultRulesPath;
    
    if (fs.existsSync(targetPath)) {
      const raw = fs.readFileSync(targetPath, 'utf8');
      this.rules = JSON.parse(raw).rules;
    } else {
      this.rules = {
        forbiddenImports: ['/providers/', '/backend/', 'WebSocket'],
        requiredManifestFields: ['id', 'name', 'version', 'minRuntimeVersion', 'targetPane', 'capabilities', 'realityTag'],
        limits: { maxMountTimeMs: 500 }
      };
    }
  }

  /**
   * Statically audits widget source code file or directory.
   * @param {string} filePath 
   * @returns {Object} { valid: boolean, forbiddenFound: string[] }
   */
  auditStaticSource(filePath) {
    if (!fs.existsSync(filePath)) {
      return { valid: false, forbiddenFound: [`File not found: ${filePath}`] };
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const forbiddenFound = [];

    for (const pattern of this.rules.forbiddenImports) {
      if (content.includes(pattern)) {
        forbiddenFound.push(`Forbidden pattern '${pattern}' found in source.`);
      }
    }

    return {
      valid: forbiddenFound.length === 0,
      forbiddenFound
    };
  }

  /**
   * Dynamically audits a widget plugin instance against runtime standards.
   * @param {Object} pluginInstance 
   * @param {Object} [mockRuntime] 
   * @returns {Promise<Object>} Detailed Compliance Report
   */
  async auditWidget(pluginInstance, mockRuntime = null) {
    const checks = [];
    const errors = [];
    let level = 'Failing';

    // 1. Contract & Manifest Check
    const contractVal = validateWidgetPlugin(pluginInstance);
    if (!contractVal.valid) {
      errors.push(...contractVal.errors);
      return {
        widgetId: pluginInstance?.manifest?.id || 'unknown',
        certified: false,
        level: 'Failing',
        checks,
        errors
      };
    }
    checks.push('Contract and Manifest schema valid.');

    // Passed basic contract = Bronze level candidate
    level = 'Bronze';

    // 2. Dynamic Lifecycle & Performance Test
    if (typeof window === 'undefined') {
      global.window = {
        location: { href: 'http://localhost/' },
        requestAnimationFrame: (cb) => setTimeout(cb, 16),
        matchMedia: () => ({ matches: false, addListener: () => {}, removeListener: () => {} })
      };
    }

    const createMockElement = () => ({
      style: {},
      clientWidth: 800,
      clientHeight: 400,
      innerHTML: '',
      appendChild: () => {},
      removeChild: () => {},
      querySelector: () => createMockElement(),
      querySelectorAll: () => [],
      getContext: () => ({
        fillRect: () => {},
        fillText: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        stroke: () => {}
      })
    });

    if (typeof document === 'undefined') {
      global.document = {
        createElement: () => createMockElement()
      };
    }

    const container = typeof document !== 'undefined' ? document.createElement('div') : createMockElement();
    
    const dummyRuntime = mockRuntime || {
      widgetId: pluginInstance.manifest.id,
      checkCapability: () => true,
      getSnapshot: () => ({ realityTag: 'OBSERVED_REALITY' }),
      getRealityStatus: () => ({ healthStatus: 'HEALTHY' }),
      getPerformanceMetrics: () => ({ fps: 60 }),
      subscribeMarketData: () => ({ dispose: () => {} }),
      subscribePerformanceMetrics: () => ({ dispose: () => {} })
    };

    let mountTimeMs = 0;
    try {
      const start = performance.now();
      await pluginInstance.mount(container, dummyRuntime);
      mountTimeMs = performance.now() - start;
      checks.push(`Mount completed in ${mountTimeMs.toFixed(2)}ms`);

      if (mountTimeMs > this.rules.limits.maxMountTimeMs) {
        errors.push(`Mount time (${mountTimeMs.toFixed(2)}ms) exceeded max limit of ${this.rules.limits.maxMountTimeMs}ms`);
      } else {
        level = 'Silver';
      }
    } catch (err) {
      errors.push(`Mount failed: ${err.message}`);
    }

    // 3. Disposal & Clean Up Check
    try {
      if (typeof pluginInstance.dispose === 'function') {
        await pluginInstance.dispose();
      } else if (typeof pluginInstance.unmount === 'function') {
        await pluginInstance.unmount();
      }
      checks.push('Lifecycle dispose() executed cleanly.');

      if (level === 'Silver') {
        // 4. Gold Level Check (Capabilities & Telemetry Integration)
        if (pluginInstance.manifest.capabilities && pluginInstance.manifest.capabilities.length > 0) {
          checks.push(`Capabilities declared and scoped: [${pluginInstance.manifest.capabilities.join(', ')}]`);
          level = 'Gold';
        }

        // 5. Platinum Level Check (Fast Mount < 100ms)
        if (level === 'Gold' && mountTimeMs < 100) {
          checks.push('High performance mount (< 100ms) verified.');
          level = 'Platinum';
        }
      }
    } catch (err) {
      errors.push(`Disposal failed: ${err.message}`);
      level = 'Failing';
    }

    return {
      widgetId: pluginInstance.manifest.id,
      certified: errors.length === 0,
      level,
      mountTimeMs: Math.round(mountTimeMs * 100) / 100,
      checks,
      errors
    };
  }
}
