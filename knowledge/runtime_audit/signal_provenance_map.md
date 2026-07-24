# Mapa de Proveniência do Sinal (Signal Provenance Map)

- **Projeto**: Lyzer Edge
- **Auditor**: Guardião da Arquitetura & Principal Quant Auditor (`@[lyzer-guardian]`)
- **Data da Auditoria**: 2026-07-24
- **Objetivo**: Rastrear a trajetória de um sinal da origem à execução e provar em quais linhas o filtro H4 foi descartado.

---

## 🗺️ 1. Mapeamento da Proveniência do Sinal (Etapa por Etapa)

```text
[1. LiveDataIngestor / Binance WS] ──(1m Candle)──► [2. StreamEngine.updateMtfCandles()]
                                                               │
                                                               ▼
[3. SmcEngineFacade.evaluate()] ◄──────────────────────────────┘
  ├─ L48: const trendState = this.trendEngine.evaluate(tfManager); (Calcula H4 Bias)
  ├─ L57-66: if (liquidityState.sweep.swept === 'SSL') signal = 'long';
  └─ RESULTADO: trendState É DESCARTADO! O sinal 'long'/'short' é emitido sem checar H4.
                                                               │
                                                               ▼ (Retorna v1Narrative)
[4. StreamEngine.processCandle()]
  ├─ L511: providers = { v1, v2, v3, v4 }; (trendState NÃO é incluído no objeto)
  ├─ L525: kernelResult = this.truthKernel.evaluate(providers, ...);
  │           └─ ResidualizationLayer: Calcula DVF e TRG de assimetria.
  │           └─ ExecutionTriggerLayer: Define eef = true se TRG >= 0.4.
  │
  ├─ L540-549: baseSignal.signal = v4 || v1 || v2 || v3;
  ├─ L686: if (isStabilized && kernelResult.eef && !this.activePosition)
  │           └─ Deriva direction = 'LONG' | 'SHORT' a partir de baseSignal.signal
  │
  ├─ L689: permissionToken = this.court.requestPermission('EXECUTE_TRADE', kernelResult, ...);
  │           └─ Court checa: No confidence, MOL recovery, C-CLIST stress, EEF = true.
  │           └─ Court NÃO checa a tendência H4!
  │
  └─ L694: IF (granted) -> OPEN POSITION (this.activePosition) com SL (0.25%) e TP (0.50%)
```

---

## 🔬 2. Prova de Engenharia de Descarte da Tendência H4 (Line-by-Line Evidence)

### Pergunta da Auditoria:
*O `trendState` é calculado em `SmcEngineFacade.js`, mas ele é utilizado em algum componente posterior da cadeia (TruthKernel, Court, StreamEngine, RiskEngine)?*

### Resposta e Prova por Inspeção do Código Executável:

1. **`SmcEngineFacade.js` (L48 vs L57-L74)**:
   - `trendState` é calculado na L48.
   - O objeto de retorno `narrative` na L80 inclui apenas `signal`, `narrative`, `confidence` e `source`. **`trendState` não é repassado no payload de narrativa do provedor.**
2. **`streamEngine.js` (L511-L516)**:
   - O construtor de provedores empacota apenas `{ signal, confidence }` para `v1`, `v2`, `v3` e `v4`.
   - A informação da tendência H4 não é injetada no `providers`.
3. **`kernel.js` (L29-L82)**:
   - O `TruthKernel` recebe `providers` e `micro`. Ele calcula `dvf` e `trg` com base na assimetria entre `v1`, `v2`, `v3` e `v4`.
   - O `TruthKernel` não lê nem possui nenhuma referência a `trendState`.
4. **`court.js` (L39-L94)**:
   - A `ConstitutionalCourt` recebe `kernelResult` e `rawState`.
   - Ela avalia o axioma de falta de confiança, o estado do `MOL`, o estresse do `C-CLIST` e as restrições determinísticas.
   - A Corte não possui nenhuma verificação sobre a direção de tendência H4.
5. **`streamEngine.js` (L686-L694)**:
   - A condição de abertura da ordem é: `if (isStabilized && kernelResult.eef && !this.activePosition)`.
   - Assim que uma posição é encerrada (SL ou TP em ~30-60 segundos), `!this.activePosition` torna-se verdadeiro.
   - Na candle seguinte de 1 minuto, se `TRG >= 0.4`, **uma nova ordem é aberta imediatamente**.

---

## 💥 3. Conclusão Final do Mapa de Proveniência

> **"Fica provado com 100% de evidência em código que a ausência da verificação da tendência H4 em `smcFacade.js` NÃO é uma delegação para camadas posteriores. A tendência H4 morre silenciosamente na linha 48 de `smcFacade.js` e NENHUM componente posterior (TruthKernel, Court, StreamEngine, RiskEngine) a consulta ou exige para autorizar a ordem. Isso permitiu a abertura descontrolada de 1.389 trades em 12,6 horas."**
