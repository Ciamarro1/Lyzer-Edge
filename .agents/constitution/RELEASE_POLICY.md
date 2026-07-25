# RELEASE & REMOTE PUSH POLICY

- **Domain**: Release Verification & Dual-Remote Synchronization
- **Scope**: Final commit approval, remote push to GitHub and Hugging Face.

---

## 1. RELEASE CHECKLIST
1. All unit and integration tests passing (`npm test`, `vitest run`).
2. Build clean with zero compilation errors (`npm run build`).
3. Local git working tree clean (`git status`).
4. Executive Dashboard and ADR generated.
5. Dual-remote push verified:
   - **GitHub**: `https://github.com/Ciamarro1/Lyzer-Edge.git`
   - **Hugging Face Space**: `https://huggingface.co/spaces/jonatanciamarro/lyzer-edge`
