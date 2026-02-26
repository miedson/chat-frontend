'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { io } from 'socket.io-client'
import { apiFetch } from '@/lib/api-client'

type ConversationStatus = 'open' | 'pending' | 'resolved'
type BoardColumnKey = 'awaiting' | 'inProgress' | 'completed'

type Conversation = {
  id: string
  subject: string | null
  status: ConversationStatus
  channel: string | null
  externalContactName: string | null
  assignedTo: {
    id: string
    name: string
    displayName: string | null
    email: string
  } | null
  participants: Array<{
    id: string
    name: string
    displayName: string | null
    email: string
  }>
  lastMessage: {
    id: string
    content: string
    type: 'incoming' | 'outgoing' | 'internal'
    createdAt: string
    sender: {
      id: string
      name: string
      displayName: string | null
    } | null
  } | null
  createdAt: string
  updatedAt: string
}

type Message = {
  id: string
  conversationId: string
  content: string
  type: 'incoming' | 'outgoing' | 'internal'
  createdAt: string
  sender: {
    id: string
    name: string
    displayName: string | null
  } | null
}

type BoardResponse = {
  awaiting: Conversation[]
  inProgress: Conversation[]
  completed: Conversation[]
}

const SOCKET_URL = process.env.NEXT_PUBLIC_CHAT_SOCKET_URL ?? 'http://localhost:3000'
const STATUS_BY_COLUMN: Record<BoardColumnKey, ConversationStatus> = {
  awaiting: 'open',
  inProgress: 'pending',
  completed: 'resolved',
}
const ALLOWED_TRANSITIONS: Record<ConversationStatus, ConversationStatus[]> = {
  open: ['pending'],
  pending: ['resolved'],
  resolved: ['pending'],
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function conversationTitle(conversation: Conversation) {
  if (conversation.subject?.trim()) return conversation.subject
  if (conversation.externalContactName?.trim()) return conversation.externalContactName
  return 'Conversa sem titulo'
}

function sortByRecent(items: Conversation[]) {
  return [...items].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )
}

function upsertMessageInBoard(board: BoardResponse, message: Message) {
  const columns: BoardColumnKey[] = ['awaiting', 'inProgress', 'completed']

  for (const key of columns) {
    const index = board[key].findIndex((item) => item.id === message.conversationId)
    if (index < 0) continue

    const next = [...board[key]]
    const conversation = next[index]

    next[index] = {
      ...conversation,
      updatedAt: message.createdAt,
      lastMessage: {
        id: message.id,
        content: message.content,
        createdAt: message.createdAt,
        type: message.type,
        sender: message.sender,
      },
    }

    return {
      ...board,
      [key]: sortByRecent(next),
    }
  }

  return board
}

function applyConversationUpdate(board: BoardResponse, updated: Conversation) {
  const cleaned: BoardResponse = {
    awaiting: board.awaiting.filter((item) => item.id !== updated.id),
    inProgress: board.inProgress.filter((item) => item.id !== updated.id),
    completed: board.completed.filter((item) => item.id !== updated.id),
  }

  if (updated.status === 'open') {
    cleaned.awaiting = sortByRecent([updated, ...cleaned.awaiting])
    return cleaned
  }

  if (updated.status === 'pending') {
    cleaned.inProgress = sortByRecent([updated, ...cleaned.inProgress])
    return cleaned
  }

  cleaned.completed = sortByRecent([updated, ...cleaned.completed])
  return cleaned
}

function isConversation(payload: unknown): payload is Conversation {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    typeof (payload as Conversation).id === 'string' &&
    typeof (payload as Conversation).status === 'string'
  )
}

function isMessage(payload: unknown): payload is Message {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    typeof (payload as Message).id === 'string' &&
    typeof (payload as Message).conversationId === 'string'
  )
}

