# Candidate Blinding Protocol
**Release MRCP-beta: Patient Zero Selection Event**

This protocol enforces the CIA mandate for a 'Triple Blind Candidate Pool' during the MRCP-beta Patient Zero Selection Event. 

## 1. Identity Blindness
All specific asset identifiers must be obfuscated to prevent bias based on historical asset performance. Use abstract designations.
- **Required Format:** "Asset Alpha", "Asset Beta", "Asset Gamma"
- **Forbidden:** "BTC", "ETH", "SOL", or any original ticker symbols, network names, and recognizable project signatures.

## 2. Temporal Blindness
All exact timestamps, recognizable dates, and specific timeframes must be masked using relative epoch framing. This forces evaluation based purely on market mechanics.
- **Required Format:** "Epoch-01", "Epoch-02"
- **Forbidden:** "2018", "March 2020", "Q4 2021"
- **Relative Time:** Use "T-0" for the critical event horizon, with relative time steps (e.g., "T-30 days", "T+5 hours").

## 3. Narrative Blindness
All real-world events that could provide contextual clues must be stripped from the dataset and replaced with abstract, purely structural descriptions.
- **Required Format:** "Exogenous Macro Shock", "Liquidity Vacuum", "Cascading Liquidations"
- **Forbidden:** "COVID", "Pandemic", "Flash Crash", "FTX Collapse", "LUNA crash"
