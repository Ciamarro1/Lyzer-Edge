# 🏛️ BATCH 037 — GATE G5: BLIND OUT-OF-SAMPLE (OOS) PRE-REGISTRATION & EPISODE-LEVEL FALSIFICATION MANDATE

**Study Identifier:** `BATCH-037-G5`  
**Protocol Title:** `BLIND OUT-OF-SAMPLE EPISODE-LEVEL VALIDATION OF PERSISTENT NEGATIVE FUNDING REGIME`  
**Registration Date:** 2026-09-01T08:45:00Z  
**Epistemic Authority:** Senior CTO & Executive Engineering Director  
**Status:** 🔒 **FROZEN & IMMUTABLE (PRE-EXECUTION SPECIFICATION)**  

---

## 🎯 1. ISOLAMENTO DO OBJETO CIENTÍFICO (APRENDIZADO DO G4)

Após a autópsia do Gate G4, a hipótese de micro-nicho composto ($N=6$) foi **definitivamente descartada para promoção**. O único objeto científico submetido ao teste cego G5 é a **Persistência Estrutural do Regime de Funding**:

$$S_t = \{ F_t < 0 \quad \text{e} \quad D_t \ge 24\text{h} \}$$

onde:
- $F_t$: Funding rate Point-in-Time estritamente menor que zero.
- $D_t$: Duração contínua do regime de funding negativo $\ge 24\text{ horas}$ consecutivas (3 épocas de funding completas).
- **Zero filtros adicionais:** Nenhum threshold de Wyckoff, indicador técnico ou volatilidade será adicionado.

---

## 📅 2. DIVISÃO TEMPORAL CEGA & CONGELAMENTO DE POPULAÇÃO

1. **In-Sample / Discovery Window (Congelada):**
   - $2023-01-01 \rightarrow 2024-12-31$ (24 meses de histórico).
2. **Blind Out-Of-Sample (OOS) Window (Estritamente Cega):**
   - $2025-01-01 \rightarrow 2026-08-31$ (20 meses de mercado não tocados no desenho).
   - O teste será executado exclusivamente sobre a partição OOS.

---

## 🔬 3. PROTOCOLO DE CLUSTERIZAÇÃO & UNIDADE EXPERIMENTAL POR EPISÓDIOS

### 3.1 Proibição de Tratamento IID de Barras Horárias
É formalmente proibido tratar as observações horárias ($N_{\text{raw}}$) como trades independentes. A unidade experimental do Gate G5 é o **Episódio de Regime Independente** ($E_m$):

1. **Início do Episódio ($t_0$):** Primeiro candle horário onde $D_t = 24\text{h}$.
2. **Disparo de Trade / Entrada:** Execução no fechamento do candle $t_0$.
3. **Horizonte de Avaliação:** $H \in \{24\text{h}, 72\text{h}, 168\text{h}\}$.
4. **Fim do Episódio / Lockout:** O episódio permanece ativo até que o funding rate retorne para $F_t \ge 0$. Nenhuma nova entrada pode ocorrer dentro da mesma janela de persistência.

---

## ⚖️ 4. CRITÉRIOS DE FALSIFICAÇÃO & GATES MATEMÁTICOS DE REJEIÇÃO

Para que o regime seja considerado aprovado no Gate G5, a partição **Blind OOS (2025–2026)** deve atender simultaneamente a:

### 4.1 $G_{5.1}$ — Cardinalidade Mínima de Episódios
- $N_{\text{episodes}} \ge 15$ episódios independentes em OOS.

### 4.2 $G_{5.2}$ — Borda Econômica Líquida por Episódio (OOS)
- Fricção padrão de execução: $0.08\%$ (taxas taker + spread).
- Borda Líquida Mínima Requerida no horizonte confirmatório $H+168$:
  $$\text{Edge}_{\text{net}}^{\text{OOS}} = \overline{R}_{\text{episode}} - 0.08\% \ge +0.20\%$$

### 4.3 $G_{5.3}$ — Robustez de Block-Bootstrap (Resampling por Episódios)
- 1.000 reamostragens em bloco ao nível de episódio.
- O limite inferior do Intervalo de Confiança de 95% do Block-Bootstrap deve ser estritamente superior a zero:
  $$CI_{95\%}^{\text{low}} > 0.00\%$$

### 4.4 $G_{5.4}$ — Estresse da Escada de Fricção (Friction Ladder)
O retorno médio do episódio deve manter-se positivo e viável em 3 níveis de atrito:
1. $0.08\%$ (Fricção Base Taker)
2. $0.15\%$ (Slippage Adverso Moderado)
3. $0.25\%$ (Choque Severo de Liquidez)

---

## 🚫 5. CLÁUSULA DE ARQUIVAMENTO AUTOMÁTICO (FAIL-CLOSED)

Se a partição Blind OOS falhar em qualquer um dos 4 critérios acima:
- A hipótese do Batch 037 será **definitivamente arquivada como `REJECT`**.
- Fica proibido recalibrar thresholds de duração ($D$), modificar horizontes ($H$) ou adicionar filtros auxiliares *post-hoc*.

---

## 🔒 6. ISOLAMENTO DE PRODUÇÃO (TWO-TRACK RULE)

- O ambiente Railway de produção permanece **100% INTOCÁVEL** com `REC_COMP_INSTITUTIONAL_v1`.
- Nenhuma linha de código ou configuração do `StreamEngine` será modificada durante ou após este teste.
