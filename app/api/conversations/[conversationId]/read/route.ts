import { NextRequest } from 'next/server'
import { forwardToApiChat } from '@/lib/api-chat'

type Context = {
  params: Promise<{ conversationId: string }>
}

export async function POST(request: NextRequest, context: Context) {
  const { conversationId } = await context.params

  return forwardToApiChat({
    method: 'POST',
    path: `/conversations/${conversationId}/read`,
    cookie: request.headers.get('cookie'),
  })
}
