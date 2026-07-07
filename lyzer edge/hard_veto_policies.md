# Hard Veto Policies

Este documento formaliza as políticas sob as quais o **Veto Engine** aplicará o veto absoluto (`confidence = 0`), forçando o Kernel a bloquear qualquer refatoração, alocação ou operação devido a falhas críticas apontadas primariamente pela **Constraint Engine**.

A matriz de Hard Vetoes independe do cálculo vetorial de probabilidade e não é cumulativa. Uma única quebra implica em *Full System Veto*.

## Matriz de Vetoes Absolutos

### 1. `INFRA_EXCHANGE_OFFLINE`
- **Condição:** A API de status da corretora reporta manutenção, os endpoints REST retornam 5xx repetidamente, ou a conexão primária de websocket fecha e não recupera num timeout severo.
- **Ação do Veto Engine:** Emitir VETO absoluto. Descartar `RDX` do cálculo atual. Enviar sinal `EMERGENCY_NO_GO` para o Kernel. Confiança das predições: travada em 0.

### 2. `INFRA_DATA_STALL`
- **Condição:** O Timestamp do último dado da *Trade Tape* recebido difere do tempo de clock local do sistema em uma margem maior que `X` milissegundos críticos (Feed lag).
- **Ação do Veto Engine:** Emitir VETO. Se o sistema está avaliando o passado atrasado achando que é o presente, todas as inferências são ilusórias. O SML/Kernel não recebem novas observações.

### 3. `EXEC_REJECTION_LIMIT`
- **Condição:** O número de ordens rejeitadas (por saldo falso, formatação incorreta, lot-size desatualizado) da conta real/sandbox excede o limiar tolerável no último bloco de tempo.
- **Ação do Veto Engine:** Emitir VETO. A execução está matematicamente impossibilitada de operar, independente do CIL acreditar em um edge. Interrupção imediata de novas submissões.

### 4. `EXEC_MAX_SLIPPAGE`
- **Condição:** O diferencial constante entre preço intencionado e preço final cruza a margem onde qualquer Alpha identificado é engolido pela fricção física.
- **Ação do Veto Engine:** Emitir VETO operacional. A lógica de decisão de novas entradas (EPE, Sizing) deve considerar confiança 0.

## Consequência do Hard Veto
A premissa do *No subsystem may override an active ECA veto* exige que qualquer componente sistêmico que processe dados adapte-se ao fato de que, sob Hard Veto, ele não deve armazenar hipóteses, não deve otimizar parâmetros e não deve recalcular distribuições de retorno. A realidade fechou suas portas.
