# OFI001 — População de Replicação Histórica Intocada

**Identificador**: `OFI001_HISTORICAL_UNTOUCHED_REPLICATION_SET`  
**Classificação**: **Reverse-Temporal Historical Holdout**  
**Status**: **CONGELADO ANTES DO DOWNLOAD CIENTÍFICO**  
**Timestamp de Selamento UTC**: `2026-09-03T03:46:00.000Z`  

---

## 1. Janela Temporal Fechada

A população confirmatória é delimitada estritamente pelo intervalo contínuo $[T_{\text{start}}, T_{\text{end}}]$:
- **$T_{\text{start}}$ (Início Estrito)**: `1577836800000` (**2020-01-01 00:00:00 UTC**)
- **$T_{\text{end}}$ (Fim Estrito)**: `1672527600000` (**2022-12-31 23:00:00 UTC**)
- **Duração Total**: 3 anos calendários completos (1.096 dias devido ao ano bissexto de 2020)
- **Horas de Amostragem Esperadas**: 26.304 barras de 1 hora contínuas por ativo.
- **Unidade de Análise Confirmatória**: 1 dia UTC não-sobreposto ($H=24\text{h}$ às 00:00 UTC).

---

## 2. Ativos e Critérios Mandatórios de Admissão

1. **Ativo Primário Central**: `BTCUSDT`
2. **Ativo de Replicação Direta**: `ETHUSDT`
3. **Regra de Admissão Forense**:
   - Zero gaps temporais não documentados na cadência de 1h.
   - Zero duplicatas.
   - Monotonicidade estrita ($t_{k+1} > t_k$).
   - Integridade de microestrutura: $0 \le V^{\text{taker\_buy}} \le V^{\text{total}}$.
   - Valores numéricos estritamente finitos (zero `NaN`, zero `null`).
   - Hash SHA-256 obrigatório pré-computado e registrado no manifesto.

---

## 3. Cláusula de Imutabilidade Pós-Lacre

Uma vez baixado, auditado e lacrado sob o Data Firewall, esse dataset constitui a **única população válida** para este ciclo confirmatório.
É terminantemente proibido:
- Descartar o período de 2020–2022 caso o resultado seja desfavorável para buscar outro intervalo;
- Modificar o tamanho do bloco primário ($B=10$);
- Realizar consultas parciais durante a execução.
