# chat-frontend

Frontend em Next.js para o projeto `api-chat`.

## Requisitos

- Node.js 20+
- pnpm

## Configuracao

```bash
cp .env.example .env.local
```

Edite o arquivo e ajuste:

- `API_CHAT_URL`: URL do backend `api-chat` para rotas REST
- `NEXT_PUBLIC_CHAT_SOCKET_URL`: URL do Socket.IO do backend

## Executar

```bash
pnpm install
pnpm dev
```

App: `http://localhost:3002`.

## Fluxo implementado

- Tela de login moderna em `/login`
- Tela principal do board em `/board` e chat em `/conversa/:conversationId`
- Configuração de canais em `/settings/channels`
- Callback OAuth Instagram em `/integracoes/instagram/callback`
- Proxy de autenticacao em `/api/auth/login`
- Proxy de conversas em `/api/conversations`
- Proxy de mensagens em `/api/conversations/:conversationId/messages`
- Proxy de canais em `/api/channels`, `/api/channels/whatsapp/connect`, `/api/channels/instagram/connect`, `/api/channels/instagram/oauth/*` e `/api/channels/:connectionId/webhook/sync`
- Integracao real-time via Socket.IO

## Deploy com Docker Compose (Coolify)

Este projeto está preparado para deploy via `docker-compose.yaml`.

### Variáveis de ambiente

Defina no Coolify:

- `API_CHAT_URL`: URL pública da `api-chat` (ex.: `https://api-chat.seudominio.com`)
- `NEXT_PUBLIC_CHAT_SOCKET_URL`: URL pública do Socket.IO da `api-chat` (normalmente a mesma URL)
- `PORT`: `3000` (opcional, padrão já definido no container)

### Executar local com Compose

```bash
docker compose up -d --build
```

App local: `http://localhost:3002`.

### Configuração no Coolify

1. Crie um novo serviço via repositório Git.
2. Selecione `Docker Compose` como método de deploy.
3. Use o arquivo `docker-compose.yaml` da pasta `chat-frontend`.
4. Configure a porta interna do serviço para `3000`.
5. Salve as variáveis e faça deploy.
