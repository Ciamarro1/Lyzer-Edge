# Historical Blind Replay Protocol (HBRP)

## Overview
The Historical Blind Replay Protocol (HBRP) is a core specification of the Evidence Validation Program (EVP) for Lyzer Labs (Release 1.8.6). Its primary purpose is to objectively evaluate the Reasoning Engine Logic (REL) against historical events without the contamination of hindsight.

## Fundamental Axiom: The End of "Worst Drawdown" Replays
We explicitly abandon the legacy practice of exclusively "replaying the worst drawdowns." Evaluating a system purely on its historical failures inherently introduces:
- **Outcome Bias:** Judging the quality of a decision based solely on its result, rather than the quality of the information and logic available at the time.
- **Selection Bias:** Tuning the system to survive specific, highly anomalous historical events, which damages its generalizability and robustness in unknown future states.

Instead, HBRP enforces a rigorous, unbiased reconstruction of history to measure true epistemic capability.

## The 5-Step Protocol

### 1. Mixed Selection
The dataset for replay must be a representative sample of various market conditions, not exclusively extreme failures. The selection must include:
- **Successes:** Periods of high profitability or optimal execution.
- **Failures:** Drawdowns, unexpected losses, or suboptimal execution.
- **Neutral:** Flat markets, sideways movement, or low-volatility periods.
- **Shock Events:** Sudden volatility spikes, black swans, or structural breaks.

### 2. Blindness to Outcomes
During the replay, the system (and the evaluators) must be completely blind to the future outcomes of the selected periods. No forward-looking data can be accessible or implicitly leaked into the reasoning process.

### 3. Reconstruct Reality
The environment must be reconstructed exactly as it existed at the time of the event. This includes only:
- **Observed Reality:** The data signals and information available up to that exact millisecond.
- **Execution Reality:** The state of the portfolio, available liquidity, and constraints.
- **Market Reality:** Order book depth, spread, and market microstructure at that specific point in time.

### 4. Execute REL and Record State
The Reasoning Engine Logic (REL) is executed within this reconstructed, blind environment. The system must record its internal state, specifically:
- **Confidence:** The probabilistic certainty of its assessment.
- **Authority:** The mandate it assumes to act on the assessment.
- **Weight:** The capital allocation or exposure size it recommends.

### 5. Reveal Outcome
Only after the REL has committed its decisions and recorded its internal state (Confidence, Authority, Weight) is the true historical outcome revealed. The system's decisions are then scored against the actual subsequent events.

## Evaluation Metric: Epistemic Alignment Rate (EAR)
The primary metric for evaluating the success of the HBRP is the **Epistemic Alignment Rate (EAR)**. 

EAR does not merely measure profitability. It measures the correlation between the system's *expressed confidence* and the *objective probability* of the outcome. 
- High EAR indicates that the system was confident when it was empirically right, and uncertain when it was wrong.
- Low EAR indicates epistemic failure (e.g., being highly confident but wrong, or being uncertain when a clear edge existed).
