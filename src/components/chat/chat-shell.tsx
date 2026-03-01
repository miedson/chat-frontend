"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { AppMenu } from "@/components/app-menu";
import { conversationService } from "@/lib/services/conversation.service";
import { sessionService } from "@/lib/services/session.service";
import {
	type BoardResponse,
	type Conversation,
	type ConversationMessage,
	type ConversationStatus,
} from "@/lib/types/conversation.types";

type BoardColumnKey = "awaiting" | "inProgress" | "completed";

type ChatShellState = {
	loadingBoard: boolean;
	movingConversationId: string | null;
	loggingOut: boolean;
	error: string | null;
};

const SOCKET_URL =
	process.env.NEXT_PUBLIC_CHAT_SOCKET_URL ?? "http://localhost:3000";
const STATUS_BY_COLUMN: Record<BoardColumnKey, ConversationStatus> = {
	awaiting: "open",
	inProgress: "pending",
	completed: "resolved",
};
const ALLOWED_TRANSITIONS: Record<ConversationStatus, ConversationStatus[]> = {
	open: ["pending"],
	pending: ["resolved"],
	resolved: ["pending"],
};

function formatDateTime(value: string) {
	return new Date(value).toLocaleString("pt-BR", {
		day: "2-digit",
		month: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function conversationTitle(conversation: Conversation) {
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
	return channel ?? "canal";
}

function sortByRecent(items: Conversation[]) {
	return [...items].sort(
		(a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
	);
}

function hasConversation(board: BoardResponse, conversationId: string) {
	return (
		board.awaiting.some((item) => item.id === conversationId) ||
		board.inProgress.some((item) => item.id === conversationId) ||
		board.completed.some((item) => item.id === conversationId)
	);
}

function upsertMessageInBoard(board: BoardResponse, message: ConversationMessage) {
	const columns: BoardColumnKey[] = ["awaiting", "inProgress", "completed"];

	for (const key of columns) {
		const index = board[key].findIndex(
			(item) => item.id === message.conversationId,
		);
		if (index < 0) continue;

		const next = [...board[key]];
		const conversation = next[index];

		next[index] = {
			...conversation,
			updatedAt: message.createdAt,
			lastMessage: {
				id: message.id,
				content: message.content,
				createdAt: message.createdAt,
				type: message.type,
				sender: message.sender,
			},
		};

		return {
			...board,
			[key]: sortByRecent(next),
		};
	}

	return board;
}

function applyConversationUpdate(board: BoardResponse, updated: Conversation) {
	const cleaned: BoardResponse = {
		awaiting: board.awaiting.filter((item) => item.id !== updated.id),
		inProgress: board.inProgress.filter((item) => item.id !== updated.id),
		completed: board.completed.filter((item) => item.id !== updated.id),
	};

	if (updated.status === "open") {
		cleaned.awaiting = sortByRecent([updated, ...cleaned.awaiting]);
		return cleaned;
	}

	if (updated.status === "pending") {
		cleaned.inProgress = sortByRecent([updated, ...cleaned.inProgress]);
		return cleaned;
	}

	cleaned.completed = sortByRecent([updated, ...cleaned.completed]);
	return cleaned;
}

function isConversation(payload: unknown): payload is Conversation {
	return (
		typeof payload === "object" &&
		payload !== null &&
		typeof (payload as Conversation).id === "string" &&
		typeof (payload as Conversation).status === "string"
	);
}

function isMessage(payload: unknown): payload is ConversationMessage {
	return (
		typeof payload === "object" &&
		payload !== null &&
		typeof (payload as ConversationMessage).id === "string" &&
		typeof (payload as ConversationMessage).conversationId === "string"
	);
}

export function ChatShell() {
	const router = useRouter();
	const [board, setBoard] = useState<BoardResponse>({
		awaiting: [],
		inProgress: [],
		completed: [],
	});
	const [state, setState] = useState<ChatShellState>({
		loadingBoard: true,
		movingConversationId: null,
		loggingOut: false,
		error: null,
	});
	const [theme, setTheme] = useState<"light" | "dark">("dark");

	const dragStateRef = useRef<{
		conversationId: string;
		fromStatus: ConversationStatus;
	} | null>(null);

	const allConversations = [
		...board.awaiting,
		...board.inProgress,
		...board.completed,
	];

	useEffect(() => {
		const storedTheme =
			typeof window !== "undefined"
				? (window.localStorage.getItem("chat-theme") as "light" | "dark" | null)
				: null;

		const resolvedTheme =
			storedTheme ??
			(window.matchMedia("(prefers-color-scheme: dark)").matches
				? "dark"
				: "light");

		setTheme(resolvedTheme);
		document.documentElement.setAttribute("data-theme", resolvedTheme);
	}, []);

	function handleToggleTheme() {
		const nextTheme = theme === "dark" ? "light" : "dark";
		setTheme(nextTheme);
		document.documentElement.setAttribute("data-theme", nextTheme);
		window.localStorage.setItem("chat-theme", nextTheme);
	}

	async function syncBoard(silent = false) {
		return conversationService
			.getBoard()
			.then((data) => {
				setBoard(data);
				setState((current) => ({ ...current, error: null }));
			})
			.catch((error: Error) => {
				if (!silent) {
					setState((current) => ({
						...current,
						error: error.message || "Falha ao carregar o quadro de conversas.",
					}));
				}
			});
	}

	async function moveConversation(
		conversation: Conversation,
		toStatus: ConversationStatus,
	) {
		if (conversation.status === toStatus) return true;

		if (!ALLOWED_TRANSITIONS[conversation.status].includes(toStatus)) {
			setState((current) => ({
				...current,
				error: "Transicao invalida para esta conversa.",
			}));
			return false;
		}

		setState((current) => ({ ...current, movingConversationId: conversation.id }));

		return conversationService
			.updateStatus(conversation.id, toStatus)
			.then((updated) => {
				setBoard((current) => applyConversationUpdate(current, updated));
				setState((current) => ({
					...current,
					movingConversationId: null,
					error: null,
				}));
				return true;
			})
			.catch((error: Error) => {
				setState((current) => ({
					...current,
					movingConversationId: null,
					error: error.message || "Falha ao mover conversa.",
				}));
				return false;
			});
	}

	async function handleDrop(column: BoardColumnKey) {
		const dragState = dragStateRef.current;
		if (!dragState) return;

		dragStateRef.current = null;
		const targetStatus = STATUS_BY_COLUMN[column];

		if (dragState.fromStatus === targetStatus) return;

		const conversation = allConversations.find(
			(item) => item.id === dragState.conversationId,
		);
		if (!conversation) return;

		await moveConversation(conversation, targetStatus);
	}

	function handleOpenConversation(conversation: Conversation) {
		if (conversation.status === "open" || !conversation.assignedTo) {
			setState((current) => ({
				...current,
				error: "Assuma esta conversa antes de abrir o chat.",
			}));
			return;
		}

		router.push(`/conversa/${conversation.id}`);
	}

	async function handleLogout() {
		setState((current) => ({ ...current, loggingOut: true }));
		await sessionService.logout().catch(() => undefined);
		window.location.assign("/login");
	}

	useEffect(() => {
		const nextSocket: Socket = io(SOCKET_URL, {
			withCredentials: true,
			transports: ["websocket", "polling"],
		});

		nextSocket.on("conversation:new", (payload: unknown) => {
			if (isConversation(payload)) {
				setBoard((current) => applyConversationUpdate(current, payload));
				return;
			}

			void syncBoard(true);
		});

		nextSocket.on("conversation:updated", (payload: unknown) => {
			if (isConversation(payload)) {
				setBoard((current) => applyConversationUpdate(current, payload));
				return;
			}

			void syncBoard(true);
		});

		nextSocket.on("conversation:message:new", (payload: unknown) => {
			if (!isMessage(payload)) {
				return;
			}

			setBoard((current) => {
				if (!hasConversation(current, payload.conversationId)) {
					void syncBoard(true);
					return current;
				}

				return upsertMessageInBoard(current, payload);
			});
		});

		nextSocket.on("connect_error", () => {
			void syncBoard(true);
		});

		return () => {
			nextSocket.disconnect();
		};
	}, []);

	useEffect(() => {
		const intervalId = setInterval(() => {
			void syncBoard(true);
		}, 8000);

		return () => {
			clearInterval(intervalId);
		};
	}, []);

	useEffect(() => {
		async function load() {
			setState((current) => ({ ...current, loadingBoard: true }));
			await syncBoard();
			setState((current) => ({ ...current, loadingBoard: false }));
		}

		void load();
	}, []);

	const columnMeta: Array<{
		key: BoardColumnKey;
		title: string;
		description: string;
		cards: Conversation[];
	}> = [
		{
			key: "awaiting",
			title: "Aguardando",
			description: "Conversas novas e nao atribuidas.",
			cards: board.awaiting,
		},
		{
			key: "inProgress",
			title: "Em Atendimento",
			description: "Conversas atribuidas para voce.",
			cards: board.inProgress,
		},
		{
			key: "completed",
			title: "Concluidas",
			description: "Conversas resolvidas.",
			cards: board.completed,
		},
	];

	return (
		<main className="board-layout">
			<AppMenu
				kicker="BOARD DE CONVERSAS"
				title="Kanban de Conversas"
				description="Fluxo: Aguardando - Em andamento - Concluidas."
				items={[
					{ href: "/board", label: "Board" },
					{ href: "/settings/channels", label: "Canais" },
				]}
				actions={
					<>
						<button
							type="button"
							className="menu-action-button"
							onClick={handleToggleTheme}
							aria-label="Alternar tema"
						>
							{theme === "dark" ? "Tema claro" : "Tema escuro"}
						</button>
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

			<section className="board-content board-content-single">
				<div className="kanban-grid">
					{columnMeta.map((column) => (
						<section
							key={column.key}
							className="kanban-column"
							onDragOver={(event) => {
								event.preventDefault();
							}}
							onDrop={(event) => {
								event.preventDefault();
								void handleDrop(column.key);
							}}
						>
							<header className="kanban-column-header">
								<h2>{column.title}</h2>
								<span>{column.cards.length}</span>
							</header>
							<p>{column.description}</p>

							<div className="kanban-cards">
								{state.loadingBoard && column.cards.length === 0 ? (
									<p className="chat-empty">Carregando conversas...</p>
								) : null}

								{!state.loadingBoard && column.cards.length === 0 ? (
									<p className="chat-empty">Sem conversas nesta coluna.</p>
								) : null}

								{column.cards.map((conversation) => (
									<article
										key={conversation.id}
										className={`kanban-card ${
											conversation.status === "open" ? "kanban-card-alert" : ""
										}`}
										draggable
										onDragStart={() => {
											dragStateRef.current = {
												conversationId: conversation.id,
												fromStatus: conversation.status,
											};
										}}
										onClick={() => {
											handleOpenConversation(conversation);
										}}
									>
										<div className="kanban-card-head">
											<strong>{conversationTitle(conversation)}</strong>
											<time>{formatDateTime(conversation.updatedAt)}</time>
										</div>

										<p>
											{conversation.lastMessage?.content ??
												"Sem mensagens ainda."}
										</p>

										<div className="kanban-card-meta">
											<span>{channelLabel(conversation.channel)}</span>
											<span>
												{conversation.assignedTo
													? (conversation.assignedTo.displayName ??
															conversation.assignedTo.name)
													: "Nao atribuida"}
											</span>
										</div>

										{conversation.status === "open" ? (
											<button
												type="button"
												className="kanban-assign-button"
												disabled={state.movingConversationId === conversation.id}
												onClick={(event) => {
													event.stopPropagation();
													void moveConversation(conversation, "pending");
												}}
											>
												{state.movingConversationId === conversation.id
													? "Assumindo..."
													: "Assumir"}
											</button>
										) : null}
									</article>
								))}
							</div>
						</section>
					))}
				</div>
			</section>
		</main>
	);
}
