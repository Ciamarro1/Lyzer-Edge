### Lyzer Edge — Status do Projeto | 27 Jul 2026

### 1. O Que Funciona
- Pipeline de 7 camadas (SMC → Court) é genuinamente inovador — conceito sólido, parâmetros configuráveis
- Frontend Command Center V2 tem arquitetura de widgets limpa com injeção de dependência
- Cobertura de 108+ símbolos com fallback sintético — o sistema nunca para
- SQLite com WAL mode e batch inserts — dados de candles são duráveis
- Documentação extensa (834 arquivos .md) descreve visão arquitetural clara

### 2. O Que Não Funciona
- **Duas implementações do TruthKernel** com o mesmo nome e algoritmos diferentes — testes cobrem o kernel errado (zero cobertura do kernel de produção)
- **C-CLIST/MOL executados fora da corte** — `streamEngine.js:552-553` atualiza estado silenciosamente antes do `requestPermission()`, criando um backdoor que pode divergir do estado oficial
- **Token de permissão forjável** — assinado com SHA-256 sem chave secreta. Qualquer um que veja um token pode forjar outro. A segurança da corte inteira depende disso
- **174 arquivos mortos (~36.700 linhas)** — código que parece ativo mas nunca é executado. Infla manutenção e engana desenvolvedores
- **Ledger da corte em memória RAM** — zerado a cada restart. Sem replay, sem recovery, sem audit trail persistente
- **11 scripts root quebrados** — usam `import` ESM mas o `package.json` não tem `"type": "module"`. Quebram na execução
- **Dados sintéticos não marcados** — durante quedas de conexão, candles falsas entram no pipeline sem flag. Pipeline não sabe diferenciar dado real de simulado

### 3. Os 3 Bugs Que Matam
1. **Tokens GitHub/HF expostos no .env** → qualquer pessoa com acesso ao repo pode assumir sua conta. Rotação imediata (1h de trabalho). Risco: comprometimento total hoje
2. **PermissionToken SHA-256 sem HMAC** → qualquer ator na rede pode forjar tokens ALLOW e executar trades sem passar pelas 7 camadas. Risco: perda financeira em dias
3. **C-CLIST/MOL backdoor + kernel duplicado** → o pipeline não executa como projetado. CSRL silenciosamente defaulta SDS=0.0, MOL interpreta como "coerência perfeita" e libera recovery prematuro. Risco: trades em condições de pânico em semanas

### 4. O Que Fazer Amanhã
- **Hoje:** Rotacionar `ghp_ZwfR...` e `hf_oENS...` em github.com/settings/tokens e huggingface.co/settings/tokens. Adicionar `.env` ao `.gitignore`
- **Hoje:** Substituir `crypto.createHash('sha256')` por `crypto.createHmac('sha256', secret)` em `permission.js`. Carregar chave do ambiente
- **Esta semana:** Remover as chamadas C-CLIST/MOL pre-evaluadas de `streamEngine.js:552-553`. O `requestPermission()` já faz isso
- **Esta semana:** Escolher um kernel como canônico (o de produção em `packages/lyzer-shared/`) e redirecionar os 5 testes de verificação para ele
- **Este mês:** Deletar `_archive/`, `src/laboratory/`, arquivos duplicados, e `lyzer edge/package-lock.json` (~36.700 linhas de código morto)

### 5. Quanto Tempo e Dinheiro
- **Corrigir tokens + PermissionToken:** 4 horas, custo zero. Risco de não fazer: perda de conta
- **Fechar backdoor + unificar kernels:** 3-4 dias. Risco de não fazer: pipeline não confiável
- **Remover código morto:** 3-5 dias. Risco de não fazer: desperdício contínuo de 40% do custo de manutenção
- **Migrar schema + persistir ledger:** 5-7 dias. Risco de não fazer: dados perdidos em restart; schema changes impossíveis
- **Custo total da dívida técnica crítica:** ~3 semanas solo. Deixar como está custa risco de perda financeira real

### 6. Veredito Final
**O sistema tem a arquitetura quantitativa mais sofisticada que já vi em um protótipo solo, mas uma帐vulnerabilidade crítica (tokens expostos + token forjável) + um backdoor no pipeline + 36.700 linhas de código morto significam que ele não está pronto para produção — e com os tokens expostos, cada hora de espera é uma aposta.**
