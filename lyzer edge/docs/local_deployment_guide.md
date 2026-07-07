# Lyzer Labs: Local PC Deployment Guide

Como a transição para a nuvem (VPS) foi abortada, o motor do Lyzer Labs (V3) deverá operar na sua máquina pessoal. 
Isso introduz riscos severos de interrupção (reboots do Windows, modo suspensão, fechamento acidental). Para mitigar esses riscos e manter a validade do experimento, siga este protocolo rigoroso:

## 1. Configuração de Energia do Windows (Crítico)
Se o seu PC entrar em modo "Suspender" (Sleep), o tempo congela para o experimento. O motor parará de coletar observações.
- Pressione a tecla `Windows` e digite **"Escolher um plano de energia"** (Power Options).
- Clique em **"Alterar configurações do plano"**.
- Em "Suspender a atividade do computador", selecione **"Nunca"** (Never).
- Em "Desligar o vídeo", você pode deixar como quiser (desligar a tela não afeta o script).

## 2. Instalação do PM2 no Windows
Nós não rodaremos o script em um terminal normal (se você fechar o 'X' sem querer, o experimento morre). Usaremos o PM2 para Windows.

Abra o PowerShell como Administrador e instale as ferramentas necessárias (se já não as tiver):
```powershell
npm install -g pm2
npm install -g pm2-windows-startup
npm install -g tsx
```

Instale o serviço de inicialização automática do Windows (para que o script volte se acabar a energia ou o Windows Update reiniciar a máquina de madrugada):
```powershell
pm2-startup install
```

## 3. Iniciando a Esteira Empírica
No PowerShell, navegue até a raiz do projeto (onde está o `package.json`):
```powershell
cd "C:\Caminho\para\seu\projeto\lyzer edge"

# Iniciar o motor TypeScript via PM2
pm2 start "npx tsx src-ts/crs/crs_terminal.ts" --name "crs-engine"

# Salvar o estado para religar caso o PC reinicie
pm2 save
```

## 4. O Isolamento Operacional (Quarentena Local)
Como o código está rodando no seu computador pessoal, o risco de **Operator Proximity** (Pressão do Operador) é extremo.
A Governança da CIA exige:
1. **Não olhe os logs diariamente.** A ansiedade invalidará a sua neutralidade.
2. **Não altere os arquivos da pasta `src-ts`.**
3. **Ignore o processo.** Deixe o PM2 rodando no background silenciosamente.

Para checar se ele está vivo (digite no PowerShell):
```powershell
pm2 status
```
Para ver os logs reais, caso queira matar a curiosidade esporadicamente:
```powershell
pm2 logs crs-engine
```

O arquivo crítico `data/fiel_transition.log` só será criado quando a guilhotina cair. Não espere por ele. Deixe o tempo passar.
