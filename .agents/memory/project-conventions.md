---
type: project
created: 2026-05-25
updated: 2026-05-25
---

# Project Conventions

## Git Workflow
- Always create a new dedicated branch for major code changes.
- Branch name format should follow: `feature/[task-slug]` or `fix/[bug-slug]`.

## Frontend Conventions (Lyzer Edge Analyst)
- **Execution Path:** The frontend is located in `lyzer edge/lyzer edge/` (double nested). Use `start.bat` to run, as it properly injects `nodejs` into the Windows PATH for `npm run full`.
- **CSS Architecture:** Vanilla CSS is used exclusively. The styles are split across `variables.css`, `base.css`, `layout.css`, and `components.css` in `src/styles`. **No Tailwind CSS.**
- **UI Framework:** The UI renders via native Vanilla DOM manipulation inside JS classes (e.g., setting `this._container.innerHTML`). Follow the established Dark Mode and Glassmorphism design tokens.

## Cognitive Governance (AUR & CML)
- **Unknown != Noise:** A regra absoluta da infraestrutura. Nenhuma implementação, serviço gRPC, ou telemetria em Rust/TS deverá descartar uma anomalia estrutural ou fricção real inclassificável como "ruído estocástico" (*Noise*). O mistério não explicado deve ser roteado e preservado formalmente no *Architectural Unknown Registry (AUR)*. O sistema deve assumir ativamente que seu modelo ontológico atual possui falhas.
- **Epistemic Containment vs Closure:** O Lyzer Labs não possui todas as respostas, mas possui um lugar institucional para todas as perguntas futuras. O maior risco futuro é o *Architectural Narcissism* — "Confiar na arquitetura antes de confiar nos experimentos". O mapa nunca deve ser confundido com o território. 90% do esforço deve ser colisão empírica com a realidade.
