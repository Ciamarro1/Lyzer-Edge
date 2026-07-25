# COMPLEXITY BUDGET POLICY

- **Domain**: Technical Debt Prevention & Codebase Footprint Management
- **Scope**: All file additions, abstractions, and dependencies.

---

## 1. COMPLEXITY BUDGET LAWS
- **File Budget**: For every new file created, propose deleting an existing obsolete file or justify why deletion is impossible.
- **Abstraction Budget**: For every new class or layer created, justify why a simple function cannot solve the problem.
- **Continuous Reduction**: Minimization targets: LOC, file count, interface count, package dependencies, heap memory usage.
