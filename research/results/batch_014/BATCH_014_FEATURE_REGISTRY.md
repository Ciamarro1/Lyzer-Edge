# BATCH 014 - FEATURE REGISTRY

## STRUCT_PENETRATION_DEPTH_Z
- **Family**: STRUCTURE
- **Math**: `(Price_Extreme - Swing_Extreme) / ATR(14)`
- **Lineage**: V8_OpenMobius, V5_Wyckoff_Spring, V1_SMC

## VOL_ANOMALY_Z60
- **Family**: VOLUME
- **Math**: `(Volume(t) - SMA(Volume, 60)) / Stdev(Volume, 60)`
- **Lineage**: V5_Wyckoff

## TIME_AT_POC_60
- **Family**: MARKET_PROFILE
- **Math**: `Count(Candles within 0.1% of POC(60))`
- **Lineage**: V6_Market_Profile

## MOMENTUM_VELOCITY_ROC
- **Family**: MOMENTUM
- **Math**: `d/dt (Close(t) - Close(t-14))`
- **Lineage**: V3_Momentum

## IMBALANCE_GAP_ATR
- **Family**: LIQUIDITY
- **Math**: `(Low(t) - High(t-2)) / ATR(14) [if positive]`
- **Lineage**: V4_IMCE, V1_SMC

