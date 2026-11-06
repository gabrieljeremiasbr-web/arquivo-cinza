# Arquivo Cinza — Código Sombrio

Site de RPG de investigação, com fichas, campanhas, dados e área do mestre.

## Arquivos

- `index.html`: interface.
- `style.css`: estilos.
- `script.js`: lógica e integração com Firebase.
- `ambiente.js`: áudio.
- `firestore.rules`: regras para aplicar no projeto Firebase. Enviar este arquivo ao GitHub não aplica as regras automaticamente.

## Executar

Sirva a pasta com um servidor HTTP, como Live Server no VS Code. O JavaScript principal usa módulos.

## Imagens

Os sete arquivos enviados estão em `imagem/`, preservados no formato original.

- `logo.png`: logo da entrada e ícone da aba.
- `investigacao.jpg`: fundo da interface e do login.
- `fundo.jpg`: fundo da entrada.
- `inicio.png`, `investigacao.png`, `mestre.png` e `dados.png`: imagens de referência disponíveis no projeto. As telas desenhadas nessas imagens não substituem os controles interativos do site.

## Serviços externos

Firebase Auth e Firestore, biblioteca Three.js via CDN e áudio do YouTube. Login e sincronização dependem da configuração do projeto Firebase, dos domínios autorizados e das regras publicadas.

Este envio organiza o código no GitHub. A hospedagem do site deve ser configurada separadamente.
