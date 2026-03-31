# 🐦 CardX v3 — Tweet Card Generator

> Gere cards visuais estilizados de tweets reais a partir de qualquer URL do X (Twitter) — com suporte a imagens, vídeos e exportação em PNG, WebM e MP4.

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-16%2B-339933?style=flat-square&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?style=flat-square&logo=express&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES2022-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![License](https://img.shields.io/badge/License-Apache%202.0-blue?style=flat-square)

</div>

---

## 📋 Índice

- [Sobre o Projeto](#-sobre-o-projeto)
- [Funcionalidades](#-funcionalidades)
- [Preview](#-preview)
- [Tecnologias](#-tecnologias)
- [Pré-requisitos](#-pré-requisitos)
- [Como Rodar](#-como-rodar)
- [Estrutura de Pastas](#-estrutura-de-pastas)
- [Como Funciona](#-como-funciona)
- [Rotas da API](#-rotas-da-api)
- [Limitações Conhecidas](#-limitações-conhecidas)
- [FAQ](#-faq)
- [Licença](#-licença)

---

## 📌 Sobre o Projeto

O **CardX** é uma ferramenta local que gera cards visuais de tweets reais a partir da URL. Cole o link de qualquer tweet público e o sistema busca automaticamente o nome do usuário, foto de perfil, texto, imagens e vídeos — montando um card fiel ao layout do X (antigo Twitter).

> O projeto nasceu da necessidade de criar prints de tweets de forma rápida, bonita e sem depender de ferramentas externas com limitações de plano.

---

## ✨ Funcionalidades

| Feature | Descrição |
|--------|-----------|
| 🔗 **Importação por URL** | Cole qualquer link `x.com/...` ou `twitter.com/...` |
| 👤 **Dados reais** | Nome, @handle, foto de perfil e badge de verificado |
| 📝 **Texto completo** | Com @menções e #hashtags renderizados corretamente |
| 🖼️ **Suporte a imagens** | Foto única ou grade de até 4 fotos |
| 🎬 **Suporte a vídeos** | Reprodução no card + gravação com áudio sincronizado |
| 🌗 **Modo claro/escuro** | X Light e X Dark |
| 🎨 **Personalização** | Cor do avatar, edição manual de todos os campos |
| 📥 **Exportação PNG** | Alta resolução (3× scale) |
| 🎥 **Exportação em vídeo** | WebM ou MP4, com áudio |
| 📋 **Copiar imagem** | Direto para área de transferência |
| 📱 **Layout responsivo** | Funciona em telas menores |

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
| Backend | Node.js + Express |
| HTTP Fetch | node-fetch@2 |
| Captura de tela | html2canvas 1.4.1 |
| Gravação de vídeo | MediaRecorder API + Canvas captureStream |
| APIs externas | fxtwitter API + Twitter Syndication API |

---

## 📦 Pré-requisitos

- **[Node.js](https://nodejs.org/)** v16 ou superior
- **npm** (já incluído no Node.js)
- Navegador moderno:
  - Chrome 109+ (MP4: Chrome 130+)
  - Firefox 113+

---

## 🚀 Como Rodar

### 1. Clone o repositório

```bash
git clone https://github.com/TheusBoot/Cardxv3.git
cd Cardxv3
```

### 2. Instale as dependências

```bash
npm install
```

> Caso não haja `package.json`, instale manualmente:
> ```bash
> npm install express node-fetch@2
> ```

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

> ⚠️ **Importante:** acesse **sempre** via `http://localhost:3000`. Abrir o `index.html` diretamente pelo Explorer não funciona — o servidor é necessário para o proxy CORS das APIs do Twitter.

### 5. Usando o CardX

1. Cole a URL do tweet no campo superior
2. Clique em **Buscar** (ou pressione `Enter`)
3. O card é gerado automaticamente
4. Ajuste nome, texto, cores e modo pelo painel lateral
5. Clique em **Baixar PNG** ou **Gravar Vídeo + Áudio**

---

## 📁 Estrutura de Pastas

Estrutura atual do projeto e estrutura recomendada para organização futura:

### Atual

```
Cardxv3/
├── OLD/                # Versões anteriores (pode ser removida)
├── index.html          # Estrutura HTML da interface
├── style.css           # Estilos globais
├── app.js              # Entry point principal
├── compose.js          # Composição e montagem do card
├── export.js           # Exportação PNG e vídeo
├── formats.js          # Formatação de dados (data, números)
├── helpers.js          # Funções utilitárias
├── preview.js          # Lógica de preview do card
├── server.js           # Servidor Node.js / proxy CORS
├── LICENSE
└── README.md
```

### ✅ Recomendada

```
Cardxv3/
├── public/                   # Arquivos servidos pelo Express
│   ├── js/                   # Módulos JavaScript do frontend
│   │   ├── app.js            # Entry point
│   │   ├── compose.js        # Composição do card
│   │   ├── export.js         # Exportação PNG e vídeo
│   │   ├── formats.js        # Formatação de dados
│   │   ├── helpers.js        # Utilitários
│   │   └── preview.js        # Preview
│   ├── css/
│   │   └── style.css
│   └── index.html
├── server.js                 # Servidor Node.js (raiz)
├── package.json
├── .gitignore
├── LICENSE
└── README.md
```

> Depois de reorganizar, lembre de atualizar os `<script src="...">` no `index.html` para apontar para `js/nome-do-arquivo.js` e o `server.js` para servir a pasta `public/` como estática.

---

## ⚙️ Como Funciona

### Busca de dados

O sistema usa duas APIs em cascata para garantir resiliência:

```
URL do tweet
    │
    ▼
┌──────────────────────────┐
│  1. fxtwitter API        │  ← tenta primeiro
│  api.fxtwitter.com       │
└──────────┬───────────────┘
           │ falhou?
           ▼
┌──────────────────────────┐
│  2. Twitter Syndication  │  ← fallback
│  cdn.syndication.twimg   │
└──────────┬───────────────┘
           │
           ▼
    dados normalizados
    → nome, avatar, texto,
      fotos, vídeos, stats
```

### Exportação PNG

Para evitar o erro `canvas tainted` por imagens cross-origin:

1. Imagens do card são pré-carregadas via `/proxy/media` como `blob:` URLs
2. `blob:` URLs são same-origin → o canvas as aceita sem contaminar
3. `html2canvas` renderiza o card com `useCORS: true`
4. `toDataURL()` funciona sem `SecurityError`
5. Imagens originais são restauradas após o export

### Gravação de vídeo com áudio

```
videoEl (proxy same-origin)
    │
    ├── captureStream() → AudioTrack ──────┐
    │                                       │
recCanvas.captureStream() → VideoTrack ────┤
                                            ▼
                                   MediaRecorder(combinedStream)
                                            │
                                    drawFrame() a 30fps
                                    ┌─ card estático (bgCanvas)
                                    └─ frames do vídeo em tempo real
                                            │
                                    Blob(chunks) → download
```

---

## 🔌 Rotas da API

### `GET /proxy/fxtwitter`

Proxy para a fxtwitter API. Retorna dados estruturados do tweet.

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `user` | string | Username do autor |
| `id` | string | ID numérico do tweet |

```
GET /proxy/fxtwitter?user=elonmusk&id=1234567890
```

---

### `GET /proxy/syndication`

Proxy para a API oficial de syndication do Twitter. Usado como fallback.

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | string | ID numérico do tweet |

```
GET /proxy/syndication?id=1234567890
```

---

### `GET /proxy/media`

Proxy para imagens e vídeos dos servidores do Twitter. Resolve o CORS para que o canvas possa renderizar a mídia. Suporta Range Requests para streaming.

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `url` | string | URL completa da mídia (domínio `twimg.com`) |

```
GET /proxy/media?url=https://pbs.twimg.com/media/exemplo.jpg
```

> Por segurança, somente domínios `twimg.com` são permitidos. Outros retornam `403 Forbidden`.

---

## ⚠️ Limitações Conhecidas

| Limitação | Motivo |
|-----------|--------|
| Apenas tweets públicos | APIs não retornam dados de contas protegidas |
| Requer `node server.js` | Sem o proxy, o browser bloqueia requests cross-origin |
| MP4 requer Chrome 130+ | Versões mais antigas não suportam `video/mp4` no MediaRecorder |
| GIFs animados sem áudio | GIFs do Twitter são vídeos sem trilha de áudio |
| Stats podem estar defasados | As APIs retornam os dados no momento da busca |

---

## ❓ FAQ

**O card não carrega — aparece "Failed to fetch"**
Certifique-se de estar acessando via `http://localhost:3000` e não abrindo o `index.html` diretamente.

**O vídeo exportado ficou sem áudio**
Isso acontece quando o tweet original é um GIF (sem trilha de áudio) ou quando o navegador bloqueia a captura. Reproduza o vídeo no card antes de gravar.

**O PNG ficou com imagens em branco**
Aguarde o card renderizar completamente antes de exportar. As imagens precisam estar totalmente carregadas.

**O botão "Gravar Vídeo" não aparece**
O botão só aparece em tweets com vídeo. Para tweets com foto ou texto, somente o PNG está disponível.

**Posso mudar a porta 3000?**
Sim. Edite a linha `const PORT = 3000;` no `server.js`.

---

## 📄 Licença

Este projeto está sob a licença **Apache 2.0**. Veja o arquivo [LICENSE](./LICENSE) para mais detalhes.

---

<div align="center">

Feito com ☕ e JavaScript por [TheusBoot](https://github.com/TheusBoot)

[🐛 Reportar Bug](https://github.com/TheusBoot/Cardxv3/issues) · [💡 Sugerir Feature](https://github.com/TheusBoot/Cardxv3/issues)

</div>