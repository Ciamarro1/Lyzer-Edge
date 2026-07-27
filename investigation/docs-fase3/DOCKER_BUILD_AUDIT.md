# Docker Build & Dependency Chain Audit

## 1. Docker Build Pipeline

```
Stage: builder (rust:1.78-bookworm)
│
├── apt: nodejs, unzip
├── cargo build --release lyzer-workspace/lyzer-core-hub (builds hub + 4 workspace deps)
├── npm install (lyzer edge/)
├── npm run build (Vite frontend → dist/)
├── curl NATS v2.10.11 → /usr/local/bin/nats-server
│
▼
Stage: runtime (ubuntu:24.04)
│
├── apt: curl, procps, python3-pip, nodejs
├── pip: huggingface_hub
├── COPY --from=builder: nats-server, lyzer-core-hub, /app
├── npm install --omit=dev (root workspace)
├── chmod 777, chown ubuntu
├── USER ubuntu
├── EXPOSE 7860
│
CMD: python3 backup_restore.py restore; nats-server -js & lyzer-core-hub & node backend/server.js
```

## 2. Services Built vs Started

| Serviço | Construído? | Iniciado? | Porta |
|---------|:-----------:|:---------:|:-----:|
| **nats-server** | ✅ Baixado (v2.10.11) | ✅ `nats-server -js &` | 4222 (não exposta) |
| **lyzer-core-hub** (Rust) | ✅ `cargo build --release` | ✅ `lyzer-core-hub &` | gRPC (não exposta) |
| **Node.js backend** (Express 5) | ✅ npm installed | ✅ `node backend/server.js` | 7860 ✅ EXPOSED |
| **risk-gateway** (Rust) | ❌ NÃO construído | ❌ NÃO iniciado | 50051 |
| **intent-registry** (Rust) | ❌ NÃO construído | ❌ NÃO iniciado | 50052 |
| **oms** / shadow-oms (Rust) | ❌ NÃO construído | ❌ NÃO iniciado | 50053 |
| **lyzer-eca** (Rust, src-rust/) | ❌ NÃO construído | ❌ NÃO iniciado | — |
| **lyzer-oal**, **lyzer-ocr**, **lyzer-shm-spine** | ❌ NÃO construídos | ❌ NÃO iniciados | — |
| **frontend Vite** (SPA) | ✅ `npm run build` | Servido pelo backend | 7860 (mesma) |

## 3. Dependency Dead Weight

| Pacote | Onde | Usado no Docker? |
|--------|------|:----------------:|
| `isomorphic-git` | root `package.json` | ❌ Não — apenas para scripts locais |
| `ts-node`, `tsx`, `typescript` | lyzer edge devDeps | ❌ Excluídos via `--omit=dev` (✅ correto) |
| `eslint`, `prettier`, `vitest`, etc. | lyzer edge devDeps | ❌ Excluídos via `--omit=dev` (✅ correto) |
| `dotenv` | lyzer edge prodDep | ✅ Usado pelo backend |
| `@lyzer/shared` | workspace pkg (no deps) | ✅ Importado via path relativo |
| `@lyzer/constitution` | workspace pkg (no deps) | ✅ Importado via path relativo |
| `@huggingface/hub` | root `package.json` | ✅ Usado por `backup_restore.py` |
| `prom-client` | lyzer edge prodDep | ✅ Usado pelo backend (métricas) |
| `sqlite3` | lyzer edge prodDep | ✅ Usado pelo backend |

**Nenhum dead weight significativo** — a instalação com `--omit=dev` elimina todos os devDependencies corretamente.

## 4. Missing Pieces

### 🔴 Críticos

1. **3 Rust edge services não são construídos nem iniciados**
   - `lyzer-edge/src-rust/lyzer-risk-gateway` — NÃO incluso no Docker
   - `lyzer-edge/src-rust/lyzer-intent-registry` — NÃO incluso no Docker
   - `lyzer-edge/src-rust/lyzer-oms` — NÃO incluso no Docker
   - O Dockerfile só constrói `lyzer-core-hub`. O workspace `lyzer edge/src-rust/Cargo.toml` (que contém risk-gateway, intent-registry, oms) é ignorado.
   - Impacto: certification tests e fluxos gRPC (RiskGateway.Authorize, IntentRegistry.*) quebram em produção.

