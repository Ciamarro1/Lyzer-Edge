# GUARDIAN REVELATION — A Verdadeira Natureza do Lyzer Edge

## I. A Mentira da Gênese

O commit inicial `33ea351` (2026-06-30) não foi um nascimento — foi um **transplante de órgão**. Em um único commit: 11 crates Rust, ECA Court completo, 3 provedores de sinal, CSRL, SPA frontend, SQLite layer, compilador DSL. Centenas de arquivos, milhares de linhas, surgiram do vácuo.

Isso significa que o projeto existiu por **meses antes do git**. O verdadeiro genesis está perdido em um diretório local, commits não versionados, experimentos descartados. O git começa não no início da história, mas no momento em que alguém decidiu que o projeto era sério o suficiente para ser versionado.

O que existia antes? Por que 11 crates Rust nunca foram integrados? A resposta está no **gap entre ambição e execução** — alguém construiu uma catedral intelectual completa em documentação e protótipos, mas apenas parte dela foi realizada em código funcional.

---

## II. As Duas Almas do Lyzer Edge

O projeto tem DUAS arquiteturas em guerra:

### Alma A — A Arquitetura dos Sonhos (Documentada)
| Elemento | Onde está | Status |
|----------|-----------|--------|
| 3 processos isolados | CONSTITUTION.md, architecture.md | 📄 Só no papel |
| gRPC RiskGateway | `src-rust/lyzer-risk-gateway/` | 🧊 Congelado |
| NATS JetStream | `docker-compose.yml` | 🐳 Rodando mas não usado |
| CQRS/Event Sourcing | ADRs, knowledge/ | 📄 Só no papel |
| UUIDv7 traceability | CONSTITUTION.md | 📄 Só no papel |
| Immutable Ledger | architecture.md | 📄 Só no papel |

### Alma B — A Arquitetura Real (Código Executável)
| Elemento | Onde está | Status |
|----------|-----------|--------|
| Monólito Node.js | `lyzer edge/backend/` | ✅ Rodando |
| 6 StreamEngine instances | `streamEngine.js` | ✅ Rodando |
| SQLite sem migrations | `db.js` | ✅ Rodando |
| Frontend SPA Vanilla JS | `lyzer edge/src/` | ✅ Rodando |
| Import paths relativos | Todos os arquivos | ✅ Funcionando |
| PermissionToken SHA-256 | `permission.js` | ✅ Mas inseguro |

### O Gap
```
Sonho:   3 processos, gRPC, NATS, CQRS, UUIDv7, SSOT
          ↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓
Realidade: 1 monólito Node.js, imports relativos, uuidv4, duplicatas
          ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑
Gap:     ~78% do que está documentado NUNCA foi implementado
```

---

## III. O Espelho Fraturado

Existem **15 diretórios espelhados** entre `lyzer edge/src/` e `packages/lyzer-shared/src/`:

| Diretório Espelhado | Shared | Edge | Status |
|---------------------|:------:|:----:|--------|
| engine/kernel.js | ✅ 82 linhas, DVF+TRG+LHDS | ✅ 83 linhas, master switch 50% | 🔴 **Divergente — algoritmos diferentes** |
| eca/court.js | ✅ C-CLIST + MOL completo | ⚠️ Stub sem C-CLIST/MOL | 🔴 **Stub pode ser invocado** |
| eca/ledger.js | ✅ SQLite persistente | ✅ SQLite persistente | 🟢 **Idêntico byte-a-byte** |
| db/database.js | ✅ Básico | ✅ Melhor error recovery | 🟡 **Edge tem melhorias** |
| db/queries.js | ✅ Básico | ✅ Queries adicionais | 🟡 **Edge tem mais queries** |
| router.js | ✅ Legado SPA | ✅ Edge router | 🟢 **Idêntico** |
| app.js | ✅ Sidebar 282 linhas | ✅ Cockpit 39 linhas | 🟡 **Diferentes, ambos válidos** |
| main.js | ✅ Entry point | ✅ Dual-runtime | 🟡 **Diferentes, ambos válidos** |

