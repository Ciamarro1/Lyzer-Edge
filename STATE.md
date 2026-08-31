# 🏛️ LYZER EDGE — RESEARCH & OPERATIONAL STATE DASHBOARD

**Data do Registro:** 2026-08-30T05:45:00Z  
**Autoridade:** Senior CTO & Executive Engineering Director  
**Status do Repositório:** 🟢 **PRODUCTION READY / 48H TESTNET SOAK ACTIVE**  
**Dataset Base:** 32.016 Hourly Candles BTCUSDT (2023–2026) | SHA-256: `5da8350f0546641485d33abe23414ac12deb88cc7721647d7fed9c1223f2dfaf`  
**Git Remote:** `https://github.com/Ciamarro1/Lyzer-Edge.git` (`origin/main` @ commit `6b71761`)

---

## 1. ESTADO DOS TRACKS DE GOVERNANÇA

```text
╔═══════════════════════════════════════════════════════════════════════════════╗
║                      LYZER EDGE — RUNTIME DASHBOARD                           ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║ RESEARCH STATUS            🟢 CLOSED & FROZEN (Batches 001 → 033 Completed)  ║
║ COMPILED PROVIDER          🟢 REC_COMP_INSTITUTIONAL_v1 (Engine V5 Only)      ║
║ PROVIDER MUTABILITY        🔒 PROHIBITED (Zero online learning / parameter edit║
║ OTHER PROVIDERS (V1-V4,V6,V7) 🔒 HARD-DISABLED (NULL in RAM / Zero Execution)  ║
║ RUNTIME CONTRACT           🟢 ENFORCED (StreamEngine hard-halts on any deviance║
║ MONITORED ASSET            🟢 BTCUSDT Only                                    ║
║ TIMEFRAME                  🟢 1 Hour (1h) Aggregated                          ║
║ EXIT POLICY                🟢 DYNAMIC_TP (SL: 1.0 ATR, TP: 2.5 ATR, Time: 6h) ║
║ CAPITAL AUTHORITY          🟢 Asymmetric Ed25519 Boot Contract Enforced       ║
║ MAX STRUCTURAL CEILING     🟢 $150,000 USD                                    ║
║ ENVIRONMENT                🟡 BINANCE TESTNET (ARL_MODE=TESTNET)              ║
║ AUTHORIZED CAPACITY        🟢 $500 USD (Valid Ed25519 Token Active)           ║
║ REAL MONEY (LIVE CAPITAL)  🔴 ZERO AUTHORIZED ($0)                            ║
║ PERSISTENT KILL-SWITCHES   🟢 ARMED (K1–K5 Survive Container Destruction)     ║
║ AUTO-PROMOTION / RESUME    🔴 PROHIBITED                                      ║
║ FIDELITY GATES             🟢 7/7 PASSED (verify_fidelity_gate.js)            ║
║ RAILWAY CLOUD DEPLOY       🟢 LIVE & STABLE (Booted 2026-08-30 05:43 UTC)     ║
║ 48H OBSERVABILITY SOAK     🟢 ACTIVE (2026-08-30 05:43 → 2026-09-01 05:43 UTC)║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

## 2. LINHA DO TEMPO CIENTÍFICA & ENGENHARIA (BATCH 001 → BATCH 033)

```text
========================================================================================================================
BATCH RANGE     FOCO INSTITUCIONAL                     RESULTADO FORENSE                        STATUS DE GOVERNANÇA
========================================================================================================================
Batch 001–004   Busca Causal Ampla & Decomposição      BOS e POCs convencionais colapsaram;     🔴 ILUSÕES DESCARTADAS
                                                       Displacement positivo isolado.
Batch 005–011   Displacement & Dinâmica de Clusters    Displacement carrega causalidade, mas     🔴 V8 ARQUIVADO POR
                                                       falhou no FWER após penalidade FWER.     CONTENÇÃO DE DANO
Batch 012–014   Wyckoff Springs & Volume Absorption    Reversão de mínima de 30h + Volume Z>1.5  🟢 ALFA CONFIRMADO
                                                       + Funding Negativo superou controles.    (PF > 1.60)
Batch 015–021   Sensibilidade, Falsificação & Compilação Testes de perturbação e choque;         🔒 PROVIDER COMPILADO:
                                                       Isolamento estrito do Engine V5.         REC_COMP_INSTITUTIONAL_v1
Batch 022–026   Atrito de Execução & Capacidade        Modelagem de slippage, filas de ordens   🟢 TETO DEFINIDO
                                                       e teto de capacidade ($150k max).        (T1: $500 a T3: $10k)
Batch 027–032   Readiness, Shadow Live & Governança    Contrato de execução institucional e     🟢 GOVERNANÇA SOBERANA
                                                       desacoplamento Rust/Node/Exchange.
Batch 033       Deployment Fidelity & Asymmetric Boot  Ed25519 Zero-Trust out-of-band auth;     🟢 PRODUÇÃO BLINDADA
                                                       Runtime Contract e trava física.         (100% Fail-Closed)
Batch 034       Absorption Reversal (Proxy Flow)       Testou ε_t → R_{t+k}; ausência de        🔴 FALSIFICADO EM G3
                                                       reação gera momentum, não reversão.      [ARCHIVED / REJECT]
Batch 035       Flow-Price Response (Real Taker Flow)  Dataset Binance Futures 2.47M certificado 🔴 FALSIFICADO EM G3
                                                       (G-DATA-0 PASS). Fluxo M5 é ruído pós-   [ARCHIVED / REJECT]
                                                       fricção (t-stat < 1.0, Net Edge < 0).
