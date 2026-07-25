# Auditoria Técnica — Technical Debt & Anti-Patterns
**Projeto**: Lyzer Edge  
**Arquivo**: `docs/audit/technical_debt.md`

---

## 1. Inventário de Dívida Técnica e Code Smells

### 1. Duplicação de Motores de Sinal
- **Local**: [streamEngine.js](file:///c:/Users/WDAGUtilityAccount/Downloads/projeto/lyzer%20edge/backend/streamEngine.js#L62-L66)
- **Problema**: O `StreamEngine` executa as reconstruções legadas `v1.reconstruct()`, `v2.reconstruct()`, `v3.reconstruct()` para alimentar o `TruthKernel`, enquanto simultaneamente instancia `LiquidityEngine` e `StructureEngine` do pacote SMC para gerar os objetos de visualização de UI (`overlays`).
- **Impacto**: Duplicação computacional a cada tick e risco de divergência entre a decisão da Corte e os indicadores exibidos na tela.
- **Severidade**: ALTA.

### 2. Singleton Pollution em Instâncias Multi-Asset
- **Local**: `packages/lyzer-constitution/src/eca/court.js`
- **Problema**: `court` é exportado como uma instância singleton global (`export const court = new ConstitutionalCourt()`). Em `server.js`, 6 instâncias de `StreamEngine` compartilham o mesmo objeto `court` em memória.
- **Impacto**: Configurações feitas por um ativo sobrescrevem as regras de estresse dos demais ativos.
- **Severidade**: CRÍTICA.

### 3. Acúmulo de Scripts na Raiz de `lyzer edge/`
- **Local**: Raiz do diretório `lyzer edge/`
- **Problema**: Presença de 12 arquivos `verify_*.js` de grande porte (ex: `verify_mne.js` com 41KB, `verify_robustness.js` com 30KB) misturados aos arquivos de configuração do projeto.
- **Impacto**: Poluição visual, falta de padronização na suíte de testes.
- **Severidade**: MÉDIA.
