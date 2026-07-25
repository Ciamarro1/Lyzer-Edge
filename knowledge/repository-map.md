---
titulo: "Lyzer Edge — Mapa do Repositório"
versao: "3.4.0-institutional"
---

# 📂 Lyzer Edge — Mapa do Repositório

```text
lyzer edge/
├── backend/
│   ├── server.js              # Servidor HTTP/WS Express
│   ├── streamEngine.js        # Engine principal (483 LoC)
│   ├── liveDataIngestor.js    # Ingestão Binance WS/REST
│   └── db.js                  # Conexão SQLite Causal Memory
├── src/
│   ├── main.js                # Entrypoint SPA
│   ├── app.js                 # Router App Shell (24 rotas)
│   ├── router.js              # Router SPA hash-based
│   └── components/
│       ├── LiveTradingView.js # Chart TradingView Native & Binance
│       └── commandCenter/     # 11 componentes do Command Center V2
├── src-rust/
│   ├── lyzer-risk-gateway/    # Servidor gRPC RiskGateway
│   ├── lyzer-intent-registry/ # Registro de intenções gRPC + NATS
│   └── lyzer-oms/             # OMS em Rust
└── tests/                     # Testes Unitários e E2E Vitest
```

---

## 🔗 Links Relacionados
- 📁 [Mapa do Projeto](project-map.md)
- 🧩 [Módulos](modules.md)
