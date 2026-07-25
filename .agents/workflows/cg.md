---
name: Cognitive Governance Dialogue & Execution (The Autonomous Factory)
description: Triggers a high-level cognitive debate (CIA vs CTO vs Ponytail), followed by relentless, multi-agent autonomous execution through the 6 pillars of the Lyzer Factory.
trigger: /cognitive-governance
---
# Cognitive Governance & Autonomous Factory Workflow

Este workflow padroniza a interação entre a camada cognitiva (CIA), a camada técnica (CTO) e o bisturi de simplicidade (Ponytail) na Lyzer Labs, seguido pela execução autônoma total (Fábrica de Software).

## FILOSOFIA DE EXECUÇÃO: A LEI DE SISYPHUS
**Delegação Total.** Lance a IA no problema com ferramentas pesadas e deixe-a moer até terminar. Foco obsessivo em não parar até que a lista de TODOs (Task Artifact) esteja vazia. O Antigravity não é um "assistente de código que escreve funções", é uma "fábrica de software que gerencia o ciclo de vida".

## 1. O Debate (20 Iterações Arquiteturais)
Quando acionado via `/cognitive-governance [Problema]`:

1. **Iterações 1 a 15 (CIA x CTO):**
   - O Orchestrator (CTO) spawna o subagente CIA (`cia.md`).
   - O CIA produz o *Cognitive Snapshot* (Fases 0 a 4).
   - O CTO mapeia isso para a realidade técnica e responde.
   - Eles iteram para destruir ambiguidades, drift semântico e definir a arquitetura (Superegos, Invariantes Epistêmicos, etc).

2. **Iterações 16 a 20 (A Injeção do Ponytail):**
   - Nas últimas 5 iterações do debate, o subagente **Ponytail** (`ponytail.md`) é ativado e inserido na conversa.
   - **A Missão do Ponytail:** Destruir a complexidade gerada pelo CIA e CTO. Ele vai forçar a solução mais estúpida, mais nativa e mais preguiçosa que satisfaça as demandas cognitivas e técnicas aprovadas. Ele corta abstrações desnecessárias antes que a arquitetura seja finalizada.

## 2. A Esteira de Execução (Os 6 Pilares da Fábrica)
Assim que o debate termina e a arquitetura é selada, a execução começa sem intervenção humana, operando sob os 6 Pilares:

1. **Orquestração Multi-Agente:** O CTO cria a lista de TODOs e spawna subagentes paralelos (`frontend-specialist`, `backend-specialist`, `database-architect`) usando `invoke_subagent`. Eles moem as tarefas simultaneamente.
2. **Memória Institucional:** O CTO usa a skill `memory-system` e o comando `/remember` para registrar os ADRs da arquitetura finalizada na pasta `.agents/memory/`.
3. **Raio de Impacto Sintático (AST):** Os subagentes consultam a skill `code-review-graph` para saber topologicamente quais arquivos quebrarão se mudarmos variáveis no core, alterando a base de forma cirúrgica.
4. **Verificação Contínua:** Os agentes escrevem o código, abrem o terminal em background e executam `test_runner.py` e `playwright_runner.py`. Eles leem logs e debugam sozinhos. Só retornam ao humano quando provam que a feature funciona.
5. **Red Teaming (Equipe Adversária):** Antes do "Done", o CTO invoca a equipe adversária de alto nível em uma branch separada. 
   - O **CAA** (Chief Adversarial Architect) estuda a arquitetura construída pelo CIA em busca de falhas cognitivas e epistemológicas.
   - O **ACTO** (Adversarial CTO) desenha a *Kill Chain* técnica e invoca subagentes como o `penetration-tester` para tentar hackear, explorar condições de corrida e derrubar o sistema. O deploy só avança se o Blue Team (CIA/CTO) vencer o Red Team.
6. **Evolução de Procedimentos (SOPs):** Se o workflow revelar um padrão repetitivo novo, o CTO usa a habilidade `skillify` para extrair isso para uma nova `SKILL.md`.
7. **Integração e Entrega Contínua (Push Automático):** 
   - **Gatekeeper de Segurança (Pre-Push):** Antes do push, o subagente `security-auditor` escaneia rigorosamente todo o diff gerado. Nenhuma linha de código vai para o GitHub com chaves de API expostas, credenciais, histórico sujo ou informações sensíveis (Leak Prevention).
   - **Deploy:** Somente após a liberação explícita do Gatekeeper, o CTO cria a mensagem de commit semântica e executa o `git add`, `git commit` e `git push` automaticamente para o repositório remoto.
8. **Gravação de Estado (The Final Checkpoint):** No exato final de todo o workflow (após o push), o CTO **obrigatoriamente** consolida o estado do projeto usando a skill `memory-system` ou acionando a gravação de memória (ex: atualizando o arquivo de investigação) para refletir exatamente o novo estado da arquitetura, decisões tomadas, débitos pagos e próximos passos.

**Regra de Ouro:** O workflow não termina até que a task list esteja vazia, o código esteja provado em execução, o push para o repositório remoto tenha sido concluído com sucesso, e a **memória institucional / documentos de estado do projeto tenham sido atualizados**. Nenhuma pergunta trivial deve ser feita ao usuário durante a moagem.
