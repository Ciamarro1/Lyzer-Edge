# FASE 3 — RELATÓRIO DE TRANSCENDÊNCIA

**12 subagentes paralelos · 7 domínios · ~27 bugs/P&D encontrados**

---

## Os 7 Achados Mais Impactantes

### 🔴 #1: MOL Completamente Quebrado (Runtime Forensics + Math Model)
**Onde**: `court.js:49` passa `requestPayload` (sem `epistemic_authority`) em vez de `kernelResult` para `mol.evaluateState()`
**Efeito**: `epistemic_authority` é sempre `undefined` → MOL nunca entra em VETO/RECOVERY → a camada inteira é inoperante. `MOL_SCL_THRESHOLD` e `MOL_STABILIZATION_WINDOW_MS` são letra morta.
**Camadas afetadas**: Pipeline Layer 6 (Meta-Observation Layer)

### 🔴 #2: 4 Branches de Exit de Posição Estruturalmente Mortos (Runtime Forensics)
**Onde**: `streamEngine.js:614,618,632,636` — `kernelResult.signal` e `kernelResult.confidence` **não existem** no objeto do TruthKernel
**Efeito**: `undefined === 'no-go'` → sempre `false`. Posições nunca fecham por reversão ou baixa confiança. Só fecham via SL/TP. Se SL/TP não é atingido, posição fica aberta **indefinidamente**.
**Camadas afetadas**: Pipeline Layer 4+ (todo o sistema de gerenciamento de posição)

### 🔴 #3: dailyCapitalUsed Monotônico (Runtime Forensics)
**Onde**: `streamEngine.js:909` — incrementado na abertura, **nunca** decrementado no fechamento
**Efeito**: Eventualmente o limite de capital diário trava permanentemente o sistema.
**Camadas afetadas**: ExchangeExecution

### 🔴 #4: SignalEngine Singleton Cross-Contamination (State Management)
**Onde**: `streamEngine.js:34` — `signalEngine` compartilhado entre todas as 6 engines; `memory.featureHistory` não separa por símbolo
**Efeito**: Sinais de BTC contaminam sinais de ETH. Cache de sinais mistura resultados de diferentes símbolos.
**Camadas afetadas**: Pipeline Layer 1 (todos os 4 providers)

### 🔴 #5: V3 RSI Bug Crítico (Signal Provider Audit)
**Onde**: `v3_momentum_rsi.js:23` — SMA inicial usa as primeiras 14 candles do array, não as últimas 14
**Efeito**: RSI é sistematicamente distorcido por dados antigos e nunca se recupera. O V3 inteiro é inválido.
**Camadas afetadas**: Pipeline Layer 1 (V3 Provider — disabled por padrão, mas ainda assim incorreto)

### 🔴 #6: Segurança 2.6/10 (Security Deep Dive v2)
**18 novas vulnerabilidades** além do RED_TEAM_DEEP.md original:
- SQL Injection via `db.js:672` (CRITICAL)
- WebSocket sem autenticação (HIGH)
- Admin API key via query parameter (HIGH)
- API key na URL do WebSocket (HIGH)
- Sem security headers, rate limiting, CORS (MEDIUM)
- Supply chain risks: `sqlite3@^6.0.1`, sem lockfile audit
- **Nota revisada**: 4.4/10 → **2.6/10**

### 🔴 #7: 16 Dead Routes no Backend (Frontend-Backend Contract)
**~70% do backend** não é chamado pelo frontend:
- Todo `archeologist/*`, `mind/*`, `metrics`, `status`, `trades/export`
- 6 endpoints de experimentos que o service define mas ninguém invoca
- `POST /api/extinction/trigger` chamado por ZSpaceDashboard mas **não existe** (404)
- `ADMIN_API_KEY` nunca enviado nas requisições admin

---

## Camada por Camada — Achados por Pipeline Layer

