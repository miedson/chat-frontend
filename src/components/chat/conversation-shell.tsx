"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { AppMenu } from "@/components/app-menu";
import { conversationService } from "@/lib/services/conversation.service";
import { sessionService } from "@/lib/services/session.service";
import {
	type Conversation,
	type ConversationMessage,
	type ConversationStatus,
} from "@/lib/types/conversation.types";

type ConversationShellState = {
	loading: boolean;
	sending: boolean;
	changingStatus: boolean;
	loggingOut: boolean;
	error: string | null;
};

const SOCKET_URL =
	process.env.NEXT_PUBLIC_CHAT_SOCKET_URL ?? "http://localhost:3000";

function isMessage(payload: unknown): payload is ConversationMessage {
	return (
		typeof payload === "object" &&
		payload !== null &&
		typeof (payload as ConversationMessage).id === "string" &&
		typeof (payload as ConversationMessage).conversationId === "string"
	);
}

function isConversation(payload: unknown): payload is Conversation {
	return (
		typeof payload === "object" &&
		payload !== null &&
		typeof (payload as Conversation).id === "string" &&
		typeof (payload as Conversation).status === "string"
	);
}

function appendUnique(messages: ConversationMessage[], incoming: ConversationMessage) {
	if (messages.some((item) => item.id === incoming.id)) {
		return messages;
	}

	return [...messages, incoming];
}

function titleFor(conversation: Conversation | null) {
	if (!conversation) return "Conversa";
	if (conversation.subject?.trim()) return conversation.subject;
	if (conversation.externalContactName?.trim()) {
		return conversation.externalContactName;
	}
	return "Conversa sem titulo";
}

function channelLabel(channel: string | null) {
	if (channel === "instagram_direct") return "Instagram Direct";
	if (channel === "instagram_comment") return "Instagram Comentario";
	if (channel === "whatsapp") return "WhatsApp";
	return channel ?? "Canal";
}

