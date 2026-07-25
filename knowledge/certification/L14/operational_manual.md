# 📘 L14 INSTITUTIONAL OPERATIONAL MANUAL — REAL-WORLD & LIVE SHADOW

**Versão:** 14.0 (Julho 2026)  
**Público-Alvo:** Operadores de Infraestrutura, Engenheiros de Confiabilidade (SREs), CRO e Comitê Fiduciário.  

---

## 1. INTRODUÇÃO E FILOSOFIA DE OPERAÇÃO
O Lyzer Edge L14 opera sob a premissa fundamental de que **a proteção do capital e a integridade fiduciária precedem qualquer busca por ganho financeiro**. O operador humano é estritamente proibido de interferir nas heurísticas de geração de sinal (SMC/IMCE V4) ou de forçar ordens em regimes de HALT.

## 2. PROCEDIMENTO DE DEPLOY EM LIVE SHADOW (L15 READINESS)
Para iniciar a fase L15 (Live Shadow sem capital), o operador deve seguir o protocolo estrito:
1. **Ativação da Conectividade Física:** Conectar os clientes WebSocket gRPC/NATS aos feeds de produção da Binance/Exchange ao vivo em modo read-only.
2. **Desativação das Chaves de Assinatura de Ordem:** As chaves de API (`API_KEY`, `API_SECRET`) injetadas no `ExchangeExecution` devem ter permissões exclusivamente de leitura (`READ_INFO`), com permissões de trade (`ENABLE_TRADING`) fisicamente desabilitadas na exchange.
3. **Inicialização do Shadow Ledger:** Rodar o comando de inicialização com o flag de auditoria cega:
   `node backend/server.js --mode=LIVE_SHADOW --blind-audit=true`
4. **Monitoramento de Latência:** Verificar no `observabilityLayer.js` se a latência de roundtrip de rede permanece abaixo do teto institucional (250ms em nuvem).

## 3. PROTOCOLOS DE REAÇÃO A INCIDENTES E HISTERESE
- **Caso A (Divergência de Ledger ou Hash Mismatch):** O sistema entrará automaticamente em `HALT_DIVERGENCE`. O SRE não deve tentar reiniciar o processo imediatamente. Deve acionar o script forense para reconciliação do `DecisionLedger`.
- **Caso B (Queda do Feed de Market Data / WebSocket 504):** O sistema entra em modo falha-fechada. As ordens em aberto são mantidas no estado local, sem envio de novas ordens até a reconexão estabilizar por 300 ticks consecutivos (Regra do MOL).
- **Caso C (Drawdown Intradiário Atingindo 10%):** O `InstitutionalRiskAllocator` cortará o orçamento de risco para 0% e acionará o cooldown de histerese (60 minutos). **Proibido intervir** ou resetar o relógio de histerese manualmente.

## 4. PROCEDIMENTOS DO COMITÊ DE AUDITORIA HUMANA (REGRA 6)
Semanalmente ou perante alertas, o comitê humano deve interrogar o sistema utilizando o `HumanOversightSimulator` nas três vertentes fiduciárias:
- Exigir justificativa de risco-retorno para exposições ativas.
- Exigir comprovação de ausência de overfitting do `IndependentValidationEngine`.
- Exigir validação de que as defesas falha-fechada continuam plenamente ativas e sem bypass.
