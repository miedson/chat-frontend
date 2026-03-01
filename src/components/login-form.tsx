"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { authService } from "@/lib/services/auth.service";

type LoginState = {
	loading: boolean;
	error: string | null;
	success: string | null;
};

export function LoginForm() {
	const router = useRouter();
	const [state, setState] = useState<LoginState>({
		loading: false,
		error: null,
		success: null,
	});

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		const form = new FormData(event.currentTarget);
		const email = String(form.get("email") ?? "");
		const password = String(form.get("password") ?? "");

		setState({ loading: true, error: null, success: null });

		authService.login(email, password)
			.then(() => {
				setState({
					loading: false,
					error: null,
					success: "Login bem-sucedido! Redirecionando...",
				});
				setTimeout(() => {
					router.push("/conversations");
				}, 1500);
			})
			.catch((error) => {
				setState({
					loading: false,
					error: error.message || "Falha no login. Tente novamente.",
					success: null,
				});
			});
	}

	return (
		<section className="login-card" aria-label="Formulario de login">
			<div className="login-card-head">
				<h2>Entrar</h2>
				<p>Use seu email corporativo para acessar o painel.</p>
			</div>

			<form className="login-form" onSubmit={handleSubmit}>
				<label htmlFor="email">Email</label>
				<input
					id="email"
					name="email"
					type="email"
					placeholder="voce@empresa.com"
					required
					autoComplete="email"
				/>

				<label htmlFor="password">Senha</label>
				<input
					id="password"
					name="password"
					type="password"
					placeholder="Sua senha"
					required
					autoComplete="current-password"
				/>

				<button type="submit" disabled={state.loading}>
					{state.loading ? "Entrando..." : "Acessar plataforma"}
				</button>

				{state.error ? (
					<p className="login-message error">{state.error}</p>
				) : null}
				{state.success ? (
					<p className="login-message success">{state.success}</p>
				) : null}
			</form>
		</section>
	);
}
