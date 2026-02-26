import { LoginForm } from '@/components/login-form'

export default function LoginPage() {
  return (
    <main className="login-shell">
      <section className="login-bg-orb login-bg-orb-left" />
      <section className="login-bg-orb login-bg-orb-right" />

      <div className="login-card-wrap">
        <div className="login-brand">
          <span className="login-kicker">MULTIATENDIMENTO</span>
          <h1>Controle suas conversas em um so lugar</h1>
          <p>
            Acesse sua central de atendimento para acompanhar equipes, canais e
            tempo de resposta com precisao.
          </p>
        </div>

        <LoginForm />
      </div>
    </main>
  )
}
