import { ConversationShell } from "@/components/chat/conversation-shell";

type PageProps = {
	params: Promise<{ conversationId: string }>;
};

export default async function ConversationPage({ params }: PageProps) {
	const { conversationId } = await params;

	return <ConversationShell conversationId={conversationId} />;
}