Batch 036       Funding Imbalance & Macro Vol Regime   G3b (F*V) aprovado (t=3.35), mas G3c     🔴 FALSIFICADO EM G3
                                                       simétrico falhou (Short em funding       [ARCHIVED / REJECT]
                                                       positivo foi destruído por momentum).
========================================================================================================================
```

---

## 3. ARQUITETURA DE SEGURANÇA & DEPLOYMENT FIDELITY (RULE #9)

### 🔐 1. Asymmetric Capital Authorization Ceremony (Ed25519)
- **Local da Chave Privada:** `.keys/private_key.pem` (Local isolado, gitignored, sob custódia humana).
- **Local da Chave Pública:** `GOVERNANCE_PUBLIC_KEY` no Railway.
- **Validador:** [`lyzer edge/backend/CapitalAuthorizationValidator.js`](file:///c:/Users/WDAGUtilityAccount/Documents/Nova%20pasta/Lyzer-Edge/lyzer%20edge/backend/CapitalAuthorizationValidator.js).
- **CLI de Emissão de Tokens:** [`scripts/authorize.js`](file:///c:/Users/WDAGUtilityAccount/Documents/Nova%20pasta/Lyzer-Edge/scripts/authorize.js) (`node scripts/authorize.js generate-keys` / `sign`).

### 🛡️ 2. Runtime Contract Físico no StreamEngine
- Se o servidor for inicializado com ativos adicionais (e.g. `ETHUSDT`), timeframes incorretos (`1m`), TP/SL alterados ou políticas de saída divergentes de `DYNAMIC_TP` + `360m`, o construtor do `StreamEngine` executa um `[HALT]` imediato e recusa o boot.
- Se `REC_COMP_INSTITUTIONAL_v1` estiver autorizado, todos os motores legados (`v1`, `v2`, `v3`, `v4`, `v6`, `v7`) são forçados a `null` em memória.

---

## 4. ESTADO DO SOAK TEST ATIVO NO RAILWAY

- **Início Oficial:** 2026-08-30 às 05:43:00 UTC (02:43:00 BRT)
- **Fim Previsto:** 2026-09-01 às 05:43:00 UTC (02:43:00 BRT)
- **Ambiente:** Binance Testnet via Railway Cloud Container
- **Token Ativo:** Assinatura Ed25519 válida, Tier T1 (\$500 USD), Sem Expiração, Nonce único.
- **Log de Boot Validado:**
  ```text
  🟢 [BOOT] CAPITAL_AUTHORIZATION_SIGNATURE Verified for Provider: REC_COMP_INSTITUTIONAL_v1
  🟢 [BOOT] Authorized Capacity: $500 (Tier: T1)
  🔒 [FIDELITY GATE] Enforcing Institutional Artifact Context: BTCUSDT @ 1h
  🟢 [CONTROL PLANE] AUTHORIZATION_STATE is AUTHORIZED. Operating in LIVE Mode.
  🔒 [FIDELITY GATE] Isolating Operational Alpha to: REC_COMP_INSTITUTIONAL_v1 (v5 Engine). Disabling all other providers.
  [STREAM] Deep Warmup Complete. LHDS should now be stabilized.
  [STREAM] Execution layer initialized for TESTNET
  🟢 [INGESTOR] Binance WebSocket connected: wss://stream.binance.com:9443/...
  🟢 [STREAM] Live real data streaming active for BTCUSDT
  ```

---

## 5. REGRAS INVIOLÁVEIS PARA AS PRÓXIMAS SESSÕES

1. **NÃO ALTERAR CÓDIGO OU VARIÁVEIS DURANTE O SOAK:** O teste de 48h é estritamente observacional.
2. **NÃO FORÇAR TRADES:** A estratégia Wyckoff Spring em 1h com confluência de Funding Negativo dispara raramente. A ausência de ordens em períodos calmos é prova de disciplina matemática.
3. **TRANSIÇÃO PARA LIVE CAPITAL (FUTURO):**
   - Executar `node scripts/authorize.js sign` alterando para `environment: 'LIVE'`.
   - Inserir as chaves da Binance de produção e a nova assinatura no Railway.
   - **Nenhum código precisará ser alterado.**

---

## 6. MAPA DE DOCUMENTOS E ARQUIVOS ESSENCIAIS

- **SOP Operacional para Humanos:** [`LYZER_EDGE_SOP.md`](file:///c:/Users/WDAGUtilityAccount/Documents/Nova%20pasta/Lyzer-Edge/LYZER_EDGE_SOP.md)
- **Constituição da Engenharia:** [`.agents/rules/MASTER_PROMPT.md`](file:///c:/Users/WDAGUtilityAccount/Documents/Nova%20pasta/Lyzer-Edge/.agents/rules/MASTER_PROMPT.md)
- **Control Plane de Governança:** [`docs/CONTROL_PLANE.md`](file:///c:/Users/WDAGUtilityAccount/Documents/Nova%20pasta/Lyzer-Edge/docs/CONTROL_PLANE.md)
- **Testes de Certificação de Fidelidade:** [`lyzer edge/tests/verification/verify_fidelity_gate.js`](file:///c:/Users/WDAGUtilityAccount/Documents/Nova%20pasta/Lyzer-Edge/lyzer%20edge/tests/verification/verify_fidelity_gate.js)
- **CLI de Assinatura Criptográfica:** [`scripts/authorize.js`](file:///c:/Users/WDAGUtilityAccount/Documents/Nova%20pasta/Lyzer-Edge/scripts/authorize.js)
