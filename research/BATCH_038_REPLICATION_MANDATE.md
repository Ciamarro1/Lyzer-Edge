# 🏛️ BATCH 038 — STRICT PROSPECTIVE REPLICATION MANDATE

**Batch Identifier:** `BATCH-038`  
**Protocol Title:** `STRICT PROSPECTIVE REPLICATION OF PERSISTENT NEGATIVE FUNDING REGIME (D >= 24h)`  
**Registration Date:** 2026-09-01T09:00:00Z  
**Epistemic Authority:** Senior CTO & Executive Engineering Director  
**Nature:** 🔒 **PROSPECTIVE REPLICATION ONLY (ZERO OPTIMIZATION / ZERO TUNING)**  
**Prior Reference:** `BATCH_037_CLOSING_MEMORANDUM.md` (Prior: $\mu_{\text{OOS}} = +0.82\%$, WinRate = $61.1\%$)  

---

## 🎯 1. SCIENTIFIC QUESTION & CORE THESIS

### Pergunta Científica Exclusiva:
> **"O efeito de persistência de funding negativo ($F_t < 0, D_t \ge 24\text{h}$) continua aparecendo quando testado sob especificação previamente congelada em novos dados prospectivos, atingindo significância ao nível de episódios independentes?"**

---

## 🔒 2. ESPECIFICAÇÃO EX-ANTE CONGELADA (ZERO RESEARCHER DEGREES OF FREEDOM)

Todas as definições matemáticas são idênticas ao B037 e estritamente imutáveis:

1. **Condição de Disparo ($t_0$):**
   - $F_{t_0} < 0$ e $D_{t_0} = 24\text{h}$ (exatamente o 24º candle horário consecutivo com funding negativo).
2. **Regra de Lockout / Unidade Experimental:**
   - Apenas 1 observação por episódio.
   - Nenhuma nova entrada até que o funding rate retorne para $F_t \ge 0$.
3. **Horizonte de Avaliação:**
   - Horizonte Primário Confirmatório: $H+168$ (7 dias).
   - Horizontes de Observação: $H+24$ (1 dia), $H+72$ (3 dias).
4. **Modelo de Fricção:**
   - $0.08\%$ (8 bps) para taxas de taker e execução de mercado.
5. **Estimador & Teste Estatístico:**
   - Retorno aritmético simples $R = \frac{C_{t_0+168} - C_{t_0}}{C_{t_0}}$.
   - Block-Bootstrap por episódios (1.000 reamostragens).
   - Teste de hipótese: $H_0: \overline{R}_{\text{episode}} - 0.08\% \le 0$ vs $H_1: \overline{R}_{\text{episode}} - 0.08\% > 0.20\%$.

---

## 📊 3. PROTOCOLO DE ACÚMULO DE DADOS PROSPECTIVOS

- **Dados Excluídos:** Todo o dataset histórico de 2023–2026 já utilizado para descoberta e OOS do B037 é classificado como *dados consumidos*.
- **População do B038:** Exclusivamente candles horários e updates de funding rate gerados **após o corte final do B037 (pós 2026-08-31)**, acumulados prospectivamente via stream da Binance Futures.
- **Critério de Ativação do Teste:** O teste estatístico do B038 só será executado após a coleta de um mínimo de **$N_{\text{episodes}} \ge 20$ novos episódios independentes**.

---

## ⚖️ 4. CRITÉRIOS DE APROVAÇÃO / REJEIÇÃO DO BATCH 038

| Gate | Critério | Limiar Mínimo Requerido | Ação em caso de Falha |
| :--- | :--- | :---: | :--- |
| **$G_{38.1}$** | Cardinalidade Prospectiva | $N \ge 20$ episódios | Aguardar acúmulo de dados |
| **$G_{38.2}$** | Borda Líquida Média | $\text{Edge}_{\text{net}} \ge +0.20\%$ | 🔴 REJECT & ARCHIVE PERMANENTE |
| **$G_{38.3}$** | Block-Bootstrap 95% CI | $\text{CI}_{\text{low}} > 0.00\%$ | 🔴 REJECT & ARCHIVE PERMANENTE |
| **$G_{38.4}$** | Consistência Temporal | Win Rate $\ge 55.0\%$ | 🔴 REJECT & ARCHIVE PERMANENTE |

---

## 🔒 5. REGRAS DE ISOLAMENTO DAS DUAS TRILHAS

1. **Produção (Railway):** Permanece **100% INTOCÁVEL** com `REC_COMP_INSTITUTIONAL_v1`.
2. **Zero Alteração no StreamEngine:** Fica proibido criar novos providers ou mexer no código de produção durante o período de acumulação de dados do B038.
