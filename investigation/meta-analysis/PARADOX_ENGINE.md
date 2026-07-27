# PARADOX ENGINE — Análise de Paradoxos e Trade-offs Arquiteturais

**Fonte:** 12 relatórios de investigação (System Map, Backend, Frontend, Security, Data, Final Synthesis, Deep Archaeology, Guardião Dashboard, Guardião Revelation, Quant Pipeline Audit, Red Team Deep, Dependency Deep Audit)
**Gerado por:** Paradox & Trade-off Analyst (Fase 4)

---

## 1. Paradox Inventory

| # | Paradox | "Correção Óbvia" | Side Effect | Severidade | Resolução Recomendada |
|---|---------|-----------------|-------------|:----------:|-----------------------|
| P1 | **signalEngine singleton compartilhado por 6 engines** | Criar uma instância `EvSignalEngine` por StreamEngine (6 instâncias) | 6x uso de memória para estado interno dos providers; estado duplicado pode divergir entre instâncias — um par BTC pode ver sinal diferente de ETH mesmo com mercado idêntico. **Fonte:** Backend Analysis §2, linha 121 | **ALTA** | Pool de 6 instâncias com semente de randomização idêntica + snapshot de estado compartilhado via `structuredClone()` a cada N ticks. Memória sobe 3x (não 6x) com deduplicação de cache de providers. |
| P2 | **C-CLIST/MOL pré-avaliados fora do court** (linhas 552-553) | Remover as chamadas `evaluateStress()` + `evaluateState()` de `processCandle()` | Se por 3 meses alguém DEPENDE dos side effects da pré-avaliação (estado mutado alimenta decisões adiante na pipeline), a remoção muda comportamento silenciosamente. **Fonte:** Quant Pipeline Audit §1, streamEngine.js:552-553 | **CRÍTICA** | Mover a pré-avaliação PARA DENTRO de `requestPermission()` como única entrada. Adicionar `console.warn()` por 30 dias em modo transição (dual-write) para capturar dependentes ocultos. |
| P3 | **Dois TruthKernels divergentes com o mesmo nome** | Deletar `lyzer edge/src/engine/kernel.js` (frontend kernel), manter o shared como canônico | Frontend `DecisionStream.js` e 5 verificações importam o kernel errado — corrigir imports quebra a camada de frontend que depende do contrato de saída `{signal, confidence}` sem `dvf`/`trg`/`eef`. **Fonte:** Quant Pipeline Audit §2, Guardian Dashboard §2 | **CRÍTICA** | Extrair um adaptador de compatibilidade: o kernel canônico emite ambos os contratos. Frontend consome `{signal, confidence, reason_codes}` (subconjunto); pipeline consome o objeto completo. Remover o kernel duplicado só após migração. |
| P4 | **174 arquivos mortos (~36.700 linhas) inflam o codebase** | Deletar `_archive/`, `src/laboratory/`, research files mortos, duplicatas | Perda de contexto de pesquisa; scripts standalone como `run_autonomous_research_lab.js` e `run_l6_war.js` podem ser usados sazonalmente; o `_archive/` tem valor pedagógico como referência de evolução do design. **Fonte:** Deep Archaeology §1-5, Guardian Dashboard §5 | **ALTA** | Mover `_archive/` para branch `research/archive` (git subtree). Manter no `main` apenas o que tem IMPORT ativo. Scripts standalone viram `scripts/` com `"type": "module"`. Research files viram branch separada com CI desligado. |
| P5 | **PermissionToken assinado com SHA-256 sem HMAC** | Substituir `createHash` por `createHmac` com chave secreta | Requer infraestrutura de gerenciamento de chave secreta (`COURT_SECRET_KEY`). Em SIMULATION/TESTNET, a chave precisa estar disponível — se exposta, o ganho de segurança é zero. Adiciona complexidade de deploy. **Fonte:** Red Team Deep §3, permission.js:34 | **CRÍTICA** | HMAC com chave derivada do `ARL_MODE` + seed fixa em SIMULATION, variável por env em LIVE. Em TESTNET, usar chave efêmera (gera no startup, dura 24h). A chave nunca trafega em query string ou header. |
| P6 | **SDS=0.0 silencioso em falha CSRL — MOL vê "estabilidade perfeita"** | Propagar erro ao invés de default 0.0 | Pipeline PARA em qualquer instabilidade CSRL (dados corrompidos, NaN, campos faltando) — derruba 6 engines em produção simultaneamente. Trocamos falsa estabilidade por falsa instabilidade. **Fonte:** Quant Pipeline Audit §4a, streamEngine.js:517-527 | **ALTA** | Elevar SDS default para `0.5` (neutro, não falsamente estável). Logar `console.error` com stack trace. Adicionar health check que reporta CSRL failures como degraded, não como crash. Pipeline continua com SDS conservador. |
| P7 | **In-memory ConstitutionalLedger perdido no restart** | Persistir ledger em SQLite `court_ledger` table | Cada veto/approve precisa de um `INSERT` síncrono no hot path da pipeline (centenas de ticks/segundo) — aumenta latência do tick em ~5-15ms. DB contention entre 6 engines. **Fonte:** Data Analysis §3, Final Synthesis §4 | **CRÍTICA** | Batch assíncrono: escreve em buffer in-memory, persiste a cada 100 entries ou 5s (o que vier primeiro). No startup, carrega últimos 1000 entries para reconstruir edge-riding counters. Zero latência adicional no hot path. |
| P8 | **Sem schema migrations — `CREATE TABLE IF NOT EXISTS`** | Adicionar migration framework com `PRAGMA user_version` | Toda inicialização checa versão e aplica DDLs pendentes — ATRASA startup em ~500ms-2s. Se migration falha, DB fica em estado inconsistente e bloqueia startup. **Fonte:** Data Analysis §4, Final Synthesis §4 | **CRÍTICA** | Migrations aplicadas em transação com `BEGIN IMMEDIATE`. Se falha, faz ROLLBACK e loga erro — sistema continua rodando com schema antigo (sem as novas colunas). Tolerância a falha de migration > consistência estrita. |
| P9 | **Dual codebase — packages/lyzer-shared/ vs lyzer edge/src/ duplicados** | Deletar duplicatas, usar alias Vite `@lyzer/shared` | 100+ imports relativos precisam ser migrados para `@lyzer/shared/...`. Qualquer import esquecido quebra em produção. Build testa imports no CI, mas se o alias Vite não corresponder ao layout do node_modules, quebra silenciosamente. **Fonte:** Deep Archaeology §3b, Dependency Deep Audit §6 | **ALTA** | Script de migração automatizado que percorre TODOS os arquivos JS/TS, substitui `../../packages/lyzer-shared/src/` → `@lyzer/shared/`. CI roda validação que falha se qualquer import relativo para `packages/` existir. Rollback = reverter commit. |
| P10 | **Dual SQLite drivers: sqlite3 (callback) + better-sqlite3 (sync)** | Unificar em better-sqlite3 | TODO código async que usa Promises com `sqlite3` precisa reescrever para API síncrona. `db.js` inteiro (400+ linhas) precisa refatorar. Mudança de sync/async afeta toda a cadeia de chamadas até `server.js`. **Fonte:** Data Analysis §8, Dependency Deep Audit | **MÉDIA** | Manter dual driver por ora. Novo código usa `better-sqlite3`. Legacy `CausalMemoryDB` continua com `sqlite3` até ser encapsulado em adapter. Risco de refatoração completa não compensa o benefício imediato. |
| P11 | **`innerHTML` para todo DOM update — XSS + perda de event listeners** | Adotar template-based rendering (Tagged Templates / lit-html) | Overhaul de 25+ views, cada uma com padrão diferente de montagem. Aumenta bundle size com framework (lit-html = ~7KB). Curva de aprendizado para um dev solo que domina innerHTML. **Fonte:** Frontend Analysis §3, Final Synthesis §3 | **ALTA** | Substituir `innerHTML` por `textContent` onde possível (dados não-html). Para HTML estruturado, adotar template literals sanitizados com DOMPurify. lit-html introduzido gradualmente em views novas. Views legadas marcadas para refatoração. |
| P12 | **Mock data roda junto com produção** (GamifiedCommandCenterView) | Gatear mock layer atrás de `MOCK_MODE=false` | Se `MOCK_MODE` default for `false` e alguém DEPENDE do gamification para visualizar o sistema sem backend real, a UI fica vazia. Gamification é a única UI funcional quando backend está offline. **Fonte:** Frontend Analysis §2, Final Synthesis §3 | **ALTA** | `MOCK_MODE` default = true (preserva comportamento atual). Documentar que produção DEVE setar `MOCK_MODE=false`. Adicionar indicador visual "⚠ MOCK" no header quando ativo. |
| P13 | **3 Rust workspaces com dependências incompatíveis** | Unificar versões de tokio/tonic/prost em um workspace único | Requer atualizar 55 arquivos Rust, resolver breaking changes entre tonic 0.9 → 0.12, prost 0.11 → 0.13. Alguns crates podem não compilar com as versões unificadas. CI Rust build dobra de tempo. **Fonte:** Deep Archaeology §9, Guardian Revelation §IV | **BAIXA** (nenhum Rust roda em produção hoje) | Manter workspaces separados. Só unificar quando houver decisão de conectar gRPC ao Node.js. Até lá, é "teatro arquitetural" com custo real de manutenção, mas unificar também é custo. Menor pior = freeze as-is. |
| P14 | **Sem rate limiting — vetor de flooding** | Adicionar `express-rate-limit` com `max: 100/min` | Admin ops legítimas (deploy script, CI health check) podem ser throttleadas. Endpoints como `/api/candles/:symbol` precisam de limite diferente de `/api/experiments/dashboard`. Taxa única não serve. **Fonte:** Red Team Deep §7, Security Analysis §3 | **ALTA** | Rate limit por grupo de rota: `/api/trades/*` = 20/min, `/api/experiments/*` = 60/min, `/api/candles/*` = 120/min, `/api/status` = ilimitado. Admin routes usam header `X-Admin-Rate` para bypass. |
| P15 | **Admin API key via query string — vazada em logs** | Aceitar key apenas via `Authorization: Bearer` header | Frontend SPA atual pode estar enviando `?adminKey=...` em requisições — mudar para header quebra compatibilidade com versão atual do frontend. **Fonte:** Backend Analysis §1, Red Team Deep §8 | **ALTA** | Suportar ambos por 30 dias (query string + header), logar warning quando query string for usada. Após migração, remover query string. Frontend atualizado primeiro. |
| P16 | **Sem WebSocket auth — qualquer cliente recebe dados de trading** | Adicionar token auth no upgrade WS | Frontend atual não envia token na conexão WS. Adicionar auth quebra compatibilidade com versão atual. Sem auth, qualquer um pode escutar dados de posições ao vivo. **Fonte:** Backend Analysis §1, Red Team Deep §8 | **MÉDIA** | Token efêmero gerado no login/session, enviado como query param `?token=...` no upgrade. Frontend existente recebe token via primeira mensagem HTTP. Fallback: se sem token, servidor envia apenas dados anonimizados (sem posições). |
| P17 | **`exec()` para backup — superfície de command injection** | Substituir por `execFile()` ou `spawn()` | `execFile()` não expande variáveis de ambiente no comando — se o script `backup_restore.py` depende de `$PATH` ou `$PYTHONPATH`, quebra. `spawn()` com `shell:false` tem o mesmo problema. **Fonte:** Red Team Deep §2, server.js:468-477 | **CRÍTICA** | `spawn('python3', [scriptPath, 'backup'], { shell: false })` + resolver `python3` via `which` no startup. Se `python3` não encontrado, loga erro e não agenda backup. Melhor não fazer backup do que fazer com risco. |
| P18 | **Race conditions em `this.activePosition` sem mutex** | Adicionar async-mutex por engine | Toda leitura/escrita de `activePosition`, `tradeHistory`, `candles` precisa de lock. Adiciona latência (~0.1ms por acquisition). Se mutex for esquecido em um branch de código, race condition persiste com falsa sensação de segurança. **Fonte:** Red Team Deep §9, streamEngine.js:394-763 | **MÉDIA** | Single-threaded `processCandle` não precisa de mutex se for garantido que executa sequencialmente. O race REAL é entre `onTick` (checkTickPositionExit) e `processCandle` — ambos chamados do mesmo callback WS. SOLUÇÃO: fila de ticks com processamento serial (`async queue`), não mutex. |
| P19 | **Unbounded array growth em fallback mode — OOM** | Adicionar cap na array `this.candles` no fallback (shift quando > 1000) | Perde dados históricos durante fallback. Se fallback dura horas, candles são descartados e indicadores (SMA, ATR) recalibram com dados parciais. **Fonte:** Red Team Deep §13, streamEngine.js:380 | **MÉDIA** | FIFO ring buffer de 5000 candles em memória. Em fallback, faz `push` + `shift` (O(1) com linked list). Indicadores usam window rolling — dados mais velhos que a janela são irrelevantes. |
| P20 | **Phantom dep `better-sqlite3` — quebra silenciosa em hoisting** | Adicionar `better-sqlite3` ao `package.json` | Aumenta o install time com native module compilation. Se `better-sqlite3` não for usado ativamente (shadow trading é raro), estamos pagando o custo de build sem benefício. **Fonte:** Dependency Deep Audit §2 | **ALTA** | Adicionar como dependência opcional (`"optionalDependencies"`). Código faz `try { import('better-sqlite3') } catch { /* use sqlite3 */ }`. Zero custo se não usado. |
| P21 | **CER DDL definido mas nunca executado — evidence registry aspiracional** | Wirear CER no startup, conectar no TruthKernel | Adiciona INSERT no hot path do TruthKernel. Cada avaliação vira um registro de evidência. DB sem TTL cresce sem limites. Performance do TruthKernel cai. **Fonte:** Data Analysis §4, Guardian Dashboard §5 | **BAIXA** (não roda hoje) | CER ativado com `CER_ENABLED=false` (desligado por default). Quando ligado, buffer assíncrono igual à solução do ConstitutionalLedger. Sem TTL = sem ativação em produção. |
| P22 | **Sem data sync frontend↔backend — trades divergem** | Backend como source of truth; frontend como cache | Toda operação de trade no frontend precisa de round-trip ao backend. Offline mode perde funcionalidade. Latência de UI aumenta (cada save = fetch). **Fonte:** Data Analysis §4, Final Synthesis §4 | **ALTA** | Backend como SSOT para trades executados. Frontend IndexedDB como cache local + journal de operações pendentes. Sincronização CRDT-style: backend envia incrementos via WS, frontend aplica localmente. Sem conflito porque trades são append-only. |
| P23 | **Monolithic `processCandle` (430 linhas)** | Decompor em módulos focados | Extrair lógica para novos módulos QUEBRA a linearidade do código. O dev solo que conhece o monolito de cor vai perder tempo navegando entre 5 arquivos. Refatoração pode introduzir bugs em 7 camadas interdependentes. **Fonte:** Backend Analysis §2, Final Synthesis §3 | **ALTA** | Extrair apenas 2 módulos primeiro: (1) PositionManager (SL/TP/exit logic) e (2) SignalEvaluator (kernel + court interaction). Manter `processCandle` como orchestrator de 50 linhas que chama os 2 + providers inline. Testar com snapshot da saída atual antes/depois. |
| P24 | **Frontend court sem C-CLIST/MOL — stub** | Adicionar C-CLIST + MOL ao frontend court | Importa 2 classes (~300 linhas) + dependências do backend. Aumenta bundle size. Se a lógica duplicada divergir do backend, frontend mostra decisões diferentes do backend. **Fonte:** Quant Pipeline Audit §3b, Guardian Revelation §V | **MÉDIA** | Frontend NÃO deve duplicar lógica de pipeline. Court widget deve CONSUMIR decisões do backend via WS, não recalcular localmente. Stub atual vira proxy de visualização. C-CLIST/MOL só no backend. |

