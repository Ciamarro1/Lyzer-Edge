# 🏛️ LYZER EDGE — BATCH 010 EXECUTION INTEGRITY AUDIT

## 1. O Problema da Sobreposição Temporal (Overlap Illusion)
A descoberta primária do Batch 010 é a constatação de que a "maturação do alfa em 72h" (observada no Batch 009) era parcialmente uma ilusão estatística causada por **trade clustering**.

Quando um *Bear Market* transiciona para *Bull Market*, ocorrem múltiplos eventos de *Bullish Displacement* em rápida sucessão. 
Se assumirmos posições independentes e mantivermos cada uma por 72 horas, acabamos empilhando 3 a 5 posições simultâneas capturando o mesmo movimento direcional macro. 

## 2. Impacto na Estatística
Ao rodar a `SUITE F: OVERLAP AUDIT`, forçamos o modelo a respeitar uma restrição rigorosa de capital: **Apenas 1 posição aberta por vez**. 
Se um sinal ocorre enquanto já estamos posicionados, ele é ignorado.

**Os resultados revelaram a verdade:**
- $N$ caiu de 203 para 114 (quase metade dos sinais eram sobreposições).
- O Profit Factor caiu de 2.67 para 2.01.
- A Win Rate despencou de 56.7% para 49.1% (agora mais próximo de um coin flip).
- **O p-valor de permutação disparou de $0.00000$ para $0.04970$.**

## 3. Conclusão Forense
O p-valor $0.04970$ cruza a linha vermelha do critério institucional ($p < 0.01$). Isso significa que, quando tratamos as apostas de forma estritamente independente em relação ao capital, não podemos descartar a hipótese nula com o nível de confiança exigido para produção. O edge existe (PF 2.01 ainda é lucrativo e WFA 8/10 é estável), mas não possui a significância inquestionável que parecia ter sob a ilusão do *stacking*.

## 4. O Caminho Adiante
A estratégia `V8.2-DISPLACEMENT-MOMENTUM` fica **REJEITADA** para alocação direta. 

Contudo, a descoberta abre duas novas portas de pesquisa:
1. **Pyramiding Estrutural:** Se os sinais agrupados são a fonte primária do lucro extremo, talvez a estratégia deva ser explicitamente um modelo de *Pyramiding*, onde sinais subsequentes adicionam tamanho a uma posição base, desde que o risco total seja gerenciado.
2. **Dinâmica de Regime:** O fato de que WFA sobrevive bem (8/10 e 9/10), mas a dependência de agrupamento é alta, sugere que o Displacement não é uma anomalia isolada, mas sim a *assinatura de ignição de uma perna de tendência*.
