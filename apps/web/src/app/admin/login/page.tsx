import messages from '../../../messages/en.json';
import { LoginForm } from '../../../components/login-form';
import { AuthShell } from '../../../components/app-shell';

export default function AdminLoginPage() {
  return (
    <AuthShell>
      <main className="portal auth-page">
        <section className="card reveal">
          <p className="eyebrow">{messages.auth.adminLogin}</p>
          <h1>{messages.auth.signIn}</h1>
          <LoginForm kind="admin" />
        </section>
      </main>
    </AuthShell>
  );
}
