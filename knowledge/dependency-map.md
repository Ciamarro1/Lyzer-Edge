---
titulo: "Lyzer Edge — Mapa de Dependências"
versao: "3.4.0-institutional"
---

# 🔗 Lyzer Edge — Mapa de Dependências

## 📦 Dependências Principais (Node.js & npm Workspaces)

| Pacote | Versão | Uso | Criticidade | Licença | Risco |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `express` | `^5.2.1` | Server HTTP/WS Backend | Alta | MIT | Baixo |
| `ws` | `^8.21.0` | Ingestão e streaming em tempo real | Crítica | MIT | Baixo |
| `@grpc/grpc-js` | `^1.14.4` | Comunicação gRPC Node -> Rust | Crítica | Apache-2.0 | Baixo |
| `sqlite3` | `^6.0.1` | Persistência Causal WAL | Alta | BSD-3-Clause | Baixo |
| `nats` | `^2.29.3` | Event Bus entre OMS e Registry | Alta | Apache-2.0 | Baixo |
| `lightweight-charts` | `^4.1.1` | Gráficos do TradingView Native | Média | Apache-2.0 | Baixo |
| `vitest` | `^1.6.1` | Runner de testes em jsdom | Média | MIT | Baixo |

## 🦀 Crates Rust (Workspaces Cargo)

| Crate | Uso | Risco |
| :--- | :--- | :--- |
| `tonic` | Servidor/Cliente gRPC de ultra-baixa latência | Baixo |
| `tokio` | Async runtime multithreaded | Baixo |
| `async-nats` | Cliente NATS JetStream em Rust | Baixo |
| `uuid` | Geração e validação de UUIDv7 causais | Baixo |
| `rusqlite` | Conexão SQLite WAL nativa em Rust | Baixo |

---

## 🔗 Links Relacionados
- 🔒 [Segurança](security.md)
- 📊 [Snapshot](snapshot.md)
