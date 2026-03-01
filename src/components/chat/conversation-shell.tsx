"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { io, type Socket } from "socket.io-client";
import { apiFetch } from "@/lib/api-client";

type Conversation = {
	id: string;
	subject: string | null;
	status: "open" | "pending" | "resolved";
	channel: string | null;
	externalContactName: string | null;
	assignedTo: {
		id: string;
		name: string;
		displayName: string | null;
		email: string;
	} | null;
	updatedAt: string;
};

type Message = {
	id: string;
	conversationId: string;
	content: string;
	type: "incoming" | "outgoing" | "internal";
	createdAt: string;
	sender: {
		id: string;
		name: string;
		displayName: string | null;
	} | null;
};

const SOCKET_URL =
	process.env.NEXT_PUBLIC_CHAT_SOCKET_URL ?? "http://localhost:3000";

function isMessage(payload: unknown): payload is Message {
	return (
		typeof payload === "object" &&
		payload !== null &&
		typeof (payload as Message).id === "string" &&
		typeof (payload as Message).conversationId === "string"
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

function appendUnique(messages: Message[], incoming: Message) {
	if (messages.some((item) => item.id === incoming.id)) {
		return messages;
	}

	return [...messages, incoming];
}

function titleFor(conversation: Conversation | null) {
	if (!conversation) return "Conversa";
	if (conversation.subject?.trim()) return conversation.subject;
	if (conversation.externalContactName?.trim())
		return conversation.externalContactName;
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
	const router = useRouter();
	const [conversation, setConversation] = useState<Conversation | null>(null);
	const [messages, setMessages] = useState<Message[]>([]);
	const [messageInput, setMessageInput] = useState("");
	const [loading, setLoading] = useState(true);
	const [sending, setSending] = useState(false);
	const [changingStatus, setChangingStatus] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const conversationIdRef = useRef(conversationId);
	const lastReadSyncRef = useRef(0);

	const canReply = useMemo(
		() => conversation?.status !== "open",
		[conversation?.status],
	);

	async function loadConversation() {
		const response = await apiFetch("/api/conversations");
		const payload = (await response.json().catch(() => null)) as
			| Conversation[]
			| { message?: string }
			| null;

		if (!response.ok || !Array.isArray(payload)) {
			setError("Falha ao carregar conversa.");
			return false;
		}

		const found = payload.find((item) => item.id === conversationId);

		if (!found) {
			setError("Conversa nao encontrada ou nao atribuida para voce.");
			return false;
		}

		if (found.status === "open" || !found.assignedTo) {
			setError("Conversa nao esta atribuida para voce.");
			return false;
		}

		setConversation(found);
		return true;
	}

	async function loadMessages(silent = false) {
		const response = await apiFetch(
			`/api/conversations/${conversationId}/messages?limit=100`,
		);
		const payload = (await response.json().catch(() => null)) as
			| Message[]
			| { message?: string }
			| null;

		if (!response.ok || !Array.isArray(payload)) {
			if (!silent) {
				setError("Falha ao carregar mensagens.");
			}
			return;
		}

		setMessages(payload);
	}

	async function syncReadReceipt(force = false) {
		const now = Date.now();
		if (!force && now - lastReadSyncRef.current < 1200) {
			return;
		}

		lastReadSyncRef.current = now;
		await apiFetch(`/api/conversations/${conversationId}/read`, {
			method: "POST",
		}).catch(() => null);
	}

	async function handleSend(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (!messageInput.trim() || !canReply) {
			return;
		}

		setSending(true);

		const response = await apiFetch(
			`/api/conversations/${conversationId}/messages`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					content: messageInput.trim(),
					type: "outgoing",
				}),
			},
		);

		const payload = (await response.json().catch(() => null)) as
			| Message
			| { message?: string }
			| null;

		if (!response.ok || !isMessage(payload)) {
			setError(
				!isMessage(payload) && payload?.message
					? payload.message
					: "Falha ao enviar mensagem.",
			);
			setSending(false);
			return;
		}

		setMessages((current) => appendUnique(current, payload));
		setMessageInput("");
		setSending(false);
	}

	async function handleStatusChange(nextStatus: "pending" | "resolved") {
		if (!conversation || conversation.status === nextStatus) {
			return;
		}

		setChangingStatus(true);

		const response = await apiFetch(
			`/api/conversations/${conversation.id}/status`,
			{
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ toStatus: nextStatus }),
			},
		);

		const payload = (await response.json().catch(() => null)) as
			| Conversation
			| { message?: string }
			| null;

		if (!response.ok || !isConversation(payload)) {
			setError(
				!isConversation(payload) && payload?.message
					? payload.message
					: "Falha ao atualizar status da conversa.",
			);
			setChangingStatus(false);
			return;
		}

		setConversation(payload);
		setChangingStatus(false);
		setError(null);
	}

	useEffect(() => {
		conversationIdRef.current = conversationId;
	}, [conversationId]);

	useEffect(() => {
		async function bootstrap() {
			setLoading(true);
			setError(null);

			const ok = await loadConversation();
			if (ok) {
				await loadMessages(false);
				await syncReadReceipt(true);
			}

			setLoading(false);
		}

		bootstrap();
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
			<header className="conversation-header">
				<div>
					<span className="chat-kicker">CONVERSA</span>
					<h1>{titleFor(conversation)}</h1>
					{conversation ? (
						<p className="chat-empty">{channelLabel(conversation.channel)}</p>
					) : null}
				</div>
				<div className="conversation-header-actions">
					{conversation?.status === "pending" ? (
						<button
							type="button"
							className="theme-toggle"
							onClick={() => {
								void handleStatusChange("resolved");
							}}
							disabled={changingStatus}
						>
							{changingStatus ? "Atualizando..." : "Concluir"}
						</button>
					) : null}

					{conversation?.status === "resolved" ? (
						<button
							type="button"
							className="theme-toggle"
							onClick={() => {
								void handleStatusChange("pending");
							}}
							disabled={changingStatus}
						>
							{changingStatus ? "Atualizando..." : "Reabrir conversa"}
						</button>
					) : null}

					<button
						type="button"
						className="theme-toggle"
						onClick={() => {
							router.push("/board");
						}}
					>
						Voltar ao quadro
					</button>
				</div>
			</header>

			{error ? <p className="chat-error">{error}</p> : null}

			<section className="conversation-thread">
				{loading ? (
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

			<form
				className="chat-composer conversation-composer"
				onSubmit={handleSend}
			>
				<input
					value={messageInput}
					onChange={(event) => setMessageInput(event.target.value)}
					placeholder="Digite sua resposta"
					disabled={!canReply || sending || loading}
				/>
				<button type="submit" disabled={!canReply || sending || loading}>
					{sending ? "Enviando..." : "Enviar"}
				</button>
			</form>
		</main>
	);
}