### Layer 1: Providers (V1-V4)
| Achado | Severidade | Fonte |
|--------|:----------:|:-----:|
| V1 é placeholder sem Order Blocks, BOS, CHoCH | 🟡 ALTO | Signal Audit |
| V2 não é SnD real (rolling min/max de 10 períodos) | 🟡 ALTO | Signal Audit |
| V2 narrativa invertida ("TRENDING_TO_SUPPLY" → long) | 🟡 ALTO | Signal Audit |
| V3 RSI bug (SMA inicial usa janela errada) | 🔴 CRÍTICO | Signal Audit |
| V4 LiquidityGraph nunca populado (dead code) | 🟡 ALTO | Signal Audit |
| V4 MetaAgentValidator recebe valores hardcoded | 🟡 ALTO | Signal Audit |
| Todos os providers sem try/catch (1/10 error score) | 🟡 ALTO | Error Handling |
| `signalEngine` compartilhado entre 6 símbolos | 🔴 CRÍTICO | State Management |

### Layer 2: ResidualizationLayer
| Achado | Severidade | Fonte |
|--------|:----------:|:-----:|
| `liquidityDivergence` hardcoded em 1.0 | 🟡 ALTO | Runtime Forensics |
| `micro.invariants` passado mas nunca lido | 🟢 BAIXO | Runtime Forensics |
| Sem tratamento de erro (2/10) | 🟡 ALTO | Error Handling |

### Layer 3: ExecutionTriggerLayer
| Achado | Severidade | Fonte |
|--------|:----------:|:-----:|
| TRG default do construtor é 0.8, documentação diz 0.4 | 🟡 ALTO | Math Model |
| Sem tratamento de erro (1/10) | 🟡 ALTO | Error Handling |

### Layer 4: TruthKernel
| Achado | Severidade | Fonte |
|--------|:----------:|:-----:|
| `kernelResult.signal` e `confidence` não existem | 🔴 CRÍTICO | Runtime Forensics |
| SDS thresholds (0.3, 0.7) não documentados | 🟡 ALTO | Math Model |
| 3 expansões diferentes do acrônimo LHDS | 🟢 BAIXO | Math Model |
| ADR-038 funde LHDS veto e colapso ontológico | 🟡 MÉDIO | Math Model |
| Sem tratamento de erro (2/10) | 🟡 ALTO | Error Handling |

### Layer 5: C-CLIST
| Achado | Severidade | Fonte |
|--------|:----------:|:-----:|
| 5 parâmetros não documentados (dvfFloor, stressAcc, release, TRG explosion, clamping) | 🟡 ALTO | Math Model |
| Stress release (0.1) é 50× maior que accumulation (0.002) — não documentado | 🟡 ALTO | Math Model |
| Estado volátil perdido em reinicialização | 🟡 MÉDIO | State Management |
| Sem tratamento de erro (2/10) | 🟡 ALTO | Error Handling |

### Layer 6: MOL (Meta-Observation Layer)
| Achado | Severidade | Fonte |
|--------|:----------:|:-----:|
| **MOL completamente quebrado** — parâmetro trocado | 🔴 CRÍTICO | Runtime Forensics |
| SDS ≤ 0.7 como critério de estabilidade não documentado | 🟡 MÉDIO | Math Model |
| DOI (Duration of Inaction) não documentado | 🟢 BAIXO | Math Model |
| Estado volátil perdido em reinicialização | 🟡 MÉDIO | State Management |
| Sem tratamento de erro (2/10) | 🟡 ALTO | Error Handling |

### Layer 7: Constitutional Court
| Achado | Severidade | Fonte |
|--------|:----------:|:-----:|
| `VETO_NO_SURVIVAL_NECESSITY` redundante (caller já filtrou) | 🟢 BAIXO | Runtime Forensics |
| Confidence/Prediction check nunca dispara (campos não existem) | 🟢 BAIXO | Runtime Forensics |
| ConstraintEngine desdentado (drawdown/size checks inertes) | 🟡 ALTO | Runtime Forensics |
| PermissionToken sem HMAC (SHA-256 puro) | 🔴 CRÍTICO | Security v2 |
| Sem tratamento de erro (3/10) | 🟡 ALTO | Error Handling |

