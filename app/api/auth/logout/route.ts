import { NextRequest } from 'next/server'
import { forwardToApiChat } from '@/lib/api-chat'

export async function POST(request: NextRequest) {
  return forwardToApiChat({
    method: 'POST',
    path: '/auth/logout',
    cookie: request.headers.get('cookie'),
  })
}
