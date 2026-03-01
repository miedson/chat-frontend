import axios from "axios";
import { api } from "@/lib/api";
import {
	type ChannelConnection,
	type ConnectWhatsappPayload,
} from "@/lib/types/channel.types";

type ApiErrorPayload = {
	message?: string;
};

type ConnectionResponse = {
	connection: ChannelConnection;
};

type InstagramOAuthResponse = {
	authUrl: string;
};

function resolveErrorMessage(error: unknown, fallback: string) {
	if (axios.isAxiosError<ApiErrorPayload>(error)) {
		return error.response?.data?.message ?? error.message ?? fallback;
	}

	return fallback;
}

export const channelService = {
	async list(): Promise<ChannelConnection[]> {
		return api
			.get<ChannelConnection[]>("/channels")
			.then((response) => response.data)
			.catch((error: unknown) => {
				throw new Error(resolveErrorMessage(error, "Falha ao carregar canais."));
			});
	},

	async connectWhatsapp(payload: ConnectWhatsappPayload): Promise<ChannelConnection> {
		return api
			.post<ConnectionResponse>("/channels/whatsapp/connect", payload)
			.then((response) => response.data.connection)
			.catch((error: unknown) => {
				throw new Error(resolveErrorMessage(error, "Falha ao conectar canal."));
			});
	},

	async getInstagramOAuthUrl(): Promise<string> {
		return api
			.get<InstagramOAuthResponse>("/channels/instagram/oauth/url")
			.then((response) => response.data.authUrl)
			.catch((error: unknown) => {
				throw new Error(resolveErrorMessage(error, "Falha ao iniciar OAuth."));
			});
	},

	async syncWebhook(connectionId: string): Promise<ChannelConnection> {
		return api
			.post<ConnectionResponse>(`/channels/${connectionId}/webhook/sync`)
			.then((response) => response.data.connection)
			.catch((error: unknown) => {
				throw new Error(resolveErrorMessage(error, "Falha ao sincronizar webhook."));
			});
	},

	async exchangeInstagramCode(code: string, state: string): Promise<void> {
		return api
			.get("/channels/instagram/oauth/exchange", {
				params: { code, state },
			})
			.then(() => undefined)
			.catch((error: unknown) => {
				throw new Error(resolveErrorMessage(error, "Falha ao concluir conexão."));
			});
	},
};