### Post-Court: Exchange Execution
| Achado | Severidade | Fonte |
|--------|:----------:|:-----:|
| `dailyCapitalUsed` monotônico | 🔴 CRÍTICO | Runtime Forensics |
| `handleExecution` sem `await` (race condition) | 🟡 ALTO | Runtime Forensics |
| Sem retry ou circuit breaker | 🔴 CRÍTICO | Error Handling |
| Apenas 1 teste de exchange (sem mock, slippage, fill) | 🔴 CRÍTICO | Test Audit |

---

## Achados por Domínio Horizontal

### Infraestrutura Rust
| Achado | Severidade |
|--------|:----------:|
| 16 crates, 3 versões de tonic (0.9, 0.12) — incompatíveis | 🟡 ALTO |
| Apenas 1 de 4 binários construído no Docker | 🟡 ALTO |
| Conflito de porta (:50051) entre risk-gateway e eca | 🟡 ALTO |
| lyzer-eca é stub que sempre veta (3.0/10) | 🟡 ALTO |
| Código morto: `channel.rs`, `cer.rs` importam crate inexistente | 🟡 MÉDIO |

### Testes
| Achado | Severidade |
|--------|:----------:|
| 557 testes (517 ✅ / 40 ❌), 6.7/10 | 🟢 BAIXO |
| Zero testes de segurança | 🔴 CRÍTICO |
| Zero testes de concorrência/race condition | 🔴 CRÍTICO |
| Zero testes de integração Rust | 🟡 ALTO |
| Testes de performance falham (2/3) | 🟡 ALTO |

### Configuração
| Achado | Severidade |
|--------|:----------:|
| 44 variáveis lidas, 29 não documentadas | 🟡 ALTO |
| 4 variáveis mortas no .env (tokens de deploy) | 🟡 MÉDIO |
| `RESIDUAL_CONSENSUS_LIMIT` default diverge (0.1 vs 0.0) | 🟢 BAIXO |
| Tokens GITHUB_TOKEN e HF_TOKEN expostos | 🔴 CRÍTICO |

### Git/Processo
| Achado | Severidade |
|--------|:----------:|
| 64% commits noturnos (sprint madrugada) | 🟢 INFO |
| Zero tags, zero merges, branch única | 🟡 MÉDIO |
| 4 commits fantasmas perdidos por force-push | 🟡 MÉDIO |
| 23 super-god modules (LiveTradingView: 1,651 linhas) | 🟡 MÉDIO |
| 44+ console.log em produção | 🟡 MÉDIO |
| ~50 TODO/FIXME markers | 🟢 BAIXO |
| Tropical de código em 3 cópias de streamEngine (v1/v2/root) | 🟡 MÉDIO |

---

## Mapa de Bugs vs Código

