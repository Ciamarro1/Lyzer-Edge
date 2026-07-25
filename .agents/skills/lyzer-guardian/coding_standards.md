# Padrões de Código e Convenções — Lyzer Guardian

## 1. Convenções Node.js / JavaScript (ESM)
- O monorepo utiliza ESM puro (`"type": "module"`).
- **Importações Locais**: Sempre utilize a extensão `.js` completa nas instruções `import` do backend (ex: `import { StreamEngine } from './streamEngine.js';`).
- **Alias Vite**: No frontend SPA, `@` mapeia para `lyzer edge/src/`.

## 2. Convenções Rust (Workspaces)
- Mantenha conformidade com Rust 2024 Edition.
- No Windows, a compilação depende do target MinGW-w64 (`x86_64-pc-windows-gnu`).
- Certifique-se de carregar as definições Protobuf via `tonic-build` / `prost` a partir de `src-proto/lyzer.proto`.

## 3. Contratos Protobuf & NATS
- Todos os IDs de intenção e causação devem obrigatoriamente utilizar UUIDv7.
- Qualquer alteração nos esquemas de evento do NATS deve respeitar a proteção de versão (`event_schema_version`).
