import { NextRequest } from 'next/server'
import { forwardToApiChat } from '@/lib/api-chat'

type Context = {
  params: Promise<{ connectionId: string }>
}

export async function POST(request: NextRequest, context: Context) {
  const { connectionId } = await context.params

  return forwardToApiChat({
    method: 'POST',
    path: `/channel/${connectionId}/webhook/sync`,
    cookie: request.headers.get('cookie'),
  })
}