function formatMessageTime(value: string) {
	return new Date(value).toLocaleTimeString("pt-BR", {
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function ConversationShell({
	conversationId,
}: {
	conversationId: string;
}) {
	const [conversation, setConversation] = useState<Conversation | null>(null);
	const [messages, setMessages] = useState<ConversationMessage[]>([]);
	const [messageInput, setMessageInput] = useState("");
	const [state, setState] = useState<ConversationShellState>({
		loading: true,
		sending: false,
		changingStatus: false,
		loggingOut: false,
		error: null,
	});
	const conversationIdRef = useRef(conversationId);
	const lastReadSyncRef = useRef(0);

	const canReply = useMemo(
		() => conversation?.status !== "open",
		[conversation?.status],
	);

	async function loadConversation() {
		return conversationService
			.list()
			.then((items) => {
				const found = items.find((item) => item.id === conversationId);

				if (!found) {
					throw new Error("Conversa nao encontrada ou nao atribuida para voce.");
				}

				if (found.status === "open" || !found.assignedTo) {
					throw new Error("Conversa nao esta atribuida para voce.");
				}

				setConversation(found);
				return true;
			})
			.catch((error: Error) => {
				setState((current) => ({
					...current,
					error: error.message || "Falha ao carregar conversa.",
				}));
				return false;
			});
	}

	async function loadMessages(silent = false) {
		return conversationService
			.getMessages(conversationId, 100)
			.then((payload) => {
				setMessages(payload);
			})
			.catch((error: Error) => {
				if (!silent) {
					setState((current) => ({
						...current,
						error: error.message || "Falha ao carregar mensagens.",
					}));
				}
			});
	}

	async function syncReadReceipt(force = false) {
		const now = Date.now();
		if (!force && now - lastReadSyncRef.current < 1200) {
			return;
		}

		lastReadSyncRef.current = now;
		await conversationService.syncRead(conversationId).catch(() => undefined);
	}

	async function handleSend(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (!messageInput.trim() || !canReply) {
			return;
		}

		setState((current) => ({ ...current, sending: true }));

		return conversationService
			.sendMessage(conversationId, messageInput.trim())
			.then((payload) => {
				setMessages((current) => appendUnique(current, payload));
				setMessageInput("");
				setState((current) => ({ ...current, sending: false, error: null }));
			})
			.catch((error: Error) => {
				setState((current) => ({
					...current,
					sending: false,
					error: error.message || "Falha ao enviar mensagem.",
				}));
			});
	}

	async function handleStatusChange(nextStatus: Exclude<ConversationStatus, "open">) {
		if (!conversation || conversation.status === nextStatus) {
			return;
		}

		setState((current) => ({ ...current, changingStatus: true }));

		return conversationService
			.updateStatus(conversation.id, nextStatus)
			.then((updated) => {
				setConversation(updated);
				setState((current) => ({
					...current,
					changingStatus: false,
					error: null,
				}));
			})
			.catch((error: Error) => {
				setState((current) => ({
					...current,
					changingStatus: false,
					error: error.message || "Falha ao atualizar status.",
				}));
			});
	}

	async function handleLogout() {
		setState((current) => ({ ...current, loggingOut: true }));
		await sessionService.logout().catch(() => undefined);
		window.location.assign("/login");
	}

	useEffect(() => {
		conversationIdRef.current = conversationId;
	}, [conversationId]);

	useEffect(() => {
		async function bootstrap() {
			setState((current) => ({
				...current,
				loading: true,
				error: null,
			}));

			const ok = await loadConversation();
			if (ok) {
				await loadMessages(false);
				await syncReadReceipt(true);
			}

			setState((current) => ({ ...current, loading: false }));
		}

		void bootstrap();
	}, [conversationId]);

	useEffect(() => {
		const socket: Socket = io(SOCKET_URL, {
			withCredentials: true,
			transports: ["websocket", "polling"],
		});

		const joinCurrentConversation = () => {
			socket.emit("conversation:join", {
				conversationId: conversationIdRef.current,
			});
		};

		socket.on("connect", () => {
			joinCurrentConversation();
		});

		socket.on("conversation:message:new", (payload: unknown) => {
			if (!isMessage(payload)) {
				return;
			}

			if (payload.conversationId !== conversationIdRef.current) {
				return;
			}

			setMessages((current) => appendUnique(current, payload));
			void syncReadReceipt(false);
		});

		socket.on("conversation:updated", (payload: unknown) => {
			if (!isConversation(payload)) {
				return;
			}

			if (payload.id !== conversationIdRef.current) {
				return;
			}

			setConversation(payload);
		});

		return () => {
			socket.emit("conversation:leave", {
				conversationId: conversationIdRef.current,
			});
			socket.disconnect();
		};
	}, [conversationId]);

	useEffect(() => {
		const intervalId = setInterval(() => {
			void loadMessages(true);
			void syncReadReceipt(false);
		}, 5000);

		return () => {
			clearInterval(intervalId);
		};
	}, [conversationId]);

	return (
		<main className="conversation-layout">
			<AppMenu
				kicker="CONVERSA"
				title={titleFor(conversation)}
				description={conversation ? channelLabel(conversation.channel) : ""}
				items={[
					{ href: "/board", label: "Board" },
					{ href: "/settings/channels", label: "Canais" },
				]}
				actions={
					<>
						{conversation?.status === "pending" ? (
							<button
								type="button"
								className="menu-action-button"
								onClick={() => {
									void handleStatusChange("resolved");
								}}
								disabled={state.changingStatus}
							>
								{state.changingStatus ? "Atualizando..." : "Concluir"}
							</button>
						) : null}

						{conversation?.status === "resolved" ? (
							<button
								type="button"
								className="menu-action-button"
								onClick={() => {
									void handleStatusChange("pending");
								}}
								disabled={state.changingStatus}
							>
								{state.changingStatus ? "Atualizando..." : "Reabrir"}
							</button>
						) : null}

						<button
							type="button"
							className="menu-action-button"
							onClick={() => {
								void handleLogout();
							}}
							disabled={state.loggingOut}
						>
							{state.loggingOut ? "Saindo..." : "Sair"}
						</button>
					</>
				}
			/>

			{state.error ? <p className="chat-error">{state.error}</p> : null}

			<section className="conversation-thread">
				{state.loading ? (
					<p className="chat-empty">Carregando conversa...</p>
				) : messages.length === 0 ? (
					<p className="chat-empty">Nenhuma mensagem nesta conversa.</p>
				) : (
					messages.map((message) => (
						<article key={message.id} className={`chat-bubble ${message.type}`}>
							<p>{message.content}</p>
							<time>{formatMessageTime(message.createdAt)}</time>
						</article>
					))
				)}
			</section>

			<form className="chat-composer conversation-composer" onSubmit={handleSend}>
				<input
					value={messageInput}
					onChange={(event) => setMessageInput(event.target.value)}
					placeholder="Digite sua resposta"
					disabled={!canReply || state.sending || state.loading}
				/>
				<button type="submit" disabled={!canReply || state.sending || state.loading}>
					{state.sending ? "Enviando..." : "Enviar"}
				</button>
			</form>
		</main>
	);
}
