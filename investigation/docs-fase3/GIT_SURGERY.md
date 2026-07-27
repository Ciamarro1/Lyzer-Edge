# GIT SURGERY — Temporal Code Churn Analysis

> **Analyst**: Git Surgery & Temporal Code Churn Analyst  
> **Repository**: Lyzer Edge  
> **Date**: 2026-07-27  
> **Commit Range**: 223 total (all refs) — 219 on `main` + 4 on `origin/master`

---

## 1. Author Profile

### Identities (shortlog --all)

| Author | Commits | % of Total | Lines Touched (churn) |
|--------|---------|-----------|----------------------|
| **Ciamarro1** | 138 | 61.9% | ~497K (298.6K added, 198.7K deleted) |
| **Lyzer Edge Guardian** | 78 | 35.0% | ~27.4K (21.5K added, 5.9K deleted) |
| **jonatanciamarro** | 4 | 1.8% | 642 (636 added, 6 deleted) |
| **Jonatan Ciamarro** | 3 | 1.3% | — |

**Interpretation**: Essentially a **solo developer (Ciamarro1/Jonatan Ciamarro)** working alongside an **AI agent or CI bot (Lyzer Edge Guardian)**. The `jonatanciamarro` identity appears only on the abandoned `origin/master` branch (predecessor commits from Jul 1). The developer contributes 61.9% of commits and **95% of total code churn** — an extreme concentration of authorship. The Guardian agent accounts for 35% of commits but only ~5% of churn, suggesting its commits are small, focused patches (bug fixes, docs, styling) rather than large feature work.

### Ghost Authorship

- `jonatanciamarro` and `Jonatan Ciamarro` are the same person but with different git config — evidence of **identity fragmentation** across environments or sessions.
- 4 commits on `origin/master` are **orphans** — they exist only on a stale remote branch, not merged into `main`.

---

## 2. Temporal Patterns

### Commit Calendar (all times BRT, UTC-3)

| Date | Commits | Day of Week |
|------|---------|-------------|
| 2026-07-26 | **75** | Sunday |
| 2026-07-25 | 28 | Saturday |
| 2026-07-24 | 28 | Friday |
| 2026-07-23 | **54** | Thursday |
| 2026-07-22 | 31 | Wednesday |
| 2026-07-06 | 3 | Monday |

### Hourly Distribution

| Hour | Commits | Period |
|------|---------|--------|
| 23-05 (night) | **143** (64%) | Night/madrugada |
| 06-17 (day) | 29 (13%) | Daytime |
| 18-22 (eve) | 51 (23%) | Evening |

**Peak hours**: 21h (29), 01h (23), 02h (22), 22h (25), 23h (13)

### Night vs Day

- **64% of all commits occur between 22:00-05:59** (night/madrugada)
- The heaviest session: Jul 26 produced 75 commits spanning 19:13 to 23:38
- Jul 23 had a massive nocturnal session: 54 commits between 00:06-05:37 (single all-nighter)
- Jul 26 also had a dawn session: 27 commits between 00:28-05:36

### Day of Week

- **Sunday is the most active** (75 commits, 34%) — the developer works weekends
- **Monday is the least active** (3 commits) — all from Jul 6, the only "business day" burst
- Thursday (54) and Wednesday (31) are strong

### Interpretation

The pattern reveals a **nocturnal, weekend-heavy development cadence**. The extreme concentration in 5 consecutive days (Jul 22-26) indicates a **crunch-time sprint** — likely a deadline-driven push. The developer appears to be working in long overnight sessions, suggesting this is a **passion project or startup grind**, not a 9-to-5 engineering job.

**Pattern name**: *"The Midnight Sprint"* — bursts of high-velocity nocturnal commits followed by quiet periods. The 3 commits on Jul 6 and then nothing until Jul 22 suggests a **hiatus** followed by a **massive push**.

---

## 3. Hot Files — Top 20 Most Modified

| Rank | File | Modifications | Category |
|------|------|---------------|----------|
| 1 | `knowledge/changelog/knowledge_history.md` | **50** | Knowledge/Living Docs |
| 2 | `knowledge/README.md` | **35** | Knowledge/Living Docs |
| 3 | `lyzer edge/src/components/GamifiedCommandCenterView.js` | **23** | Frontend — Core UI |
| 4 | `lyzer edge/backend/streamEngine.js` | **15** | Backend — Core Pipeline |
| 5 | `lyzer edge/src/components/commandCenter/widgets/chartHost/ChartHostWidget.js` | **14** | Frontend — Widget |
| 6 | `lyzer edge/src/components/LiveTradingView.js` | **14** | Frontend — Core View |
| 7 | `lyzer edge/backend/db.js` | **11** | Backend — Database |
| 8 | `lyzer edge/scripts/architectureCertification.js` | **10** | DevOps/Certification |
| 9 | `lyzer edge/backend/server.js` | **8** | Backend — Server |
| 10 | `lyzer edge/src/components/commandCenter/sdk/CommandCenterRuntime.js` | **7** | Frontend — SDK |
| 11 | `.agents/skills/lyzer-guardian/rules.md` | **7** | AI Agent Config |
| 12 | `lyzer edge/src/components/commandCenter/widgets/agentHub/AgentHubWidget.js` | **7** | Frontend — Widget |
| 13 | `lyzer edge/src/main.js` | **6** | Frontend — Entrypoint |
| 14 | `lyzer edge/src/app.js` | **6** | Frontend — Router |
| 15 | `lyzer edge/src/components/commandCenter/widgets/tradeLog/EvolvedTradeLogWidget.js` | **6** | Frontend — Widget |
| 16 | `lyzer edge/src/services/wsClient.js` | **5** | Frontend — Services |
| 17 | `lyzer edge/index.html` | **5** | Frontend — HTML |
| 18 | `lyzer edge/src/components/commandCenter/sdk/types.js` | **5** | Frontend — Types |
| 19 | `lyzer edge/package.json` | **5** | Config |
| 20 | `lyzer edge/src/components/commandCenter/widgets/court/CourtWidget.js` | **4** | Frontend — Widget |

