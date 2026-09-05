# Ciclo de Pesquisa de Alfa AD007–AD010 e Certificação Operacional da Plataforma

**Data de Registro:** 2026-09-04T21:05:00-03:00  
**Autoridade:** Senior CTO & Executive Engineering Director (`@cto-executive`)  
**Status do Ciclo:** 🟢 CONCLUÍDO & ARQUIVADO / TRANSIÇÃO TRILHA 1 CERTIFICADA  

---

## 1. Contexto e Motivação
Após a falsificação das hipóteses direcionais (H001–H011) e a falha confirmatória de squeeze no Holdout (H012), a pesquisa concentrou-se na extração de prêmios estruturais de juros e base em criptoativos. O programa AD006 isolou o carry perpétuo delta-neutro (H013), mas a validação no Holdout 2025–2026 revelou compressão de rendimento (+3,85% a.a. vs. meta de >= +6,00% a.a.).

Para investigar se o rendimento poderia ser ampliado dentro dos padrões institucionais de risco, foram desenhados e executados quatro programas adicionais:
1. **AD007 (Rotação Transversal & Hurdle):** Rotação mensal para Top 3 ativos com maiores funding rates (H014).
2. **AD008 (Margem de Portfólio Alavancada):** Gearing 2.0x com taxa de empréstimo fiat de 3% a.a. (H015).
3. **AD009 (Estrutura a Termo & Futuros com Entrega COIN-M):** Arbitragem de base trimestral com zero custo de empréstimo (H016).
4. **AD010 (Barbell Híbrido Carry + Direcional V5):** 85% carry 1.5x PM + 15% Wyckoff Spring 1H com funding negativo (H017).

---

## 2. Resultados Comparativos no Holdout Temporal Virgem (2025–2026, 608 dias)

Todos os testes foram executados *one-shot* através de lacres criptográficos pré-registrados em disco, sem vazamento de informação do futuro nem ajuste post-hoc:

| Hipótese | Modalidade de Execução | Retorno Anual. | Sharpe | Max Drawdown | p-valor (Bootstrap) | Veredito Constitucional |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **H013** | Static Perp Carry 1.0x | +3,85% a.a. | 22,77 | 0,49% | 0,0001 | 🔴 REJECTED_NOT_CONFIRMED |
| **H014** | Rotational Top 3 Perp 1.0x | +3,12% a.a. | 11,03 | 0,15% | 0,0001 | 🔴 REJECTED_NOT_CONFIRMED |
| **H015** | Portfolio Margin Carry 2.0x | +4,67% a.a. | 13,74 | 1,77% | 0,0001 | 🔴 REJECTED_NOT_CONFIRMED |
| **H016** | Coin-M Calendar Basis ETH | +4,07% a.a. | 2,02 | 1,30% | 0,0026 | 🔴 REJECTED_NOT_CONFIRMED |
| **H017** | Barbell Synergy (85/15) | +4,10% a.a. | 6,33 | 0,80% | 0,0001 | 🔴 REJECTED_NOT_CONFIRMED |

---

## 3. Os Três Axiomas Estruturais de Derivativos na Era Pós-ETF

1. **Axioma I (Teto Assintótico de Yield Passivo):** A entrada de ETFs à vista e o amadurecimento institucional comprimiram estruturalmente as taxas de carrego delta-neutro para uma faixa assintótica de **3,1% a 4,7% a.a.**
2. **Axioma II (Canibalização pelo Custo de Empréstimo):** A alavancagem em dólares sintéticos via Portfolio Margin incorre em juros de empréstimo (3% a 5% a.a.) que devoram de 38% a 65% do ganho de funding bruto, neutralizando a vantagem de escala.
3. **Axioma III (Invariância do Alfa Direcional por Liquidação):** Enquanto estratégias passivas sofrem compressão de margens, o alfa de absorção de liquidação estrutural (`REC_COMP_INSTITUTIONAL_v1`, Wyckoff Springs sob funding negativo) manteve eficácia robusta (60% win rate no Holdout, Sharpe 6,33, 99,38% de tempo neutro). A absorção de liquidações forçadas independe do ciclo de juros macro.

---

## 4. Certificação da Trilha 1 de Produção & Governança de Capital

- **Invariante Criptográfico V8:** SHA-256 `fc19e807255b3ecfb8351e82d7dc9d244c1e511d9aa007ac8b67b12d584b4db1` intacto.
- **Auditoria de Prontidão:** 10/10 checks aprovados (`scripts/audit_operational_readiness.js`).
- **Portões de Fidelidade:** 7/7 clamps aprovados (`verify_fidelity_gate.js`).
- **Suíte P0:** 49/49 testes verdes (`npm run test:p0`).
- **Escada de Capital:**
  - **Tier 0 (Ativo):** Binance Testnet, **$0,00 USD** capital real.
  - **Tier 1 (Piloto):** Máximo **$500,00 USD**, dependente de assinatura executiva humana out-of-band (Ed25519).
  - **Tier 2 (Escalar):** Máximo **$1.000,00 USD**, após 90 dias ininterruptos com Sharpe > 2,5 e MaxDD < 1,5%.
