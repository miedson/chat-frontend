import { RegisterForm } from "@/components/register-form";

export default function RegisterPage() {
	return (
		<main className="login-shell">
			<section className="login-bg-orb login-bg-orb-left" />
			<section className="login-bg-orb login-bg-orb-right" />

			<div className="login-card-wrap">
				<div className="login-brand">
					<span className="login-kicker">CRIAR CONTA</span>
					<h1>Configure sua organizacao e inicie o atendimento</h1>
					<p>
						O cadastro cria o usuario credenciado na API Auth e provisiona os
						dados locais na API Chat.
					</p>
				</div>

				<RegisterForm />
			</div>
		</main>
	);
}
