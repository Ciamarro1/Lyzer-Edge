# CAPITAL PRESERVATION POLICY (L7)
**Date:** Julho 2026

Este documento estabelece as leis irrevogáveis de proteção do capital do fundo Lyzer Edge. O descumprimento de qualquer destas regras exige o desligamento mecânico do sistema.

## 1. Limites de Drawdown Diário (Circuit Breakers)
- **Soft Stop:** Se o portfólio sofrer um Drawdown Intradiário > **5%**, o `CapitalGovernor` entrará em **CAUTIOUS MODE**, cortando o *Position Sizing* pela metade.
- **Hard Stop (Circuit Breaker):** Se o portfólio sofrer um Drawdown Intradiário > **10%**, todas as ordens abertas devem ser canceladas e as posições fechadas a mercado (ou limit se spread > max). O sistema entra em estado de **HALT**.

## 2. Cooldown e Recovery Mode
- Após o acionamento de um Hard Stop, o sistema **NÃO PODE** religar automaticamente. É exigido um *cooldown period* mínimo de **24 horas**.
- O religamento deve ocorrer em **Recovery Mode**: *Position Sizing* é travado no tamanho mínimo (`baseAllocation`) por 5 trades consecutivos com expectancy positiva, para provar que a assimetria do regime foi restaurada.

## 3. Desligamento por Divergência Institucional (Reality Gap)
- Se a divergência entre a execução pretendida pelo Alpha e o Execution Replay (Realized Price) ultrapassar uma média de **15%** do PnL bruto em uma janela móvel de 30 dias, o Lyzer assume que as condições da Exchange mudaram estruturalmente (taxas, latência).
- O sistema paralisa as ordens e regride o status de "Live" para "Shadow Mode" automaticamente até a calibragem ser re-homologada num novo ciclo L7.
