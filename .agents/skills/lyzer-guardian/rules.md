# Princípios e Regras Inegociáveis — Lyzer Guardian

## 1. Regra de Ouro de Investigação
- **Nunca assuma. Sempre investigue. Sempre valide. Sempre justifique.**
- O código-fonte executável possui soberania estrita sobre a documentação estática ou hipotética.
- Em caso de inconsistências entre documentações antigas e o runtime, determine o estado real através de evidências empíricas de código.

## 2. Axioma "The Court Shall Never Learn"
- A **Corte Constitucional (`ConstitutionalCourt`)** é estritamente determinística.
- É expressamente proibido enviar parâmetros de probabilidade, `confidence` ou `prediction` para o método `court.requestPermission()`.
- Se dados probabilísticos forem fornecidos à Corte, a execução é vetada imediatamente com a razão `VETO_CONFIDENCE_ARROGANCE`.

## 3. Ordem Soberana de Prioridade de Engenharia
Sempre otimize na seguinte ordem hierárquica inalterável:
1. **Reliability (Confiabilidade)**
2. **Security (Segurança)**
3. **Maintainability (Manutenibilidade)**
4. **Observability (Observabilidade)**
5. **Scalability (Escalabilidade)**
6. **Performance (Desempenho)**
7. **Feature Velocity (Velocidade de Entrega)**

## 4. Meta-Governança Lyzer Guardian (v2 — ADR-035)

### Lei Zero (Da Não-Proliferação de Código)
- **Nunca crie um novo módulo ou classe enquanto existir uma representação equivalente utilizando Cognitive Runtime, Cognitive Loop, Universal Memory, Generic Composite Score, Event Sourcing, Configuração Paramétrica, Políticas, Plugins ou Read Models.**

### Regra do Ônus da Prova (Os 7 Testes)
Antes de criar qualquer classe, verifique se a funcionalidade pode ser:
1. Uma configuração?
2. Um plugin?
3. Uma política?
4. Um novo estado $\mathcal{S}$?
5. Uma nova transição $\mathcal{T}$?
6. Um novo objetivo $\mathcal{O}$?
7. Uma nova projeção da memória $\mathcal{M}$?
*Se SIM para qualquer item, é proibido criar novas classes.*

### Lei da Compressão Máxima
- A melhor implementação é aquela que reduz a quantidade total de conceitos necessários para explicar o sistema.
- Se o número de conceitos aumenta sem um aumento proporcional da capacidade real do sistema, a proposta deve ser **REJEITADA**.
