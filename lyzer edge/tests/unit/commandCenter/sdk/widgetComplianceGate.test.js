import { describe, it, expect } from 'vitest';
import { WidgetComplianceGate } from '../../../../scripts/widgetComplianceGate.js';
import { RealityStatusWidget } from '../../../../src/components/commandCenter/widgets/realityStatus/RealityStatusWidget.js';
import { ChartHostWidget } from '../../../../src/components/commandCenter/widgets/chartHost/ChartHostWidget.js';

describe('Phase 3.3 - SDK Compliance Gate Audit', () => {
  if (typeof window !== 'undefined' && !window.matchMedia) {
    window.matchMedia = (query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
    });
  }

  const gate = new WidgetComplianceGate();

  it('audits RealityStatusWidget and assigns Gold or Platinum certification', async () => {
    const widget = new RealityStatusWidget();
    const report = await gate.auditWidget(widget);

    console.log(`[Compliance Gate] ${report.widgetId}: Level=${report.level}, Certified=${report.certified}`);
    expect(report.certified).toBe(true);
    expect(['Gold', 'Platinum']).toContain(report.level);
    expect(report.errors.length).toBe(0);
  });

  it('audits ChartHostWidget and assigns Gold or Platinum certification', async () => {
    const widget = new ChartHostWidget();
    const report = await gate.auditWidget(widget);

    console.log(`[Compliance Gate] ${report.widgetId}: Level=${report.level}, Certified=${report.certified}`);
    expect(report.certified).toBe(true);
    expect(['Gold', 'Platinum']).toContain(report.level);
    expect(report.errors.length).toBe(0);
  });

  it('fails uncompliant widget lacking dispose() or invalid manifest', async () => {
    const badWidget = {
      manifest: { id: 'bad' }, // Invalid manifest
      mount: () => {}
    };

    const report = await gate.auditWidget(badWidget);
    expect(report.certified).toBe(false);
    expect(report.level).toBe('Failing');
    expect(report.errors.length).toBeGreaterThan(0);
  });
});
