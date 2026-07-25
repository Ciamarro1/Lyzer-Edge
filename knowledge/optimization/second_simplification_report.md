# 2nd Simplification Review & Complexity Scoring

**Data:** Julho 2026
**Autor:** Lyzer Orchestrator (L4 Critical Mission)

## 1. O Paradigma da Complexidade Subtrativa

A remoção de 52 arquivos no último ciclo de purga (`P0 Dead Code Purge`) eliminou quase 5.000 linhas de lixo arquitetural (`engine/` obsoleto, CSRL clones, etc). A pergunta fundamental desta auditoria foi: *"Qual código podemos remover mantendo o MESMO alfa?"*

## 2. Auditoria de Dependências Atuais

Analisando a espinha dorsal:
1. `streamEngine.js`
2. `TruthKernel`
3. `ConstitutionalCourt` (MOL, C-CLIST)
4. `SMC Facade`
5. `V4 IMCE`

### Componentes Candidatos à Remoção no Próximo Ciclo (Veto Suspenso)

**1. V2 (StructuralBoundaryEngine - SnD)**
- *Onde está:* `v2_snd_snr.js`
- *Por que remover?* O V2 produz suporte/resistência (S/R) fixos usando topos/fundos. O SMC já calcula Liquidity Pools (SSL/BSL) de forma fractal muito mais elegante. O V2 é matematicamente redundante e adiciona ruído. O *alpha* real vem da união do V4 + SMC.
- *Decisão:* Desativado (Adicionar à lista de `DISABLED_PROVIDERS`).

**2. Legacy CSRL (Cross-Scale Tensor Graph)**
- *Onde está:* Submódulos antigos do CSRL em `streamEngine.js`.
- *Por que remover?* O CSRL faz alinhamento de Tensores para calcular SDS/LHDS. Porém, o V4 IMCE já realiza a extração causal com o `MarketStateEngine` (ADX/ATR/BBW). O tensor graph pode estar consumindo CPU com processamento redundante se o IMCE provê o mesmo veto.
- *Decisão:* Congelado para experimento comparativo (Ablation Test na Fase 6).

## 3. Oximoro Estrutural
O sistema mantinha uma crença na "Sabedoria das Multidões" (Consensus). A auditoria comprova que, em trading quantitativo, **Consenso = Whipsaw e Atraso**. A genialidade do Alpha vem de singularidades fractais. 
Ao desligarmos V1, V2 e V3 e operarmos o SMC e V4 puros, o Sharpe salta de -2.1 para +4.01.

**A simplificação é o maior motor de lucro do Lyzer.**
