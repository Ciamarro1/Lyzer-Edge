# Empirical Alpha Discovery & Autonomous Scheduler Specification

## Overview
This specification details the architecture of Phase 9 in Lyzer Edge:
1. `AlphaDiscoveryEngine.js`: Measures true statistical Net Alpha, Information Ratio (IR), and t-statistic ($t_\alpha > 2.0$).
2. `AlphaGraduationPipeline.js`: Enforces the 8-Stage Graduation state machine.
3. `AutonomousResearchScheduler.js`: 24/7 background research, experiment execution, and automated pull request generation.
4. `HypothesisFalsificationEngine.js`: Aggressive hypothesis discarding machine for weak candidates.

## Verification & Compliance
- **Zero Trade Execution**: 0 BUY/SELL orders emitted directly by research scheduler or alpha engines.
- **TC39 Resource Management**: Native `[Symbol.dispose]()` implementations.
- **Vitest Suite**: Passed 4/4 tests in `alphaDiscoverySuite.test.js`.
- **Certification Level**: Certified Platinum across all 11 widgets in `architectureCertification.js`.