---

## 2. Matriz de Trade-offs

### 2.1 Dimensões Primárias

```
                     Corretude ← → Performance
                         ↑              ↑
                         │              │
                   Segurança ─────── Usabilidade
                         │              │
                         ↓              ↓
               Manutenibilidade ← → Velocidade
                         ↑              ↑
                         │              │
                  Simplicidade ──── Completude
                         │              │
                         ↓              ↓
                   Isolamento ← → Latência
```

### 2.2 Onde Cada Decisão Está no Espectro

| Decisão | Eixo | Extremo A | ← Posição → | Extremo B |
|---------|------|-----------|:----------:|-----------|
| HMAC PermissionToken | Segurança vs Usabilidade | HMAC com chave 🔒 | **← HMAC + fallback TESTNET** | SHA-256 puro 🔓 |
| Persistir Ledger | Corretude vs Performance | INSERT síncrono por tick 🎯 | **← Buffer assíncrono** | In-memory só ⚡ |
| Remover C-CLIST pré-avaliação | Corretude vs Manutenibilidade | Dupla avaliação 🌀 | **← Single entry point** | Nenhuma avaliação 🚫 |
| Unificar TruthKernels | Simplicidade vs Completude | Um kernel canônico 🎯 | **← Adapter de compatibilidade** | Dois kernels divergentes 🌿 |
| Deletar 174 dead files | Manutenibilidade vs Completude | Deletar todos 🗑️ | **← Branch archive** | Manter tudo 📂 |
| innerHTML → lit-html | Segurança vs Velocidade | lit-html + DOMPurify 🛡️ | **← textContent gradual** | innerHTML puro ⚡ |
| Monolito vs Distribuído | Simplicidade vs Isolamento | Monolito in-process 🏠 | **← Híbrido: só RiskGateway** | 3 processos gRPC 🏗️ |
| processCandle decomposição | Manutenibilidade vs Velocidade | 5 módulos focados 🧩 | **← 2 módulos + orchestrator** | Monolito de 430 linhas 📜 |
| Rate limiting | Segurança vs Usabilidade | 100 req/min global 🚦 | **← Por grupo de rota** | Sem limite ∞ |
| Schema migrations | Corretude vs Simplicidade | Migration framework + rollback 🏛️ | **← Transação tolerante a falha** | CREATE TABLE IF NOT EXISTS 🏕️ |
| Dual SQLite drivers | Segurança vs Performance | better-sqlite3 sync 👍 | **← Adapter bridge** | Dual drivers atuais 🤝 |

