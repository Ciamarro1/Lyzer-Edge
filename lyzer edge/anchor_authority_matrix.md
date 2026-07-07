# Anchor Authority Matrix

Este documento define a hierarquia estrita de resolução de conflitos entre as âncoras da External Constraint Anchor (ECA). Ele responde à pergunta crítica: **"Qual âncora vence quando há conflito de realidade?"**

O princípio governante é que as âncoras mais determinísticas e externalizadas (infraestrutura) invalidam sumariamente as âncoras derivadas ou probabilísticas.

## Authority Hierarchy

A hierarquia da realidade é processada na seguinte ordem de dominância (do maior para o menor):

### 1. Infrastructure Anchors (MAX AUTHORITY)
- **Natureza:** Hardware, rede e conectividade.
- **Autoridade:** Se uma *Infrastructure Anchor* falhar (ex: Exchange Offline, API Timeout), **ela desliga o sistema inteiro**. Nenhuma outra âncora importa.
- **Exemplo de Conflito:** O Mercado indica um "Healthy Bull Regime" (Market: Healthy), mas a API da exchange está indisponível (Infrastructure: Critical).
- **Resolução:** O ECA impõe VETO GERAL. O sistema entra em modo *Kill Switch*.

### 2. Execution Anchors
- **Natureza:** A mecânica física da operação.
- **Autoridade:** Domina as métricas de mercado. Se a latência ou o slippage são impeditivos, a hipótese de mercado é irrealizável.
- **Exemplo de Conflito:** A liquidez do *Order Book* parece ideal (Market: Healthy), mas as ordens estão sofrendo *Slippage* extremo ou rejeição contínua (Execution: Critical).
- **Resolução:** O ECA bloqueia refatorações e cessa negociações no ativo em questão, degradando a confiança da estratégia para 0.

### 3. Market Anchors (Hard Anchors)
- **Natureza:** A realidade matemática inegável do mercado (Tape, OHLCV).
- **Autoridade:** Domina a confiança interna. A fita de transações ("Trade Tape") nunca mente.
- **Exemplo de Conflito:** O sistema de Causal Intelligence e o Metacognition estão 95% confiantes na subida do preço (Meta: Healthy), mas a fita mostra reversão bruta de volume (Market: Critical).
- **Resolução:** O ECA força a degradação imediata do *Confidence Score* das predições, acionando o FMC (Failure Mode Classifier).

### 4. System Stability Anchors (Meta Anchors) (MIN AUTHORITY)
- **Natureza:** Métricas derivadas da relação Predição vs. Resultado (*Counterfactual Validity*).
- **Autoridade:** A mais fraca. Serve primariamente como diagnóstico precoce e *early warning*. Uma falha aqui não precisa necessariamente desligar o sistema se o mercado e a execução estiverem perfeitos, mas sugere fadiga do modelo.
- **Exemplo de Conflito:** O sistema prevê corretamente os movimentos com boa execução (Market/Execution: Healthy), mas as predições estão sobrevivendo cada vez menos tempo (Meta: Warning).
- **Resolução:** O ECA reduz o teto de confiança para 0.80 e aumenta a amostragem cautelar (Monitor Mode).

## Summary Rule
`Infrastructure > Execution > Market > Meta`

Se uma âncora superior estiver em estado **CRITICAL**, ela oblitera qualquer estado **HEALTHY** relatado pelas âncoras inferiores.
