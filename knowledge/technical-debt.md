---
titulo: "Lyzer Edge — Dívida Técnica & Oportunidades"
versao: "3.4.0-institutional"
---

# ⚠️ Lyzer Edge — Dívida Técnica & Oportunidades

1. **Modularização de Chunks no Frontend**: O bundle Vite gera um chunk minificado de ~1.2 MB. Recomenda-se implementar `import()` dinâmico para code-splitting.
2. **Execução de Testes Nativos do SQLite**: Certos testes concorrentes exigem execução sequencial ou limpeza estrita do banco em memória para evitar colisões V8/NAPI.

---

## 🔗 Links Relacionados
- ⚠️ [Riscos](risks.md)
- 📊 [Snapshot](snapshot.md)
