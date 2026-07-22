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

Nunca inverta esta ordem.
