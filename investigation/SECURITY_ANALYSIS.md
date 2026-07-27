# Security Analysis — Lyzer Edge

## CRITICAL: Secrets Expostos

- **Arquivos .env (2 encontrados):** .env e lyzer edge/.env contêm:
  - GITHUB_TOKEN=ghp_***REDACTED***
  - HF_TOKEN=hf_***REDACTED***
- **Risco:** Qualquer pessoa com acesso ao repositório pode usar esses tokens para ler/escrever em nome do usuário
- **Recomendação:** Rotacionar imediatamente ambos os tokens no GitHub e Hugging Face

## HIGH: Código com exec() inseguro

- lyzer edge/backend/server.js — usa exec() do child_process para backup
- **Risco:** Injeção de comando se argumentos vierem de input não sanitizado
- **Recomendação:** Substituir por execFile() ou usar a API fs diretamente

## MEDIUM: Sem helmet, sem cors, sem auth

- Servidor Express não tem middleware de segurança (helmet, cors)
- WebSocket sem autenticação
- Rotas admin protegidas apenas por query param dminKey
- **Recomendação:** Adicionar helmet, cors, e autenticação via token

## MEDIUM: Dockerfile sem segurança

- Usa 
oot como usuário (deveria ser non-root)
- Sem .dockerignore para excluir .env, node_modules
- **Recomendação:** Usar USER non-root, criar .dockerignore

## LOW: Chmod 777 no server.js

- Backup script usa chmod 777 — permissões excessivas
- **Recomendação:** Usar 755 ou 700

## LOW: Logging de erros sem sanitização

- Vários catch blocks logam o erro completo, possivelmente expondo detalhes internos
