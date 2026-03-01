import axios from "axios";
import { api } from "@/lib/api";
import {
	type BoardResponse,
	type Conversation,
	type ConversationMessage,
	type ConversationStatus,
} from "@/lib/types/conversation.types";

type ApiErrorPayload = {
	message?: string;
};

function resolveErrorMessage(error: unknown, fallback: string) {
	if (axios.isAxiosError<ApiErrorPayload>(error)) {
		return error.response?.data?.message ?? error.message ?? fallback;
	}

	return fallback;
}

export const conversationService = {
	async getBoard(): Promise<BoardResponse> {
		return api
			.get<BoardResponse>("/conversations/board")
			.then((response) => response.data)
			.catch((error: unknown) => {
				throw new Error(resolveErrorMessage(error, "Falha ao carregar o board."));
			});
	},

	async list(): Promise<Conversation[]> {
		return api
			.get<Conversation[]>("/conversations")
			.then((response) => response.data)
			.catch((error: unknown) => {
				throw new Error(resolveErrorMessage(error, "Falha ao carregar conversas."));
			});
	},

	async getMessages(conversationId: string, limit = 100): Promise<ConversationMessage[]> {
		return api
			.get<ConversationMessage[]>(`/conversations/${conversationId}/messages`, {
				params: { limit },
			})
			.then((response) => response.data)
			.catch((error: unknown) => {
				throw new Error(resolveErrorMessage(error, "Falha ao carregar mensagens."));
			});
	},

	async updateStatus(conversationId: string, toStatus: ConversationStatus): Promise<Conversation> {
		return api
			.patch<Conversation>(`/conversations/${conversationId}/status`, { toStatus })
			.then((response) => response.data)
			.catch((error: unknown) => {
				throw new Error(resolveErrorMessage(error, "Falha ao atualizar status."));
			});
	},

	async sendMessage(conversationId: string, content: string): Promise<ConversationMessage> {
		return api
			.post<ConversationMessage>(`/conversations/${conversationId}/messages`, {
				content,
				type: "outgoing",
			})
			.then((response) => response.data)
			.catch((error: unknown) => {
				throw new Error(resolveErrorMessage(error, "Falha ao enviar mensagem."));
			});
	},

	async syncRead(conversationId: string): Promise<void> {
		return api
			.post(`/conversations/${conversationId}/read`)
			.then(() => undefined)
			.catch((error: unknown) => {
				throw new Error(resolveErrorMessage(error, "Falha ao registrar leitura."));
			});
	},
};
