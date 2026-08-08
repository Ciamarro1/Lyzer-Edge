---
title: Lyzer Edge
emoji: 📈
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
pinned: false
---

<div align="center">

# 🔬 LYZER EDGE
### *Institutional Quantitative Intelligence & Deterministic Execution Engine*

[![Docker](https://img.shields.io/badge/Docker-Multi--stage-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://github.com/Ciamarro1/Lyzer-Edge)
[![Node.js](https://img.shields.io/badge/Node.js-20.x%20ESM-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Rust](https://img.shields.io/badge/Rust-1.78%2B%202024-000000?style=for-the-badge&logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Express](https://img.shields.io/badge/Express-5.0-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

[Visão Geral](#-visão-executiva) • [Arquitetura](#-arquitetura-do-sistema) • [Primeiros Passos](#-guia-de-primeiros-passos--onboarding) • [Funcionalidades](#-matriz-de-funcionalidades) • [Base de Conhecimento](#-base-de-conhecimento-knowledge) • [Contribuição](#-como-contribuir)

</div>

---

## 📖 Visão Executiva

**Lyzer Edge** não é um robô tradicional de negociação nem uma caixa-preta de aprendizado de máquina preditivo. É uma **plataforma quantitativa institucional e um motor de execução determinística** projetado para operar em ambientes financeiros não-estacionários e adversariais (*Non-Stationary Switching Processes*).

O sistema opera sob o axioma fundamental da engenharia de risco:

$$\text{Sobrevivência (Survival)} > \text{Governança} > \text{Otimização de Curto Prazo}$$

### 🎯 O Problema que Resolvermos
A maioria dos algoritmos de negociação falha em produção porque otimizam estatísticas do passado (*overfitting*) e confiam cegamente em modelos probabilísticos em momentos de choque de volatilidade. O Lyzer Edge introduz um **Oráculo de Estresse Epistêmico ($\text{C-CLIST}$)** e uma **Corte Constitucional Soberana (`ConstitutionalCourt`)** que vetam ativamente qualquer execução durante momentos de "Campo de Ilusão de Estabilidade".

---

## 🏛️ Arquitetura do Sistema

O Lyzer Edge adota uma arquitetura em **3 Processos Isolados (3-Process Topology)** e um **Pipeline Quantitativo em 7 Camadas**, garantindo que falhas de I/O na web não afetem o plano de execução financeira.

### 1. Topologia de 3 Processos Isolados

```mermaid
graph TB
    subgraph P1["Processo 1: Node.js Backend & Dashboard Node"]
        HTTP[Express 5 REST API - Port 7860]
        WS[WebSocket Server / Tick Broadcaster]
        SE[StreamEngine Instances x6]
        ING[LiveDataIngestor Binance WS]
    end

    subgraph P2["Processo 2: ECA Court Node (Rust Hub / JS Court)"]
        TK[TruthKernel - LHDS & TRG]
        CCLIST[Continuous CLIST Stress Oracle]
        MOL[Meta-Observation Layer]
        COURT[Constitutional Court - Sovereign Gate]
        LEDGER[Immutable Event Ledger]
    end

    subgraph P3["Processo 3: Execution Node (Rust / NATS)"]
        NATS[NATS JetStream Spine]
        RG[RiskGateway gRPC Service]
        IR[Intent Registry DB]
        OMS[Exchange Execution Gateway]
    end

    ING -->|Candles 1m..1d| SE
    SE -->|Compute Reality| TK
    TK -->|Evaluate Stress| CCLIST
    CCLIST -->|Status| MOL
    MOL -->|EEF & State| COURT
    COURT -->|Permission Token| SE
    SE -->|Authorize Intent| RG
    RG -->|Publish Intent Event| NATS
    NATS -->|Route Order| OMS
    COURT -->|Append Audit| LEDGER
    SE -->|UI Overlays| WS
```

### 2. Pipeline Quantitativo em 7 Camadas

Toda proposta de ordem transita obrigatoriamente por 7 etapas rígidas de governança antes do envio à corretora:

```mermaid
graph TD
    C1[1. Signal Providers - V1 SMC/ICT, V2 SnD, V3 Momentum] --> C2[2. ResidualizationLayer - Consensus Destruction]
    C2 --> C3[3. ExecutionTriggerLayer - TRG >= 0.4]
    C3 --> C4[4. TruthKernel - LHDS Veto & Ontological Check]
    C4 --> C5[5. C-CLIST - Stress Oracle / Lethal Illusion Check]
    C5 --> C6[6. MOL - Meta-Observation Recovery State SCL]
    C6 --> C7[7. Constitutional Court - ECA Sovereign Authorization]
    C7 -->|Permission Granted| EXEC[Market Execution / Order API]
    C7 -->|Permission Vetoed| VETO[Audit Log Ledger & Telemetry]
```

---

## 🚀 Guia de Primeiros Passos (Onboarding)

Se você acabou de clonar ou instalar o repositório **Lyzer Edge**, siga este guia prático para colocar a aplicação rodando em poucos minutos:

### 1. Pré-requisitos do Ambiente
- **Node.js**: v20.x ou superior.
- **Rust**: 1.78+ (com toolchain MinGW-w64 no Windows se compilando crates nativas).
- **Git** & **PowerShell** (no Windows) ou **Bash** (no Linux/macOS).

---

### 2. Passo a Passo de Inicialização

#### Passo 1: Configurar as Variáveis de Ambiente (`.env`)
Entre na pasta do projeto principal (`lyzer edge`) e crie o arquivo `.env` a partir do template:

```powershell
# No PowerShell, a partir da raiz do repositório:
cd "lyzer edge"
Copy-Item .env.template .env
```

#### Passo 2: Configurar o Modo de Simulação
Para testar o sistema **sem precisar de chaves da Binance**, abra o arquivo `.env` recém-criado e confirme os parâmetros de simulação:

```env
ARL_MODE=SIMULATION
LIVE_TRADING_ENABLED=false
MAX_DAILY_CAPITAL=1000
```
> 💡 *No modo `SIMULATION`, o Lyzer Edge gera candles de teste e executa ordens simuladas (`FILLED_MOCK`) sem risco financeiro.*

#### Passo 3: Instalar as Dependências (Monorepo)
Instale todos os pacotes npm das workspaces compartilhadas:

```bash
# Executado a partir de "lyzer edge/" ou da raiz:
npm install
```

#### Passo 4: Iniciar o Sistema Completo (Backend + Frontend Painel)
Execute o comando que inicia o servidor Backend (Express + WebSocket na porta `7860`) e a interface gráfica do Frontend em paralelo:

```bash
cd "lyzer edge"
npm run full
```

#### Passo 5: Abrir o Painel Web (Dashboard)
Acesse no seu navegador o endereço exibido no terminal (geralmente):

$$\text{http://localhost:5173}$$

---

### 🛠️ Comandos de Desenvolvimento

Todos os comandos devem ser executados a partir do diretório `lyzer edge/`:

| Comando | O que faz |
|---|---|
| `npm run full` | Inicia Backend (porta 7860) e Frontend Vite simultaneamente (Recomendado) |
| `npm run backend` | Inicia apenas o servidor Backend em Node.js |
| `npm run dev` | Inicia apenas o servidor de desenvolvimento Frontend Vite |
| `npm test` | Executa a suíte de testes unitários e de integração via Vitest |
| `npm run coverage` | Executa testes e gera relatório de cobertura V8 |
| `npm run lint` | Executa a verificação estática com ESLint |

---

## 📊 Matriz de Funcionalidades & Estado Atual

| Categoria | Funcionalidade | Estado | Descrição |
|---|---|---|---|
| **Pipeline** | Provedores V1 (SMC/ICT), V2 (SnD), V3 (Momentum) | ✅ Implementado | Geração de propostas de sinal por narrativa de mercado. |
| **Pipeline** | TruthKernel & Geometria TRG | ✅ Implementado | Cálculo de Tail Risk Geometry e veto por colapso ontológico. |
| **Governança** | ECA Constitutional Court & C-CLIST | ✅ Implementado | Oráculo de estresse epistêmico e arbitragem soberana. |
| **Execução** | Adaptador Binance (Live / Testnet / Mock) | ✅ Implementado | Execução de ordens REST com travas de capital diário. |
| **Interface** | Frontend SPA Z-Space (Vite + Vanilla JS) | ✅ Implementado | Gráficos interativos com overlays SMC (FVG, OB, SR). |
| **Notificações**| Bot Telegram Notifier | ✅ Implementado | Notificações de execução e alertas de emergência do sistema. |
| **SMC Modular**| Suíte SMC (`packages/lyzer-shared/src/smc/`) | ✅ Implementado | Simplificação v2.0 concluída (~70% redução de legado). |
| **Rust IPC** | Gateway de Risco gRPC & NATS JetStream | ✅ Implementado | Integração de baixa latência em Rust para ordens UUIDv7. |
| **Arquitetura v2.0**| Simplificação Minimalista (`/knowledge/simplification`) | ✅ Implementado | 100% de paridade e 0 regressões funcionais. |

---

## 📂 Estrutura do Monorepo

```
projeto/
├── .agents/                 # AG Kit, regras (GEMINI.md), memórias e skills (lyzer-guardian)
├── docs/                    # Documentação oficial de auditoria técnica (/docs/audit/)
├── knowledge/               # Base de Conhecimento Viva e permanente (/knowledge/)
├── packages/
│   ├── lyzer-shared/        # Motores de Sinal, CSRL, SMC e TruthKernel (Node.js ESM)
│   └── lyzer-constitution/  # Corte Constitucional, C-CLIST, MOL e Ledger (Node.js ESM)
├── lyzer edge/              # Aplicação principal (Backend Express + Frontend SPA Vite)
│   ├── backend/             # StreamEngine.js, server.js, ingestors e executores
│   ├── src/                 # Interface gráfica SPA, componentes e rotas
│   ├── src-rust/            # Edge services em Rust (Risk Gateway, Intent Registry, OMS)
│   └── tests/               # Suíte de testes unitários e E2E SMC
├── src-rust/                # Kernel Rust (OAL, OCR, SHM Spine, Binance Adapter)
└── lyzer-workspace/         # Constitutional Hub Rust (Core Hub, Arbitration, Governance)
```

---

## 📚 Base de Conhecimento & Documentação

O repositório conta com uma **Base de Conhecimento Viva (Knowledge Base)** e uma **Auditoria Técnica Completa**:

- 🧠 **[Knowledge Base (`/knowledge`)](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/knowledge/README.md)** — Fonte oficial de verdade sobre arquitetura, módulos, domínio e invariantes.
- 📋 **[Auditoria Técnica (`/docs/audit`)](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/docs/audit/executive_summary.md)** — Diagnóstico executivo, fluxo de runtime e matrizes de risco.
- 🛡️ **[Skill AG Kit (`lyzer-guardian`)](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/.agents/skills/lyzer-guardian/SKILL.md)** — Regras do Arquiteto Cognitivo Permanente do projeto.

---

## 🔒 Segurança e Governança de Risco

1. **Axioma "The Court Shall Never Learn"**: A Corte Constitucional ignora e vetará qualquer entrada que contenha probabilidade ou `confidence`, prevenindo arrogância estocástica.
2. **Mascaramento de Segredos**: Nunca comite arquivos `.env` com chaves reais da Binance. Utilize variáveis de ambiente injetadas em contêineres seguros.
3. **Isolação em Contêineres**: O [Dockerfile](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/Dockerfile) executa sob usuário não-privilegiado `ubuntu` (UID 1000) em um contêiner multi-stage Ubuntu 24.04.

---

## 🤝 Como Contribuir

Contribuições são extremamente bem-vindas! Siga o fluxo abaixo:

1. **Abra uma Issue**: Descreva o problema ou a oportunidade de melhoria antes de enviar código.
2. **Crie uma Branch Dedicada**: `git checkout -b feature/minha-melhoria`
3. **Execute a Suíte de Testes**: Garantir que 100% dos testes passem com `npm test`.
4. **Respeite as Convenções ESM**: Use extensão `.js` explícita em importações do Node.js backend.
5. **Envie um Pull Request**: Detalhe o impacto arquitetural e inclua evidências dos testes.

---

## 📜 Licença

Proprietário — Lyzer Labs. Todos os direitos reservados.

---

<div align="center">

> *"Inteligência não é encontrar respostas simples. É preservar perguntas legítimas frente ao colapso do tempo."* — **Lyzer Labs Executive Board**

</div>
