# ADR: Visual Overlays no LiveTrading (SMC Zones + Structure)

**Data:** 2026-07-03
**Workflow:** /cg (Cognitive Governance)
**Participantes:** CIA, CTO, Ponytail, frontend-specialist, backend-specialist, Red Team (CAA + penetration-tester), security-auditor

## Decisão

Implementar overlays visuais de zonas SMC (FVG, OB, EQH, EQL, SWEEP) e estruturais (BOS, CHOCH, Swing High/Low, S/R) no gráfico candlestick do LiveTradingView para dar visibilidade ao que o motor Lyzer está enxergando.

## Arquivos Afetados

- `backend/streamEngine.js` — Adiciona SMC LiquidityEngine + StructureEngine, extrai S/R, envia `payload.overlays`
- `packages/lyzer-shared/src/smc/liquidityEngine.js` — Otimização O(n³→O(n·k)) no sweep detection, cap de 50 pares EQH/EQL, cap de 300 zonas totais
- `src/components/LiveTradingView.js` — Renderiza zonas/marcadores/S/R no canvas, com `globalAlpha` reduzido para zonas mitigadas

## Decisões de Arquitetura

1. **Pipeline separado:** Overlays rodam em engines SMC dedicadas (não reutilizam V1/V2/V3 providers) para garantir dados brutos sem interferência do kernel.
2. **Payload completo a cada tick:** `overlays` substitui o estado anterior no frontend (não acumula), evitando vazamento de memória.
3. **Cap de zonas:** 300 zonas máximas por tick + 50 pares EQH/EQL para limitar payload WebSocket.
4. **Zonas mitigadas:** Renderizadas com 20% de opacidade para evitar viés de confirmação (CIA finding).

## Itens Cortados pelo Ponytail

- ❌ Opacidade por `strength` (sempre 1.0, zero valor visual)
- ❌ Filtro de range mínimo para S/R (hack de 10 linhas, não resolve o problema real)
- ❌ Sincronização de pipeline overlay/signal (ambos leem `mtfCandles`, sem incompatibilidade)
- ❌ Decaimento temporal (eye candy sem impacto em decisão)
- ❌ Renomear `zones` → `levels` (breaking change, zero valor)

## Red Team Findings Resolvidos

| Threat | Severidade | Fix |
|--------|-----------|-----|
| O(n³) sweep detection → 75M iterações/tick | CRÍTICO | Set incremental `brokenBSL`/`brokenSSL` → O(n·k) |
| EQH/EQL spamming → até 1225 pares | ALTO | Cap de 50 pares cada |
| Payload WebSocket → até 500KB+ | ALTO | Cap de 300 zonas totais |
| Canvas pipeline thrashing (globalAlpha) | MÉDIO | Um `globalAlpha` set por zona (aceitável) |

## Segurança

**APPROVED** — sem issues bloqueantes. Recomendação informacional: trocar `innerHTML` por `textContent` no trade log (defense-in-depth).
