import { NextRequest } from 'next/server'
import { forwardToApiChat } from '@/lib/api-chat'

export async function GET(request: NextRequest) {
  return forwardToApiChat({
    method: 'GET',
    path: '/conversations',
    cookie: request.headers.get('cookie'),
  })
}
