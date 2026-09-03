# 🏭 Lyzer Alpha Factory v1.0
## Industrialized Institutional Quantitative Discovery Framework

A **Alpha Factory v1.0** é a infraestrutura unificada e modular de pesquisa quantitativa do Lyzer Edge. Ela substitui a criação artesanal e ad-hoc de scripts por um pipeline industrializado em **3 estágios (*Fast-Fail*)**, reduzindo o tempo de execução de campanhas de dias para segundos, sem abrir mão de nenhuma garantia constitucional.

---

## 🏛️ Princípios Arquiteturais

1. **Constitutional Invariance**:
   - O motor de produção V8 (`institutional_quant_signal_engine.js`) é auditado e verificado como imutável (`fc19e807255b3ecfb8351e82d7dc9d244c1e511d9aa007ac8b67b12d584b4db1`).
   - O Firewall de Dados é *fail-closed*: qualquer tentativa de ler velas posteriores a `2024-12-31T23:59:59.999Z` dispara `FIREWALL_BREACH_EXCEPTION`.
   - O timeframe 1H é bloqueado por padrão (`CONTAMINATED_1H_EXCEPTION`) em novas campanhas competitivas.

2. **Pipeline Hierárquico em 3 Estágios (*Fast-Fail*)**:
   - **Estágio 0 — Censo de Densidade & Viabilidade (< 100ms)**:
     Avalia se a célula gera pelo menos $N_{\text{min}}$ ($60$) eventos viáveis com amplitude $R_{\text{raw}} \ge 80\text{ bps}$. Se falhar, é desqualificada antes da simulação, evitando até 400.000 iterações desnecessárias de bootstrap.
   - **Estágio 1 — Assimetria Econômica (< 500ms)**:
     Simula a execução sob contrato estrito (12 bps all-in, pior caso intrabar, slippage em gap). Células com retorno médio $E[R] < +0,150R$ ou $N < 60$ são filtradas.
   - **Estágio 2 — Bateria de Inferência & Topologia**:
     Executa o Bootstrap de Blocos Calendários de 14 dias UTC ($B = 10.000$, Hall centering), aplica Benjamini–Yekutieli (BY, 2001) para controle de FDR sob dependência arbitrária, e mapeia as bacias topológicas contíguas para extrair o medoide geodésico determinístico.

---

## 📂 Estrutura de Diretórios

```text
research/alpha_factory/
├── core/
│   ├── firewall_guard.js            # Barreira criptográfica de dados (<= 2024-12-31)
│   ├── inference_battery.js         # Bootstrap 14d, BY (2001), BH (1995), Bacias e Medoide
│   ├── event_density_prescreener.js # Estágio 0 Fast-Fail de densidade e viabilidade
│   └── fast_simulator.js            # Simulador de execução sob contrato congelado
├── data_lake/
│   ├── lake_manager.js              # Gerenciador de cache e memória de alta velocidade
│   ├── index_lake.js                # Auditor e indexador do Data Lake
│   └── DATA_LAKE_MANIFEST.json      # Manifesto criptográfico dos datasets certificados
├── pipeline/
│   └── campaign_runner.js           # Orquestrador central de campanhas em 3 estágios
├── tests/
│   ├── alpha_factory.test.js        # Suíte de testes unitários Vitest
│   └── benchmark_ad003_reproduction.js # Benchmark de reprodutibilidade bit-a-bit
└── README.md                        # Este documento
```

---

## 🚀 Como Executar Testes e Benchmarks

### Executar a Suíte de Testes Unitários:
```bash
node node_modules/vitest/vitest.mjs run research/alpha_factory/tests/alpha_factory.test.js
```

### Executar o Benchmark de Reprodução Histórica:
```bash
node research/alpha_factory/tests/benchmark_ad003_reproduction.js
```

### Auditar e Reindexar o Data Lake:
```bash
node research/alpha_factory/data_lake/index_lake.js
```
