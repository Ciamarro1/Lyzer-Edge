# Project: lyzer-edge Setup and Dependency Installation

## Architecture
This project is an environment setup and installation pipeline for `lyzer-edge`.
- Host: Windows
- Runtimes: Node.js (v18+), Python (3.12+), Rust (Edition 2021/2024), NATS Server
- Repository: Hugging Face Space `jonatanciamarro/lyzer-edge`
- Integration: JavaScript/TypeScript frontend/backend layers, Rust kernel modules, and Python analytics modules, coordinated by a NATS broker and a PowerShell ignition script (`start_live_experiment.ps1`).

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Environment Setup | Download, install, and add to PATH: Node.js, Python, Rust, NATS Server. | None | PLANNED |
| 2 | M2: Source Retrieval | Clone/download repo `jonatanciamarro/lyzer-edge` from Hugging Face space using token. | None | PLANNED |
| 3 | M3: Build & Dependencies | Install npm dependencies, cargo build Rust kernel, create Python venv and install requirements. | M1, M2 | PLANNED |
| 4 | M4: Integration Verification | Verify NATS Server runs, start ignition script `./start_live_experiment.ps1` and verify logs. | M3 | PLANNED |

## Interface Contracts
- Node.js: CLI version v18+ must be available in system PATH.
- Python: CLI version v3.12+ must be available in system PATH.
- Rust/Cargo: `rustc` and `cargo` must be available in system PATH.
- NATS Server: `nats-server` must be executable and available in system PATH.
- Repository structure: Extracted directly into `c:\Users\WDAGUtilityAccount\Downloads\lyzer`.

## Code Layout
- Working Directory: `c:\Users\WDAGUtilityAccount\Downloads\lyzer`
- Subagents Metadata: `c:\Users\WDAGUtilityAccount\Downloads\lyzer\.agents\`
