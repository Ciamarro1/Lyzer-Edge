# Lyzer Labs: Deploying the CRS Engine to a Cloud VPS

Como assistente de IA, eu não posso criar a conta na nuvem por você, pois plataformas como Oracle e Google exigem autenticação pessoal (e-mail, telefone e um cartão de crédito apenas para verificar identidade, sem cobranças no plano *Free Tier*).

No entanto, eu estruturei o passo a passo exato para você subir o servidor e deixar o Lyzer Labs rodando eternamente de graça.

## Passo 1: Criar a Conta na Oracle Cloud (Ou Google Cloud)

A Oracle possui o melhor plano gratuito permanente atual.
1. Acesse [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/) e clique em "Start for free".
2. Preencha seus dados reais (a verificação do cartão não debita nenhum valor permanente).
3. Após a conta ser ativada, acesse o painel de controle (Console).

## Passo 2: Criar o Servidor (Instância)

1. No painel da Oracle, vá em **Compute > Instances** e clique em **Create Instance**.
2. Dê o nome de `lyzer-labs-crs`.
3. Na seção **Image and Shape**:
   *   **Image:** Escolha **Ubuntu 22.04** ou **24.04**.
   *   **Shape:** O padrão AMD Micro (1 OCPU, 1GB RAM) ou Ampere A1 (ARM) servem perfeitamente. Ambos são *Always Free*.
4. Na seção **Networking**, pode deixar as opções padrão (Criação de nova VCN).
5. Na seção **SSH Keys**: Escolha **Save Private Key** e guarde esse arquivo no seu computador (você precisará dele para conectar).
6. Clique em **Create**. Aguarde o status ficar verde (*Running*). Copie o **Public IP Address** do servidor.

## Passo 3: Conectar ao Servidor

No seu computador (Windows), abra o PowerShell ou o Terminal e conecte usando a chave que você baixou:

```bash
# Navegue até a pasta onde salvou a chave
cd Downloads

# Conecte ao servidor usando o IP copiado
ssh -i "nome_da_chave_privada.key" ubuntu@IP_DO_SERVIDOR
```
*Se pedir confirmação (fingerprint), digite `yes`.*

## Passo 4: Preparar o Ambiente Linux

Assim que estiver dentro do terminal do servidor, execute os seguintes comandos para instalar o Node.js, Git e o gerenciador de processos PM2:

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js e NPM
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git

# Instalar o PM2 (Gerenciador de Processos 24/7) globalmente
sudo npm install -g pm2
sudo npm install -g tsx
```

## Passo 5: Subir o Código do Lyzer Labs

Você pode enviar os arquivos via GitHub ou diretamente usando SCP. Se não quiser colocar no GitHub público, a forma mais rápida é usar o comando SCP no seu Windows (abra outro terminal no seu PC, na pasta raiz do projeto V3):

```bash
# Copiar a pasta atual para o servidor
scp -r -i "C:\Caminho\para\sua\chave.key" .\* ubuntu@IP_DO_SERVIDOR:~/lyzer_edge/
```

Ou, de volta no terminal do **servidor Linux**, instale os pacotes npm:
```bash
cd ~/lyzer_edge
npm install
```

## Passo 6: Ligar o Motor com PM2

Agora o momento crucial. O PM2 vai rodar o nosso terminal TypeScript em background e protegê-lo contra quedas.

No terminal do servidor, dentro da pasta `lyzer_edge`, rode:

```bash
# Inicia o motor CRS
pm2 start "npx tsx src-ts/crs/crs_terminal.ts" --name "crs-engine"

# Salva o processo para que ele volte automaticamente se o servidor reiniciar
pm2 save
pm2 startup
```

## Monitoramento (Opcional)

Agora você pode fechar o terminal, desligar o seu PC, ir viajar, que a máquina continuará rodando. Se quiser ver os logs, basta conectar novamente e digitar:

```bash
# Ver os logs do terminal em tempo real
pm2 logs crs-engine

# Ver o arquivo de observações acumulando
tail -f data/eml_stream.log
```

Quando o evento empírico (**CSB**) finalmente acontecer na nuvem, o processo travará automaticamente e registrará o log no `fiel_transition.log`.
