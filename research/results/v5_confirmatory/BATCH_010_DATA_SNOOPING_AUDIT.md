# 🏛️ LYZER EDGE — BATCH 010 DATA SNOOPING AUDIT

## 1. Qual era a hipótese antes do teste?
A hipótese, formulada no final do Batch 008, era que a falha da estratégia `V8.0-DISPLACEMENT-FVG-LONG` na Análise Walk-Forward (WFA 6/10) se devia à **sobre-filtragem**. A exigência de um FVG e de uma tendência excessivamente inclinada reduziu o tamanho da amostra (N=63), destruindo a consistência estatística. A hipótese previu que relaxar os filtros aumentaria o $N$, estabilizando o WFA e preservando o alfa, que amadureceria melhor em 72h em vez de 12h.

## 2. Qual parâmetro estava pré-registrado?
A matriz pré-registrada no Batch 009 testou configurações rigorosamente independentes usando filtros pré-estabelecidos: `Trend` (None, Simple, Strict), `FVG` (Required, None) e `Horizon` (12h, 24h, 48h, 72h). Nenhum parâmetro de limiar de entrada ($2.0\text{ ATR}$) foi modificado.

## 3. Quais variantes foram exploradas?
Foram exploradas 24 variantes simultâneas de arquiteturas de filtros e horizontes, rodadas em 24 workers isolados.

## 4. Quantos modelos foram testados?
24 modelos independentes. 

## 5. Quantos foram descartados?
23 modelos foram descartados por falharem no controle rigoroso FWER de Bonferroni ($p < 0.00042$), PF $< 1.20$ ou WFA $< 7/10$.

## 6. Qual modelo venceu?
`V8.2-DISPLACEMENT-MOMENTUM`: Trend = `BULL_SIMPLE`, FVG = `NONE`, Horizon = `72h`.

## 7. O modelo vencedor foi selecionado usando informação OOS?
**NÃO.** O WFA (Walk-Forward Analysis) é inerentemente out-of-sample para cada janela. As 10 janelas temporais foram fixadas no Batch 007 e não foram alteradas ou deslocadas para "encaixar" um resultado melhor. A correção FWER (Bonferroni) penalizou severamente a matriz de 24 testes, exigindo $p < 0.00042$ (Teste Nulo em Monte Carlo), de forma que o fato de termos testado 24 coisas foi punido estatisticamente.

## 8. O resultado continua significativo após correção?
**SIM.** O p-valor empírico após 10.000 permutações Monte Carlo no Null Universe respectivo (`BULL_SIMPLE`) retornou exatamente $0.00000$ (Nenhuma permutação aleatória dentre as 10.000 simulou um PF de 2.81 num universo de $N=203$). Portanto $p < 0.0001 < 0.00042$, o que confirma validade robusta sob Controle de Erro Family-Wise.

## 9. Próximo Estágio (Batch 010):
O Batch 010 foca em **execution validity**. Ele questiona abertamente se o $N=203$ é uma ilusão estatística causada por "overlapping trades" (acumulação de eventos dependentes). Se as múltiplas posições simultâneas quebrarem a estratégia sob restrição de capital (`ONE_POSITION`), o modelo será rebaixado.
