# Victory Conditions Registry (Release 1.8A)

> STATUS: FROZEN
> Congelado antes da injeção de dados laboratoriais. Nenhuma modificação permitida.

Este documento resolve a ambiguidade residual da métrica de *Adaptive Advantage* para evitar *Post-Hoc Interpretation* e *Metric Capture*. 

O Tribunal da Realidade do Lyzer Labs julga que sobrevivência biológica (ter $1) sem capacidade operacional não é sobrevivência, e que lucro com risco ruinoso é falha estatística.

## 1. Survival (S)
A sobrevivência não é apenas "possuir capital > 0". O Lyzer Labs define morte institucional como o alcance de um *drawdown* de onde a recuperação probabilística anula a vantagem estratégica.
* `S = 1` se `Max Drawdown < 25%` (Sobreviveu)
* `S = 0` se `Max Drawdown >= 25%` (Sistema é considerado morto, refatoração falhou)

## 2. Capital Efficiency (C)
O crescimento composto real sobre o ambiente de estresse.
* `C = (Final Capital / Initial Capital)`

## 3. Governance Cost (Gc)
O atrito gerado pela lentidão ou rejeição de oportunidades devido às travas constitucionais (SIL, IWL, IIL). Ele já está matematicamente embutido no cálculo do `Final Capital` da versão governada durante a simulação.

## 4. Adaptive Advantage (AA)
A métrica suprema de validação do ciclo 1.7.X. A diferença líquida ponderada pela penalidade de ruína.
* `AA = (S_gov * C_gov) - (S_ungov * C_ungov)`

## 5. Verdict Thresholds
* **VICTORY:** `AA > 0`
  * A Constituição Cognitiva salvou o sistema do *drawdown* letal ou produziu mais capital líquido sem se autodestruir. A Governança ganha o direito empírico de existir.
* **FAILURE:** `AA <= 0`
  * A Constituição foi peso morto (burocracia pura) ou o sistema puramente reativo (sem governança) adaptou-se mais rápido ao regime sem morrer. Componentes governamentais devem ser deletados ou simplificados.
