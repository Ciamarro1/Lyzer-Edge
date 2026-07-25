---
type: architecture_decision_record
title: ADR - Observation Candidate Registry (OCR)
created: 2026-06-24
status: proposed
---

# LYZER LABS — OBSERVATION CANDIDATE REGISTRY (OCR)

**Release:** 1.8.7-C
**Autoria:** CTO Office (sob emenda constitucional da CIA)
**Objetivo:** Impedir o *Microstructure Fundamentalism* registrando hipóteses observacionais e exigindo validação empírica rigorosa antes que sejam promovidas ao status de Evidência no sistema.

---

## 1. O Problema da Captura Observacional
A auditoria arquitetural revelou que, sem um filtro estrito entre "Observação" e "Evidência", qualquer sensor recém-descoberto (ex: Liquidity Vacuum) poderia ser imediatamente dogmatizado como a "verdade final", gerando a *Sensor Replacement Fallacy*. O OCR resolve isso exigindo que todo novo sinal passe por uma quarentena probatória de falsificação.

## 2. A Nova Cadeia Ontológica
O OCR atua como uma barreira epistemológica intransponível entre o mundo cru e as certezas do sistema:
`Reality → Observation → **[ OCR ]** → Evidence → Belief → Decision`

## 3. Funcionamento do Registro
Para um Candidato Observacional ser elevado a Evidência, ele deve ser formalmente registrado no OCR com:
1. **Mecanismo de Falsificação:** Como podemos provar que este candidato empírico *não* possui relação causal com a transição de regime?
2. **Definição de Event-Time:** Especificação explícita de como o evento será monitorado sem o viés compressivo do relógio humano.
3. **Métrica de Distinguibilidade (D):** Teste de como a inclusão desse sensor amplia ou mantém a "distância aos estados absorventes" do Lyzer.

## 4. Candidatos Iniciais (Genesis Candidates)
Os seguintes fenômenos, historicamente propostos mas nunca comprovados como absolutos, estão oficialmente isolados no OCR e aguardam validação:
- `CANDIDATE-001`: **Liquidity Vacuum** (Hipótese: O esgotamento não-reposto de liquidez direcional antecede as transições de fase de mercado).
- `CANDIDATE-002`: **Tick Kurtosis** (Hipótese: Aglomerações anômalas de agressão a mercado em caudas grossas são as verdadeiras portadoras da assimetria causal).
- `CANDIDATE-003`: **Book Fracture** (Hipótese: A quebra topológica de continuidade do *spread* sob estresse reflete uma fragilidade estrutural no regime).

## 5. Bloqueio de Engenharia do MIC
O *Truth Kernel* e a Camada de Governança estão restritos a consumir exclusivamente `Evidence` formalmente promovida pelo OCR. A engenharia do futuro MIC consistirá unicamente em conectar os *feeds* aos `Observational Candidates` rodando em formato "Shadow Mode" para submetê-los aos testes empíricos do laboratório, sem permitir que atuem na tomada de decisão até sua comprovação.
