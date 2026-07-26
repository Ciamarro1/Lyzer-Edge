# Lyzer Edge — Critical Findings & Blocker Registry

## Critical Architectural Findings

### 1. Verification Scripts in Project Root
- **Finding**: 12 `verify_*.js` scripts and 35+ `push_*.py` operational scripts reside in `lyzer edge/` root and `scratch/`.
- **Severity**: LOW / HOUSEKEEPING.
- **Risk**: Clutters root directory structure.
- **Mitigation**: Move ad-hoc verification scripts into `scripts/verification/`.

### 2. Dual Location Workspace Documentation
- **Finding**: Documentation exists in both `lyzer edge/docs/workspace/` and root `knowledge/`.
- **Severity**: LOW.
- **Risk**: Potential document duplication across legacy phases.
- **Mitigation**: Establish `lyzer edge/docs/workspace/` as single source of truth.
