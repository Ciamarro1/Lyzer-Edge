# Alpha Evolution Engine V2 (Continuous Machine Learning)

**Data:** Julho 2026
**Autor:** Lyzer Orchestrator (L4 Critical Mission)
**Caminho:** `packages/lyzer-shared/src/research/alphaEvolutionEngine.js`

## 1. O Paradigma do CML (Continuous Machine Learning)
A evolução do Alfa no Lyzer Edge não é mais feita via *commits heurísticos* ("Acho que esse indicador funciona"). Ela segue um pipeline institucional governado pela `ENGINEERING_CONSTITUTION.md` e mediado pelo `AlphaEvolutionEngine`.

O Ciclo de Sobrevivência (Alpha Immune System) funciona assim:

1. **OBSERVE (Drift Detector):** O sistema monitora a estabilidade do Sharpe Ratio (Janela vs Baseline).
2. **DETECT DRIFT:** Se `recentSharpe / earlySharpe < 0.8`, o sistema declara "Erosão de Alfa" (Alpha Decay).
3. **GENERATE HYPOTHESIS:** O `HypothesisRegistry` é instanciado com uma nova tese (ex: "Aumentar restrição do TRG para 0.6 em mercados laterais").
4. **RUN EXPERIMENT (ReplayEngine):** Um sub-processo executa walk-forward isolado contra dados OOS.
5. **STATISTICAL VALIDATION:** O `StatisticalValidator` aplica *Welch's t-test*. O P-Value precisa ser < 0.05.
6. **ARB APPROVAL:** Se o experimento gerar alpha > baseline E for estatisticamente significante, o status muda para `SIGNIFICANT`.
7. **DEPLOY:** O hiperparâmetro é substituído em memória e o novo regime assume o trade.

## 2. Bloqueios Institucionais Injetados

A Fase 6 incluiu barreiras ativas contra engenharia destrutiva:

- **Negative Alpha Veto:** Mesmo que um experimento seja estatisticamente significante, se a métrica de retorno for menor (Sharpe caiu), ele entra no estado `REJECTED` com código `Negative alpha contribution`.
- **Zero-Lookahead Warranty:** A reconstrução causal do V4 IMCE agora bloqueia inferências usando `candle.close` antes da propriedade `closed: true` ser emitida.

## 3. Resumo da Fase 6
O Lyzer Edge agora possui uma máquina de estados autônoma que quantifica, propõe, testa e descarta variações do seu próprio núcleo de trade, barrando opiniões humanas e exigindo testes de Welch com P-Value < 0.05 para qualquer atualização no Core.
