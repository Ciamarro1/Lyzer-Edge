# ECA ↔ CIL Bridge

O **Causal Intelligence Layer (CIL)** é o motor responsável por formular e avaliar hipóteses contrafactuais ("O que teria acontecido se eu fizesse Y em vez de X?"). A ponte entre o CIL e o **External Constraint Anchor (ECA)** é vital para evitar que as simulações contrafactuais do sistema alucinem viabilidade.

## Counterfactual Validity Score

O CIL produz simulações de trade. O ECA é acionado para validar essas simulações contra o *Anchor Registry* (em especial as *Execution Anchors* e *Market Anchors*).

Quando o CIL gera uma hipótese contrafactual:
1. O CIL propõe: "Se eu tivesse comprado às 10:00 com volume `V`, o lucro seria `P`".
2. O ECA avalia a **Counterfactual Validity**:
   - Existia volume `V` no *Order Book* naquele exato milissegundo? (Market Anchor)
   - O spread real (Slippage previsto vs real) consumiria `P`? (Execution Anchor)
   - A corretora rejeitou ordens ou estava indisponível neste período? (Infrastructure Anchor)

## Feedback Loop

Se o ECA sinalizar que a hipótese contrafactual é **inválida** (não sobreviveria à execução real):
- O `RDX_causal` aumenta.
- O CIL é instruído a reduzir a probabilidade atribuída àquela cadeia de inferência causal.
- A otimização autônoma do modelo (Release 1.8) é restrita para ignorar cenários "ganhadores no papel, perdedores na fita".

O ECA impede que o CIL super-otimize o sistema para mercados de liquidez infinita e execução perfeita inexistentes.
