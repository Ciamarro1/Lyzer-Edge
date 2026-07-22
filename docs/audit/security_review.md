# Auditoria Técnica — Security Review
**Projeto**: Lyzer Edge  
**Arquivo**: `docs/audit/security_review.md`

---

## 1. Avaliação da Superfície de Ataque e Vulnerabilidades

### 1. Gestão de Credenciais e Segredos
- **Achado**: O arquivo `.env.template` orienta a configuração de chaves de API da Binance (`BINANCE_API_KEY` e `BINANCE_API_SECRET`).
- **Risco**: Chaves de API configuradas via variáveis de ambiente em contêineres Docker podem ser expostas caso o endpoint `/api/status` ou logs de exceção não filtrados imprimam a `process.env`.
- **Recomendação**: Mascarar `process.env` em logs e utilizar gestão de segredos via Docker Secrets ou Hugging Face Secrets.

### 2. Endpoints HTTP REST sem Autenticação
- **Achado**: Endpoints destrutivos no `server.js`:
  - `POST /api/trades/close`
  - `POST /api/trades/delete`
  - `POST /api/trades/wipe`
  Estão totalmente expostos sem exigência de cabeçalho de autenticação ou token JWT.
- **Risco [ALTO]**: Qualquer atacante na rede pode enviar uma requisição `POST /api/trades/wipe` e apagar todas as posições ativas em memória.
- **Recomendação**: Adicionar middleware de autenticação (API Key Header ou JWT) para todas as rotas `/api/trades/*`.

### 3. Comunicação Inter-Processos (IPC / gRPC / NATS)
- **Achado**: O servidor NATS é iniciado com `nats-server -js` sem exigência de autenticação por senha ou TLS por padrão nas portas locais.
- **Impacto**: Em ambiente contêiner único a mitigação ocorre pela isolação da rede do contêiner, porém em deployments multi-node a porta 4222 necessita de TLS e auth token.
