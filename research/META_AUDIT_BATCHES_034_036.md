# 🏛️ LYZER EDGE — META-AUDIT: FORENSIC REVIEW OF BATCHES 034–036

**Data da Auditoria:** 2026-08-31T23:55:00Z  
**Autoridade:** Senior CTO & Executive Engineering Director  
**Objetivo:** Auditoria metodológica, temporal, estatística e de governança dos experimentos 034, 035 e 036 antes da abertura de novos ciclos de pesquisa.

---

## 🔬 1. MATRIZ DE REVISÃO METODOLÓGICA DOS EXPERIMENTOS

```text
╔═══════════════════════════════════════════════════════════════════════════════════════════════════════╗
║ ITEM AUDITADO                       BATCH 034               BATCH 035               BATCH 036         ║
╠═══════════════════════════════════════════════════════════════════════════════════════════════════════╣
║ 1. Fonte de Dados                   BTCUSDT Spot (1h proxy) Binance Futures (M5/H1) Binance Fut + FR  ║
║ 2. Certificação G-DATA-0            Não (Base legada)       Sim (2.47M candles)     Sim (Auditada)    ║
║ 3. Taker Flow Primário              Proxy BVC (Intra)       Taker Buy Real (fapi)   Funding 8h Real   ║
║ 4. Point-in-Time (Zero Lookahead)   Estrito (Roll 500)      Estrito (Roll 288/20)   Estrito (Binary)  ║
║ 5. Alinhamento Temporal             Candle H1 Close         Candle M5 Close         H1 Close -> FR    ║
║ 6. Correção Autocorrelação (HAC)    Newey-West (L=k+1)      Newey-West (L=k+1)      Newey-West (L)    ║
║ 7. Dimensão Econômica (Friction)    Não avaliada isolada    Sim (0.08% taker fee)   Sim (0.08% fee)   ║
║ 8. Horizontes Ex-Ante vs Testados   Conforme PREREG         Conforme PREREG         ⚠️ H+168 Explorat. ║
║ 9. Graus de Liberdade Efetivos      N=17.043                N=210.234               N=15.384          ║
║ 10. Veredito de Governança          🔴 REJECT               🔴 REJECT               🔴 REJECT         ║
╚═══════════════════════════════════════════════════════════════════════════════════════════════════════╝
```

---

## 🔍 2. AUDITORIA DETALHADA DOS 12 PONTOS CRÍTICOS

### 1. Definição Exata dos Timestamps & Alinhamento de Fechamento
- **Achado:** Em todos os três scripts (`01_extract_*.js`), a sincronização opera no `closeTime` da barra de medição $t$.
- **Validação:** Para prever o retorno futuro $R_{t+k} = \frac{Close_{t+k} - Close_t}{Close_t}$, a decisão é tomada exatamente no instante $Close_t$. Zero vazamento de $Close_{t+1}$.

### 2. Sincronização Point-in-Time Funding $\rightarrow$ Candle H1
- **Achado:** A função `getLatestFunding(h1CloseTime)` executa uma busca binária estrita por `fundingTime <= h1CloseTime`.
- **Validação:** A taxa de funding só é visível para o modelo após sua liquidação oficial pela exchange (00:00, 08:00, 16:00 UTC). Não há interpolação lookahead de taxas futuras.

### 3. Horizontes Ex-Ante vs Descoberta Exploratória no Batch 036
- **Achado Crítico (Bandeira Amarela Identificada):**
  - O texto conceitual do PREREG-036 listou horizontes de $8h, 24h, 48h, 72h$, enquanto o código incluiu $H+168h$ (7 dias).
- **Classificação Forense:**
  - O resultado em $H+168$ ($t = 3.352, p = 0.0008$) deve ser classificado com total rigor como **Hipótese Geradora / Descoberta Exploratória**, e **NÃO como evidência confirmatória pré-registrada**.
  - Essa classificação protege a integridade epistemológica do laboratório contra acusações de data-snooping de múltiplos horizontes.

### 4. Graus de Liberdade Efetivos ($N_{eff}$) & Retornos Sobrepostos
- **Achado:** Ao calcular retornos futuros de $k$ períodos sobre dados contínuos, os retornos são correlacionados por construção ($t$ e $t+1$ compartilham $k-1$ períodos).
- **Tratamento no Laboratório:**
  - Aplicou-se a matriz de autocovariância de Newey-West com kernel de Bartlett e defasagem $L = k + 1$ (ou $L = \lfloor k/8 \rfloor + 1$ no funding).
  - O número de observações independentes efetivas é:
    $$N_{eff} \approx \frac{N}{k}$$
    Para $N = 15.384$ em $H+168$ (7 dias = 168 horas), $N_{eff} \approx 91$ blocos independentes.
  - Com $N_{eff} \approx 91$, o $t\text{-stat} = 3.352$ ainda permanece estatisticamente relevante ($p \approx 0.001$), mas com menor margem de segurança do que os 15k pontos nominais aparentavam.

### 5. Custos de Fricção e Definição de $Edge_{net}$
- **Achado:** O desconto de $0.08\%$ ($8 \text{ bps}$) roundtrip modela adequadamente a taxa padrão Taker de Binance Futures ($0.04\%$ entrada $+ 0.04\%$ saída ou $0.02\%$ maker $+ 0.05\%$ taker $+$ slippage mínimo).
- **Conclusão:** Nenhum sinal com retorno bruto $< 0.18\%$ tem viabilidade econômica em produção.

---

## 🏛️ 3. O MAPA DO CONHECIMENTO NEGATIVO (O QUE APRENDEMOS)

A ciência quantitativa institucional avança eliminando o espaço de hipóteses falsas:

1. **Conhecimento Negativo B034:**
   O fenômeno de grande agressão de volume sem deslocamento imediato de preço em 1H **não gera reversão**. O mercado tende à transmissão de momentum ou rompimento.
2. **Conhecimento Negativo B035:**
   O fluxo agressor isolado em velas de 5 minutos ($VDR \times FI$) **é ruído browniano pós-custos**. O mercado perpétuo de BTCUSDT é eficiente demais no curtíssimo prazo para permitir estratégias direcionais ingênuas de order flow M5.
3. **Conhecimento Negativo B036:**
   O desequilíbrio de funding isolado **não prevê linearmente o preço**. Além disso, o funding rate opera com **profunda assimetria direcional**:
   - Funding Negativo Extremo $\rightarrow$ Shorts pressionados geram pressão compradora forte.
   - Funding Positivo Extremo $\rightarrow$ Não gera queda; reflete continuação eufórica de momentum de alta. Estratégias simétricas de desvanecimento falham.

---

## 🎯 4. DIRETRIZES CONSOLIDADAS PARA O BATCH 037

Quando o laboratório estiver pronto para formular o **Batch 037**, o escopo não será um novo indicador ou fator isolado, mas sim:

**`BATCH 037: CONDITIONAL REGIME STATE PERSISTENCE`**

- **Unidade de Pesquisa:** O **Estado Condicional de Mercado** (Combinação ex-ante de Posicionamento Estrutural $+$ Regime de Volatilidade $+$ Estrutura de Preço).
- **Regra de Não-Promoção Individual:** Nenhum componente isolado (nem funding, nem volume, nem indicador) será promovido a alfa se não demonstrar persistência estatística e margem econômica líquida ($Edge_{net} > 0.20\%$) dentro do estado conjunto.
- **Isolamento de Produção:** O motor operacional de produção (`REC_COMP_INSTITUTIONAL_v1`) permanece **100% blindado e congelado no Soak do Railway**.
