# MISSION L4+ — ALPHA INDUSTRIALIZATION PROGRAM

## 1. Estado Atual Comprovado
- **Pipeline Alfa Aprovado**: `SMC + V4 IMCE` são os motores definitivos e complementares de alfa.
- **Provider Purge**: `V1` e `V3` foram matematicamente desqualificados por reduzirem a robustez estatística em mercado real. Encontram-se desativados no `streamEngine.js` (`DISABLED_PROVIDERS=v1,v3`).
- **Validação Laboratorial**: Sharpe Out-of-Sample positivo (+4.01) sob validação walk-forward.
- **Arquitetura**: O sistema abandonou a proliferação especulativa de complexidade em prol de validação empírica.

## 2. Hipóteses de Evolução
- **Hipótese 1 (Imunidade de Regime)**: O alfa atual degenera sob regimes de volatilidade extrema e não-direcionais (ex: `CHOPPY`, `TREND_EXHAUSTION`). O mapeamento rigoroso do Regime x Performance permitirá um Veto de Sobrevivência.
- **Hipótese 2 (Sensibilidade Estrutural)**: Os parâmetros fixos de Stop Loss e Take Profit atuais não sobrevivem a variações microestruturais de mercado (spread dinâmico).
- **Hipótese 3 (Erosão no Mundo Real)**: Existe um "Reality Gap" entre a simulação laboratorial e o PnL vivo. O modo *Shadow Trading* quantificará esse drift.

## 3. Critérios de Sucesso
- Criação e execução completa do teste Adversarial de Monte Carlo comprovando resiliência do Sharpe Ratio > 1.5 mesmo com introdução de ruído gaussiano (slippage/spread).
- Deploy do `RealityGapMonitor` no servidor de produção para auditoria passiva contínua.
- Limpeza estrutural da complexidade herdada sem queda na precisão dos sinais do V4 IMCE.
- Nenhuma modificação no motor SMC ou V4 sem evidência estatística comprobatória submetida ao `AlphaEvolutionEngine`.

## 4. Critérios de Rejeição
- Qualquer adição de heurística (ex: novos indicadores genéricos) não suportada pelo Evidence Graph será liminarmente vetada.
- Degradação do Calmar Ratio < 1.0 no Teste de Estresse Monte Carlo.
- Overfitting em hiperparâmetros (Curva de validação divergente no Grid Search).

## 5. Riscos Mapeados
- **Risco Operacional**: O `Shadow Trading` pode poluir os logs de produção se a observabilidade não for estrita.
- **Risco Quantitativo**: O Grid Search pode introduzir viés de seleção retroativa se o P-Value ajustado de Bonferroni não for respeitado.

## 6. Plano de Rollback
- O controle de versão (`git reset --hard`) e o isolamento de pesquisa na pasta `packages/lyzer-shared/src/research/` asseguram que o motor Core (`streamEngine.js`) não será bloqueado.
- Os Vetos de Regime podem ser instantaneamente desativados reduzindo a agressividade no `C-CLIST`.
