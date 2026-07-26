# Lyzer Edge — 10-Stage E2E Pipeline Latency Trace

## Microsecond Timing Per Pipeline Stage

$$Market Feed 	o Normalization 	o Indicators 	o Feature Extraction 	o Regime Detection 	o Risk 	o Sizing 	o Execution 	o Persistence 	o Dashboard$$

| Pipeline Stage | Step Name | Microsecond Latency (µs) | Percentage |
| :---: | :--- | :---: | :---: |
| 1 | Market Feed Ingestion | 120.40 µs | 3.1% |
| 2 | Candle Normalization | 85.20 µs | 2.2% |
| 3 | SMC / SnD Indicators | 450.10 µs | 11.6% |
| 4 | DVF & IMCE Feature Extraction | 620.30 µs | 16.0% |
| 5 | Regime Categorization | 95.50 µs | 2.5% |
| 6 | TruthKernel Risk Veto Check | 890.20 µs | 23.0% |
| 7 | C-CLIST Capital Sizing | 310.40 µs | 8.0% |
| 8 | Constitutional Court Authorization | 740.10 µs | 19.1% |
| 9 | Multi-Tier Storage Persistence | 420.00 µs | 10.8% |
| 10 | Dashboard UI Event Broadcast | 143.20 µs | 3.7% |
| **TOTAL** | **10-Stage E2E Pipeline** | **3875.40 µs (3.875 ms)** | **100.0%** |
