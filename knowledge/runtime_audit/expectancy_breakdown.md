# Decomposição Matemática de Expectativa (Expectancy Breakdown)

- **Projeto**: Lyzer Edge
- **Auditor**: Guardião da Arquitetura & Principal Quant Auditor (`@[lyzer-guardian]`)
- **Arquivo Auditado**: `lyzer edge/docs/lyzer_edge_backup_2026-07-24.json`

---

## 1. Fórmula da Expectativa Matemático-Estatística

A expectativa por operação $E$ é definida por:

$$E = (W \cdot \text{Avg Win}) - (L \cdot \text{Avg Loss})$$

Onde:
- $W$: Taxa de Vitória (Win Rate) $= 0,3074$ (30.74%)
- $L$: Taxa de Derrota (Loss Rate) $= 0,6883$ (68.83%)
- $\text{Avg Win}$: Ganho Médio por Vitória $= +\$6,00$
- $\text{Avg Loss}$: Perda Média por Derrota $= -\$3,00$

### Cálculo Aplicado:

$$E = (0,3074 \times 6,00) - (0,6883 \times 3,00)$$
$$E = 1,8444 - 2,0649 = -\$0,2205 \text{ por trade}$$

Com um total de **1.389 trades fechados**, a expectativa matemática negativa gera a perda acumulada total de:

$$\text{PnL Total} = 1389 \times (-\$0,2205) = -\$306,27 \approx -\$306,18$$

---

## 2. Ponto de Equilíbrio (Break-Even Win Rate Required)

Para que o sistema obtenha expectativa positiva ($E > 0$) mantendo o perfil de risco $R:R = 1:2$ ($\text{SL} = 3.00, \text{TP} = 6.00$):

$$W_{\text{breakeven}} = \frac{\text{Avg Loss}}{\text{Avg Win} + \text{Avg Loss}} = \frac{3,00}{6,00 + 3,00} = \frac{3}{9} = 33,33\%$$

### Diagnóstico:
- **Win Rate Atual**: $30,74\%$
- **Déficit para Equilíbrio**: $-2,59\%$
- **Déficit para Meta Institucional ($E = +0,82R$)**: O Win Rate necessita atingir no mínimo **47,0%** sob a mesma estrutura de risco.

---

## 3. Decomposição por Direção de Operação (LONG vs SHORT)

| Direção | Operações | Win Rate | Ganho Acumulado ($) | Perda Acumulada ($) | Net PnL ($) | Expectancy ($/trade) |
|---|---|---|---|---|---|---|
| **LONG** | 682 | 31,2% | +$1.278,00 | -$1.407,00 | -$129,00 | -$0,19 |
| **SHORT** | 707 | 30,3% | +$1.284,00 | -$1.461,18 | -$177,18 | -$0,25 |
| **TOTAL** | **1.389** | **30,7%** | **+$2.562,00** | **-$2.868,18** | **-$306,18** | **-$0,22** |

- **Conclusão**: O viés negativo é simétrico entre compras (LONG) e vendas (SHORT), provando que o problema não é a direção do mercado, mas o **excesso de entradas ruidosas**.
