# OFI-CONFIRMATION-SETUP-001 — Data Firewall & População Intacta

**Identificador**: `DATA_FIREWALL_SPEC`  
**Diretório do Firewall**: `research/alpha_confirmation/OFI001/untouched_data/`  
**Timestamp UTC**: `2026-09-03T03:32:00.000Z`  
**Status**: **ARMADO E BLOQUEADO**  

---

## 1. Princípio do Firewall Epistêmico

O firewall de dados estabelece uma **fronteira criptográfica e de permissão unidirecional**:
1. **Isolamento do Discovery**:
   Nenhum código ou script residente em `research/alpha_discovery/` possui permissão ou capacidade de leitura sobre o diretório `untouched_data/`.
2. **Imutabilidade Antes da Abertura**:
   Nenhum dataset pode ser depositado em `untouched_data/` sem:
   - Registro prévio do SHA-256 no `MANIFEST.json`.
   - Congelamento estrito da especificação do protocolo (`CUMULATIVE_OFI_FROZEN_SPEC.md`).
3. **Proibição de Ajuste Pré-Abertura**:
   O runner confirmatório é estritamente compilado para ler a especificação congelada e executar um único passe determinístico fail-closed. É vedado qualquer modo "debug" ou "dry-run" exploratório sobre os dados intactos.

---

## 2. Requisitos de Admissão da População Intacta

Para que um dataset seja aceito em `untouched_data/`:

| Requisito | Critério Técnico | Verificação |
|---|---|:---:|
| **1. Não-Contaminação Temporal** | Dados gerados estritamente fora do intervalo de mineração (pós 2026-08-31 ou séries arquivais pré-2023). | Verificação de timestamp |
| **2. Integridade Criptográfica** | Hash SHA-256 pré-computado e registrado no manifesto antes da ingestão. | Hash match |
| **3. Variáveis Obrigatórias** | `timestamp`, `open`, `high`, `low`, `close`, `volume`, `taker_buy_volume`. | Validação de schema |
| **4. Frequência Nativa** | 1 hora contínua, UTC, sem gaps artificiais. | Auditoria monotônica |
| **5. Volume Mínimo (Power)** | Pelo menos 365 a 730 observações diárias independentes ($N \ge 365$ dias). | Checagem de dimensão |

---

## 3. Estado Atual do Firewall

- O diretório `untouched_data/` está criado e sob custódia governamental.
- Nenhum dado confirmatório foi depositado ou aberto.
- Os resultados permanecem estritamente **BLOQUEADOS**.
