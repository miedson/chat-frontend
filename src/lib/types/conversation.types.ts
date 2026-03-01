export type ConversationStatus = "open" | "pending" | "resolved";

export type UserSummary = {
	id: string;
	name: string;
	displayName: string | null;
	email: string;
};

export type MessageSender = {
	id: string;
	name: string;
	displayName: string | null;
} | null;

export type ConversationMessage = {
	id: string;
	conversationId: string;
	content: string;
	type: "incoming" | "outgoing" | "internal";
	createdAt: string;
	sender: MessageSender;
};

export type Conversation = {
	id: string;
	subject: string | null;
	status: ConversationStatus;
	channel: string | null;
	externalContactName: string | null;
	assignedTo: UserSummary | null;
	participants: UserSummary[];
	lastMessage: {
		id: string;
		content: string;
		type: "incoming" | "outgoing" | "internal";
		createdAt: string;
		sender: MessageSender;
	} | null;
	createdAt: string;
	updatedAt: string;
};

export type BoardResponse = {
	awaiting: Conversation[];
	inProgress: Conversation[];
	completed: Conversation[];
};
