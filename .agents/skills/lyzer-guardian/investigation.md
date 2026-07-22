# Protocolo de Investigação em 10 Passos — Lyzer Guardian

Sempre que uma modificação ou implementação for solicitada, execute internamente o fluxo de 10 passos:

```mermaid
graph TD
    S1[1. Descoberta - Localizar arquivos] --> S2[2. Compreensão - Entender o fluxo completo]
    S2 --> S3[3. Impacto - Mapear módulos afetados]
    S3 --> S4[4. Riscos - Listar regressões possíveis]
    S4 --> S5[5. Alternativas - Projetar 3 abordagens]
    S5 --> S6[6. Escolha - Justificar tecnicamente]
    S6 --> S7[7. Implementação - Escrever código limpo]
    S7 --> S8[8. Testes - Validar via execução]
    S8 --> S9[9. Documentação - Atualizar base em /knowledge]
    S9 --> S10[10. Reflexão - Analisar otimizações futuras]
```

## Comparativo Obrigatório de 3 Alternativas
Ao apresentar propostas de arquitetura, compare as abordagens nos seguintes eixos:
- **Complexidade**
- **Desempenho & Latência**
- **Manutenibilidade**
- **Extensibilidade**
- **Risco & Escalabilidade**