### 2.3 Matriz de Conflitos (3x3)

| Dimensão | Conflita com | Por quê | Exemplo |
|----------|-------------|---------|---------|
| **Segurança** | Performance | HMAC, schema validation, rate limiting adicionam latência | Auth em WS + HMAC + rate limit = ~5ms extra por requisição |
| **Segurança** | Usabilidade | Autenticação dificulta debugging e desenvolvimento | WS auth quebra frontend sem token |
| **Segurança** | Simplicidade | HMAC, migrations, CER adicionam complexidade | Gerenciamento de COURT_SECRET_KEY |
| **Isolamento** | Latência | Per-engine instances, processo separado, gRPC → IPC cost | 3-process isolation adiciona ~50ms por trade |
| **Isolamento** | Manutenibilidade | 3 processos = 3x deploy, log, monitoramento | 3 Rust workspaces incompatíveis |
| **Corretude** | Performance | Persistir ledger, schema validation, SDS fallback correto | Ledger buffer assíncrono vs síncrono |
| **Manutenibilidade** | Velocidade | TypeScript, módulos focados, migrations = mais tempo de desenvolvimento | Decompor processCandle leva 3-5 dias |
| **Simplicidade** | Completude | Um kernel vs adapter, deletar research vs archive | Archive branch preserva pesquisa, main fica clean |
| **Performance** | Latência | Buffer assíncrono vs write-through | Ledger perde no máximo 5s de dados em crash |

