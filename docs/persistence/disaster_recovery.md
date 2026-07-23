# Protocolo de Recuperação de Desastres e Crash Recovery — Lyzer Edge

- **Status**: Aprovado pelo Comitê SRE & Production Reliability
- **Data**: 2026-07-22
- **Autor**: Production Reliability Auditor (`@[lyzer-guardian]`)

---

## 🛡️ Procedimento de Recuperação Pós-Crash (Crash Recovery Protocol)

Em caso de interrupção não programada do processo Node.js (e.g. falha de energia, kernel panic ou SIGKILL):

1. **Reabertura do Banco de Dados**:
   Ao inicializar o `CausalMemoryDB`, o driver do SQLite detecta automaticamente a presença dos arquivos `.db-wal` e `.db-shm`.
2. **Replay de Log WAL**:
   O SQLite executa o replay atômico de todas as transações commitadas no log WAL que ainda não haviam sido transferidas para o banco principal `.db`.
3. **Validação da Linha Temporal**:
   A suíte de verificação lê o último registro com `UUIDv7` válido e retoma a sincronização sem duplicidade de candles.

---

## ⚡ Testes de Caos de Persistência (CE001 Execution)

O experimento de caos `CE001-sqlite-latency` foi executado antes e depois da habilitação do modo WAL:

- **Antes (DELETE Mode)**: O atraso de disco de 500ms causava acúmulo nas filas da aplicação e spikes na rota `/metrics`.
- **Depois (WAL Mode)**: O arquivo `-wal` absorve as gravações no topo da memória sem bloquear as leituras do Dashboard nem a raspagem do endpoint Prometheus.
