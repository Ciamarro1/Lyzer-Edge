# Arquitetura da Camada de Memória Causal (Fase 5.2) — Lyzer Edge

- **Status**: Aprovado pelo Comitê de Banco de Dados & Arquitetura de Armazenamento
- **Data**: 2026-07-22
- **Autor**: Storage Systems Architect (`@[lyzer-guardian]`)

---

## 🎯 Visão Geral da Arquitetura

O **Lyzer Edge** trata o banco de dados relacional não como um repositório genérico de tabelas, mas como uma **Memória Causal de Alta Fidelidade (Causal Memory Layer)**.

Nenhum evento temporal (Kline, Invariante CSRL, Veto Constitucional ou Ordem de Risco) é persistido sem os respectivos identificadores de correlação temporal UUIDv7.

```
       [ StreamEngine / Market Ingestion ]
                        │
                        ▼
      [ In-Memory Spectrogram & C-CLIST ]
                        │
                        ▼
  [ SQLite Causal Memory DB (journal_mode = WAL) ]
            │                       │
            ▼                       ▼
   (WAL File Log Log)    (Shared Memory .shm)
```

---

## ⚙️ Especificação Técnica dos Pragmas Institucionais

| PRAGMA Configurado | Valor | Justificativa de Engenharia |
|---|---|---|
| `journal_mode` | `WAL` | Permite leituras não-bloqueantes simultâneas com gravações em lote. |
| `synchronous` | `NORMAL` | Reduz os flushes de disco síncronos sem comprometer a durabilidade no modo WAL. |
| `busy_timeout` | `5000` (ms) | Elimina exceções de `SQLITE_BUSY` sob rajadas de escrita, aguardando até 5 segundos. |
| `temp_store` | `MEMORY` | Armazena tabelas temporárias e índices auxiliares em RAM. |
| `cache_size` | `-64000` (64MB) | Aloca 64MB de cache de páginas em RAM por conexão de banco. |
| `mmap_size` | `30000000000` (30GB) | Habilita Memory Mapped I/O para leitura direta de páginas de disco via espaço de endereçamento do sistema operacional. |
| `wal_autocheckpoint` | `1000` | Dispara automaticamente o checkpoint PASSIVE ao atingir 1.000 páginas no arquivo `-wal`. |