---

## 3. Mapa de Tensões

### 3.1 Tensão Central: Uma Catedral em Um Andar

```
Documentação Promete                        Código Entrega
─────────────────────────                  ─────────────────
3 processos isolados    ◄── GAP ~78% ──►   1 monólito Node.js
gRPC + NATS                                 Imports relativos
UUIDv7                                      UUIDv4 + inteiros
CER ativo                                   CER DDL não executado
Court com HMAC                              SHA-256 sem chave
Pipeline sem backdoor                       C-CLIST pré-avaliado
```

**Fonte:** Guardian Revelation §II, §IV — "O teatro arquitetural"

**Tensão:** A correção "honesta" (admitir monólito, remover teatro) entra em conflito com a ambição documentada do sistema distribuído futuro. A decisão de simplificar (Opção A do Guardian Revelation) fecha portas para o sistema de 3 processos sem reescrever. A decisão de completar (Opção B) requer 6-12 meses e uma equipe.

### 3.2 Tensão de Segunda Ordem: O Preço do Single Entry Point

```
C-CLIST/MOL dentro do requestPermission() ←── Correto por design
                                              │
                                Mas a pré-avaliação em streamEngine.js:552
                                PODE ter dependentes ocultos
                                              │
                        Se remover → comportamento muda
                        Se manter → backdoor persiste
```

