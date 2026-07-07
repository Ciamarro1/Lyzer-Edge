# EML Institutional Learning Ledger

## Purpose
This document serves as the Institutional Learning Ledger for the Empirical Memory Layer (EML). It establishes a rigid format to systematically document experimental outcomes, incident post-mortems, and architectural evaluations. Its primary function is to prevent confirmation bias by forcing the explicit documentation of failed expectations and persistent unknowns alongside verified successes.

## Learning Entry Template

### [YYYY-MM-DD] - [Event/Experiment/Incident Name]
**Reference ID:** [Ticket/PR/Experiment ID]
**Owner:** [Name/Role]
**Hypothesis/Objective:** [What did we set out to prove, build, or investigate? What was the expected outcome?]

#### 1. What We Learned (Verified Facts)
*Document only facts validated by empirical evidence, metrics, or concrete production data. Do not include assumptions or unverified theories.*
* **Verified Fact 1:** [Description]
  * **Evidence/Data:** [Link to dashboard, logs, or concrete proof]
* **Verified Fact 2:** [Description]
  * **Evidence/Data:** [Link to dashboard, logs, or concrete proof]

#### 2. What We Didn't Learn (Failed Hypotheses & Disproven Assumptions)
*Document expected outcomes that failed to materialize. Acknowledge where our mental models or assumptions about the system were incorrect.*
* **Failed Expectation 1:** [What did we assume would happen that didn't?]
  * **Observed Reality:** [What actually occurred instead?]
* **Failed Expectation 2:** [What did we assume would happen that didn't?]
  * **Observed Reality:** [What actually occurred instead?]

#### 3. What We Still Don't Know (Remaining Unknowns & Blind Spots)
*Document new questions raised by this event, variables we currently lack the observability to measure, or areas where strategic ambiguity persists.*
* **Identified Unknown 1:** [What critical question remains unanswered?]
  * **Risk/Impact:** [How does this unknown affect system reliability or future decisions?]
* **Identified Unknown 2:** [What critical question remains unanswered?]
  * **Risk/Impact:** [How does this unknown affect system reliability or future decisions?]

---
