"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FocusEvent, type FormEvent, useState } from "react";
import { authService } from "@/lib/services/auth.service";
import { setPendingVerification } from "@/lib/verification-pending";

type RegisterState = {
	loading: boolean;
	error: string | null;
	success: string | null;
};

type RegisterStep = 1 | 2;
type RegisterFormValues = {
	name: string;
	displayName: string;
	email: string;
	password: string;
	confirmPassword: string;
	organizationName: string;
	organizationDocument: string;
	organizationPhone: string;
	organizationDomain: string;
	organizationSupportEmail: string;
};

function isValidPhone(value: string) {
	return /^(\+55)?\s?\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/.test(value);
}

function isValidEmail(value: string) {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

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

export function RegisterForm() {
	const router = useRouter();
	const [step, setStep] = useState<RegisterStep>(1);
	const [values, setValues] = useState<RegisterFormValues>({
		name: "",
		displayName: "",
		email: "",
		password: "",
		confirmPassword: "",
		organizationName: "",
		organizationDocument: "",
		organizationPhone: "",
		organizationDomain: "",
		organizationSupportEmail: "",
	});
	const [state, setState] = useState<RegisterState>({
		loading: false,
		error: null,
		success: null,
	});
	const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(
		null,
	);
	const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false);

	function updateValue<Key extends keyof RegisterFormValues>(
		key: Key,
		value: RegisterFormValues[Key],
	) {
		setValues((current) => ({
			...current,
			[key]: value,
		}));
	}

	function validateConfirmPassword(password: string, confirmPassword: string) {
		if (!confirmPassword) {
			setConfirmPasswordError("Confirme a senha.");
			return false;
		}

		if (password !== confirmPassword) {
			setConfirmPasswordError("As senhas nao conferem.");
			return false;
		}

		setConfirmPasswordError(null);
		return true;
	}

	function handleConfirmPasswordBlur(event: FocusEvent<HTMLInputElement>) {
		setConfirmPasswordTouched(true);
		const confirmPassword = event.currentTarget.value;
		const password = values.password;
		validateConfirmPassword(password, confirmPassword);
	}

	function handleNextStep() {
		const name = values.name.trim();
		const email = values.email.trim();
		const password = values.password;
		const confirmPassword = values.confirmPassword;

		if (!name) {
			setState((current) => ({ ...current, error: "Nome obrigatorio." }));
			return;
		}

		if (!isValidEmail(email)) {
			setState((current) => ({ ...current, error: "Email invalido." }));
			return;
		}

		const passwordError = validatePassword(password);
		if (passwordError) {
			setState((current) => ({ ...current, error: passwordError }));
			return;
		}

		setConfirmPasswordTouched(true);
		if (!validateConfirmPassword(password, confirmPassword)) {
			setState((current) => ({ ...current, error: "As senhas nao conferem." }));
			return;
		}

		setState((current) => ({ ...current, error: null }));
		setStep(2);
	}

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const name = values.name.trim();
		const displayName = values.displayName.trim();
		const email = values.email.trim();
		const password = values.password;
		const organizationName = values.organizationName.trim();
		const organizationDocument = values.organizationDocument.trim();
		const organizationPhone = values.organizationPhone.trim();
		const organizationDomain = values.organizationDomain.trim();
		const organizationSupportEmail = values.organizationSupportEmail.trim();

		// Revalida step 1 no submit para evitar envio inconsistente.
		if (!name || !isValidEmail(email) || validatePassword(password)) {
			setState((current) => ({
				...current,
				loading: false,
				error: "Revise os dados do usuario antes de finalizar.",
			}));
			setStep(1);
			return;
		}

		if (!organizationName || !organizationDocument || !organizationPhone) {
			setState((current) => ({
				...current,
				loading: false,
				error: "Preencha os campos obrigatorios da organizacao.",
			}));
			return;
		}

		if (!isValidPhone(organizationPhone)) {
			setState((current) => ({
				...current,
				loading: false,
				error: "Telefone invalido.",
			}));
			return;
		}

		if (organizationSupportEmail && !isValidEmail(organizationSupportEmail)) {
			setState((current) => ({
				...current,
				loading: false,
				error: "Email de suporte invalido.",
			}));
			return;
		}

		setState({ loading: true, error: null, success: null });

		return authService
			.register({
				name,
				displayName: displayName || undefined,
				email,
				password,
				organization: {
					name: organizationName,
					document: organizationDocument,
					phone: organizationPhone,
					domain: organizationDomain || undefined,
					supportEmail: organizationSupportEmail || undefined,
				},
			})
			.then((response) => {
				setState({
					loading: false,
					error: null,
					success: response.message,
				});

				if (response.status === "verification_required") {
					window.sessionStorage.setItem(
						"pending_verification",
						JSON.stringify({
							email,
							password,
						}),
					);
					setPendingVerification(email);
					setTimeout(() => {
						router.push(`/verificar-email?email=${encodeURIComponent(email)}`);
					}, 900);
					return;
				}

				setTimeout(() => {
					router.push("/login");
				}, 900);
			})
			.catch((error: Error) => {
				setState({
					loading: false,
					error: error.message || "Falha ao criar conta.",
					success: null,
				});
			});
	}

	return (
			<section className="login-card" aria-label="Formulario de registro">
			<div className="login-card-head">
				<h2>Criar conta</h2>
				<p>Cadastro em 2 etapas: usuario e organizacao.</p>
				<p className="chat-empty">
					Etapa {step} de 2: {step === 1 ? "Dados do usuario" : "Dados da organizacao"}
				</p>
			</div>

			<form className="login-form" onSubmit={handleSubmit} noValidate>
				{step === 1 ? (
					<>
						<label htmlFor="name">Nome</label>
						<input
							id="name"
							name="name"
							placeholder="Nome completo"
							value={values.name}
							onChange={(event) => updateValue("name", event.target.value)}
							required
						/>

						<label htmlFor="displayName">Nome de exibicao (opcional)</label>
						<input
							id="displayName"
							name="displayName"
							placeholder="Como aparecera no chat"
							value={values.displayName}
							onChange={(event) => updateValue("displayName", event.target.value)}
						/>

						<label htmlFor="email">E-mail</label>
						<input
							id="email"
							name="email"
							type="email"
							placeholder="voce@empresa.com"
							value={values.email}
							onChange={(event) => updateValue("email", event.target.value)}
							required
						/>

						<label htmlFor="password">Senha</label>
						<input
							id="password"
							name="password"
							type="password"
							placeholder="Senha forte"
							value={values.password}
							onChange={(event) => updateValue("password", event.target.value)}
							required
						/>

						<label htmlFor="confirmPassword">Confirmar senha</label>
						<input
							id="confirmPassword"
							name="confirmPassword"
							type="password"
							placeholder="Repita a senha"
							value={values.confirmPassword}
							onChange={(event) =>
								updateValue("confirmPassword", event.target.value)
							}
							className={
								confirmPasswordTouched
									? confirmPasswordError
										? "input-error"
										: "input-success"
									: ""
							}
							onBlur={handleConfirmPasswordBlur}
							required
						/>
						{confirmPasswordError ? (
							<p className="login-message error">{confirmPasswordError}</p>
						) : null}

						<button
							type="button"
							onClick={() => {
								handleNextStep();
							}}
						>
							Proxima etapa
						</button>
					</>
				) : (
					<>
						<label htmlFor="organizationName">Organizacao</label>
						<input
							id="organizationName"
							name="organizationName"
							placeholder="Nome da empresa"
							value={values.organizationName}
							onChange={(event) =>
								updateValue("organizationName", event.target.value)
							}
							required
						/>

						<label htmlFor="organizationDocument">CPF/CNPJ</label>
						<input
							id="organizationDocument"
							name="organizationDocument"
							placeholder="000.000.000-00 ou 00.000.000/0000-00"
							value={values.organizationDocument}
							onChange={(event) =>
								updateValue("organizationDocument", event.target.value)
							}
							required
						/>

						<label htmlFor="organizationPhone">Telefone</label>
						<input
							id="organizationPhone"
							name="organizationPhone"
							placeholder="(85) 99999-0000"
							value={values.organizationPhone}
							onChange={(event) =>
								updateValue("organizationPhone", event.target.value)
							}
							required
						/>

						<label htmlFor="organizationDomain">Dominio (opcional)</label>
						<input
							id="organizationDomain"
							name="organizationDomain"
							placeholder="empresa.com"
							value={values.organizationDomain}
							onChange={(event) =>
								updateValue("organizationDomain", event.target.value)
							}
						/>

						<label htmlFor="organizationSupportEmail">
							Email de suporte (opcional)
						</label>
						<input
							id="organizationSupportEmail"
							name="organizationSupportEmail"
							type="email"
							placeholder="suporte@empresa.com"
							value={values.organizationSupportEmail}
							onChange={(event) =>
								updateValue("organizationSupportEmail", event.target.value)
							}
						/>

						<div className="app-menu-actions">
							<button
								type="button"
								className="menu-action-button"
								onClick={() => {
									setStep(1);
									setState((current) => ({ ...current, error: null }));
								}}
							>
								Voltar
							</button>
							<button type="submit" disabled={state.loading}>
								{state.loading ? "Criando conta..." : "Registrar"}
							</button>
						</div>
					</>
				)}

				{state.error ? <p className="login-message error">{state.error}</p> : null}
				{state.success ? (
					<p className="login-message success">{state.success}</p>
				) : null}
			</form>

			<p className="auth-link">
				Ja possui conta? <Link href="/login">Entrar</Link>
			</p>
		</section>
	);
}
