---
proposito: "Guia de Onboarding e inicialização rápida para novos engenheiros e agentes de IA"
data_criacao: "2026-07-22"
ultima_atualizacao: "2026-07-22"
origem_dados:
  - "AGENTS.md"
  - "README.md"
nivel_confianca: "Alto"
pendencias_conhecidas: "Nenhuma"
---

# Guia de Onboarding — Lyzer Edge

## 1. Pré-requisitos
- Node.js 20.x ou superior.
- Rust 1.78+ (com toolchain MinGW-w64 no Windows).
- NATS Server instalado localmente (`nats-server`).

## 2. Comandos Principais (Executados a partir do diretório `lyzer edge/`)

```bash
# Instalar todas as dependências do monorepo
npm install

# Subir servidor de desenvolvimento Vite + Backend Express em paralelo
npm run full

# Rodar a suíte de testes unitários Vitest
npm test

# Rodar linter de código
npm run lint
```
