import { NextRequest } from 'next/server'
import { forwardToApiChat } from '@/lib/api-chat'

export async function GET(request: NextRequest) {
  return forwardToApiChat({
    method: 'GET',
    path: '/conversations/board',
    cookie: request.headers.get('cookie'),
  })
}
