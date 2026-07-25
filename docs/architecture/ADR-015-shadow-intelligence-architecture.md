# ADR-015: Arquitetura de Inteligência Shadow & Score Adaptativo (Fase 7.0)

- **Status**: Aprovado pelo Architecture Decision Board (Principal Systems Architect, Shadow Engine Lead, Quant Auditor)
- **Data**: 2026-07-22
- **Autor**: Guardião da Arquitetura (`@[lyzer-guardian]`)

---

## 🏛️ 1. Contexto & O Conceito de Execução Shadow

O **ADR-015** define o mecanismo de **Execução Shadow (Fase 7.0)**. O motor `AdaptiveShadowEngine` roda em paralelo com a produção real:

```
                          MARKET TICK
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
      PRODUCTION ENGINE                     SHADOW ENGINE
   (Decisão Ativa v1.0.0)             (Decisão Adaptada Prop)
            │                                     │
            ▼                                     ▼
    Trade Realizado                      Simulação Não-Destrutiva
            │                                     │
            └──────────────────┬──────────────────┘
                               ▼
                    [ SHADOW_COMPARISON_EVENT ]
                               │
                               ▼
               [ Adaptive Confidence Score (ACS) ]
```

---

## 📊 2. A Métrica Institucional: Adaptive Confidence Score (ACS)

Toda proposta avaliada no motor Shadow recebe um score quantitativo $ACS \in [0, 100\%]$ calculado pela seguinte média ponderada imutável:

$$\text{ACS} = (0.30 \times \text{Estabilidade Histórica}) + (0.25 \times \text{Ganho Risco/Retorno}) + (0.20 \times \text{Consistência Multi-Regime}) + (0.15 \times \text{Ausência de Conflitos}) + (0.10 \times \text{Recência})$$

### Regra Operacional do Score ACS:
- **$\text{ACS} < 80\%$**: Proposta REJEITADA automaticamente (`REJECTED_LOW_ACS`).
- **$80\% \le \text{ACS} \le 95\%$**: Proposta mantida em OBSERVAÇÃO SHADOW (`OBSERVING_SHADOW`).
- **$\text{ACS} > 95\%$**: Proposta SUBMETIDA À CORTE ECA para aprovação final (`SUBMITTED_TO_ECA`).

---

## 📝 3. O Evento Causal `SHADOW_COMPARISON_EVENT`

Todas as comparações entre a decisão real de produção e a decisão simulada em Shadow geram um evento causal auditável com o schema:

```json
{
  "event_type": "SHADOW_COMPARISON_EVENT",
  "source": "ADAPTIVE_SHADOW_ENGINE",
  "payload": {
    "proposal_id": "prop_019f8cb9_77ef",
    "production_decision": "ALLOW",
    "shadow_decision": "REJECT",
    "production_pnl": -1.2,
    "shadow_simulated_pnl": 0.0,
    "pnl_delta": +1.2,
    "acs_score": 96.4
  }
}
```