| Bug | Arquivo | Linha | Gravidade |
|-----|---------|:-----:|:---------:|
| MOL parâmetro trocado | `court.js` | 49 | 🔴 CRÍTICO |
| `kernelResult.signal` inexistente | `streamEngine.js` | 614, 632 | 🔴 CRÍTICO |
| `kernelResult.confidence` inexistente | `streamEngine.js` | 618, 636 | 🔴 CRÍTICO |
| `dailyCapitalUsed` nunca decrementado | `streamEngine.js` | 909 | 🔴 CRÍTICO |
| `signalEngine` sem isolamento por símbolo | `streamEngine.js` | 34, 59 | 🔴 CRÍTICO |
| V3 RSI SMA usa janela errada | `v3_momentum_rsi.js` | 23 | 🔴 CRÍTICO |
| SQL Injection (colunas dinâmicas) | `db.js` | 672 | 🔴 CRÍTICO |
| PermissionToken sem HMAC | `permission.js` | 31-35 | 🔴 CRÍTICO |
| WS sem autenticação | `server.js` | 398 | 🔴 CRÍTICO |
| `handleExecution` sem await | `streamEngine.js` | 913 | 🟡 ALTO |
| `liquidityDivergence` hardcoded 1.0 | `streamEngine.js` | 548 | 🟡 ALTO |
| ConstraintEngine checks inertes | `constraintEngine.js` | 29-35 | 🟡 ALTO |
| V2 narrativa invertida | `v2_snd_snr.js` | 74-82 | 🟡 ALTO |
| V2 não é SnD (rolling min/max) | `v2_snd_snr.js` | todo | 🟡 ALTO |
| V1 sem OB/BOS/CHoCH | `v1_smc_ict.js` | todo | 🟡 ALTO |
| V4 LiquidityGraph dead | `v4_imce.js` | interno | 🟡 ALTO |
| TRG threshold default 0.8 vs doc 0.4 | `executionTriggerLayer.js` | 12 | 🟡 ALTO |
| 5 parâmetros C-CLIST não documentados | `c-clist.js` | vários | 🟡 ALTO |
| POST /api/extinction/trigger 404 | ZSpaceDashboard → backend | — | 🟡 ALTO |
| ADMIN_API_KEY nunca enviado | frontend → backend | — | 🟡 ALTO |
| 16 dead routes no backend | `server.js` | vários | 🟡 ALTO |
| 29 variáveis de config não documentadas | todo o código | — | 🟡 ALTO |
| 29 catch vazios | `packages/lyzer-shared/src/research/` | vários | 🟡 ALTO |
| Sem unhandledRejection/uncaughtException | global | — | 🟡 ALTO |
| VETO_NO_SURVIVAL_NECESSITY redundante | `court.js` | 76-82 | 🟢 BAIXO |
| Confidence/Prediction check nunca dispara | `court.js` | 41-45 | 🟢 BAIXO |
| `Z_t` = dvf * 10 sem normalização | `streamEngine.js` | 591 | 🟢 BAIXO |
| V4 excluído do payload overlays | `streamEngine.js` | 827-848 | 🟢 BAIXO |

---

## O Que a Fase 3 Revelou que a Fase 2 Não Viu

**Fase 2** (~5 fases de investigação anteriores) encontrou principalmente problemas **estruturais**: 
- 174 arquivos mortos, dual kernels, monorepo fantasma, documentação inflada, tokens expostos

**Fase 3** (esta) encontrou problemas **comportamentais e de lógica** que exigem execução real para detectar:

1. **A MOL inteira não funciona** — não é um problema de arquitetura, é um **bug de parâmetro trocado** numa chamada de função
2. **V3 RSI bug** — a SMA inicial usa a janela errada, invalidando todo o provider (que já está disabled, mas ainda assim é um indicador de qualidade)
3. **4 branches de exit mortos** — `kernelResult.signal` e `confidence` nunca existiram, mas ninguém percebeu porque SL/TP mascarava
4. **SignalEngine cross-contamination** — BTC sinais contaminam ETH, mas só é visível executando multi-símbolo
5. **16 dead routes no backend** — 70% do backend não é chamado
6. **18 novas vulnerabilidades de segurança** — incluindo SQL Injection que a primeira auditoria perdeu
7. **V2 não é Supply & Demand** — é um rolling min/max com narrativa invertida

### Por que a Fase 2 Não Viu Isso
A Fase 2 (DEEP_ARCHAEOLOGY, RED_TEAM_DEEP, QUANT_PIPELINE_AUDIT, etc.) focou em:
- Arquivos que existem vs não existem
- Duplicação e estrutura
- Dependências e configuração
- Segurança superficial (tokens, exec())

A Fase 3 exigiu:
- **Leitura linha a linha** de código executável (Runtime Forensics)
- **Execução mental** do fluxo de dados (parâmetros sendo passados corretamente?)
- **Conhecimento de domínio** (o que é SMC/ICT de verdade? O que é Supply & Demand?)
- **Análise de fórmulas** (a matemática corresponde?)
- **Mapeamento frontend-backend** (quem chama o quê?)

---

## Conclusão

```
Antes da Fase 3: "A arquitetura tem gaps, mas o pipeline roda."
Depois da Fase 3:  "O pipeline roda, mas:
  - A MOL não funciona (bug de parâmetro)
  - 4 branches de exit são código morto
  - O V2 não é SnD real
  - O V3 tem RSI bug
  - O signalEngine contamina entre símbolos
  - 70% do backend não é chamado
  - A segurança é 2.6/10 com SQL Injection confirmado
  - dailyCapitalUsed trava o sistema eventualmente"
```