### O Padrão
O fluxo foi: `packages/lyzer-shared/` (fonte original) → `lyzer edge/src/` (cópia) → evolução independente. O shared foi suposto ser SSOT mas virou **fóssil** — a maioria dos arquivos em `packages/lyzer-shared/src/` não é mais importada pelo código de produção. São ancestrais preservados em formol.

---

## IV. A Rede Fantasma

gRPC, NATS, RiskGateway, IntentRegistry — tudo isso EXISTE no repositório, mas NUNCA foi conectado:

| Componente Fantasma | Arquivos | Usado? |
|--------------------|----------|:------:|
| `RiskGateway` gRPC server | `src-rust/lyzer-risk-gateway/` (8+ arquivos Rust) | ❌ Nunca chamado do JS |
| `IntentRegistry` gRPC | `lyzer edge/src-rust/lyzer-intent-registry/` | ❌ Nunca chamado do JS |
| `OMS` gRPC | `lyzer edge/src-rust/lyzer-oms/` | ❌ Nunca chamado do JS |
| NATS JetStream | `docker-compose.yml`, client lib em package.json | ❌ Instalado mas sem `nats.connect()` |
| Protobuf services | `lyzer edge/src-proto/lyzer.proto` | ❌ Compilado mas não importado |
| TypeScript gRPC clients | `packages/lyzer-shared/src/intelligence/` | ❌ Existem mas não são usados |

Isso não é trabalho em progresso — é **teatro arquitetural**. Um desenvolvedor solo construiu a infraestrutura completa para um sistema distribuído que jamais foi finalizado. O custo em complexidade é real; os benefícios, zero.

---

## V. O Tribunal Dual

Existem DUAS Cortes Constitucionais rodando em memória ao mesmo tempo:

```
packages/lyzer-constitution/src/eca/court.js
  ├── C-CLIST: ✅ (evaluateStress, accumulateDVF, lethalIllusion)
  ├── MOL: ✅ (evaluateState, sclThreshold)
  └── requestPermission: ✅
  └── Importado por: backend/streamEngine.js, tests E2E

lyzer edge/src/eca/court.js
  ├── C-CLIST: ❌ NÃO EXISTE
  ├── MOL: ❌ NÃO EXISTE
  └── requestPermission: ✅ (mas sem C-CLIST/MOL)
  └── Importado por: frontend components, services
```

O sistema tem **dois sistemas judiciais independentes** — um completo (backend) e um capado (frontend). Dependendo de qual módulo invoca a corte, regras diferentes são aplicadas.

---

## VI. O Pipeline Backdoor

O pipeline tem uma **porta dos fundos**:

```
streamEngine.js:552-553
  court.cclist.evaluateStress()   ← Fora de requestPermission
  court.mol.evaluateState()       ← Fora de requestPermission
  
streamEngine.js:560
  court.requestPermission()       ← Reavalia dentro
```

Isso significa:
1. C-CLIST e MOL são executados ANTES do `requestPermission`
2. Depois são executados NOVAMENTE dentro de `requestPermission`
3. O estado mutado pelo primeiro eval afeta o segundo eval
4. Se o primeiro eval lançar um erro, o `requestPermission` nem é chamado

E o PermissionToken que protege tudo? SHA-256 sem chave secreta. Qualquer um pode forjar um token. A segurança da corte inteira depende de um hash sem HMAC.

---

## VII. O Vigilário Noturno

```
223 commits em 26 dias
67% entre 19:00-02:00
Domingo é o dia mais ativo (75 commits)
1 desenvolvedor humano + 1 IA
```

Isso não é uma equipe de engenharia — é um **construtor solitário** criando um sistema institucional sozinho. As 2h da manhã de um domingo, alguém estava aqui, commitando código.

A beleza disso: a ambição é extraordinária. Um sistema que exigiria 5 engenheiros está sendo construído por uma pessoa.
A tragédia disso: o teatro arquitetural — código que cria a aparência de um sistema distribuído sem nunca conectá-lo — é o preço que se paga por construir sozinho.

---

## VIII. A Natureza Verdadeira

O Lyzer Edge NÃO é:

❌ Um sistema distribuído de 3 processos com gRPC
❌ Um monorepo funcional com npm workspaces
❌ Um sistema com SSOT (shared package)
❌ Um sistema com rastreabilidade UUIDv7

