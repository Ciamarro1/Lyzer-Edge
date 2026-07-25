---
titulo: "Lyzer Edge — Overview do Sistema"
versao: "3.4.0-institutional"
data: "2026-07-25"
autor: "Lyzer Guardian & Lyzer Orchestrator"
nivel_confianca: "Alto (Baseado em Evidências)"
---

# 🌐 Lyzer Edge — Overview do Sistema

O **Lyzer Edge** é uma plataforma quantitativa de inteligência de mercado, execução algorítmica e governança constitucional adaptativa de classe institucional. O sistema opera sob um modelo de **3 processos isolados** e um pipeline de execução quantitativa em **7 camadas**, projetado com o princípio fundamental da **anti-fragilidade**.

---

## 🎯 Objetivos do Sistema

1. **Destruição da Falsa Estabilidade**: Nullificação de consenso falso entre provedores através do *Streaming Consensus Residualization* (SCD) e extração de *Divergence Vector Field* (DVF).
2. **Soberania Epistêmica**: Avaliação contínua da realidade via *Dual Reality Monitoring* e *Local Topological Divergence Score* (LHDS).
3. **Governança Constitucional**: Filtragem de ordens por regras invioláveis no *ECA Court* (C-CLIST e MOL) e validação final via *RiskGateway* gRPC.
4. **Execução de Baixa Latência**: Processamento determinístico com isolamento entre ingestão de mercado, decisão algorítmica e observabilidade.

---

## 🏛️ Topologia em 3 Processos Isolados

```mermaid
graph TD
    subgraph Processo 1 [Node.js API & Execution Engine]
        API[Express 5 Server :7860]
        WS[Binance Live Stream]
        SE[StreamEngine x6 Assets]
        API --> SE
        WS --> SE
    end

    subgraph Processo 2 [ECA Sovereign Court Node]
        CC[Constitutional Court]
        CCL[C-CLIST Stress Oracle]
        MOL[Minimum Operation Level]
        CC --- CCL
        CC --- MOL
    end

    subgraph Processo 3 [gRPC RiskGateway & OMS]
        RG[RiskGateway Server :50051]
        IR[IntentRegistry :50052]
        OMS[Rust Shadow OMS]
        NATS[NATS Event Bus :4222]
        RG --- IR
        IR --- NATS
        OMS --- NATS
    end

    SE -- gRPC / IPC --> CC
    CC -- Authorize --> RG
```

---

## 🔗 Links Relacionados
- 🏗️ [Arquitetura](architecture.md)
- 🗺️ [Mapa do Projeto](project-map.md)
- ⚡ [Fluxo de Execução](execution-flow.md)
- 📊 [Snapshot](snapshot.md)
