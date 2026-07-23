# ADR-014: Governança de Parâmetros Adaptativos (Fase 7.0)

- **Status**: Aprovado pelo Architecture Decision Board (Principal Systems Architect, Quant Governance Lead, Risk Auditor)
- **Data**: 2026-07-22
- **Autor**: Guardião da Arquitetura (`@[lyzer-guardian]`)

---

## 🏛️ 1. Contexto & Risco de Mudança sem Governança

Com a conclusão da Fase 6.6 (Metacognição), o **Lyzer Edge** adquiriu capacidade de autoquestionamento, arbitragem de contradições e decaimento exponencial de confiança.

Contudo, permitir que o motor de aprendizado aplique modificações de parâmetros diretamente no pipeline de execução real sem uma etapa de testes em ambiente isolado (Sandbox) é uma violação gravíssima de segurança e estabilidade quantitativa.

O **ADR-014** institui a arquitetura de **Governança de Parâmetros Adaptativos (Fase 7.0)**.

> *"Nenhuma proposta de alteração de parâmetro toca o motor de produção sem provar sua superioridade estatística e segurança em ambiente Sandbox."*

---

## 🛡️ 2. O Objeto Formal: `ParameterProposal`

Toda sugestão de alteração de parâmetros é representada pelo schema contratual imutável `ParameterProposal`:

```json
{
  "proposal_id": "prop_019f8cb9_77ef",
  "target": {
    "module": "CSRL",
    "parameter": "LHDS_THRESHOLD"
  },
  "current_value": 0.90,
  "proposed_value": 0.85,
  "reason": {
    "hypothesis": "false_breakout_prevention",
    "confidence": 0.91
  },
  "evidence": {
    "sample_size": 2400,
    "regimes": ["REGIME_B_INFERRED", "REGIME_C_VETO"],
    "backtest_gain": 0.087
  },
  "status": "PENDING_SANDBOX"
}
```

---

## ⚖️ 3. Regras de Autoridade & Limites de Variação

1. **Faixa Estrita de Variação (Boundary Clamping)**: Um parâmetro adaptativo não pode variar mais do que **$\pm 15\%$** em relação à sua linha de base histórica em uma única versão.
2. **Ciclo Mínimo de Observação em Sandbox**: Uma proposta deve rodar em modo *Shadow* por no mínimo **1.000 ticks de mercado** antes de ser submetida à aprovação da Corte ECA.
3. **Imutabilidade de Regras de Segurança**: Limites do RiskGateway Rust (`MAX_DAILY_CAPITAL`, alavancagem máxima) e o Veto Constitucional Ontológico são imutáveis e jamais aceitam propostas de relaxamento.
