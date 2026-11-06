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

## Publicação com GitHub Pages

Este site é estático e pode ser publicado pelo GitHub Pages diretamente da branch `main`, pasta `/ (root)`.

1. Abra **Settings → Pages** neste repositório.
2. Em **Build and deployment**, escolha **Deploy from a branch**.
3. Selecione **main** e **/ (root)** e clique em **Save**.
4. O endereço será: https://gabrieljeremiasbr-web.github.io/arquivo-cinza/

A URL do Lovable não será necessária para acessar o site. Para o login do Firebase funcionar na nova URL, adicione `gabrieljeremiasbr-web.github.io` em **Firebase Console → Authentication → Settings → Authorized domains**. Confira também as regras do Firestore. O GitHub Pages não publica automaticamente essas regras.
