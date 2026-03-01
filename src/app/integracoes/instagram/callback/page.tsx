"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api-client";

export default function InstagramCallbackPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [message, setMessage] = useState(
		"Finalizando conexão com Instagram...",
	);

	useEffect(() => {
		async function run() {
			const code = searchParams.get("code");
			const state = searchParams.get("state");

			if (!code || !state) {
				setMessage("Falha: parâmetros de autorização ausentes.");
				return;
			}

			const response = await apiFetch(
				`/api/channels/instagram/oauth/exchange?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
			);

			if (!response.ok) {
				const payload = (await response.json().catch(() => null)) as {
					message?: string;
				} | null;
				setMessage(
					payload?.message ?? "Falha ao concluir conexão com Instagram.",
				);
				return;
			}

			setMessage("Instagram conectado com sucesso. Redirecionando...");
			setTimeout(() => {
				router.replace("/settings/channels");
			}, 700);
		}

		run();
	}, [router, searchParams]);

	return (
		<main className="settings-layout">
			<section className="settings-card">
				<h2>Conexão Instagram</h2>
				<p>{message}</p>
			</section>
		</main>
	);
}
