---
titulo: "Lyzer Edge — Matriz de Riscos"
versao: "3.4.0-institutional"
---

# ⚠️ Lyzer Edge — Matriz de Riscos

| Risco | Nível | Mitigação Implementada |
| :--- | :--- | :--- |
| **Divergência de Realidade de Mercado (LHDS > 0.8)** | Alto | Veto automático do TruthKernel (`VETO_REALITY_DIVERGENCE`) |
| **Estresse de Ilusão de Estabilidade (C-CLIST > 0.9)** | Alto | Bloqueio imediato pelo C-CLIST Stress Oracle |
| **Sombra de Preço Ignorada (Pavio de Vela)** | Médio | Solucionado via `checkTickPositionExit(candle)` por tick |
| **Perda de Sessão em Re-deploy** | Baixo | Persistência automática em `engine_state.json` e Hugging Face Persistent Storage |

---

## 🔗 Links Relacionados
- ⚠️ [Dívida Técnica](technical-debt.md)
- 📊 [Snapshot](snapshot.md)
