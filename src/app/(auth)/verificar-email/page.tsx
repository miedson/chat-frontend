import { VerifyEmailForm } from "@/components/verify-email-form";

export default function VerifyEmailPage() {
	return (
		<main className="login-shell">
			<section className="login-bg-orb login-bg-orb-left" />
			<section className="login-bg-orb login-bg-orb-right" />

			<div className="login-card-wrap">
				<div className="login-brand">
					<span className="login-kicker">VALIDACAO DE E-MAIL</span>
					<h1>Confirme seu cadastro com o codigo enviado</h1>
					<p>
						Se necessario, voce pode solicitar um novo codigo usando o botao de
						reenvio.
					</p>
				</div>

				<VerifyEmailForm />
			</div>
		</main>
	);
}
