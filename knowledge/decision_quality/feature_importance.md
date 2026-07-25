# Feature Importance & Explainability Report

## 📊 Ranking de Relevância por Modelo SHAP / Random Forest

| Posição | Variável | Importância Relativa (%) | Impacto no Alfa |
|---|---|---|---|
| 1 | **Regime de Volatilidade (ATR)** | **34,00%** | Crítico — Define se a amplitude acomoda o SL |
| 2 | **Estrutura M15 (BOS / CHOCH)** | **28,00%** | Alto — Garante direção macro da liquidez |
| 3 | **Assimetria de Cauda (TRG)** | **18,00%** | Moderado — Contém a exposição de risco |
| 4 | **Alinhamento H4** | **12,00%** | Moderado — Filtro de tendência superior |
| 5 | **Varredura SMC (M1 Sweep)** | **5,00%** | Baixo/Ruidoso — Gerador primário de overtrading |
| 6 | **Horário / Spread** | **3,00%** | Marginal |
