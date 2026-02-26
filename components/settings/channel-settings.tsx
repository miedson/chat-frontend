'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api-client'
import { io } from 'socket.io-client'

type ChannelConnection = {
  id: string
  kind: 'whatsapp'
  provider: 'evolution' | 'whatsapp_cloud'
  name: string
  phone: string
  status: 'pending_qr' | 'connected' | 'disconnected' | 'failed'
  providerInstanceKey: string | null
  qrCodeBase64: string | null
  createdAt: string
  updatedAt: string
}

const SOCKET_URL =
  process.env.NEXT_PUBLIC_CHAT_SOCKET_URL ?? 'http://localhost:3000'

function upsertChannelConnection(
  current: ChannelConnection[],
  incoming: ChannelConnection,
) {
  const index = current.findIndex((item) => item.id === incoming.id)

  if (index < 0) {
    return [incoming, ...current].sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
  }

  const next = [...current]
  next[index] = incoming
  return next.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )
}

export function ChannelSettings() {
  const [channels, setChannels] = useState<ChannelConnection[]>([])
  const [provider, setProvider] = useState<'evolution' | 'whatsapp_cloud'>(
    'evolution',
  )
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [useOrganizationPhone, setUseOrganizationPhone] = useState(true)
  const [loading, setLoading] = useState(false)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadChannels() {
    const response = await apiFetch('/api/channels')
    const payload = (await response.json().catch(() => [])) as
      | ChannelConnection[]
      | { message?: string }

    if (!response.ok || !Array.isArray(payload)) {
      setError(
        Array.isArray(payload)
          ? 'Falha ao carregar canais.'
          : payload.message ?? 'Falha ao carregar canais.',
      )
      return
    }

    setChannels(payload)
  }

  useEffect(() => {
    loadChannels()
  }, [])

  useEffect(() => {
    if (!channels.some((channel) => channel.status === 'pending_qr')) {
      return
    }

    const intervalId = setInterval(() => {
      loadChannels()
    }, 5000)

    return () => {
      clearInterval(intervalId)
    }
  }, [channels])

  useEffect(() => {
    const nextSocket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    })

    nextSocket.on(
      'channel:connection:updated',
      (connection: ChannelConnection) => {
        setChannels((current) => upsertChannelConnection(current, connection))
      },
    )

    return () => {
      nextSocket.disconnect()
    }
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)

    const response = await apiFetch('/api/channels/whatsapp/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider,
        name: name.trim() || undefined,
        phone: phone.trim() || undefined,
        useOrganizationPhone,
      }),
    })

    const payload = (await response.json().catch(() => null)) as
      | { connection?: ChannelConnection; message?: string }
      | null

    if (!response.ok || !payload?.connection) {
      setError(payload?.message ?? 'Falha ao conectar canal.')
      setLoading(false)
      return
    }

    setName('')
    setPhone('')
    setUseOrganizationPhone(true)
    setChannels((current) =>
      upsertChannelConnection(current, payload.connection as ChannelConnection),
    )
    setLoading(false)
  }

  async function handleSyncWebhook(connectionId: string) {
    setSyncingId(connectionId)
    setError(null)

    const response = await apiFetch(
      `/api/channels/${connectionId}/webhook/sync`,
      { method: 'POST' },
    )

    const payload = (await response.json().catch(() => null)) as
      | { connection?: ChannelConnection; message?: string }
      | null

    if (!response.ok || !payload?.connection) {
      setError(payload?.message ?? 'Falha ao sincronizar webhook.')
      setSyncingId(null)
      return
    }

    setChannels((current) =>
      upsertChannelConnection(current, payload.connection as ChannelConnection),
    )
    setSyncingId(null)
  }

  async function handleLogout() {
    setLoggingOut(true)
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    }).catch(() => null)

    window.location.assign('/login')
  }

  return (
    <main className="settings-layout">
      <header className="settings-header">
        <div>
          <span className="chat-kicker">CONFIGURACOES</span>
          <h1>Canais de atendimento</h1>
          <p>Conecte WhatsApp via Evolution API ou API oficial (Cloud).</p>
        </div>
        <div className="settings-header-actions">
          <Link href="/atendimento">Voltar ao atendimento</Link>
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

      <section className="settings-grid">
        <article className="settings-card">
          <h2>Conectar WhatsApp</h2>
          <form className="settings-form" onSubmit={handleSubmit}>
            <label htmlFor="provider">Provider</label>
            <select
              id="provider"
              value={provider}
              onChange={(event) =>
                setProvider(event.target.value as 'evolution' | 'whatsapp_cloud')
              }
            >
              <option value="evolution">Evolution API</option>
              <option value="whatsapp_cloud">WhatsApp Cloud API</option>
            </select>

            <label htmlFor="name">Nome do canal</label>
            <input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: Suporte Comercial"
            />

            <label htmlFor="phone">Telefone (opcional)</label>
            <input
              id="phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="5511999999999"
              disabled={useOrganizationPhone}
            />

            <label className="settings-checkbox">
              <input
                type="checkbox"
                checked={useOrganizationPhone}
                onChange={(event) => setUseOrganizationPhone(event.target.checked)}
              />
              Usar telefone da organizacao
            </label>

            <button type="submit" disabled={loading}>
              {loading ? 'Conectando...' : 'Conectar canal'}
            </button>
          </form>

          {error ? <p className="chat-error">{error}</p> : null}
        </article>

        <article className="settings-card">
          <h2>Canais conectados</h2>
          <div className="settings-channel-list">
            {channels.length === 0 ? (
              <p className="chat-empty">Nenhum canal conectado.</p>
            ) : null}

            {channels.map((channel) => (
              <section key={channel.id} className="settings-channel-item">
                <header>
                  <strong>{channel.name}</strong>
                  <span>{channel.status === 'connected' ? 'connected' : channel.status}</span>
                </header>
                <p>{channel.provider} - {channel.phone}</p>
                {channel.providerInstanceKey ? (
                  <p>Instancia: {channel.providerInstanceKey}</p>
                ) : null}

                {channel.qrCodeBase64 ? (
                  <img
                    src={channel.qrCodeBase64}
                    alt={`QR Code ${channel.name}`}
                    className="settings-qr"
                  />
                ) : null}
                <button
                  type="button"
                  className="settings-sync-button"
                  onClick={() => handleSyncWebhook(channel.id)}
                  disabled={syncingId === channel.id}
                >
                  {syncingId === channel.id
                    ? 'Sincronizando...'
                    : 'Sincronizar webhook'}
                </button>
              </section>
            ))}
          </div>
        </article>
      </section>
    </main>
  )
}
