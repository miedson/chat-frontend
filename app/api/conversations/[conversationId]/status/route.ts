import { NextRequest } from 'next/server'
import { forwardToApiChat } from '@/lib/api-chat'

type Context = {
  params: Promise<{ conversationId: string }>
}

export async function PATCH(request: NextRequest, context: Context) {
  const { conversationId } = await context.params
  const body = await request.json().catch(() => null)

  return forwardToApiChat({
    method: 'PATCH',
    path: `/conversations/${conversationId}/status`,
    cookie: request.headers.get('cookie'),
    body,
  })
}
