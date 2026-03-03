"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { authService } from "@/lib/services/auth.service";
import { hasPendingVerification, setPendingVerification } from "@/lib/verification-pending";

type ResetMode = "request" | "reset";
type ResetState = {
	loading: boolean;
	error: string | null;
	success: string | null;
};

function validatePassword(password: string) {
	if (password.length < 8 || password.length > 128) {
		return "Senha deve ter entre 8 e 128 caracteres";
	}

	if (!/[a-z]/.test(password)) return "Senha precisa de letra minuscula";
	if (!/[A-Z]/.test(password)) return "Senha precisa de letra maiuscula";
	if (!/[0-9]/.test(password)) return "Senha precisa de numero";
	if (!/[^A-Za-z0-9]/.test(password)) return "Senha precisa de simbolo";
	return null;
}

export function ResetPasswordForm() {
	const router = useRouter();
	const [mode, setMode] = useState<ResetMode>("request");
	const [email, setEmail] = useState("");
	const [token, setToken] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [state, setState] = useState<ResetState>({
		loading: false,
		error: null,
		success: null,
	});

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const tokenFromUrl = params.get("token") ?? "";
		const emailFromUrl = params.get("email") ?? "";

		if (tokenFromUrl) {
			setMode("reset");
			setToken(tokenFromUrl);
		}

		if (emailFromUrl) {
			setEmail(emailFromUrl);
		}
	}, []);

	async function handleRequestReset(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		const normalizedEmail = email.trim();
		if (!normalizedEmail) {
			setState({
				loading: false,
				error: "Informe o e-mail para solicitar redefinicao.",
				success: null,
			});
			return;
		}

		setState({ loading: true, error: null, success: null });

		return authService
			.forgotPassword({ email: normalizedEmail })
			.then(() => {
				setState({
					loading: false,
					error: null,
					success: "Se o e-mail existir, enviamos as instrucoes de redefinicao.",
				});
			})
			.catch((error: Error) => {
				setState({
					loading: false,
					error: error.message || "Falha ao solicitar redefinicao.",
					success: null,
				});
			});
	}

	async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		const normalizedEmail = email.trim();
		const normalizedToken = token.trim();
		if (!normalizedEmail || !normalizedToken) {
			setState({
				loading: false,
				error: "Informe e-mail e token de redefinicao.",
				success: null,
			});
			return;
		}

		const passwordError = validatePassword(password);
		if (passwordError) {
			setState({
				loading: false,
				error: passwordError,
				success: null,
			});
			return;
		}

		if (password !== confirmPassword) {
			setState({
				loading: false,
				error: "As senhas nao conferem.",
				success: null,
			});
			return;
		}

		const wasPendingVerification = hasPendingVerification();
		setState({ loading: true, error: null, success: null });

		return authService
			.resetPassword({
				token: normalizedToken,
				password,
			})
			.then(() => {
				if (wasPendingVerification) {
					window.sessionStorage.setItem(
						"pending_verification",
						JSON.stringify({
							email: normalizedEmail,
							password,
						}),
					);
					setPendingVerification(normalizedEmail);
					router.push(`/verificar-email?email=${encodeURIComponent(normalizedEmail)}`);
					return;
				}

				setState({
					loading: false,
					error: null,
					success: "Senha redefinida com sucesso. Faca login com a nova senha.",
				});
				setTimeout(() => {
					router.push("/login");
				}, 1000);
			})
			.catch((error: Error) => {
				setState({
					loading: false,
					error: error.message || "Falha ao redefinir senha.",
					success: null,
				});
			});
	}

	return (
		<section className="login-card" aria-label="Formulario de redefinicao de senha">
			<div className="login-card-head">
				<h2>Redefinir senha</h2>
				<p>
					{mode === "request"
						? "Solicite o link de redefinicao no seu e-mail."
						: "Informe o token recebido para definir uma nova senha."}
				</p>
			</div>

			{mode === "request" ? (
				<form className="login-form" onSubmit={handleRequestReset}>
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

					<button type="submit" disabled={state.loading}>
						{state.loading ? "Enviando..." : "Enviar link"}
					</button>

					<button
						type="button"
						className="menu-action-button"
						onClick={() => setMode("reset")}
						disabled={state.loading}
					>
						Ja tenho token
					</button>
				</form>
			) : (
				<form className="login-form" onSubmit={handleResetPassword}>
					<label htmlFor="reset-email">E-mail</label>
					<input
						id="reset-email"
						name="email"
						type="email"
						value={email}
						onChange={(event) => setEmail(event.target.value)}
						placeholder="voce@empresa.com"
						required
					/>

					<label htmlFor="token">Token</label>
					<input
						id="token"
						name="token"
						value={token}
						onChange={(event) => setToken(event.target.value)}
						placeholder="Token recebido por e-mail"
						required
					/>

					<label htmlFor="password">Nova senha</label>
					<input
						id="password"
						name="password"
						type="password"
						value={password}
						onChange={(event) => setPassword(event.target.value)}
						placeholder="Nova senha"
						required
					/>

					<label htmlFor="confirmPassword">Confirmar nova senha</label>
					<input
						id="confirmPassword"
						name="confirmPassword"
						type="password"
						value={confirmPassword}
						onChange={(event) => setConfirmPassword(event.target.value)}
						placeholder="Repita a nova senha"
						required
					/>

					<button type="submit" disabled={state.loading}>
						{state.loading ? "Atualizando..." : "Salvar nova senha"}
					</button>

					<button
						type="button"
						className="menu-action-button"
						onClick={() => setMode("request")}
						disabled={state.loading}
					>
						Voltar
					</button>
				</form>
			)}

			{state.error ? <p className="login-message error">{state.error}</p> : null}
			{state.success ? <p className="login-message success">{state.success}</p> : null}

			<p className="auth-link">
				Voltar para <Link href="/login">login</Link>
			</p>
		</section>
	);
}