export function ChatShell() {
  const router = useRouter()
  const [board, setBoard] = useState<BoardResponse>({
    awaiting: [],
    inProgress: [],
    completed: [],
  })
  const [loadingBoard, setLoadingBoard] = useState(true)
  const [movingConversationId, setMovingConversationId] = useState<string | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')

  const dragStateRef = useRef<{ conversationId: string; fromStatus: ConversationStatus } | null>(
    null,
  )

  const allConversations = [...board.awaiting, ...board.inProgress, ...board.completed]

  useEffect(() => {
    const storedTheme =
      typeof window !== 'undefined'
        ? (window.localStorage.getItem('chat-theme') as 'light' | 'dark' | null)
        : null

    const resolvedTheme =
      storedTheme ??
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')

    setTheme(resolvedTheme)
    document.documentElement.setAttribute('data-theme', resolvedTheme)
  }, [])

  function handleToggleTheme() {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    document.documentElement.setAttribute('data-theme', nextTheme)
    window.localStorage.setItem('chat-theme', nextTheme)
  }

  async function syncBoard() {
    const response = await apiFetch('/api/conversations/board')
    const payload = (await response.json().catch(() => null)) as
      | BoardResponse
      | { message?: string }
      | null

    if (
      !response.ok ||
      !payload ||
      !Array.isArray((payload as BoardResponse).awaiting) ||
      !Array.isArray((payload as BoardResponse).inProgress) ||
      !Array.isArray((payload as BoardResponse).completed)
    ) {
      setError('Falha ao carregar o quadro de conversas.')
      return
    }

    setBoard(payload as BoardResponse)
    setError(null)
  }

  async function moveConversation(conversation: Conversation, toStatus: ConversationStatus) {
    if (conversation.status === toStatus) return true

    if (!ALLOWED_TRANSITIONS[conversation.status].includes(toStatus)) {
      setError('Transicao invalida para esta conversa.')
      return false
    }

    setMovingConversationId(conversation.id)

    const response = await apiFetch(`/api/conversations/${conversation.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toStatus }),
    })

    const payload = (await response.json().catch(() => null)) as
      | Conversation
      | { message?: string }
      | null

    if (!response.ok || !isConversation(payload)) {
      setError(
        !isConversation(payload) && payload?.message
          ? payload.message
          : 'Falha ao mover conversa.',
      )
      setMovingConversationId(null)
      return false
    }

    setBoard((current) => applyConversationUpdate(current, payload))
    setMovingConversationId(null)
    setError(null)
    return true
  }

  async function handleDrop(column: BoardColumnKey) {
    const dragState = dragStateRef.current
    if (!dragState) return

    dragStateRef.current = null
    const targetStatus = STATUS_BY_COLUMN[column]

    if (dragState.fromStatus === targetStatus) return

    const conversation = allConversations.find((item) => item.id === dragState.conversationId)
    if (!conversation) return

    await moveConversation(conversation, targetStatus)
  }

  function handleOpenConversation(conversation: Conversation) {
    if (conversation.status === 'open' || !conversation.assignedTo) {
      setError('Assuma esta conversa antes de abrir o chat.')
      return
    }

    router.push(`/conversa/${conversation.id}`)
  }

  async function handleLogout() {
    setLoggingOut(true)
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    }).catch(() => null)

    window.location.assign('/login')
  }

  useEffect(() => {
    const nextSocket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    })

    nextSocket.on('conversation:new', (payload: unknown) => {
      if (!isConversation(payload)) return
      setBoard((current) => applyConversationUpdate(current, payload))
    })

    nextSocket.on('conversation:updated', (payload: unknown) => {
      if (!isConversation(payload)) return
      setBoard((current) => applyConversationUpdate(current, payload))
    })

    nextSocket.on('conversation:message:new', (payload: unknown) => {
      if (!isMessage(payload)) return
      setBoard((current) => upsertMessageInBoard(current, payload))
    })

    return () => {
      nextSocket.disconnect()
    }
  }, [])

  useEffect(() => {
    async function load() {
      setLoadingBoard(true)
      await syncBoard()
      setLoadingBoard(false)
    }

    load()
  }, [])

  const columnMeta: Array<{
    key: BoardColumnKey
    title: string
    description: string
    cards: Conversation[]
  }> = [
    {
      key: 'awaiting',
      title: 'Aguardando',
      description: 'Conversas novas e nao atribuidas.',
      cards: board.awaiting,
    },
    {
      key: 'inProgress',
      title: 'Em Atendimento',
      description: 'Conversas atribuidas para voce.',
      cards: board.inProgress,
    },
    {
      key: 'completed',
      title: 'Concluidas',
      description: 'Conversas resolvidas.',
      cards: board.completed,
    },
  ]

  return (
    <main className="board-layout">
      <header className="board-header">
        <div>
          <span className="chat-kicker">PAINEL DE ATENDIMENTO</span>
          <h1>Kanban de Conversas</h1>
          <p>Fluxo: Aguardando - Em Atendimento - Concluidas.</p>
        </div>

        <div className="board-header-actions">
          <button
            type="button"
            className="theme-toggle"
            onClick={handleToggleTheme}
            aria-label="Alternar tema"
          >
            {theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
          </button>
          <Link href="/settings/channels">Canais</Link>
          <button
            type="button"
            className="settings-logout-button"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? 'Saindo...' : 'Sair'}
          </button>
        </div>
      </header>

      {error ? <p className="chat-error">{error}</p> : null}

      <section className="board-content board-content-single">
        <div className="kanban-grid">
          {columnMeta.map((column) => (
            <section
              key={column.key}
              className="kanban-column"
              onDragOver={(event) => {
                event.preventDefault()
              }}
              onDrop={(event) => {
                event.preventDefault()
                void handleDrop(column.key)
              }}
            >
              <header className="kanban-column-header">
                <h2>{column.title}</h2>
                <span>{column.cards.length}</span>
              </header>
              <p>{column.description}</p>

              <div className="kanban-cards">
                {loadingBoard && column.cards.length === 0 ? (
                  <p className="chat-empty">Carregando conversas...</p>
                ) : null}

                {!loadingBoard && column.cards.length === 0 ? (
                  <p className="chat-empty">Sem conversas nesta coluna.</p>
                ) : null}

                {column.cards.map((conversation) => (
                  <article
                    key={conversation.id}
                    className={`kanban-card ${
                      conversation.status === 'open' ? 'kanban-card-alert' : ''
                    }`}
                    draggable
                    onDragStart={() => {
                      dragStateRef.current = {
                        conversationId: conversation.id,
                        fromStatus: conversation.status,
                      }
                    }}
                    onClick={() => {
                      handleOpenConversation(conversation)
                    }}
                  >
                    <div className="kanban-card-head">
                      <strong>{conversationTitle(conversation)}</strong>
                      <time>{formatDateTime(conversation.updatedAt)}</time>
                    </div>

                    <p>{conversation.lastMessage?.content ?? 'Sem mensagens ainda.'}</p>

                    <div className="kanban-card-meta">
                      <span>{conversation.channel ?? 'whatsapp'}</span>
                      <span>
                        {conversation.assignedTo
                          ? conversation.assignedTo.displayName ?? conversation.assignedTo.name
                          : 'Nao atribuida'}
                      </span>
                    </div>

                    {conversation.status === 'open' ? (
                      <button
                        type="button"
                        className="kanban-assign-button"
                        disabled={movingConversationId === conversation.id}
                        onClick={(event) => {
                          event.stopPropagation()
                          void moveConversation(conversation, 'pending')
                        }}
                      >
                        {movingConversationId === conversation.id ? 'Assumindo...' : 'Assumir'}
                      </button>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    </main>
  )
}
