# OFI-CONFIRMATION-SETUP-001 — Relatório Constitucional de Veredito Final

**Veredito Oficial**: **FAIL (FALSIFIED ON HISTORICAL REPLICATION SET)**  
**Data da Execução**: `2026-09-03T03:47:11.734Z`  
**População de Teste**: Historical Untouched Replication Set (`2020-01-01` a `2022-12-31`)  
**SHA-256 do Motor V8**: `fc19e807255b3ecfb8351e82d7dc9d244c1e511d9aa007ac8b67b12d584b4db1` (**INTACTO**)  

---

## 1. Tabela Constitucional de Critérios Inegociáveis

| ID | Critério Pré-Registrado | Valor Observado | Limiar Exigido | Veredito |
|---|---|:---:|:---:|:---:|
| **CRIT-1** | Primary Linear Correlation (BTC IC >= +0.020) | **IC = +0.056** | IC >= +0.020 | ✅ **PASS** |
| **CRIT-2** | Non-Parametric Significance (Primary Block B=10 p < 0.05) | **p = 0.0599** | p < 0.05 | ❌ **FAIL** |
| **CRIT-3** | Newey-West HAC Significance (t > 1.96) | **t = 2.25** | t > 1.96 | ✅ **PASS** |
| **CRIT-4** | Sample Mean Net Return per Trade (>= +5.0 bps after 10 bps friction) | **Net Return = +14.17 bps** | Net Return >= +5.0 bps | ✅ **PASS** |
| **CRIT-5** | Incremental Information over Price Momentum (beta_OFI > 0 and t > 1.96) | **beta = 0.1134, t = 3.04** | beta_OFI > 0, t > 1.96 | ✅ **PASS** |
| **CRIT-6** | Direct Replication Consistency (ETH IC > 0) | **ETH IC = -0.0266** | ETH IC > 0 | ❌ **FAIL** |

---

## 2. Síntese Epistêmica

O candidato exploratório **BTC L6/H24**, descoberto originalmente na mineração de 2023–2026, foi testado sob a especificação congelada contra a população intocada de 2020–2022 ($N = 1094$ dias não sobrepostos).

- **Resultado Primário (BTC)**:
  - Pearson $IC = +0.056$ (Newey-West $t = 2.25$).
  - Permutação em Blocos ($B=10$): $p = 0.0599$.
  - Retorno Líquido Médio por Trade (10 bps de custo): +14.17 bps.
  - Modelo Incremental: $\beta_{\text{OFI}} = 0.1134$ ($t = 3.04$).

- **Replicação Direta (ETH)**:
  - Pearson $IC = -0.0266$ ($t = -1.02$).
  - Permutação em Blocos ($B=10$): $p = 0.3566$.

---

## 3. Conclusão Institucional

A decisão sobre o candidato segue a regra de parada constitucional:
**Veredito Final**: `FAIL (FALSIFIED ON HISTORICAL REPLICATION SET)`.
