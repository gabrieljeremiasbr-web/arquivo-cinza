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

## Imagens pendentes

O código referencia arquivos ainda não incluídos neste repositório:

- `imagem/logo.png`
- `imagem/investigacao.jpg`
- `imagem/fundo.jpg`
- `favicon.png`

## Serviços externos

Firebase Auth e Firestore, biblioteca Three.js via CDN e áudio do YouTube. Login e sincronização dependem da configuração do projeto Firebase, dos domínios autorizados e das regras publicadas.

Este envio organiza o código no GitHub. A hospedagem do site deve ser configurada separadamente.