**Fonte:** Quant Pipeline Audit §1, streamEngine.js:552-553

### 3.3 Tensão de Disponibilidade: SDS Fallback

```
Propagar erro CSRL → Pipeline crash ←── Correto mas frágil
                      
       vs
       
Default SDS=0.0 → MOL vê estabilidade ←── Robusto mas incorreto
```

**Fonte:** Quant Pipeline Audit §4a

### 3.4 Tensão de Fronteira: Dois Kernels, Duas Verdades

```
packages/lyzer-shared/src/engine/kernel.js
  ├── Produção RODA este
  ├── Testes NÃO testam este
  └── Contrato de saída: {dvf, trg, eef, ...}
  
lyzer edge/src/engine/kernel.js
  ├── Frontend USA este
  ├── 5 verificações TESTAM este
  └── Contrato de saída: {signal, confidence}
```

**Fonte:** Quant Pipeline Audit §2, Guardian Dashboard §2

**Tensão:** Unificar = corrigir um erro de import, mas frontend e backend têm necessidades DIFERENTES do kernel. O backend precisa de DVF/TRG para a pipeline; o frontend precisa de signal/confidence para o DecisionStream. Forçar o mesmo contrato = over-engineering para um lado.

### 3.5 Tensão de Persistência: Durabilidade vs Performance

