# REVIEW POLICY & ARCHITECTURE REVIEW BOARD (ARB)

- **Domain**: Peer Review & Unanimous Architecture Governance
- **Scope**: Code review, refactoring approval, and structural change gate.

---

## 1. MANDATORY CROSS REVIEW
- **Implementer != Reviewer**: The specialist agent that writes or modifies code CANNOT approve its own pull request or refactor.
- Every code edit must be reviewed by a distinct specialist agent matching the domain (e.g. Backend code reviewed by Security/Red Team; SMC refactor reviewed by Quant Guardian).

---

## 2. ARCHITECTURE REVIEW BOARD (ARB)

### Board Composition
1. **Principal Software Architect**
2. **Quant Guardian**
3. **Performance Engineer**
4. **Security Auditor / Red Team**

### Governance Rules
- Structural changes (Execution Levels **L3** and **L4**) require **unanimous approval** of all 4 board members.
- If any board member raises an objection, the issue must be resolved by executable benchmark and documented in `docs/adr/ADR-0XX.md`.
