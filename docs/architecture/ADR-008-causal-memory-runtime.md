# ADR-008: Arquitetura do Runtime de Memória Causal e Soberania Causal (Fase 5.4)

- **Status**: Aprovado pelo Architecture Decision Board (Principal Backend Architect, Event Sourcing Specialist, Database Engineer, Cognitive Kernel Lead)
- **Data**: 2026-07-22
- **Autor**: Guardião da Arquitetura (`@[lyzer-guardian]`)

---

## 🏛️ 1. Contexto e axioma de "Causal Sovereignty"

Com a aprovação dos ADRs 006 e 007, o contrato de evento e o modelo de dados imutável do **Lyzer Edge** foram consolidados.

A **Fase 5.4** estabelece a infraestrutura executável responsável por operacionalizar essa memória em tempo de execução: o **Causal Memory Runtime Layer**.

Nesta fase, declaramos a lei constitucional suprema da plataforma:

> **Axioma da Soberania Causal (Causal Sovereignty Axiom):**  
> *Nenhuma ação, decisão ou ordem do sistema pode existir sem uma cadeia causal completa, imutável e auditável que explique a sua origem.*

---

## 🏗️ 2. Arquitetura dos 5 Componentes do Runtime

```
   ┌────────────────┐
   │  EventFactory  │ ──(Gera Evento + UUIDv7 + SHA256)──┐
   └────────────────┘                                    │
                                                         ▼
   ┌────────────────┐                          ┌──────────────────┐
   │ EventValidator │ ◄──(Valida Hash Chain)───│    EventStore    │
   └────────────────┘                          │ (SQLite WAL Log) │
                                               └──────────────────┘
                                                         │
                        ┌────────────────────────────────┴───────────────────────────────┐
                        ▼                                                                ▼
              ┌──────────────────┐                                             ┌──────────────────┐
              │ ProjectionEngine │                                             │   RewindEngine   │
              │(Views & State)   │                                             │ (State Replay)   │
              └──────────────────┘                                             └──────────────────┘
```

1. **`EventFactory`**: Instancia eventos em conformidade estrita com o ADR-007, atribuindo `event_id` (UUIDv7), timestamp em nanossegundos, metadata e calculando o digest SHA-256 encadeado (`hash`).
2. **`EventValidator`**: Intercepta todo evento antes de sua gravação ou consumo. Valida o schema, checa a integridade do `hash_prev` contra o evento anterior e aborta transações se detectar órfãos ou corrupção.
3. **`EventStore`**: Gerencia a persistência append-only no arquivo SQLite WAL, provendo APIs assíncronas para inserção em lote, consulta temporal e recuperação.
4. **`ProjectionEngine`**: Consome o stream de eventos em tempo de execução para manter atualizadas as visões materializadas e snapshots de estado (`Operational Memory`).
5. **`RewindEngine`**: Fornece o motor de "viagem no tempo" epistemológica, capaz de reconstruir a realidade percebida completa em qualquer timestamp $T_0$.

---

## 🔄 3. Fluxo Determinístico Causal de Decisão

```
[1. MARKET_OBSERVATION] ──► [2. REALITY_RECONSTRUCTED] ──► [3. FEATURE_GENERATED]
                                                                  │
                                                                  ▼
[6. RISK_ASSESSED] ◄────── [5. CONSTITUTIONAL_JUDGMENT] ◄── [4. REGIME_INFERRED]
       │
       ▼
[7. TRADE_INTENT_CREATED] ──► [8. EXECUTION_RESULT] ──► [9. LEARNING_FEEDBACK]
```

### Detalhamento dos Passos:
1. **`MARKET_OBSERVATION_RECEIVED`**: Ingestão de Klines pelo `StreamEngine`.
2. **`REALITY_RECONSTRUCTED`**: Alinhamento tensorial e cálculo de invariantes pelo CSRL.
3. **`FEATURE_GENERATED`**: Extração de OrderBlocks e liquidez pelo `SmcEngineFacade`.
4. **`REGIME_INFERRED`**: Classificação de regime de estresse pelo `TruthKernel`.
5. **`CONSTITUTIONAL_JUDGMENT`**: Avaliação de restrições e emissão de acórdão com evidências pela `ECA Court`.
6. **`RISK_ASSESSED`**: Validação de exposição de capital pelo `RiskGateway` em Rust.
7. **`TRADE_INTENT_CREATED`**: Registro da intenção formal com UUIDv7.
8. **`EXECUTION_RESULT`**: Confirmação da ordem executada ou simulada.
9. **`LEARNING_FEEDBACK`**: Atualização do modelo de memória semântica pós-execução.

---

## 🔒 4. Invariantes Impossíveis de Violar (Runtime Invariants)

O runtime rejeita sumariamente qualquer evento que viole as seguintes leis:

- **Invariante I1 (Risco Obrigatório)**: Um evento `EXECUTION_RESULT` sem um `RISK_ASSESSED` e `TRADE_INTENT_CREATED` precedente na mesma cadeia de correlação é considerado **INVÁLIDO** e descartado.
- **Invariante I2 (Evidência Constitucional)**: Um `CONSTITUTIONAL_JUDGMENT` sem o payload `evidence` preenchido (escores LHDS/C-CLIST) é considerado **NULO**.
- **Invariante I3 (Linhagem de Aprendizado)**: Um evento `LEARNING_FEEDBACK` sem histórico causal rastreável de pelo menos 5 etapas anteriores é **REJEITADO**.
- **Invariante I4 (Integridade Encadeada)**: Qualquer evento cujo `hash_prev` divirja do `hash` do evento imediatamente anterior interrompe a ingestão e dispara um **Alerta Vermelho SRE**.

---

## 🏛️ 5. Escolha da Arquitetura de Persistência

Aprovada a **Opção C**:

> **SQLite Event Store + Snapshots Periódicos + Materialized Views**

Esta opção combina a gravação sequencial de alta performance em lote no arquivo WAL com snapshots de estado a cada 1.000 eventos, permitindo reconstrução em tempo sub-milisegundo sem precisar reprocessar todo o histórico desde o gênese.
