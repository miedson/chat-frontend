import { NextResponse } from 'next/server'
import { forwardToApiChat } from '@/lib/api-chat'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)

  if (!body || typeof body.email !== 'string' || typeof body.password !== 'string') {
    return NextResponse.json({ message: 'Payload invalido.' }, { status: 400 })
  }

  return forwardToApiChat({
    method: 'POST',
    path: '/auth/login',
    body: {
      email: body.email,
      password: body.password,
    },
  })
}
