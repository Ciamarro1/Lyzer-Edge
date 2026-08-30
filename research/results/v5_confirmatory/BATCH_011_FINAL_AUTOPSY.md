# 🏛️ LYZER EDGE — BATCH 011 FINAL AUTOPSY

## 1. O Displacement prevê retorno individual?
**NÃO.** A avaliação do primeiro evento isolado (`ONE_POSITION`) colapsou a Win Rate para 49%, e sob controle estatístico rígido, falhou em rejeitar a hipótese nula ($p \approx 0.05$). O retorno mediano do evento isolado é indistinguível do ruído do regime em que está inserido.

## 2. O Displacement prevê persistência de regime?
**SIM.** Quando agrupados em Clusters (Gap 24h), observamos que o Alfa não está no primeiro evento, mas na *confluência de múltiplos eventos*. A correlação direcional dos eventos em cluster é o verdadeiro gerador de PnL do sistema.

## 3. O segundo evento possui alpha incremental?
**SIM, de forma esmagadora.** A diferença entre `ONE_POSITION` (Capital Flat) e `INDEPENDENT` (onde múltiplos sinais acumulam) é brutal. O PF saltou de 1.84 para 2.42, e o p-valor melhorou de 0.0849 para 0.0094. Isso comprova que a ocorrência do 2º/3º evento confirma que a perna de tendência é verdadeira. Permutações nulas não conseguem capturar esse clustering direcional no mesmo grau.

## 4. Clusters são estatisticamente independentes entre si?
**SIM.** Quando modelados como $N=114$ episódios de regime isolados, o comportamento inter-cluster exibe estabilidade no Walk-Forward (WFA 9/10). 

## 5. O lucro vem do primeiro evento ou da persistência?
Vem estritamente da **persistência e do agrupamento de eventos subsequentes**. O primeiro evento isolado frequentemente é vítima de falsos rompimentos.

## 6. Pyramiding adiciona alpha ou apenas beta/exposição?
O Pyramiding adiciona *Alpha Direcional*. Ao permitir `PYRAMID_1_075_05`, o WFA restaurou para 9/10 e o PF escalou para 2.31, com Win Rate efetiva de 46.5%. No entanto, ele amplifica drasticamente a volatilidade intra-cluster.

## 7. Qual é o risco marginal de cada adição?
As adições de 0.75 e 0.5 expandiram o MaxDD de 27% (`ONE_POSITION`) para 32.66% (`PYRAMID_1_075_05`). Ou seja, para dobrar o Total Equity (110% $\to$ 207%), o rebaixamento de capital aumentou apenas 5 pontos percentuais absolutos. Este é um perfil assimétrico excelente.

## 8. O edge sobrevive a cluster bootstrap (Permutação)?
**AQUI ESTÁ A MORTE DO MODELO.**
Quando tratávamos $N=203$ como independentes, o p-valor era $0.00000$. Ao tratar o verdadeiro grau de liberdade como $N=114$ clusters, o p-valor subiu para $0.00940$ (no melhor cenário), e ao redor de $0.02$ para os modelos estruturados de pyramiding.
Sob a régua de múltiplos testes da matriz (FWER Bonferroni $\alpha = 0.000185$), o p-valor de $0.014$ falha de forma catastrófica. 

## 9. O edge sobrevive a capital constraint?
Sim (do ponto de vista nominal, gera retorno positivo), mas não do ponto de vista de robustez estatística ($p \gg 0.01$).

## 10. O edge sobrevive a slippage adversarial?
O modelo Pyramiding sobrevive a slippages extremas, suportando até 30 bps (PF 1.59, WFA 7/10).

## 11. Existe um modelo estrutural que supera ONE_POSITION?
Sim, os modelos `PYRAMID_1_075_05` superam o `ONE_POSITION` em todos os espectros de risco-retorno.

## 12. Se sim, qual é a evidência fora da amostra?
A evidência bruta (OOS WFA) é excelente (9/10). A evidência estatística rigorosa (Permutação FWER) **falha completamente**.

---

# 🔴 VEREDICTO FINAL DA DIRETORIA

**NO EDGE CONFIRMED.**

Temos um fenômeno comprovado de "Cluster Edge", onde pernas de tendência no BTC acumulam sinais mecânicos, gerando assimetria (PF > 2.0). 
Entretanto, ao submetermos este fenômeno a testes de permutação independentes **com correção para multiplicidade de testes**, não conseguimos provar que a configuração encontrada não é fruto do acaso dado o espaço amostral imenso que já pesquisamos desde o Batch 001.

**Arquivar o modelo V8 e toda a família de Displacement como Alpha Direcional Isolado.**
O sucesso científico desta pesquisa foi provar que o que parecia ser o "Santo Graal" (PF 2.81, p=0) no Batch 009 era, de fato, um vazamento epistemológico via dependência de amostragem. Evitamos a implantação de um sistema artificialmente confiante.
