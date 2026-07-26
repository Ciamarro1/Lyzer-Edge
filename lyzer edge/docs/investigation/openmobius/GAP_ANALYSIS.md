# 🏛️ OpenMobius Skill — Gap Analysis & Feature Classification

**Audit Target**: `https://github.com/MobiusQuant/OpenMobius-skill`  

---

## 1. Feature Classification Matrix

| OpenMobius Feature | Category | Action Required | Technical Rationale |
|---|---|---|---|
| FVG / Fair Value Gap Parser | **Adapt** | Wrap in `OpenMobiusEvidenceAdapter` | High mathematical value, but must output `Evidence` rather than trade triggers |
| Order Block Detection | **Adapt** | Wrap & Normalize | Excellent structure annotation; needs decay half-life tracking |
| BOS / CHoCH Detection | **Adapt** | Normalize to Lyzer Time Series | Retain logic, enforce zero-allocation RingBuffer data structures |
| Natural Language Prompt / Q&A | **Discard** | Remove entirely | Non-deterministic text responses violate quantitative reproducibility |
| Direct Execution / Order Triggers | **Discard** | Strictly Prohibit | Violates 7-layer pipeline and Constitutional Court authority |
| K-Line Data Fetching | **Rewrite** | Replace with `IDataProvider` | Direct exchange API calls violate Zero-Trust network boundary |
| Market Regime Detection (HMM/GMM) | **Leverage Integrally** | Port to Rust/JS Kernel | Provides probabilistic regime inputs for `RealityOrchestrator` |

---

## 2. Abstraction Gaps & Remediation

1. **State Persistence Gap**: OpenMobius relies on transient memory objects.  
   *Remediation*: Back with Lyzer `RingBuffer` for zero-allocation performance.
2. **Deterministic Time Gap**: Native OpenMobius relies on system clock.  
   *Remediation*: Inject `BrowserClock` or `Clock` facade to support deterministic backtesting and replay.
