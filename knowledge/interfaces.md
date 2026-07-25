---
titulo: "Lyzer Edge — Interfaces & Contratos"
versao: "3.4.0-institutional"
---

# 📐 Lyzer Edge — Interfaces & Contratos

## Contrato Protobuf (`lyzer.proto`)

```protobuf
syntax = "proto3";
package lyzer;

service RiskGateway {
  rpc Authorize (AuthorizationRequest) returns (AuthorizationResponse);
}

service IntentRegistry {
  rpc RegisterIntent (IntentPayload) returns (IntentAck);
  rpc AppendIntentEvent (IntentEventPayload) returns (IntentAck);
  rpc AuditQuery (AuditFilter) returns (AuditStream);
}
```

---

## 🔗 Links Relacionados
- 🔌 [APIs](api.md)
- 🔌 [Serviços](services.md)
