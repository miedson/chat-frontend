"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppMenu } from "@/components/app-menu";
import { channelService } from "@/lib/services/channel.service";

type CallbackState = {
	message: string;
	error: string | null;
	success: string | null;
};

export default function InstagramCallbackPage() {
	const router = useRouter();
	const [state, setState] = useState<CallbackState>({
		message: "Finalizando conexão com Instagram...",
		error: null,
		success: null,
	});

	useEffect(() => {
		async function run() {
			const params = new URLSearchParams(window.location.search);
			const code = params.get("code");
			const oauthState = params.get("state");

			if (!code || !oauthState) {
				setState({
					message: "Falha: parâmetros de autorização ausentes.",
					error: "Falha: parâmetros de autorização ausentes.",
					success: null,
				});
				return;
			}

			return channelService
				.exchangeInstagramCode(code, oauthState)
				.then(() => {
					setState({
						message: "Instagram conectado com sucesso. Redirecionando...",
						error: null,
						success: "Instagram conectado com sucesso. Redirecionando...",
					});
					setTimeout(() => {
						router.replace("/settings/channels");
					}, 700);
				})
				.catch((error: Error) => {
					setState({
						message:
							error.message ?? "Falha ao concluir conexão com Instagram.",
						error: error.message ?? "Falha ao concluir conexão com Instagram.",
						success: null,
					});
				});
		}

		void run();
	}, [router]);

	return (
		<main className="settings-layout">
			<AppMenu
				kicker="INTEGRACOES"
				title="Conexão Instagram"
				description="Confirmação da autorização Meta"
				items={[
					{ href: "/board", label: "Board" },
					{ href: "/settings/channels", label: "Canais" },
				]}
			/>
			<section className="settings-card">
				<h2>Conexão Instagram</h2>
				<p>{state.message}</p>
				{state.error ? <p className="chat-error">{state.error}</p> : null}
				{state.success ? (
					<p className="login-message success">{state.success}</p>
				) : null}
			</section>
		</main>
	);
}
