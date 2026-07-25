# Minimal Reality Contact Protocol (MRCP)
## Sample Selection Protocol (SSP)
**Version:** 1.8.7-A
**Context:** Lyzer Labs - Historical Blind Replay Protocol (HBRP)

### 1. Objective
To construct a statistically robust and rigorous sample set of 20 to 50 distinct historical market periods for validation under the Historical Blind Replay Protocol (HBRP). This protocol ensures that reality-based consensus algorithms and trading heuristics are tested against a full spectrum of market conditions rather than over-optimized for a single regime.

### 2. Sample Distribution Requirements
The target sample size is **N = 40** (range 20 to 50). The selection must strictly adhere to the following distribution constraints to prevent regime bias:

*   **Great Successes (20%):** Periods characterized by massive, sustained secular bull markets and explosive growth (e.g., Post-2008 recovery, Late 90s Tech Boom, 2020-2021 Crypto run).
*   **Massive Failures (20%):** Severe and sustained secular bear markets, structural collapses, and prolonged value destruction (e.g., 2000-2002 Dot-Com crash, 2008 Global Financial Crisis, 2022 Crypto Winter).
*   **Systemic Shocks / Black Swans (15%):** Sudden, extreme volatility events characterized by structural illiquidity and rapid repricing (e.g., March 2020 COVID crash, 1987 Black Monday, 2010 Flash Crash).
*   **Sideways / Range-Bound Markets (25%):** Periods of high noise, mean-reverting chop, and lack of clear macro trend, designed to test system patience and capital preservation.
*   **Neutral / Transitions (20%):** Regimes transitioning from bear to bull or vice versa, testing the system's ability to identify trend exhaustion and structural shifts.

### 3. Selection Methodology

#### 3.1. Timeframe Independence
Periods must be selected across multiple timeframes to ensure fractal robustness and prevent overfitting to specific resolution dynamics.

#### 3.2. Asset Class Diversification
Historical periods from multiple asset classes exhibiting required volatility signatures must be included to avoid data snooping bias on any single instrument.

#### 3.3. Blind Injection (HBRP Requirement)
When the protocol is executed, the selected samples must have their timestamps and absolute price labels obfuscated (normalized). The underlying system must navigate the period relying purely on structural reality and internal modeling, with zero external time-based data leakage.

### 4. Rejection Criteria
A historical period cannot be included in the sample if:
*   The data is corrupted, discontinuous, or lacks sufficient volume depth.
*   The period overlaps with another selected sample by more than 10%.
*   The regime characteristics are ambiguous and do not fit cleanly into one of the designated categories.

### 5. Review and Governance
The final sample set must be reviewed by Quantitative Engineering. Any adjustments to the distribution weights must be mathematically justified and documented before the MRCP simulation can commence.
