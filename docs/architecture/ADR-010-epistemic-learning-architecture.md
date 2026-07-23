# ADR-010: Arquitetura de Aprendizado Epistêmico (Fase 6)

- **Status**: Aprovado pelo Architecture Decision Board (Principal Systems Architect, AI Systems Architect, Quant Epistemologist)
- **Data**: 2026-07-22
- **Autor**: Guardião da Arquitetura (`@[lyzer-guardian]`)

---

## 🏛️ 1. Contexto & Necessidade de Governança do Aprendizado

Nas Fases 5.3 a 5.6.1, o **Lyzer Edge** construiu uma memória causal completa (CCS = 100.0%). O sistema lembra de cada observação, tensores normalizados, estruturas SMC, acórdão constitucional, autorização de risco, execução e feedback pós-fill (`LEARNING_FEEDBACK`).

A **Fase 6** aborda a transição de um sistema *reflexivo/executivo* para um **organismo cognitivo adaptativo**.

Contudo, um sistema adaptativo desprovido de governança corre o risco catastrófico de "aprender errado" (superajuste a ruído, overfitting temporal ou contaminação por viés estatístico). O **ADR-010** estabelece o contrato inviolável de aprendizado epistêmico.

> *"Antes o risco era não lembrar. Agora o risco é aprender errado."*

---

## 🛡️ 2. Axiomas do Aprendizado & Limites Invioláveis

### O Que Pode Ser Adaptado (Mutável):
1. **Limiares de Invariantes Adaptativos**: Ajuste de tolerância de regimes baseados em volatilidade observada ($SDS$ e $TRG$).
2. **Pesos Preditivos de Hipóteses**: Calibragem da confiança atribuída a cenários do CSRL e padrões SMC.
3. **Parâmetros de Transição MOL**: Ajuste das contagens de resfriamento $SCL$ e $DOI$ em regimes de transição pós-estresse.

### O Que NUNCA Pode Ser Alterado (Inviolável / Imutável):
1. **Os 7 Camadas do Pipeline Quantitativo**: Nenhuma adaptação pode pular ou desativar o CSRL, o TruthKernel, o C-CLIST ou a Corte Constitucional ECA.
2. **Veto Constitucional Absoluto**: Se o LHDS exceder o limite de colapso ontológico ($LHDS > 0.90$), o veto é absoluto e inegociável.
3. **Soberania do RiskGateway**: Limites máximos de capital diário (`MAX_DAILY_CAPITAL`) são fixados por governança externa e não podem ser alterados pelo motor de aprendizado.
4. **Assinatura SHA-256 e Imutabilidade da Memória Causal**: A memória de fatos passados jamais pode ser reescrita ou modificada pelo processo de aprendizado.

---

## 🔬 3. O Ciclo Cognitivo de Aprendizado em 4 Etapas

```
1. PERCEBER  ──────►  Captura de observações e tensores (REALITY_SNAPSHOT)
       │
2. JULGAR    ──────►  Validação pela Corte Constitucional (CONSTITUTIONAL_JUDGMENT)
       │
3. EXECUTAR  ──────►  Preenchimento de ordens (EXECUTION_RESULT)
       │
4. EVOLUIR   ──────►  Avaliação de hipótese + Proposta de Adaptação (ADR-011)
```

---

## 📐 4. Consequências & Decisões Arquiteturais

1. **Separação Rígida entre Fato e Proposta**: Eventos de aprendizado geram apenas propostas formais de alteração (`ParameterProposal`), que devem passar pela aprovação da Corte Constitucional ECA.
2. **Resistência a Ruído (Sample Threshold)**: Nenhuma proposta de alteração de parâmetro será avaliada com menos de **500 observações causais confirmadas**.
3. **Auditabilidade de Aprendizado**: Toda alteração de parâmetro aprovada gerará uma nova versão rastreável (`v1.0.0` $\rightarrow$ `v1.1.0`) na tabela `semantic_memory`.
