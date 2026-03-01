"use client";

import { type FormEvent, useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { AppMenu } from "@/components/app-menu";
import { channelService } from "@/lib/services/channel.service";
import { sessionService } from "@/lib/services/session.service";
import {
	type ChannelConnection,
	type ConnectWhatsappPayload,
} from "@/lib/types/channel.types";

type ChannelSettingsState = {
	loading: boolean;
	loadingInstagramOAuth: boolean;
	syncingId: string | null;
	loggingOut: boolean;
	error: string | null;
};

const SOCKET_URL =
	process.env.NEXT_PUBLIC_CHAT_SOCKET_URL ?? "http://localhost:3000";

function upsertChannelConnection(
	current: ChannelConnection[],
	incoming: ChannelConnection,
) {
	const index = current.findIndex((item) => item.id === incoming.id);

	if (index < 0) {
		return [incoming, ...current].sort(
			(a, b) =>
				new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
		);
	}

	const next = [...current];
	next[index] = incoming;
	return next.sort(
		(a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
	);
}

function isWhatsappProvider(
	value: string,
): value is ConnectWhatsappPayload["provider"] {
	return value === "evolution" || value === "whatsapp_cloud";
}

export function ChannelSettings() {
	const [channels, setChannels] = useState<ChannelConnection[]>([]);
	const [provider, setProvider] = useState<ConnectWhatsappPayload["provider"]>(
		"evolution",
	);
	const [name, setName] = useState("");
	const [phone, setPhone] = useState("");
	const [useOrganizationPhone, setUseOrganizationPhone] = useState(true);
	const [state, setState] = useState<ChannelSettingsState>({
		loading: false,
		loadingInstagramOAuth: false,
		syncingId: null,
		loggingOut: false,
		error: null,
	});

	async function loadChannels() {
		return channelService
			.list()
			.then((payload) => {
				setChannels(payload);
			})
			.catch((error: Error) => {
				setState((current) => ({
					...current,
					error: error.message || "Falha ao carregar canais.",
				}));
			});
	}

	useEffect(() => {
		void loadChannels();
	}, []);

	useEffect(() => {
		if (!channels.some((channel) => channel.status === "pending_qr")) {
			return;
		}

		const intervalId = setInterval(() => {
			void loadChannels();
		}, 5000);

		return () => {
			clearInterval(intervalId);
		};
	}, [channels]);

	useEffect(() => {
		const nextSocket: Socket = io(SOCKET_URL, {
			withCredentials: true,
			transports: ["websocket", "polling"],
		});

		nextSocket.on(
			"channel:connection:updated",
			(connection: ChannelConnection) => {
				setChannels((current) => upsertChannelConnection(current, connection));
			},
		);

		return () => {
			nextSocket.disconnect();
		};
	}, []);

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setState((current) => ({ ...current, error: null, loading: true }));

		return channelService
			.connectWhatsapp({
				provider,
				name: name.trim() || undefined,
				phone: phone.trim() || undefined,
				useOrganizationPhone,
			})
			.then((connection) => {
				setName("");
				setPhone("");
				setUseOrganizationPhone(true);
				setChannels((current) => upsertChannelConnection(current, connection));
				setState((current) => ({ ...current, loading: false }));
			})
			.catch((error: Error) => {
				setState((current) => ({
					...current,
					loading: false,
					error: error.message || "Falha ao conectar canal.",
				}));
			});
	}

	async function handleStartInstagramOAuth() {
		setState((current) => ({
			...current,
			error: null,
			loadingInstagramOAuth: true,
		}));

		return channelService
			.getInstagramOAuthUrl()
			.then((authUrl) => {
				window.location.assign(authUrl);
			})
			.catch((error: Error) => {
				setState((current) => ({
					...current,
					loadingInstagramOAuth: false,
					error: error.message || "Falha ao iniciar conexão OAuth.",
				}));
			});
	}

	async function handleSyncWebhook(connectionId: string) {
		setState((current) => ({
			...current,
			error: null,
			syncingId: connectionId,
		}));

		return channelService
			.syncWebhook(connectionId)
			.then((connection) => {
				setChannels((current) => upsertChannelConnection(current, connection));
				setState((current) => ({ ...current, syncingId: null }));
			})
			.catch((error: Error) => {
				setState((current) => ({
					...current,
					syncingId: null,
					error: error.message || "Falha ao sincronizar webhook.",
				}));
			});
	}

	async function handleLogout() {
		setState((current) => ({ ...current, loggingOut: true }));
		await sessionService.logout().catch(() => undefined);
		window.location.assign("/login");
	}

	return (
		<main className="settings-layout">
			<AppMenu
				kicker="CONFIGURACOES"
				title="Canais do board"
				description="Conecte WhatsApp e Instagram e mantenha os canais sincronizados."
				items={[
					{ href: "/board", label: "Board" },
					{ href: "/settings/channels", label: "Canais" },
				]}
				actions={
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
				}
			/>

			<section className="settings-grid">
				<article className="settings-card">
					<h2>Conectar WhatsApp</h2>
					<form className="settings-form" onSubmit={handleSubmit}>
						<label htmlFor="provider">Provider</label>
						<select
							id="provider"
							value={provider}
							onChange={(event) => {
								if (!isWhatsappProvider(event.target.value)) {
									return;
								}
								setProvider(event.target.value);
							}}
						>
							<option value="evolution">Evolution API</option>
							<option value="whatsapp_cloud">WhatsApp Cloud API</option>
						</select>

						<label htmlFor="name">Nome do canal</label>
						<input
							id="name"
							value={name}
							onChange={(event) => setName(event.target.value)}
							placeholder="Ex.: Suporte Comercial"
						/>

						<label htmlFor="phone">Telefone (opcional)</label>
						<input
							id="phone"
							value={phone}
							onChange={(event) => setPhone(event.target.value)}
							placeholder="5511999999999"
							disabled={useOrganizationPhone}
						/>

						<label className="settings-checkbox">
							<input
								type="checkbox"
								checked={useOrganizationPhone}
								onChange={(event) =>
									setUseOrganizationPhone(event.target.checked)
								}
							/>
							Usar telefone da organizacao
						</label>

						<button type="submit" disabled={state.loading}>
							{state.loading ? "Conectando..." : "Conectar canal"}
						</button>
					</form>

					{state.error ? <p className="chat-error">{state.error}</p> : null}
				</article>

				<article className="settings-card">
					<h2>Conectar Instagram</h2>
					<p>
						Use OAuth com Meta para conectar automaticamente sua conta business,
						sem preencher IDs e token manualmente.
					</p>
					<button
						type="button"
						className="settings-sync-button"
						onClick={() => {
							void handleStartInstagramOAuth();
						}}
						disabled={state.loadingInstagramOAuth}
					>
						{state.loadingInstagramOAuth
							? "Redirecionando para Meta..."
							: "Conectar com Instagram (Meta)"}
					</button>
				</article>

				<article className="settings-card">
					<h2>Canais conectados</h2>
					<div className="settings-channel-list">
						{channels.length === 0 ? (
							<p className="chat-empty">Nenhum canal conectado.</p>
						) : null}

						{channels.map((channel) => (
							<section key={channel.id} className="settings-channel-item">
								<header>
									<strong>{channel.name}</strong>
									<span>
										{channel.status === "connected"
											? "connected"
											: channel.status}
									</span>
								</header>
								<p>
									{channel.kind} - {channel.provider} - {channel.phone}
								</p>
								{channel.providerInstanceKey ? (
									<p>Instancia: {channel.providerInstanceKey}</p>
								) : null}

								{channel.qrCodeBase64 ? (
									<img
										src={channel.qrCodeBase64}
										alt={`QR Code ${channel.name}`}
										className="settings-qr"
									/>
								) : null}
								{channel.kind === "whatsapp" ? (
									<button
										type="button"
										className="settings-sync-button"
										onClick={() => {
											void handleSyncWebhook(channel.id);
										}}
										disabled={state.syncingId === channel.id}
									>
										{state.syncingId === channel.id
											? "Sincronizando..."
											: "Sincronizar webhook"}
									</button>
								) : null}
							</section>
						))}
					</div>
				</article>
			</section>
		</main>
	);
}
