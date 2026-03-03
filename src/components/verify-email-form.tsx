"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { authService } from "@/lib/services/auth.service";
import { clearPendingVerification, setPendingVerification } from "@/lib/verification-pending";

type VerifyEmailState = {
	loadingVerify: boolean;
	loadingResend: boolean;
	error: string | null;
	success: string | null;
};

export function VerifyEmailForm() {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [code, setCode] = useState("");
	const [password, setPassword] = useState("");
	const [state, setState] = useState<VerifyEmailState>({
		loadingVerify: false,
		loadingResend: false,
		error: null,
		success: null,
	});

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const queryEmail = params.get("email") ?? "";
		const cached = window.sessionStorage.getItem("pending_verification");
		const cachedData = cached ? (JSON.parse(cached) as { email?: string; password?: string }) : {};

		setEmail(queryEmail || cachedData.email || "");
		setPassword(cachedData.password || "");
	}, []);

	async function handleVerify(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (!email || !code) {
			setState((current) => ({
				...current,
				error: "Informe e-mail e codigo.",
				success: null,
			}));
			return;
		}

		setState({
			loadingVerify: true,
			loadingResend: false,
			error: null,
			success: null,
		});

		return authService
			.verifyEmail({ email: email.trim(), code: code.trim() })
			.then(() => {
				window.sessionStorage.removeItem("pending_verification");
				clearPendingVerification();
				setState({
					loadingVerify: false,
					loadingResend: false,
					error: null,
					success: "E-mail verificado com sucesso. Faca login.",
				});
				setTimeout(() => {
					router.push("/login");
				}, 1000);
			})
			.catch((error: Error) => {
				setState({
					loadingVerify: false,
					loadingResend: false,
					error: error.message || "Falha ao verificar codigo.",
					success: null,
				});
			});
	}

	async function handleResendCode() {
		if (!email || !password) {
			setState((current) => ({
				...current,
				error: "Informe e-mail e senha para reenviar o codigo.",
				success: null,
			}));
			return;
		}

		setState({
			loadingVerify: false,
			loadingResend: true,
			error: null,
			success: null,
		});

		return authService
			.resendVerification({
				email: email.trim(),
				password,
			})
			.then((response) => {
				setPendingVerification(email.trim());
				window.sessionStorage.setItem(
					"pending_verification",
					JSON.stringify({ email: email.trim(), password }),
				);
				setState({
					loadingVerify: false,
					loadingResend: false,
					error: null,
					success: response.message || "Novo codigo enviado para seu e-mail.",
				});
			})
			.catch((error: Error) => {
				setState({
					loadingVerify: false,
					loadingResend: false,
					error: error.message || "Falha ao reenviar codigo.",
					success: null,
				});
			});
	}

	return (
		<section className="login-card" aria-label="Formulario de verificacao">
			<div className="login-card-head">
				<h2>Verificar e-mail</h2>
				<p>Digite o codigo recebido por e-mail para ativar a conta.</p>
			</div>

			<form className="login-form" onSubmit={handleVerify}>
				<label htmlFor="email">E-mail</label>
				<input
					id="email"
					name="email"
					type="email"
					value={email}
					onChange={(event) => setEmail(event.target.value)}
					placeholder="voce@empresa.com"
					required
				/>

				<label htmlFor="code">Codigo de verificacao</label>
				<input
					id="code"
					name="code"
					value={code}
					onChange={(event) => setCode(event.target.value)}
					placeholder="000000"
					maxLength={6}
					required
				/>

				<label htmlFor="password">Senha (para reenviar codigo)</label>
				<input
					id="password"
					name="password"
					type="password"
					value={password}
					onChange={(event) => setPassword(event.target.value)}
					placeholder="Sua senha"
					required
				/>

				<button type="submit" disabled={state.loadingVerify || state.loadingResend}>
					{state.loadingVerify ? "Validando..." : "Confirmar codigo"}
				</button>

				<button
					type="button"
					className="menu-action-button"
					disabled={state.loadingVerify || state.loadingResend}
					onClick={() => {
						void handleResendCode();
					}}
				>
					{state.loadingResend ? "Reenviando..." : "Reenviar codigo"}
				</button>

				{state.error ? <p className="login-message error">{state.error}</p> : null}
				{state.success ? (
					<p className="login-message success">{state.success}</p>
				) : null}
			</form>

			<p className="auth-link">
				Voltar para <Link href="/login">login</Link>
			</p>
		</section>
	);
}
