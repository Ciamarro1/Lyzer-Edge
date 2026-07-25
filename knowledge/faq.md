---
titulo: "Lyzer Edge — Perguntas Frequentes (FAQ)"
versao: "3.4.0-institutional"
---

# ❓ Lyzer Edge — Perguntas Frequentes (FAQ)

### P: O sistema perde operações se eu fechar o navegador?
**R**: Não. O backend roda de forma autônoma no servidor Node.js/Docker e grava o estado continuadamente em `/tmp/data/engine_state.json`.

### P: Por que ordens eram puladas em wicks rápidos e como isso foi resolvido?
**R**: No modelo anterior, a verificação ocorria no fechamento da vela (1m). Implementamos o guarda instantâneo `checkTickPositionExit(candle)` que fecha posições no momento exato em que o tick de preço toca o SL ou TP.

---

## 🔗 Links Relacionados
- 🌐 [Overview](overview.md)
- 📊 [Snapshot](snapshot.md)
