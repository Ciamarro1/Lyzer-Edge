# Lyzer Edge — Research & Replay Laboratory

Este diretório contém toda a infraestrutura de pesquisa quantitativa do Lyzer Edge.

## Estrutura

```
research/
├── README.md              ← Este arquivo
├── replay/                ← Replay Engine determinístico
├── datasets/              ← Dados históricos (M1 klines)
├── experiments/           ← Configurações e logs de experimentos
├── results/               ← Resultados de IS (In-Sample)
├── baseline/              ← Resultados do baseline control
├── oos/                   ← Resultados Out-of-Sample
├── stress/                ← Resultados de testes adversariais
└── reports/               ← Relatórios executivos finais
```

## Regras Invioláveis

1. **Não otimize antes de ter um experimento válido.**
2. **Não altere múltiplas variáveis simultaneamente.**
3. **Não confunda hipótese com fato.**
4. **Não misture IS e OOS.**
5. **Determinismo: mesmos inputs = mesmos outputs.**
