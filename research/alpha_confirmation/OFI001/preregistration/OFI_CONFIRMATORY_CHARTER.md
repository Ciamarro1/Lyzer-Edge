# OFI-CONFIRMATION-SETUP-001 — Carta Constitucional de Pré-Registro

**Identificador do Programa**: `OFI-CONFIRMATION-SETUP-001`  
**Linhagem**: `ALPHA_DISCOVERY_001` $\to$ `AD001_CANDIDATE_AUDIT_001` $\to$ `OFI-CONFIRMATION-SETUP-001`  
**Status Operacional**: **SETUP CONCLUÍDO / EXECUÇÃO BLOQUEADA**  
**Timestamp UTC**: `2026-09-03T03:35:00.000Z`  
**Classificação do Fenômeno**: $\mathbf{OFI = \text{🟡 CANDIDATO FORTE DE PESQUISA (NÃO É ALPHA)}}$  
**Engine V8 SHA-256**: `fc19e807255b3ecfb8351e82d7dc9d244c1e511d9aa007ac8b67b12d584b4db1` (Intacto)  

---

## 1. Princípio Constitucional da Separação Estrita

1. **Separação de Espaços**:
   - `research/alpha_discovery/AD001/`: Espaço de Mineração/Descoberta (Contaminado para testes confirmatórios de OFI).
   - `research/alpha_confirmation/OFI001/`: Espaço Confirmatório Intacto, protegido por Data Firewall.
2. **Proibição de Reutilização**:
   Os dados do período 2023-01-01 a 2026-08-31 pertencem ao espaço de descoberta. O teste confirmatório deste candidato exige uma **nova população intocada** (dados temporais não observados ou novas fontes independentes).
3. **Zero Silent Prompt Patching**:
   Nenhum parâmetro ($L, H$, filtros, custos ou thresholds) poderá ser alterado após a ingestão dos dados não observados.

---

## 2. Resumo da Power Analysis Pré-Registrada

Conforme demonstrado em [POWER_ANALYSIS.md](file:///c:/Users/WDAGUtilityAccount/.gemini/antigravity/scratch/Lyzer-Edge/research/alpha_confirmation/OFI001/preregistration/POWER_ANALYSIS.md):

- **Hipótese de Decaimento de Mineração**: O $IC \approx +0.0415$ observado na descoberta provavelmente sofrerá decaimento para $IC_{\text{true}} \in [0.015, 0.025]$ fora da amostra minerada.
- **Dimensionamento para Poder de 80% ($\alpha=0.05$, Unilateral)**:
  - Para $IC = 0.020$: Requer **$N \approx 2.012$ observações diárias independentes** ($\approx 5.5$ anos).
  - Para $IC = 0.025$: Requer **$N \approx 990$ observações diárias** ($\approx 33$ meses em ativo único, ou $\approx 16.5$ meses em painel conjunto BTC + ETH).
  - Para $IC = 0.030$: Requer **$N \approx 687$ observações diárias** ($\approx 22.5$ meses em ativo único, ou $\approx 11.3$ meses conjunto).
- **Mandato de Amostra Mínima**: O teste confirmatório só poderá ser aberto quando o dataset não observado contiver **pelo menos $N \ge 365$ observações não sobrepostas diárias** (1 ano completo de dados novos para painel duplo ou 2 anos para ativo isolado).

---

## 3. Especificação do Candidato Congelado

Documentado em [CUMULATIVE_OFI_FROZEN_SPEC.md](file:///c:/Users/WDAGUtilityAccount/.gemini/antigravity/scratch/Lyzer-Edge/research/alpha_confirmation/OFI001/frozen_spec/CUMULATIVE_OFI_FROZEN_SPEC.md):

- **Fórmula**:
  $$OFI_t = \frac{V^{\text{taker\_buy}}_t - V^{\text{taker\_sell}}_t}{V^{\text{taker\_buy}}_t + V^{\text{taker\_sell}}_t}$$
  $$\text{CumOFI}_t(L) = \frac{1}{L} \sum_{k=0}^{L-1} OFI_{t-k}$$
- **Ativo Primário**: `BTCUSDT` ($L = 6\text{h}, H = 24\text{h}$).
- **Ativo de Replicação Primária**: `ETHUSDT` ($L = 6\text{h}, H = 24\text{h}$ espelho; $L = 3\text{h}, H = 12\text{h}$ local).
- **Cadência**: Observações diárias não sobrepostas ($t_{i+1} - t_i = 24\text{h}$ às 00:00 UTC).
- **Fricção Fixa**: 10 bps por round-trip (5 bps entrada + 5 bps saída).

---

## 4. Teste de Informação Incremental (Model 0 vs Model 1)

O teste primário exigirá rejeição de que o OFI seja apenas um proxy do momentum passado de preço:
- **Model 0 (Preço Apenas)**: $R_{t, t+H} = \alpha_0 + \beta_{\text{price}} R_{t-L, t} + \epsilon_t$
- **Model 1 (Preço + Cumulative OFI)**: $R_{t, t+H} = \alpha_1 + \beta_{\text{price}} R_{t-L, t} + \beta_{\text{OFI}} \text{CumOFI}_t(L) + \eta_t$
- **Condição Sine Qua Non**: $\beta_{\text{OFI}} > 0$ com Newey-West $t > 1.96$ ($p < 0.05$).

---

## 5. Inferência Estatística e Controles Nulos

- **Estatística Primária**: **Block Permutation Test** ($B = 10$ observações = $240\text{h}$, 1.000 replicações, PRNG determinístico).
- **Estatística Secundária**: Newey-West HAC ($L_{\text{lag}} = 5$).
- **Curva de Custos**: Avaliação em $0, 5, 10, 15, 20\text{ bps}$. Break-even requerido $\ge 20.0\text{ bps}$.

---

## 6. Estado Atual de Bloqueio Operacional

- **Data Firewall**: **ARMADO E ATIVO** via `data_firewall_guard.js`.
- **Cofre de Resultados (`results/`)**: **VAZIO E BLOQUEADO**.
- **Próxima Ação Autorizada**: Nenhuma execução está autorizada até a obtenção e auditoria de admissão de um novo dataset intocado em conformidade com o dimensionamento da Power Analysis.
