import { ResetPasswordForm } from "@/components/reset-password-form";

export default function ResetPasswordPage() {
	return (
		<main className="login-shell">
			<section className="login-bg-orb login-bg-orb-left" />
			<section className="login-bg-orb login-bg-orb-right" />

			<div className="login-card-wrap">
				<div className="login-brand">
					<span className="login-kicker">SEGURANCA</span>
					<h1>Recupere o acesso com uma nova senha</h1>
					<p>
						Se a conta ainda nao estiver verificada, voce sera redirecionado para
						a validacao antes de acessar o sistema.
					</p>
				</div>

				<ResetPasswordForm />
			</div>
		</main>
	);
}
