# Estratégia de Checkpoint WAL e Concorrência — Lyzer Edge

- **Status**: Aprovado pelo Comitê de Banco de Dados & Storage
- **Data**: 2026-07-22
- **Autor**: Principal Database Engineer (`@[lyzer-guardian]`)

---

## 🛠️ Modos de Checkpoint e Frequência

O arquivo de log `-wal` acumula alterações estruturais sequenciais. Para evitar o crescimento descontrolado do arquivo `-wal`, o `CausalMemoryDB` aplica uma estratégia em 3 níveis:

### 1. `wal_autocheckpoint = 1000` (Nível Automatizado)
O motor do SQLite transfere páginas do `-wal` para o banco de dados principal `.db` assim que o log atinge 1.000 páginas sem bloquear leituras ativas.

### 2. Checkpoint `PASSIVE` (Nível de Aplicação)
Invocado via `db.walCheckpoint('PASSIVE')` ao término de transações em lote pesadas. Transfere todas as páginas disponíveis sem travar leitores ativos.

### 3. Checkpoint `RESTART` / `TRUNCATE` (Nível de Manutenção)
Executado durante janelas de baixa volatilidade ou no encerramento limpo do servidor (`db.close()`) para zerar o tamanho do arquivo `-wal`.

---

## 🔒 Preservação da Integridade Causal (UUIDv7)

O uso do modo WAL garante que a ordem estritamente atômica de gravação das transações é mantida no log apêndice.

$$\text{UUIDv7 (Timestamp MS + Sequence)} \rightarrow \text{Gravação Atômica WAL} \rightarrow \text{Preservação da Linhagem Causal}$$

Mesmo sob concorrência de leitores do Spectrogram, nenhuma transação pendente é visível antes da conclusão do `COMMIT`.
