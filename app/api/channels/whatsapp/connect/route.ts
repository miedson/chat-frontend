import { NextRequest } from 'next/server'
import { forwardToApiChat } from '@/lib/api-chat'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)

  return forwardToApiChat({
    method: 'POST',
    path: '/channel/whatsapp/connect',
    cookie: request.headers.get('cookie'),
    body,
  })
}
