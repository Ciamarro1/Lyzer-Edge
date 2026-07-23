# ADR-011: Modelo de Governança Adaptativa & Propostas de Aprendizado (Fase 6)

- **Status**: Aprovado pelo Architecture Decision Board (Principal Systems Architect, AI Governance Lead, Quant Infrastructure Auditor)
- **Data**: 2026-07-22
- **Autor**: Guardião da Arquitetura (`@[lyzer-guardian]`)

---

## 🏛️ 1. Contexto & Princípio de Governança

No **Lyzer Edge**, o aprendizado automatizado **não possui autoridade de execução direta**. Em sistemas de alta criticidade e finanças quantitativas, permitir que agentes de inteligência alterem parâmetros de risco autonomamente é a principal causa de falhas catastróficas e colapso operacional.

O **ADR-011** institui a regra inviolável:

$$\text{Proposta de Aprendizado } (\text{ParameterProposal}) \neq \text{Alteração no Runtime}$$

Toda proposta gerada pelo motor de aprendizado deve ser submetida a um pipeline rigoroso de validação constitucional e auditoria cognitiva antes de ser aplicada ao sistema.

---

## 🔄 2. O Pipeline de Governança Adaptativa

```
                     causal_events_log
                            │
                            ▼
                  [ MemoryMiningEngine ]
                            │  (Extrai padrões e hipóteses)
                            ▼
                [ ParameterProposal (Draft) ]
                            │
                            ▼
                  [ CognitiveAuditor ]
                            │  (Valida viés, amostra e melhora estocástica)
                            ▼
                [ ECA Constitutional Court ]
                            │
               ┌────────────┴────────────┐
               ▼                         ▼
      [ Proposal Accepted ]     [ Proposal Rejected ]
               │                         │
               ▼                         ▼
      [ Parameter Versioning ]    [ Log Rejection Reason ]
               │
               ▼
      [ Active Runtime Update ]
```

---

## 📋 3. Estrutura Contratual de uma Proposta (`ParameterProposal`)

Toda sugestão de aprendizado adaptativo é representada pelo seguinte schema contratual imutável:

```json
{
  "proposal_id": "prop_019f8ca7_88ab",
  "timestamp": 1704192000000,
  "source_engine": "MemoryMiningEngine",
  "target_parameter": "TRG_THRESHOLD",
  "current_value": 0.40,
  "proposed_value": 0.45,
  "evidence_count": 642,
  "expected_pnl_improvement": "+14.2%",
  "expected_drawdown_reduction": "-8.5%",
  "constitutional_status": "PENDING_AUDIT"
}
```

---

## 🛡️ 4. O papel do `CognitiveAuditor` & Regras de Rejeição

O módulo `CognitiveAuditor` executa 5 verificações obrigatórias em cada proposta:

1. **Amostragem Mínima**: `evidence_count >= 500`. Se menor, **REJEITADO (INSUFFICIENT_SAMPLE)**.
2. **Estabilidade de Regime**: O padrão foi verificado em mais de um regime de mercado. Se isolado em apenas um regime atípico, **REJEITADO (REGIME_OVERFITTING)**.
3. **Melhoria Significativa**: A melhoria esperada no PnL ou redução de drawdown deve ser maior que $+5\%$. Se inferior, **REJEITADO (NEGLIGIBLE_IMPROVEMENT)**.
4. **Verificação Constitucional**: A alteração viola qualquer axioma inviolável do ADR-010? Se sim, **REJEITADO (CONSTITUTIONAL_VIOLATION)**.
5. **Teste de Degradamento Temporale**: O padrão se mantém estável nas janelas mais recentes de 30 dias? Se houver degradação, **REJEITADO (TEMPORAL_DECAY)**.

---

## 🏷️ 5. Versionamento de Parâmetros Operacionais

Todas as alterações aprovadas são gravadas na tabela `semantic_memory` com seu número de versão semântico imutável (`v1.0.0`, `v1.1.0`, etc.), garantindo que o `RewindEngine` consiga reconstruir não apenas o estado dos fatos, mas também **a versão exata dos parâmetros ativos** em qualquer timestamp $T_0$.
