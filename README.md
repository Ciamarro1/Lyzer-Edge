---
title: Lyzer Edge
emoji: 📈
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
pinned: false
---

# 🔬 Lyzer Edge

> **Lyzer Labs — Institutional Adaptive Intelligence Ecosystem**

Lyzer Edge não é um bot de trading nem um framework simples de IA. É uma arquitetura cognitiva e operacional completa projetada para mercados financeiros (cripto/tradicionais). O sistema foi construído sob um axioma fundamental: **A sobrevivência (Survival) tem precedência sobre a governança e a otimização de curto prazo.**

O sistema foi arquitetado para acumular inteligência de forma auditável e sobreviver à sua própria evolução em ambientes não-estacionários e adversariais (Non-Stationary Switching Processes).

---

## 🏛️ Arquitetura e Pilares (The 6 Pillars)

O projeto opera sob uma Fábrica Autônoma de Software ("Sisyphus Factory") guiada por governança cognitiva entre agentes.

1. **Orquestração Multi-Agente:** Especialistas (CIA, CTO, Ponytail, Red Team) operam em paralelo.
2. **Memória Institucional:** *Architecture Decision Records* (ADRs) mantêm o histórico imutável das decisões sistêmicas na camada `.agents/memory/`.
3. **Raio de Impacto Sintático (AST):** Modificações baseadas em topologia (grafos) para refatoração cirúrgica profunda.
4. **Verificação Contínua (E2E):** O código é testado contra pipelines rígidos de robustez (e.g., `test_runner.py`, `playwright_runner.py`).
5. **Red Teaming:** Um subagente *Security Auditor* e *Penetration Tester* atacam o código antes de qualquer deploy em produção (Adversarial Cognitive Governance).
6. **Evolução de Procedimentos (SOPs):** Procedimentos maduros viram *Skills* reusáveis (`skillify`).

---

## 🏗️ Topologia do Ecossistema

O repositório é polyglot (JS/TS, Rust, Python) e subdividido em camadas estritas de separação de risco (Failure Boundaries).

### 1. Intelligence & Execution Plane (JS/TS)
A interface cognitiva e interpretativa do mercado.
- **Frontend SPA (Vite + Vanilla JS):** Dashboards complexos como o *Z-Space Live*, *Decision Stream* e *Edge Explorer*.
- **Decision Engines:** *Truth Kernel*, *SML (System Metacognition Layer)*, *RSIS (Regime Shock Simulator)* e mais 30 motores especializados que alimentam o pipeline de Execução.

### 2. Constitutional Kernel (Rust Hub)
O coração da velocidade e determinismo. Isolado da governança para garantir arbitragem estrita.
- **`lyzer-core-hub`:** Gatekeeping TCP de sinais.
- **`lyzer-shm-spine`:** Memória compartilhada lock-free (64-byte `repr(C)`) unindo Python e Rust.
- **`lyzer-risk-gateway`:** Avaliação determinística microsecond para aprovação de intenções (*Execution Intents*).

### 3. Research & Epistemic Observatory (Python)
A linha de pesquisa B (`lyzer_analytics_line_b/`) contendo o framework empírico.
- Implementação rigorosa do **IGHT (Invariant Geometric Hypothesis Testing)**.
- Desacoplamento entre Risco de Sobrevivência ($T_c$) e Colapso Epistêmico Observacional.

---

## 🚀 Como Iniciar

### Pré-requisitos
- Node.js (v18+)
- Rust (Edition 2021/2024) + Cargo
- Python (3.12+)
- NATS Server (Message Broker nativo)

### Inicialização (Live Experiment)
O ponto de entrada para o pipeline unificado (CPS-1.1 Regime-Aware Ensemble) é o script de ignição:
```powershell
./start_live_experiment.ps1
```
*(Nota: Certifique-se de que o `.env` esteja configurado de forma segura fora do controle de versão)*

---

## 🔒 Governança de Risco e Segurança

A Lyzer Edge segue o princípio de **Leak Prevention (Gatekeeper Pre-Push)**:
1. Nunca injetar segredos, histórico sujo ou chaves de API.
2. Todo pull request/commit é rigorosamente escaneado pelos agentes do *Red Team*.
3. O `lyzer-core-hub` é projetado para falhar com segurança (`panic = "abort"`), congelando execuções de risco sem efeito dominó.

---

> *"Inteligência não é encontrar respostas. É preservar perguntas legítimas frente ao colapso do tempo."* — Lyzer Labs CIA
