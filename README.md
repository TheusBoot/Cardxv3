# 🐦 CardX — Tweet Card Generator

> Gere prints estilizados de tweets reais diretamente pela URL — com suporte a imagens, vídeos e exportação em PNG, WebM e MP4.

---

## 📋 Índice

- [Sobre o Projeto](#-sobre-o-projeto)
- [Funcionalidades](#-funcionalidades)
- [Preview](#-preview)
- [Tecnologias](#-tecnologias)
- [Pré-requisitos](#-pré-requisitos)
- [Instalação e Uso](#-instalação-e-uso)
- [Estrutura de Arquivos](#-estrutura-de-arquivos)
- [Como Funciona](#-como-funciona)
- [Rotas do Servidor](#-rotas-do-servidor)
- [Limitações Conhecidas](#-limitações-conhecidas)
- [Perguntas Frequentes](#-perguntas-frequentes)
- [Licença](#-licença)

---

## 📌 Sobre o Projeto

O **CardX** é uma ferramenta local que permite gerar cards visuais de tweets reais a partir da URL. Cole o link de qualquer tweet público e o sistema busca automaticamente o nome do usuário, foto de perfil, texto, imagens e vídeos — montando um card fiel ao layout do X (antigo Twitter).

O projeto nasceu da necessidade de criar prints de tweets de forma rápida, bonita e offline, sem depender de ferramentas externas com limitações de plano.

---

## ✨ Funcionalidades

- 🔗 **Importação por URL** — cole qualquer link `x.com/...` ou `twitter.com/...`
- 👤 **Dados reais** — nome, @handle, foto de perfil e badge de verificado
- 📝 **Texto completo** com @menções e #hashtags clicáveis
- 🖼️ **Suporte a imagens** — foto única ou grade de até 4 fotos
- 🎬 **Suporte a vídeos** — reprodução no card + gravação com áudio
- 🌗 **Modo claro e escuro** (X Light / X Dark)
- 🎨 **Personalização** — cor do avatar, edição manual de todos os campos
- 📥 **Exportação em PNG** — alta resolução (3x scale)
- 🎥 **Exportação em vídeo** — WebM ou MP4, com áudio sincronizado
- 📋 **Copiar imagem** direto para a área de transferência
- 📱 **Layout responsivo** — funciona em telas menores

---

## 🖼️ Preview

```
┌─────────────────────────────────────────┐
│  [foto]  Nome do Usuário ✓              │
│          @handle                    𝕏   │
│                                         │
│  Texto do tweet com @menção e #hashtag  │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │         [ imagem / vídeo ]      │    │
│  └─────────────────────────────────┘    │
│                                         │
│  3:45 PM · 25 mar 2026                  │
│  ─────────────────────────────────────  │
│  🔁 312 Retweets  ❤️ 2,4K Curtidas     │
└─────────────────────────────────────────┘
```

---

## 🛠️ Tecnologias

| Camada | Tecnologia |
|--------|-----------|
| Frontend | HTML5, CSS3, JavaScript (ES2022) |
| Backend | Node.js, Express |
| Fetch HTTP | node-fetch@2 |
| Captura de tela | html2canvas 1.4.1 |
| Gravação de vídeo | MediaRecorder API + Canvas captureStream |
| APIs externas | fxtwitter API + Twitter Syndication API |

---

## 📦 Pré-requisitos

- [Node.js](https://nodejs.org/) versão 16 ou superior
- npm (já vem com o Node.js)
- Navegador moderno: **Chrome 109+** ou **Firefox 113+**
  - Para exportar MP4: Chrome 130+

---

## 🚀 Instalação e Uso

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/cardx.git
cd cardx
```

### 2. Instale as dependências

```bash
npm install express node-fetch@2
```

### 3. Inicie o servidor

```bash
node server.js
```

Você verá no terminal:
```
✅ CardX Server rodando em http://localhost:3000
```

### 4. Acesse no navegador

```
http://localhost:3000
```

> ⚠️ **Importante:** abra sempre via `http://localhost:3000`, nunca abrindo o arquivo HTML diretamente pelo Explorer. O servidor local é necessário para resolver o CORS das APIs do Twitter.

### 5. Use

1. Cole a URL do tweet no campo superior
2. Clique em **Buscar** (ou pressione Enter)
3. O card é gerado automaticamente
4. Ajuste nome, texto, cores ou modo escuro pelo painel lateral
5. Clique em **Baixar PNG** ou **Gravar Vídeo + Áudio**

---

## 📁 Estrutura de Arquivos

```
cardx/
│
├── index.html      # Estrutura HTML — layout, sidebar, card e skeleton
├── style.css       # Estilos — tema escuro, card do tweet, responsivo
├── app.js          # Lógica — fetch, render, gravação de vídeo, exportação
├── server.js       # Servidor Node.js — proxy CORS para APIs do Twitter
│
└── README.md
```

### Responsabilidades de cada arquivo

**`index.html`**
Contém toda a estrutura da interface: header com barra de URL, sidebar com os campos editáveis e o painel de exportação, área principal com o card do tweet, skeleton de loading e mensagens de erro.

**`style.css`**
Define o tema escuro da aplicação, o layout em grid de duas colunas, os estilos do card do tweet (modo claro e escuro), a animação de shimmer do skeleton, a barra de progresso da gravação e os breakpoints responsivos.

**`app.js`**
Contém toda a lógica JavaScript dividida em módulos funcionais:
- **Estado global** — variáveis compartilhadas entre funções
- **API** — funções para montar as URLs do proxy e das APIs externas
- **Fetch** — `tryFxTwitter`, `trySyndication`, `fetchTweet` com timeout e cancelamento
- **Render** — `renderCard`, `renderMedia` para montar o card no DOM
- **Gravação** — `startRecordVideo`, `stopRecording`, `saveRecording` com captura de áudio
- **Exportação PNG** — `getCardCanvas`, `downloadPNG`, `copyPNG` com pré-carregamento de imagens como blob
- **Helpers** — `esc`, `fmtNum`, `formatDate`, `renderText`, `setStatus`, etc.

**`server.js`**
Servidor Express que resolve o problema de CORS ao agir como intermediário entre o browser e as APIs externas do Twitter. Expõe três rotas de proxy.

---

## 🔌 Rotas do Servidor

### `GET /proxy/fxtwitter`
Proxy para a API pública do fxtwitter, que retorna dados estruturados do tweet.

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `user` | string | Username do autor |
| `id` | string | ID numérico do tweet |

```
GET /proxy/fxtwitter?user=elonmusk&id=1234567890
```

---

### `GET /proxy/syndication`
Proxy para a API de syndication oficial do Twitter (a mesma usada pelo botão "Embed Tweet"). Usada como fallback quando o fxtwitter falha.

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | string | ID numérico do tweet |

```
GET /proxy/syndication?id=1234567890
```

---

### `GET /proxy/media`
Proxy para imagens e vídeos hospedados nos servidores do Twitter (`pbs.twimg.com`, `video.twimg.com`). Resolve o CORS para que o canvas possa desenhar a mídia sem ficar "tainted". Suporta Range Requests para streaming de vídeo.

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `url` | string | URL completa da mídia (deve ser de domínio twimg.com) |

```
GET /proxy/media?url=https://pbs.twimg.com/media/exemplo.jpg
```

> Por segurança, apenas URLs dos domínios `twimg.com` são permitidas. Qualquer outro domínio retorna `403 Forbidden`.

---

## ⚙️ Como Funciona

### Busca de dados do tweet

O sistema usa duas APIs em cascata:

```
URL do tweet
    │
    ▼
┌─────────────────────────┐
│  1. fxtwitter API       │  ← tenta primeiro
│  api.fxtwitter.com      │
└─────────┬───────────────┘
          │ falhou?
          ▼
┌─────────────────────────┐
│  2. Twitter Syndication │  ← fallback
│  cdn.syndication.twimg  │
└─────────┬───────────────┘
          │
          ▼
    dados normalizados
    → nome, avatar, texto,
      fotos, vídeos, stats
```

### Exportação PNG

Para evitar o erro de "canvas tainted" causado por imagens cross-origin:

1. Todas as imagens do card são pré-carregadas pelo `/proxy/media` como `blob:` URLs
2. As `blob:` URLs são same-origin → o canvas as aceita sem contaminar
3. O `html2canvas` renderiza o card limpo com `useCORS: true`
4. O `toDataURL()` funciona sem `SecurityError`
5. As imagens originais são restauradas após o export

### Gravação de vídeo com áudio

```
videoEl (vídeo original, same-origin via proxy)
    │
    ├── captureStream() → AudioTrack  ──────────┐
    │                                            │
recCanvas.captureStream() → VideoTrack ──────────┤
                                                  ▼
                                         MediaRecorder(combinedStream)
                                                  │
                                          drawFrame() a 30fps
                                          ┌─ bgCanvas (card estático)
                                          └─ videoEl frames em tempo real
                                                  │
                                          Blob(chunks) → download
```

---

## ⚠️ Limitações Conhecidas

| Limitação | Motivo |
|-----------|--------|
| Só funciona com tweets públicos | APIs não retornam dados de contas protegidas |
| Requer servidor local (`node server.js`) | Sem o proxy, o browser bloqueia requisições cross-origin para as APIs do Twitter |
| Exportação MP4 requer Chrome 130+ | Versões mais antigas não suportam `video/mp4` no MediaRecorder |
| Vídeos de GIF animado podem não ter áudio | GIFs do Twitter são vídeos sem trilha de áudio |
| Stats (curtidas, views) podem estar desatualizados | As APIs retornam os dados no momento da busca |

---

## ❓ Perguntas Frequentes

**O card não carrega — aparece "Failed to fetch"**
Certifique-se de estar acessando via `http://localhost:3000` e não abrindo o `index.html` diretamente pelo Explorer/Finder.

**O vídeo exportado ficou sem áudio**
Isso acontece quando o tweet original é um GIF (que não tem trilha de áudio) ou quando o navegador bloqueia a captura de áudio. Tente reproduzir o vídeo no card antes de gravar.

**O PNG ficou com imagens em branco**
Isso pode acontecer se as imagens ainda não carregaram. Aguarde o card renderizar completamente antes de exportar.

**O botão "Gravar Vídeo" não aparece**
O botão só aparece quando o tweet contém um vídeo. Para tweets com apenas fotos ou texto, só o PNG está disponível.

**Posso mudar a porta 3000?**
Sim, edite a linha `const PORT = 3000;` no `server.js` para qualquer porta disponível.

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

<div align="center">
  <p>Feito com ☕ e JavaScript</p>
  <p>
    <a href="https://github.com/seu-usuario/cardx/issues">Reportar Bug</a>
    ·
    <a href="https://github.com/seu-usuario/cardx/issues">Sugerir Feature</a>
  </p>
</div>