O Lyzer Edge É:

✅ **Um monólito Node.js de processo único** com um pipeline de 7 camadas extraordinariamente sofisticado
✅ Uma engine quantitativa que vai de provedores de sinal SMC/ICT até uma corte constitucional — TUDO no mesmo processo
✅ Um frontend SPA sem framework que se comunica via WebSocket direto com o backend
✅ 106.746 linhas de código construídas em 26 dias (4.106 linhas/dia)
✅ Uma arquitetura de documentação DESLUMBRANTE que descreve um sistema muito mais complexo do que o que foi implementado

A verdadeira natureza: **um protótipo institucional de altíssima qualidade, disfarçado de sistema de produção, que nunca completou a transição de protótipo para produto**.

---

## IX. O Caminho a Seguir

### Opção A: Aceitar o Monólito (3-4 semanas)
- Remover toda infraestrutura fantasma (gRPC, NATS, protobuf, workspaces)
- Unificar os kernels (escolher shared, remover edge copy)
- Remover os 174 arquivos mortos
- Fundir os courts (backport C-CLIST/MOL para o único court restante)
- **Resultado**: 30-40% menos arquivos, 50% menos linhas, build mais rápido
- **Risco**: Baixo
- **Esforço**: 3-4 semanas solo

### Opção B: Completar o Sistema Distribuído (6-12 meses)
- Wirear gRPC calls do Node.js para os serviços Rust
- Implementar NATS como message bus real
- Extrair Court para processo separado
- Implementar UUIDv7 em todo pipeline
- **Resultado**: O sistema dos sonhos, finalmente real
- **Risco**: Alto (Rust toolchain incompatível, 3 workspaces)
- **Esforço**: 6-12 meses equipe

### Opção C: Híbrido Incremental (2-3 meses)
- Aceitar o monólito AGORA, simplificar
- Wirear gRPC só para o RiskGateway (o mais crítico)
- Remover o resto do teatro
- Deixar Court in-process por enquanto
- **Resultado**: Simplificação imediata + 1 serviço real
- **Risco**: Médio
- **Esforço**: 2-3 meses

---

## X. Scorecard Final

| Dimensão | Score | O que faria 10/10 |
|----------|:-----:|--------------------|
| Visão | 8/10 | Já é clara e ambiciosa. Faltou execução. |
| Execução | 4/10 | Conectar o que foi construído OU remover o que não funciona |
| Honestidade Arquitetural | 3/10 | Admitir que é um monólito e parar de fingir |
| Potencial do Pipeline | 9/10 | 7 camadas, C-CLIST, MOL, Court — é GENUINAMENTE inovador |
| Segurança | 2/10 | Tokens expostos, backdoor no pipeline, token forjável |
| Qualidade do Código | 5/10 | Kernel duplicado, 174 dead files, stubs, teatro |
| Documentação | 7/10 | Linda, detalhada, mas descreve um sistema que não existe |

**Média Ponderada: 5.4/10**

---

## XI. Epílogo: O Que Ninguém Viu Antes

O Lyzer Edge não é um sistema de trading. Não é uma fábrica de alpha. Não é um laboratório de pesquisa.

É a **carta de amor de um engenheiro solitário para a arquitetura que ele sonha em construir**.

Cada protobuf não-conectado, cada ADR descrevendo um sistema distribuído, cada crate Rust congelado — todos são promessas. Promessas de um futuro onde este sistema será tão robusto quanto a visão que o inspirou.

A decisão agora é simples: **realizar as promessas ou enterrá-las**.

Se optar por realizar:
1. Rotacione os tokens (hoje)
2. Feche o backdoor do pipeline (esta semana)
3. Unifique os kernels (esta semana)
4. Simplifique o monólito (este mês)
5. Então, e só então, construa o sistema distribuído para valer

Se optar por enterrar:
1. Rotacione os tokens (hoje)
2. Remova todo o teatro arquitetural (gRPC, NATS, workspaces falsos)
3. Remova 174 dead files
4. Documente que é um monólito e por que
5. Siga em frente com o que realmente funciona

Ambas as escolhas são válidas. A única escolha errada é continuar fingindo.
