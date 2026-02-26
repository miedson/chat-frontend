import { redirect } from 'next/navigation'

type PageProps = {
  params: Promise<{ conversationId: string }>
}

export default async function ChatConversationLegacyPage({ params }: PageProps) {
  const { conversationId } = await params
  redirect(`/conversa/${conversationId}`)
}
