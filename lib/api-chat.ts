import { NextResponse } from 'next/server'

export function getApiChatBaseUrl() {
  return process.env.API_CHAT_URL?.replace(/\/$/, '') ?? 'http://localhost:3000'
}

type ForwardOptions = {
  method: 'GET' | 'POST' | 'PATCH'
  path: string
  cookie?: string | null
  body?: unknown
}

export async function forwardToApiChat({
  method,
  path,
  cookie,
  body,
}: ForwardOptions) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (cookie) {
    headers.cookie = cookie
  }

  const response = await fetch(`${getApiChatBaseUrl()}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  }).catch(() => null)

  if (!response) {
    return NextResponse.json(
      { message: 'Nao foi possivel conectar com a API.' },
      { status: 502 },
    )
  }

  const payload = await response.json().catch(() => null)
  const nextResponse = NextResponse.json(payload ?? {}, {
    status: response.status,
  })

  const responseHeaders = response.headers as Headers & {
    getSetCookie?: () => string[]
  }

  const setCookies = responseHeaders.getSetCookie?.() ?? []
  for (const cookieValue of setCookies) {
    const normalizedCookie =
      process.env.NODE_ENV === 'production'
        ? cookieValue
        : cookieValue.replace(/;\s*Secure/gi, '')

    nextResponse.headers.append('set-cookie', normalizedCookie)
  }

  return nextResponse
}
