import { NextRequest } from 'next/server'
import { forwardToApiChat } from '@/lib/api-chat'

type Context = {
  params: Promise<{ conversationId: string }>
}

export async function GET(request: NextRequest, context: Context) {
  const { conversationId } = await context.params
  const limit = request.nextUrl.searchParams.get('limit')
  const query = limit ? `?limit=${limit}` : ''

  return forwardToApiChat({
    method: 'GET',
    path: `/conversations/${conversationId}/messages${query}`,
    cookie: request.headers.get('cookie'),
  })
}

export async function POST(request: NextRequest, context: Context) {
  const { conversationId } = await context.params
  const body = await request.json().catch(() => null)

  return forwardToApiChat({
    method: 'POST',
    path: `/conversations/${conversationId}/messages`,
    cookie: request.headers.get('cookie'),
    body,
  })
}