### Churn Concentration

- **Knowledge docs** (#1, #2) are the most volatile files — 85 modifications total. This is a living documentation pattern where the changelog and README are updated continuously.
- **GamifiedCommandCenterView.js** dominates the frontend (23 edits) — it's the main cockpit UI, constantly evolving.
- **streamEngine.js** (15 edits) is the most volatile backend file — the pipeline orchestrator receives continuous tuning.
- **Widget files** (ChartHost, AgentHub, TradeLog, Court) indicate a **widgetized architecture** being iterated rapidly.

### What's NOT Hot

- Core engine files (`kernel.js`, `signalEngine.js`, `court.js`) have low modification counts — suggesting the pipeline architecture stabilized early.
- Rust files appear rarely — the Rust workspace receives few commits, possibly treated as stable infrastructure.
- Test files are underrepresented — only `architectureCertification.js` appears in the top 20. Unit tests are not being iterated heavily.

---

## 4. Branch Topology

```
* main  (default, local)
  remotes/huggingface/main
  remotes/origin/HEAD -> origin/main
  remotes/origin/main
  remotes/origin/master  (stale — 4 orphan commits)
```

### Branch Analysis

- **Single-branch development**: All 223 commits land directly on `main`. Zero feature branches, zero topic branches.
- **Remote mismatch**: `origin/master` contains 4 commits that are **not present** on `main`. These are from a different lineage (Jul 1, authored by `jonatanciamarro`), suggesting the repo was either:
  - Rebased/rewritten at some point, or
  - Force-pushed with a fresh `main` branch over the original `master`
- **Sparse remote**: Only one remote tracked (huggingface + origin point to same main).
- **No `develop` branch**, no release branches, no hotfix branches.

### Implications

- **No isolation** between features — all work-in-progress lands on main.
- **No code review workflow** — no merge commits exist, confirming direct pushes.
- **No release staging** — the only "tag-like" milestone is implicit (the state of main at any point).
- The `origin/master` orphan branch is a **code cemetery** — dead commits that will never merge.

---

## 5. Churn Analysis

### Author Churn

| Author | Additions | Deletions | Total Churn |
|--------|-----------|-----------|-------------|
| Ciamarro1 | 298,614 | 198,735 | **497,349** |
| Lyzer Edge Guardian | 21,466 | 5,904 | **27,370** |
| jonatanciamarro | 636 | 6 | **642** |
| **Total** | **320,716** | **204,645** | **525,361** |

### Churn Ratio

- **Net addition**: 116,071 lines (320.7K added - 204.6K deleted) — significant net growth.
- **Guardian ratio**: ~80% additions vs deletions — the bot primarily adds code, rarely deletes.
- **Ciamarro1 ratio**: 60% additions, 40% deletions — a healthy churn profile where refactoring balances growth.
- **Average commit size**: ~2,356 lines touched per commit (unusually high — suggests large, monolithic commits).

### Volatile Areas (by directory)

| Directory | Churn Risk | Assessment |
|-----------|-----------|------------|
| `knowledge/` | **EXTREME** | 85 edits to 2 files — living docs rewritten constantly |
| `lyzer edge/src/components/` | **HIGH** | Command center widgets iterated heavily |
| `lyzer edge/backend/` | **HIGH** | streamEngine, db.js, server.js are in flux |
| `lyzer edge/src/engine/` | **MEDIUM** | Core logic stable, occasional deep changes |
| `packages/lyzer-shared/` | **MEDIUM** | Shared library — moderate churn |
| `packages/lyzer-constitution/` | **LOW** | Constitutional/Hub code mostly stable |
| `src-rust/` | **LOW** | Rust workspace — minimal modifications |
| `lyzer-workspace/` | **LOW** | Constitutional hub — stable |
| `.agents/` | **LOW-MEDIUM** | Agent config and skills being added |

### Files with Zero Net Change (pure refactor noise)

Files like `packages/lyzer-shared/src/engine/stats.js` (586 lines, all additions) and many `.agents/` files appear to have been added in bulk — likely template-generated or copied. This inflates the churn numbers artificially.

### Interpretation

The churn is **heavily concentrated in the UI layer** and **knowledge docs**, while the **kernel/constitutional pipeline is relatively stable**. This is consistent with a project that has a solid core architecture but is rapidly iterating on the user experience and documentation. The high average commit size suggests opportunities for **smaller, more atomic commits**.

---

## 6. Missing Practices

### What the Git History Reveals About Engineering Practices

#### 🚩 Red Flags

| Missing Practice | Evidence | Severity |
|-----------------|----------|----------|
| **No tags/releases** | `git tag` returns empty | HIGH — cannot reproduce any specific release |
| **No feature branches** | Single linear main branch | HIGH — no isolation, WIP on main |
| **No merge commits** | `git log --merges` returns empty | HIGH — no code review workflow |
| **No conventional commits (early)** | Early messages lack `feat:`/`fix:` prefix | MEDIUM — inconsistent history |
| **Large monolithic commits** | Avg ~2,356 lines per commit | MEDIUM — hard to revert/review |
| **Identity fragmentation** | 3 git identities for 1 person | LOW — cosmetic, but confusing |
| **No .gitignore discipline** | `package-lock.json` tracked (7K+ lines) | LOW — unnecessary noise in history |
| **Low test churn** | No test files in top 20 hot files | MEDIUM — testing may be underinvested |

#### ✅ Green Flags

| Good Practice | Evidence |
|---------------|----------|
| **Later adoption of conventional commits** | Recent commits use `feat:`, `fix:`, `docs:`, `style:` prefixes |
| **Living documentation** | `knowledge_history.md` updated 50 times — documentation is treated as code |
| **AI-assisted development** | Guardian bot handles automated fixes and style patches |
| **High commit velocity** | 223 commits in 5 active days = ~45 commits/day sprint velocity |
| **Architecture certification** | `architectureCertification.js` (10 edits) — there is awareness of validation |
| **Modular structure** | Widget-based frontend architecture clearly visible in commit patterns |

#### 🧛 Ghost Commits

The 4 commits on `origin/master` (jonatanciamarro, Jul 1, 2026) are **ghost commits** — they exist in the object store but are not reachable from `main`. They contain:
- `streamEngine.js` modifications (78 lines)
- `optimize_backtest.js` (291 lines added)
- `run_binance_backtest.js` (273 lines added)

These commits represent **lost work** — completed code that was never merged into the main lineage. Likely a casualty of a force-push or repository restructuring early in the project's life.

#### 🌙 The Nocturnal Factor

91 commits (41%) fall strictly in the 22:00-05:59 window. The pattern is so pronounced that the repository's active hours mirror a **night shift schedule**. This raises two concerns:

1. **Sustainability risk** — such intensity is not maintainable long-term
2. **Review deficit** — nocturnal solo commits receive zero peer review

---

## 7. Summary Metrics

| Metric | Value |
|--------|-------|
| **Total commits** | 223 (main lineage) |
| **Effective authors** | 1 human + 1 AI agent |
| **Branches** | 1 (main) + 1 stale (origin/master) |
| **Tags** | 0 |
| **Merge commits** | 0 |
| **First commit** | Jul 6, 2026 (09ca14e — "Align live exits...") |
| **Last commit** | Jul 26, 2026 (fb717fd — "feat(ui): add interactive...") |
| **Total lines added** | ~320,716 |
| **Total lines deleted** | ~204,645 |
| **Net code growth** | ~116,071 lines |
| **Avg commit size** | ~2,356 lines touched |
| **Active period** | 5 days (Jul 22-26) + 1 day (Jul 6) |
| **Night commit %** | ~64% (22:00-05:59) |
| **Weekend commit %** | ~46% (Sat+Sun) |
| **Most volatile file** | `knowledge/changelog/knowledge_history.md` (50 edits) |

---

## 8. Final Diagnosis

This repository tells the story of a **solo founder or small team in hypergrowth mode**. The architecture is sophisticated (7-layer pipeline, constitutional court, Rust services, widget ecosystem), but the **engineering process is immature**:

- **No branching strategy** → risk of breaking main with half-baked features
- **No releases** → impossible to roll back to a known-good state
- **No code review** → single point of failure in the sole human developer
- **Nocturnal intensity** → high burnout risk
- **Lost commits** → evidence of repository trauma (force-push/rebasing)

The **AI agent (Lyzer Edge Guardian)** acts as a force multiplier — handling docs, style fixes, and minor patches — but the **architecture and core logic remain in the hands of one person**. The recent adoption of conventional commits and architecture certification scripts suggests **growing engineering maturity**, but the process infrastructure (branches, reviews, tags, CI) has not yet caught up.

**Recommendation**: The codebase quality is high, but the process needs to catch up to the architecture ambition. Even basic Git hygiene (feature branches, pull requests, semantic version tags) would dramatically reduce risk.