2. **Nenhuma porta é exposta além da 7860**
   - NATS (4222), gRPC services (50051-50053) não expostos — serviços não podem ser acessados externamente. Pode ser intencional (3-process isolation), mas se o backend precisa chamá-los via localhost em container único, funciona. Se precisam ser acessados de fora, falha.

### 🟡 Médios

3. **`nats-server -js &`** — iniciado em background. Se crashar, ninguém reinicia. Sem healthcheck.
4. **`lyzer-core-hub &`** — idem, background sem supervisão.
5. **Sem `.dockerignore`** — o `COPY . .` no builder copia tudo, incluindo `node_modules/` locais, `.git/`, `src-rust/` (Rust não usado), `lyzer-workspace/target/` (se houver builds locais). Incha o contexto de build.
6. **`lyzer-core-hub` depende de 4 crates workspace** (`lyzer-core-models`, `lyzer-core-arbitration`, `lyzer-core-memory`, `lyzer-core-governance`). Elas são compiladas como dependências de path — funciona, mas o Dockerfile não copia `Cargo.lock` do workspace. Cargo pode resolver versões diferentes entre builds.

### 🟢 Leves

7. **`prom-client`** é dependência de produção mas metrics endpoint pode não ser chamado em Spaces. Overhead mínimo.
8. **Root `package.json` tem `isomorphic-git`** — nunca referenciado no backend, apenas usado em scripts locais offline.

## 5. Deployment Readiness Score

**Rating: 6/10**

| Critério | Nota | Justificativa |
|----------|:----:|---------------|
| Build completo | 6/10 | O Dockerfile BUILD, mas não constrói 3 serviços Rust necessários |
| Runtime estável | 7/10 | Single point of failure para nats-server e lyzer-core-hub (background) |
| Dependências corretas | 9/10 | `--omit=dev` funciona. Workspaces resolvem. |
| Portas | 5/10 | Só 7860 exposta. NATS + gRPC não expostos |
| Resiliência | 4/10 | Sem healthcheck, sem restart, sem supervisão de processos |
| Documentação | 7/10 | Dockerfile simples e legível, mas inconsistente com AGENTS.md |

**O container sobe e o frontend + backend funcionam.** Tudo que depende de NATS + gRPC (risk-gateway, intent-registry, certification tests) FALHA.

## 6. Questions for HF Spaces

### Funcionaria no Hugging Face Spaces (Docker SDK)?

**Sim, com ressalvas:**

| Aspecto | Veredito |
|---------|:--------:|
| `sdk: docker` | ✅ Configurado corretamente no deploy script |
| Porta 7860 | ✅ É a porta padrão do Spaces. EXPOSE 7860 funciona |
| Imagem base `ubuntu:24.04` | ✅ Suportada |
| Múltiplos serviços no CMD | ⚠️ Spaces esperam um processo frontal. O shell com `&` funciona, mas HF Spaces podem matar processos background se detectarem idle |
| `python3 backup_restore.py restore` | ✅ Funciona via HF_TOKEN + HF_BUCKET_NAME env vars |
| Permissões (USER ubuntu, UID 1000) | ✅ Compatível com o runtime do Spaces |
| Tamanho da imagem | ⚠️ Stage 1 (rust:1.78-bookworm) é pesada (~1.5GB). Stage 2 final é razoável. Pode bater limite de build timeout no HF free tier |
| **3 serviços Rust ausentes** | 🔴 Risk-gateway, intent-registry, OMS não rodam. Funcionalidade gRPC quebrada |

### Ações recomendadas para HF Spaces

1. Adicionar build dos 3 serviços Rust no Stage 1:
   ```
   RUN cargo build --release --manifest-path "lyzer edge/src-rust/Cargo.toml"
   ```
2. Copiar binários no Stage 2 e iniciá-los no CMD
3. Adicionar `.dockerignore` com: `node_modules`, `.git`, `target/`, `*.ps1`, `.env*`
4. Considerar `supervisord` ou `s6-overlay` para gerenciar múltiplos processos com healthcheck
5. Expor porta NATS (4222) e gRPC (50051-50053) se acesso externo for necessário
6. Adicionar `set -e` no CMD shell para falhar rápido se backup_restore.py falhar
