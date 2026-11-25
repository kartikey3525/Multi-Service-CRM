import messages from '../../messages/en.json';
import { LoginForm } from '../../components/login-form';
import { AuthShell } from '../../components/app-shell';
import { brand } from '../../lib/brand';

export default function PartnerLoginPage() {
  return (
    <AuthShell>
      <main className="portal auth-page">
        <section className="card reveal">
          <p className="eyebrow">{messages.auth.partnerLogin}</p>
          <h1>{messages.auth.signIn}</h1>
          <LoginForm kind="partner" />
          <p className="auth-footer">
            {messages.auth.helpLink}{' '}
            <a href={`mailto:${brand.supportEmail}`}>{brand.supportEmail}</a>
          </p>
        </section>
      </main>
    </AuthShell>
  );
}
