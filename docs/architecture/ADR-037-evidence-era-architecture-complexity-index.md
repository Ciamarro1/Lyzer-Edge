# ADR-037: The Evidence Era & Architecture Complexity Index (ACI)

- **Status**: ACCEPTED (EMPIRICAL ERA & ARCHITECTURAL METRICS)
- **Date**: 2026-07-23
- **Author**: Guardião da Arquitetura, Matemático da Computação, Principal Systems Architect

---

## 1. O Triplo Nível da Arquitetura

Para impedir a rigidez estática e ao mesmo tempo proteger o núcleo do sistema, a evolução do Lyzer Edge passa a ser governada pela distinção em **três camadas de mutabilidade**:

| Camada | Mutabilidade | Frequência de Alteração | Critério de Mudança |
|--------|--------------|-------------------------|---------------------|
| **Fundamentos (ADR-033 a 036)** | Quase Imutável | Excepcional | Evidência empírica incontestável de falha matemática |
| **Arquitetura (Configuração/Políticas)** | Flexível | Conforme evolução do mercado | Parametrização via $UCC \langle \mathcal{S}, \mathcal{T}, \mathcal{M}, \mathcal{O} \rangle$ |
| **Implementação (Conectores/Cálculo)** | Contínua | Diária / Por Release | Otimização de performance, latência e correções |

---

## 2. Inauguração da "Evidence Era" (A Era da Evidência)

Com a arquitetura conceitual consolidada, a pergunta soberana do projeto deixa de ser *"Como o sistema deve ser construído?"* e passa a ser:

> **"O que o sistema realmente faz quando roda sob estresse, estagnação e falha real?"**

A **Evidence Era** direciona todos os testes para bancadas empíricas institucionais:
1. **Benchmark de Performance**: Latência end-to-end (ms), Throughput (ticks/s), Consumo de Heap/RAM e CPU.
2. **Resiliência Financeira**: Sharpe Ratio real, Max Drawdown, Recovery Time e Turnover.
3. **Chaos Engineering & Fault Injection**: Simulação de queda de corretoras, desconnexão de rede, falsos positivos/negativos e latência injetada via `CircuitBreakerEngine`.
4. **Replay Determinístico**: Teste de integridade $100\%$ determinística usando histórico de Event Sourcing.

---

## 3. Formulação do Architecture Complexity Index (ACI)

Para medir quantitativamente a qualidade e a simplicidade da própria arquitetura, institui-se o **Architecture Complexity Index (ACI)**.

### Equação do ACI:

$$ACI = \frac{N_{\text{conceitos}} \cdot N_{\text{módulos}} \cdot \text{Grau de Acoplamento}}{N_{\text{capacidades}} \cdot \text{Throughput (ticks/s)}}$$

### Regra de Governança de Release:
Para qualquer atualização ou release do Lyzer Edge $t+1$:

$$ACI_{t+1} \le ACI_t \quad \text{e} \quad \text{Capacidade}_{t+1} \ge \text{Capacidade}_t$$

Se uma nova versão aumentar a capacidade mas elevar o $ACI$, ela é **REJEITADA** e deve passar por compressão antes de ser integrada à branch principal.

---

## 4. Descoberta por Remoção

A evolução do Lyzer Edge atinge a maturidade pela **pesquisa de remoção**: identificar módulos e engines existentes que podem ser descontinuados e substituídos por configurações parametrizadas do `CognitiveRuntimePlatform`.

---

## 📐 Veredito Constitucional

> **"A maturidade da engenharia se provará na Era da Evidência. O ACI garante que o sistema se tornará cada vez mais simples e rápido à medida que sua capacidade cognitiva se expande."**
