# 🏛️ Lyzer Edge Command Center SDK — Version & Contract Freeze (v1.0.0)

**Status**: CONGELADO / FROZEN (v1.0.0)  
**Data**: 2026-07-25  
**Garantia de Estabilidade**: Nenhuma alteração incompatível (breaking change) será realizada na API pública do Widget SDK antes da versão **M2.0.0**.

---

## 1. APIs Públicas Suportadas (`IWidgetPlugin` v1.0.0)

Todo widget ou plugin de terceiros montado no Command Center V2 deve obrigatoriamente satisfazer a interface `IWidgetPlugin`:

```typescript
interface IWidgetPlugin {
  readonly manifest: WidgetManifest;
  mount(container: HTMLElement, runtime: ICommandCenterRuntime): void | Promise<void>;
  update?(state: any): void;
  dispose(): void | Promise<void>;
}
```

### 1.1 `WidgetManifest` Schema v1.0.0
- `id`: Slug em minúsculas (ex: `'chart-host-widget'`)
- `name`: Nome legível do widget
- `version`: Formato SemVer estrito (ex: `'1.0.0'`)
- `minRuntimeVersion`: Formato SemVer (ex: `'3.4.0'`)
- `targetPane`: `'LEFT_PANE'` | `'RIGHT_PANE'` | `'FULL_WIDTH'`
- `capabilities`: Array de capacidades declaradas (ex: `['telemetry:read', 'market_data:read']`)
- `realityTag`: `'OBSERVED_REALITY'` | `'SYNTHETIC_REALITY'`

---

## 2. API Pública do Runtime (`ICommandCenterRuntime` v1.0.0)

O `runtime` repassado no método `.mount(container, runtime)` expõe exclusivamente os seguintes métodos seguros:

| Método | Capability Requerida | Descrição |
|---|---|---|
| `getSnapshot()` | `telemetry:read` | Retorna o snapshot global do sistema |
| `getRealityStatus()` | Nenhuma | Retorna status do Reality Orchestrator |
| `getPerformanceMetrics()` | `telemetry:read` | Retorna métricas do PerformanceMonitor |
| `subscribeSnapshot(callback)` | `telemetry:read` | Retorna handle Disposable |
| `subscribeSlice(selector, callback)` | `telemetry:read` | Inscrição reativa com throttling |
| `subscribePerformanceMetrics(callback)` | `telemetry:read` | Inscrição no barramento de métricas |
| `subscribeMarketData(query, callback)` | `market_data:read` | Inscrição de ticks/velas de mercado |
| `getMarketData(query)` | `market_data:read` | Consulta histórica de mercado |
| `getCourtAuditLog()` | `court:read` | Registros do Tribunal Constitucional |
| `getCausalTimeline(query)` | `causal_timeline:read` | Linha do tempo de intenções causais |
| `emitEvent(topic, payload)` | `ui_event:emit` | Dispara evento sanitizado no EventBus |
| `listenEvent(topic, handler)` | `ui_event:listen` | Escuta evento sanitizado no EventBus |

---

## 3. Regra Fundamental de Limpeza (The Disposable Rule)

> **MANDATO INSTITUCIONAL**: Nenhuma subscrição ou recurso alocado por um widget pode retornar `void` ou omitir encerramento. Todos os listeners e timers devem ser limpos no método `.dispose()`.

---

## 4. APIs Proibidas (Uso Negado)

Fica estritamente proibido dentro de qualquer widget:
1. Instanciar ou importar `WebSocket` ou conectores de rede diretamente.
2. Importar `LiveProvider`, `ReplayProvider` ou classes de infraestrutura diretamente.
3. Acessar ou alterar o objeto `window` ou `document` fora do contêiner DOM injetado.
4. Omitir a chamada ao `dispose()`.
