import { describe, it, expect } from "vitest";
import { TruthKernel } from "../../../packages/lyzer-constitution/src/eca/truthKernel.js";

describe("TruthKernel Dynamic Limits Suite (Requirement R4 - Volatility Adaptive Limits)", () => {
  // Pillar 1: Backward Compatibility & Defaults
  describe("Pillar 1: Backward Compatibility & Missing Indicators", () => {
    it("1.1 should retain exact default static limits (0.8, 0.7) when micro is empty or omitted", () => {
      const kernel = new TruthKernel();
      const resEmpty = kernel.evaluate(
        { v1: { signal: "long", confidence: 50 } },
        {},
      );
      const resOmitted = kernel.evaluate({
        v1: { signal: "long", confidence: 50 },
      });

      expect(resEmpty.dynamic_limits.lhdsVetoLimit).toBe(0.8);
      expect(resEmpty.dynamic_limits.ontologicalCollapseTrg).toBe(0.7);
      expect(resEmpty.dynamic_limits.volatilityMultiplier).toBe(1.0);
      expect(resEmpty.dynamic_limits.isDynamic).toBe(false);

      expect(resOmitted.dynamic_limits.lhdsVetoLimit).toBe(0.8);
      expect(resOmitted.dynamic_limits.ontologicalCollapseTrg).toBe(0.7);
      expect(resOmitted.dynamic_limits.volatilityMultiplier).toBe(1.0);
      expect(resOmitted.dynamic_limits.isDynamic).toBe(false);
    });

    it("1.2 should preserve custom constructor options when no volatility indicators are present", () => {
      const kernel = new TruthKernel({
        lhdsVetoLimit: 0.65,
        ontologicalCollapseTrg: 0.55,
      });
      const res = kernel.evaluate({}, { scaleDivergence: 0.2 });
      expect(res.dynamic_limits.lhdsVetoLimit).toBe(0.65);
      expect(res.dynamic_limits.ontologicalCollapseTrg).toBe(0.55);
      expect(res.dynamic_limits.isDynamic).toBe(false);
    });

    it("1.3 should preserve extreme constructor test values (e.g. 0.0 and 10.0) without corrupting legacy tests", () => {
      const zeroKernel = new TruthKernel({ ontologicalCollapseTrg: 0.0 });
      const tenKernel = new TruthKernel({ ontologicalCollapseTrg: 10.0 });

      expect(zeroKernel.computeDynamicLimits({}).ontologicalCollapseTrg).toBe(
        0.0,
      );
      expect(tenKernel.computeDynamicLimits({}).ontologicalCollapseTrg).toBe(
        10.0,
      );
    });

    it("1.4 should bypass dynamic scaling when dynamicLimits is explicitly disabled via options", () => {
      const kernel = new TruthKernel({
        dynamicLimits: false,
        lhdsVetoLimit: 0.8,
        ontologicalCollapseTrg: 0.7,
      });
      const limits = kernel.computeDynamicLimits({ atrRatio: 2.0 });
      expect(limits.lhdsVetoLimit).toBe(0.8);
      expect(limits.ontologicalCollapseTrg).toBe(0.7);
      expect(limits.isDynamic).toBe(false);
    });
  });

  // Pillar 2: Volatility Expansion (High Volatility Regimes)
  describe("Pillar 2: Volatility Expansion Regimes (High Volatility / Momentum)", () => {
    it("2.1 should expand LHDS veto limit under high atrRatio (e.g. atrRatio = 2.0)", () => {
      const kernel = new TruthKernel({ lhdsVetoLimit: 0.8, trgThreshold: 0.1 });
      const providers = {
        v1: { signal: "long", confidence: 100 },
        v2: { signal: "short", confidence: 100 },
      };

      // In high volatility (atrRatio = 2.0), effective limit expands (> 0.85).
      // An LHDS of 0.85 would veto under static 0.8, but passes under dynamic expansion.
      const res = kernel.evaluate(providers, {
        lhds: 0.85,
        atrRatio: 2.0,
        scaleDivergence: 0.2,
      });
      expect(res.dynamic_limits.lhdsVetoLimit).toBeGreaterThan(0.85);
      expect(res.dynamic_limits.isDynamic).toBe(true);
      expect(res.epistemic_authority).toBe("OBSERVED");
      expect(res.eef).toBe(true);
      expect(res.reason_codes).not.toContain("VETO_REALITY_DIVERGENCE");
    });

    it("2.2 should expand ontological collapse TRG limit under high volatility expansion", () => {
      const kernel = new TruthKernel({ ontologicalCollapseTrg: 0.7 });
      const providers = {
        v1: { signal: "long", confidence: 45 },
        v2: { signal: "short", confidence: 45 },
      }; // trg = 0.81

      // SDS > 0.7 with TRG = 0.81 would trigger ontological collapse at static 0.70.
      // Under high volatility (atrRatio = 2.5), ontologicalCollapseTrg expands to ~0.85+.
      const res = kernel.evaluate(providers, {
        scaleDivergence: 0.85,
        atrRatio: 2.5,
      });
      expect(res.dynamic_limits.ontologicalCollapseTrg).toBeGreaterThan(0.7);
      expect(res.dynamic_limits.isDynamic).toBe(true);
      expect(res.epistemic_authority).toBe("INFERRED");
      expect(res.reason_codes).not.toContain("VETO_ONTOLOGICAL_COLLAPSE");
    });

    it("2.3 should adapt dynamically when oppScore = 3 (high opportunity regime)", () => {
      const kernel = new TruthKernel({ lhdsVetoLimit: 0.8 });
      const res = kernel.evaluate({}, { oppScore: 3 });
      expect(res.dynamic_limits.volatilityMultiplier).toBeGreaterThan(1.0);
      expect(res.dynamic_limits.lhdsVetoLimit).toBeGreaterThan(0.8);
      expect(res.dynamic_limits.isDynamic).toBe(true);
    });

    it("2.4 should adapt dynamically with atr14_pct and volatilityRatio indicators", () => {
      const kernel = new TruthKernel({ lhdsVetoLimit: 0.8 });
      const resAtr = kernel.evaluate({}, { atr14_pct: 0.0015 }); // Normalized > 0.00055
      const resRatio = kernel.evaluate({}, { volatilityRatio: 1.8 });

      expect(resAtr.dynamic_limits.lhdsVetoLimit).toBeGreaterThan(0.8);
      expect(resRatio.dynamic_limits.lhdsVetoLimit).toBeGreaterThan(0.8);
    });

    it("2.5 should adapt dynamically when regime string indicates EXPANSION or NEWS_SHOCK", () => {
      const kernel = new TruthKernel({ lhdsVetoLimit: 0.8 });
      const resExpansion = kernel.evaluate({}, { regime: "EXPANSION" });
      const resShock = kernel.evaluate({}, { regime: "NEWS_SHOCK" });

      expect(resExpansion.dynamic_limits.lhdsVetoLimit).toBeGreaterThan(0.8);
      expect(resShock.dynamic_limits.lhdsVetoLimit).toBeGreaterThan(
        resExpansion.dynamic_limits.lhdsVetoLimit,
      );
    });

    it("2.6 should strictly clamp expanded limits to maximum safety bounds (LHDS <= 0.95, Collapse <= 0.90)", () => {
      const kernel = new TruthKernel({
        lhdsVetoLimit: 0.8,
        ontologicalCollapseTrg: 0.7,
      });
      const res = kernel.evaluate({}, { atrRatio: 100.0 }); // extreme volatility
      expect(res.dynamic_limits.lhdsVetoLimit).toBeLessThanOrEqual(0.95);
      expect(res.dynamic_limits.ontologicalCollapseTrg).toBeLessThanOrEqual(
        0.9,
      );
    });
  });

  // Pillar 3: Volatility Compression (Low Volatility Regimes)
  describe("Pillar 3: Volatility Compression Regimes (Low Volatility / Squeeze)", () => {
    it("3.1 should tighten LHDS veto limit under low atrRatio (e.g. atrRatio = 0.5)", () => {
      const kernel = new TruthKernel({ lhdsVetoLimit: 0.8, trgThreshold: 0.1 });
      const providers = { v1: { signal: "long", confidence: 100 } };

      // In low volatility (atrRatio = 0.5), effective limit tightens (< 0.75).
      // An LHDS of 0.76 would pass static 0.80, but must trigger VETO under dynamic compression.
      const res = kernel.evaluate(providers, { lhds: 0.76, atrRatio: 0.5 });
      expect(res.dynamic_limits.lhdsVetoLimit).toBeLessThan(0.76);
      expect(res.dynamic_limits.isDynamic).toBe(true);
      expect(res.epistemic_authority).toBe("VETO");
      expect(res.eef).toBe(false);
      expect(res.reason_codes).toContain("VETO_REALITY_DIVERGENCE");
    });

    it("3.2 should tighten ontological collapse TRG limit under low volatility compression", () => {
      const kernel = new TruthKernel({ ontologicalCollapseTrg: 0.7 });
      const providers = {
        v1: { signal: "long", confidence: 45 },
        v2: { signal: "short", confidence: 45 },
      }; // trg = 0.6561

      // TRG = 0.6561 is below static 0.70.
      // In compression (atrRatio = 0.4), ontologicalCollapseTrg tightens to ~0.6496.
      // Under high SDS (0.85), it must trigger ontological collapse veto.
      const res = kernel.evaluate(providers, {
        scaleDivergence: 0.85,
        atrRatio: 0.4,
      });
      expect(res.dynamic_limits.ontologicalCollapseTrg).toBeLessThan(0.66);
      expect(res.dynamic_limits.isDynamic).toBe(true);
      expect(res.epistemic_authority).toBe("VETO");
      expect(res.eef).toBe(false);
      expect(res.reason_codes).toContain("VETO_ONTOLOGICAL_COLLAPSE");
    });

    it("3.3 should adapt dynamically when oppScore = 0 (dead market consolidation)", () => {
      const kernel = new TruthKernel({ lhdsVetoLimit: 0.8 });
      const res = kernel.evaluate({}, { oppScore: 0 });
      expect(res.dynamic_limits.volatilityMultiplier).toBeLessThan(1.0);
      expect(res.dynamic_limits.lhdsVetoLimit).toBeLessThan(0.8);
      expect(res.dynamic_limits.isDynamic).toBe(true);
    });

    it("3.4 should adapt dynamically when regime string indicates COMPRESSION or LOW_LIQUIDITY", () => {
      const kernel = new TruthKernel({ lhdsVetoLimit: 0.8 });
      const resComp = kernel.evaluate({}, { regime: "COMPRESSION" });
      expect(resComp.dynamic_limits.lhdsVetoLimit).toBeLessThan(0.8);
    });

    it("3.5 should strictly clamp compressed limits to minimum safety bounds (LHDS >= 0.50, Collapse >= 0.40)", () => {
      const kernel = new TruthKernel({
        lhdsVetoLimit: 0.8,
        ontologicalCollapseTrg: 0.7,
      });
      const res = kernel.evaluate({}, { atrRatio: 0.0001 }); // near zero volatility
      expect(res.dynamic_limits.lhdsVetoLimit).toBeGreaterThanOrEqual(0.5);
      expect(res.dynamic_limits.ontologicalCollapseTrg).toBeGreaterThanOrEqual(
        0.4,
      );
    });
  });

  // Pillar 4: Adversarial Inputs & Numerical Robustness
  describe("Pillar 4: Adversarial Inputs & Numerical Robustness", () => {
    it("4.1 should handle null, undefined, and non-object micro parameters gracefully", () => {
      const kernel = new TruthKernel();
      expect(() => kernel.evaluate({}, null)).not.toThrow();
      expect(() => kernel.evaluate({}, undefined)).not.toThrow();
      expect(() => kernel.evaluate({}, "invalid string")).not.toThrow();
      expect(() => kernel.evaluate({}, 12345)).not.toThrow();

      const resNull = kernel.evaluate({}, null);
      expect(resNull.dynamic_limits.lhdsVetoLimit).toBe(0.8);
      expect(resNull.dynamic_limits.ontologicalCollapseTrg).toBe(0.7);
    });

    it("4.2 should sanitize NaN, Infinity, and negative values without propagating invalid numbers", () => {
      const kernel = new TruthKernel();
      const resNaN = kernel.evaluate({}, { atrRatio: NaN });
      const resInf = kernel.evaluate({}, { atrRatio: Infinity });
      const resNeg = kernel.evaluate({}, { atrRatio: -2.5 });

      expect(Number.isFinite(resNaN.dynamic_limits.lhdsVetoLimit)).toBe(true);
      expect(Number.isFinite(resInf.dynamic_limits.lhdsVetoLimit)).toBe(true);
      expect(Number.isFinite(resNeg.dynamic_limits.lhdsVetoLimit)).toBe(true);

      expect(resNaN.dynamic_limits.lhdsVetoLimit).toBe(0.8);
      expect(resInf.dynamic_limits.lhdsVetoLimit).toBe(0.8);
      expect(resNeg.dynamic_limits.lhdsVetoLimit).toBe(0.8);
    });

    it("4.3 should expose dynamic limits in both dynamic_limits and raw_metrics for downstream auditability", () => {
      const kernel = new TruthKernel();
      const res = kernel.evaluate({}, { atrRatio: 1.5, scaleDivergence: 0.2 });
      expect(res.dynamic_limits).toBeDefined();
      expect(res.raw_metrics.dynamic_limits).toBeDefined();
      expect(res.raw_metrics.lhds_veto_limit).toBe(
        res.dynamic_limits.lhdsVetoLimit,
      );
      expect(res.raw_metrics.ontological_collapse_trg).toBe(
        res.dynamic_limits.ontologicalCollapseTrg,
      );
    });
  });
});
