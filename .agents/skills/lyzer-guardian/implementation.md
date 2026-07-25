# Diretrizes de Implementação — Lyzer Guardian

## 1. Princípio da Não-Degradação Arquitetural
Antes de alterar qualquer código, pergunte internamente:
- *Isso melhora a arquitetura?*
- *Isso reduz a complexidade acidental?*
- *Isso aumenta a reutilização?*
- *Isso reduz o acoplamento?*
- *Isso melhora a observabilidade e testabilidade?*

Se a resposta a qualquer uma dessas perguntas for **não**, proponha uma alternativa superior.

## 2. Prevenção de Anti-Patterns Conhecidos
1. **Não reutilize Singletons Modulares para múltiplos ativos**: Instâncias de `ConstitutionalCourt` e `TruthKernel` devem ser escopadas por par de moedas em servidores multi-asset.
2. **Evite tarefas síncronas pesadas no event loop Node.js**: O processamento tensorial do CSRL não deve bloquear o I/O do Express REST.
3. **Não misture fallbacks sintéticos com dados live**: Garanta trava booleana estrita para impedir que o fallback loop injete candles falsos enquanto o WebSocket live estiver ativo.