```
Hot path (tick) ←── Court decide →── Escrever no ledger
        │                                  │
     < 1ms                            5-15ms síncrono
        │                                  │
    Performance                        Durabilidade
```

**Fonte:** Data Analysis §3, Final Synthesis §4

### 3.6 Tensão de Dívida: Refatorar vs Feature

```
Mês 1: Refatorar processCandle ─── Não entrega features
Mês 1: Feature nova ─── Aumenta dívida técnica em processCandle
```

Toda semana que passa SEM decompor `processCandle`, a dívida cresce (mais linhas, mais bugs). Mas parar features por 3-5 dias para refatorar não entrega valor visível.

---

## 4. Compromissos Recomendados

### 4.1 Resumo dos Compromissos (Prioritários)

| Ordem | Compromisso | Paradoxo | Custo | Benefício | Risco de Não Fazer |
|:-----:|-------------|:--------:|:-----:|:---------:|:------------------:|
| 1 | Buffer assíncrono para ledger | P7 | 2 dias | Ledger persistente sem latência no hot path | Perda de audit trail em crash |
| 2 | HMAC + chave derivada do modo | P5 | 4h | Token não forjável em LIVE | Bypass completo da corte |
| 3 | SDS default 0.5 + health check | P6 | 1 dia | Pipeline continua sem falsa estabilidade | MOL recovery falso |
| 4 | C-CLIST/MOL dentro do requestPermission com dual-write temporário | P2 | 2 dias | Único entry point sem quebra silenciosa | Backdoor persiste |
| 5 | Rate limit por grupo de rota | P14 | 1 dia | Flood mitigation sem afetar admin | DoS no backend |
| 6 | spawn() para backup | P17 | 1h | Command injection mitigado | RCE via exec() |
| 7 | Kernel adapter de compatibilidade | P3 | 3 dias | Um kernel, dois contratos de saída | Pipeline e frontend divergem |
| 8 | Archive → branch separada | P4 | 1 dia | Main limpo, pesquisa preservada | Dead code engana |
| 9 | Queue serial de ticks (não mutex) | P18 | 2 dias | Race conditions eliminadas sem locking | Phantom trades |
| 10 | Migrations com rollback tolerante | P8 | 2 dias | Schema evolui sem risco de startup block | Schema diverge do código |

