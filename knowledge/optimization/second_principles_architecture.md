# Second Principles Architecture

**Data:** Julho 2026
**Missão:** L5 Institutional Alpha Operations
**Investigador:** Lyzer Orchestrator (Principal Architect Mode)

A pergunta da Fase L5: *"Se tivéssemos que reconstruir o Lyzer Edge do zero hoje, quais componentes manteríamos?"*

A base do pensamento de *Second Principles* (após *First Principles*) é a Navalha de Ockham: Se duas camadas explicam o mesmo fenômeno causal, a mais simples (com menos parâmetros não testáveis) prevalece.

## Classificação Final dos Componentes Atuais

### 🟩 KEEP (Essencial. Tocar apenas com Governo L5)
- `packages/lyzer-shared/src/providers/v4_imce.js`: É o coração causal do alfa. Onde a intenção institucional é separada do ruído.
- `packages/lyzer-shared/src/smc/`: SMC, Structure, Liquidity, Narrative Engines. É a lente estrutural onde o V4 opera. Sem isso, o V4 não sabe **onde** olhar.
- `packages/lyzer-constitution/src/eca/court.js`: O Guardião final. CCLIST, MOL e EEF são o que salvam o Lyzer em mercados tóxicos e cisnes negros.

### 🟨 MERGE (Redundante. Fundir para reduzir latência)
- `TruthKernel (kernel.js)` e `ConstitutionalCourt`: Hoje, o TruthKernel processa e o ECA Court julga. O `AlphaGovernanceEngine` deve unificar isso. A separação só existia pela divisão de pacotes Monorepo originais. Fundi-los num binário Rust (futuro) ou pacote C++ Node Addon reduzirá 3ms de processamento.

### 🟥 REMOVE (Lixo Empírico. Destrói Sharpe)
- `packages/lyzer-shared/src/providers/v1_smc_ict.js`
- `packages/lyzer-shared/src/providers/v2_snd_snr.js`
- `packages/lyzer-shared/src/providers/v3_momentum.js`
**Motivo:** Já estavam desativados (`DISABLED_PROVIDERS`), mas agora serão completamente excluídos do build. Sinais baseados puramente em momentum e geometria S/R clássica sofrem de latência extrema e causam *whipsaws* constantes. Apenas a Reconstrução de Liquidez Dinâmica (SMC nativo) se provou lucrativa no Monte Carlo.

### 🟦 REWRITE (Débito Técnico Aceitável. Refatorar em Rust futuramente)
- `lyzer edge/backend/streamEngine.js`: Está inchado (600+ linhas) operando como *God Object*. Ingestão de dados, lógica de *Shadow Trading*, UI de log e Orquestração de API deveriam estar em micro-serviços isolados consumindo NATS.

## O Que Resta?
Ao finalizar a L5, a árvore quantitativa está tão limpa quanto a de um fundo HFT institucional: Ingestor Rápido -> Classificador Causal de 2 camadas -> Circuit Breaker de 10 níveis -> Exchange. Nada a mais.