### 4.2 Compromissos Não Recomendados Agora

| Decisão | Por Que Não Agora | Quando Fazer |
|---------|-------------------|-------------|
| Unificar SQLite drivers | Risco alto, benefício baixo (só shadow telemetry usa better-sqlite3) | Quando refatorar db.js |
| lit-html em todas as views | Esforço enorme (25+ views), benefício incremental | Views novas usam; views legadas quando forem tocadas |
| 3-process isolation | 6-12 meses de trabalho, Rust incompatível | SÓ depois de simplificar monólito |
| Unificar Rust workspaces | Nenhum Rust roda em produção hoje | Quando gRPC for conectado |
| CER ativo | Não tem TTL, não tem consumidor, não tem storage strategy | Quando houver consumer real |
| Data sync frontend↔backend | CRDT-style sync é complexo; trades frontend são journal pessoal, não operacional | Quando multi-deploy precisar de SSOT |

### 4.3 O Grande Compromisso: Theta Simplification vs Theta Completion

Do Guardian Revelation §IX, adaptado pela análise de paradoxos:

```
Opção A (Simplificar)                     Opção C (Híbrido)
─────────────────────                     ──────────────────
✅ Remove 174 dead files                  ✅ Remove ~100 dead files
✅ Remove teatro arquitetural             ✅ Mantém gRPC RiskGateway
✅ Deleta phantom infra                   ❌ Mantém NATS + proto
❌ Fecha porta para distribuição          ✅ Porta aberta para futuro
✅ Reduz complexidade em 40%              ✅ Reduz complexidade em 20%
✅ 3-4 semanas solo                       ✅ 2-3 meses solo
```

**Compromisso recomendado: Opção Híbrida (C) com viés de simplificação imediata.**

Fase 1 (Sprint 1-2):
- Rotacionar tokens (CRÍTICO)
- HMAC PermissionToken (P5)
- SDS default 0.5 (P6)
- spawn() backup (P17)
- Rate limit (P14)
- Archive → branch (P4)

Fase 2 (Sprint 3-4):
- Buffer assíncrono ledger (P7)
- C-CLIST/MOL entry point único (P2)
- Kernel adapter (P3)
- Queue serial de ticks (P18)
- Migrations framework (P8)

Fase 3 (Sprint 5-6):
- processCandle → 2 módulos (P23)
- Remover query string admin key (P15)
- WS auth (P16)
- innerHTML → textContent gradual (P11)

**Não recomendo Opção B (Completar sistema distribuído) até que Fase 1-3 esteja COMPLETA.** A base atual não suporta a complexidade adicional de gRPC + NATS + 3 processos. O teatro arquitetural precisa ser desmontado antes de ser reconstruído como arquitetura real.

---

## 5. Appendix: Paradoxos por Origem

| Fonte | Paradoxos |
|-------|-----------|
| Backend Analysis | P1 (signalEngine), P7 (ledger), P14 (rate limit), P15 (admin key), P16 (WS auth), P23 (processCandle) |
| Data Analysis | P7 (ledger), P8 (migrations), P9 (duplicatas), P10 (SQLite drivers), P21 (CER) |
| Frontend Analysis | P11 (innerHTML), P12 (mock data), P22 (data sync) |
| Quant Pipeline Audit | P2 (C-CLIST backdoor), P3 (kernel duplo), P6 (SDS fallback) |
| Red Team Deep | P5 (HMAC), P17 (exec), P18 (race), P19 (unbounded array), P20 (phantom dep) |
| Deep Archaeology | P4 (dead files), P9 (duplicatas), P13 (Rust workspaces) |
| Guardian Dashboard | P2, P3, P5, P6, P7, P8 |
| Guardian Revelation | P4, P9, P13 (todos os paradoxos do gap documentação↔código) |
